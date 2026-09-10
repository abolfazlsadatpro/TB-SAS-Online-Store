"""
Coupon Service Layer — Minimal first-phase architecture (TASK 22 approved).

No endpoint logic. No HTML generation. Only business logic:
- lookup
- normalization
- validation (active, dates, usage, minimum subtotal, discount config)
- discount calculation (percent precedence over amount when both positive)
- session state (identity only: `cart_coupon_code`)
- safe Decimal arithmetic (no floats)
- structured Python-level results (not HTTP responses)

Architecture constraints (TASK 20 / TASK 21 approved):
- `request.session["cart_coupon_code"]` stores identity only (`str` / `None`).
- `Coupon` model fields (`store/models.py`):
  `code` (`CharField`, unique, db_index), `is_active`, `discount_percent`,
  `discount_amount`, `valid_from`/`valid_until`, `min_subtotal`,
  `max_discount`, `usage_limit`, `usage_count`.
- Discount precedence: `percent` takes precedence over `amount` when both positive.
- `calculate_coupon_discount()` uses `Decimal` arithmetic (`subtotal` is `Decimal`; `percent` converted via `Decimal(str(percent))`; `amount` is `Decimal`).
- `max_discount` cap applies to percentage discounts (`Decimal`).
- `min_subtotal` applies to `subtotal` (before discount — design choice from TASK 20; `free_shipping_threshold` = `Decimal("100.00")` verified from DB; `tax_percent` = `Decimal("10.00")`).
- Tax (`tax_percent`) applies after discount (`subtotal - discount` base — TASK 20 design approved).
- Shipping (`free_shipping_threshold`) applies to `subtotal` before discount (`shipping = 0` currently because no paid price exists; design notes future adjustment).
- No price snapshot stored in session (`cart_service.py` does not include price in session; `calculate_subtotal()` reads current `Product.final_price`).
- No `CouponUsage` model (future); `usage_limit` applies globally (`usage_count` global only); no per-user tracking for minimal phase.
- Guest/authenticated: session-based; both work (`enable_guest_checkout` = `True`).
- Checkout (future) must re-validate coupon at `Order` creation time and increment `usage_count` transactionally (`transaction.atomic()` recommended).
- No endpoint (`store/urls.py` unchanged — `cart/coupon/` does not exist).
- No JavaScript coupon interaction (`cart.js` unchanged from TASK 17 — event delegation only; no coupon endpoint connection).
- No template coupon server integration (`templates/main/cart.html` unchanged — `.coupon-box` remains static input/button).
"""

from decimal import Decimal
from django.utils import timezone

from store.models import Coupon, SettingSite
from store.services import cart_service


# ------------------------------------------------------------------
# Internal — normalization / lookup helpers
# ------------------------------------------------------------------


def normalize_coupon_code(code):
    """Normalize coupon code for lookup (strip whitespace, uppercase)."""
    if code is None:
        return None
    normalized = str(code).strip().upper()
    return normalized if normalized else None


# ------------------------------------------------------------------
# Lookup
# ------------------------------------------------------------------


def get_coupon(request, code):
    """
    Look up coupon by normalized code.
    Returns (Coupon instance or None, error_message or empty string).
    Does NOT validate eligibility (dates, usage, subtotal) — only existence.
    """
    normalized = normalize_coupon_code(code)
    if normalized is None:
        return None, "Coupon code cannot be empty."
    try:
        coupon = Coupon.objects.get(code=normalized)
    except Coupon.DoesNotExist:
        return None, "Invalid coupon code."
    return coupon, ""


# ------------------------------------------------------------------
# Validation
# ------------------------------------------------------------------


def validate_coupon(request, code, subtotal):
    """
    Full coupon validation against current cart state and database state.
    Returns (is_valid: bool, coupon: Coupon or None, message: str, discount: Decimal).
    Validation order (deterministic, safe):
      1. Normalization and lookup.
      2. Active state (`is_active`).
      3. Validity window (`valid_from` / `valid_until`) — timezone-aware.
      4. Usage limit (`usage_count < usage_limit` if set > 0).
      5. Empty cart (`subtotal` > 0 required for application — design choice based on business logic: applying a coupon to an empty cart is meaningless).
      6. Minimum subtotal (`subtotal >= min_subtotal`).
      7. Discount configuration (`percent > 0` or `amount > 0` — at least one positive; both positive handled by precedence rule during calculation).
      8. Final discount calculation (percentage precedence when both positive; cap by `max_discount` if set > 0; never exceeds `subtotal`; never negative).
    """
    coupon, lookup_error = get_coupon(request, code)
    if coupon is None:
        return False, None, lookup_error if lookup_error else "Invalid coupon code.", Decimal("0")

    # Active check.
    if not coupon.is_active:
        return False, coupon, "Coupon is inactive.", Decimal("0")

    # Validity window (timezone-aware). Uses Django `timezone.now()`.
    now = timezone.now()
    if coupon.valid_from is not None and now < coupon.valid_from:
        return False, coupon, "Coupon is not yet active.", Decimal("0")
    if coupon.valid_until is not None and now > coupon.valid_until:
        return False, coupon, "Coupon has expired.", Decimal("0")

    # Empty cart check (design choice: coupon requires non-empty cart for meaningful application).
    # Note: if the user has items but subtotal is 0 (free items), the minimum subtotal check handles it.
    # This check specifically prevents applying a coupon to a completely empty session (`subtotal == 0`).
    # Given the approved architecture (`enable_guest_checkout` = True; session-based temporary cart),
    # applying a coupon with no items has no business value and is prevented safely.
    # The endpoint layer (`POST /cart/coupon/`) should handle the case where `cart_items` is empty
    # (return `success: False`, message: `"Cart is empty."`).
    if subtotal <= Decimal("0"):
        return False, coupon, "Cart subtotal must be positive to apply a coupon.", Decimal("0")

    # Usage limit (global tracking — no per-user tracking in minimal phase).
    if coupon.usage_limit is not None and coupon.usage_limit > 0:
        if coupon.usage_count >= coupon.usage_limit:
            return False, coupon, "Usage limit reached.", Decimal("0")

    # Minimum subtotal check (`subtotal` before discount — design choice from TASK 20).
    if subtotal < coupon.min_subtotal:
        return False, coupon, "Subtotal does not meet minimum requirement.", Decimal("0")

    # Discount configuration (at least one positive — enforced by model `clean()`).
    percent = int(coupon.discount_percent) if coupon.discount_percent is not None else 0
    amount = Decimal(str(coupon.discount_amount)) if coupon.discount_amount is not None else Decimal("0")
    if percent <= 0 and amount <= Decimal("0"):
        return False, coupon, "Coupon has no valid discount.", Decimal("0")

    # Calculate authoritative discount (server only — never from session).
    discount = calculate_coupon_discount(subtotal, coupon)
    return True, coupon, "Coupon applied.", discount


# ------------------------------------------------------------------
# Discount calculation
# ------------------------------------------------------------------


def calculate_coupon_discount(subtotal, coupon):
    """
    Authoritative coupon discount calculation.
    Returns Decimal (never float). Never exceeds `subtotal`.
    Uses current `subtotal` (authoritative from `cart_service.calculate_subtotal`).
    Precedence: if both `percent > 0` and `amount > 0`, `percent` takes precedence
    (deterministic safe behavior approved by TASK 20 design; avoids ambiguous
    double-application).
    """
    if subtotal < Decimal("0"):
        subtotal = Decimal("0")

    percent = int(coupon.discount_percent) if coupon.discount_percent is not None else 0
    amount = Decimal(str(coupon.discount_amount)) if coupon.discount_amount is not None else Decimal("0")

    # Precedence: percent over amount when both positive.
    if percent > 0:
        calculated = (subtotal * Decimal(str(percent))) / Decimal("100")
    elif amount > Decimal("0"):
        calculated = amount
    else:
        calculated = Decimal("0")

    # Cap by max_discount if set (`> 0`).
    max_disc = coupon.max_discount
    if max_disc is not None and Decimal(str(max_disc)) > Decimal("0"):
        max_disc_dec = Decimal(str(max_disc))
        if calculated > max_disc_dec:
            calculated = max_disc_dec

    # Never exceed subtotal (safeguard against negative total).
    if calculated > subtotal:
        calculated = subtotal

    # Ensure non-negative (safeguard; should not occur given validation, but included for absolute safety).
    if calculated < Decimal("0"):
        calculated = Decimal("0")

    return calculated


# ------------------------------------------------------------------
# Apply / Remove / State helpers
# ------------------------------------------------------------------


def apply_coupon(request, code):
    """
    Apply coupon to session.
    Returns service-level result dict (not HTTP response):
    {
        "success": bool,
        "message": str,
        "coupon_applied": bool,
        "coupon_code": str or None,
        "discount": Decimal,
        "badge": int,
        "lines_count": int,
        "items_count": int,
        "subtotal": Decimal,
        "shipping": Decimal,
        "tax": Decimal,
        "total": Decimal,
    }
    """
    # Normalize before validation.
    normalized = normalize_coupon_code(code)
    if normalized is None:
        return {
            "success": False,
            "message": "Please enter a coupon code.",
            "coupon_applied": False,
            "coupon_code": None,
            "discount": Decimal("0"),
            "badge": cart_service.get_badge_count(request),
        }

    # Resolve current authoritative subtotal.
    subtotal = cart_service.calculate_subtotal(request)

    # Validate coupon (re-checks DB state at request time — important for freshness).
    is_valid, coupon_obj, message, discount = validate_coupon(
        request, normalized, subtotal
    )

    if not is_valid:
        # Clear stale/invalid coupon from session if previously stored.
        session = getattr(request, "session", None)
        if session is not None:
            session.pop("cart_coupon_code", None)
            if hasattr(session, "modified"):
                session.modified = True
        return {
            "success": False,
            "message": message,
            "coupon_applied": False,
            "coupon_code": None,
            "discount": Decimal("0"),
            "badge": cart_service.get_badge_count(request),
            "lines_count": cart_service.get_lines_count(request),
            "items_count": cart_service.get_badge_count(request),
            "subtotal": cart_service.calculate_subtotal(request),
            "shipping": Decimal("0"),
            "tax": Decimal("0"),
            "total": cart_service.calculate_subtotal(request),
        }

    # Store valid coupon code in session (identity only — no computed amount stored).
    session = getattr(request, "session", None)
    if session is not None:
        session["cart_coupon_code"] = normalized
        if hasattr(session, "modified"):
            session.modified = True

    # Recalculate full totals with validated discount (authoritative from server).
    totals = cart_service.calculate_totals(request, discount=discount)

    return {
        "success": True,
        "message": message,
        "coupon_applied": True,
        "coupon_code": normalized,
        "discount": discount,
        "badge": cart_service.get_badge_count(request),
        "lines_count": cart_service.get_lines_count(request),
        "items_count": cart_service.get_badge_count(request),
        "subtotal": totals.get("subtotal"),
        "shipping": totals.get("shipping"),
        "tax": totals.get("tax"),
        "total": totals.get("total"),
    }


def remove_coupon(request):
    """
    Remove coupon from session (clear identity).
    Returns service-level result dict.
    """
    session = getattr(request, "session", None)
    if session is not None:
        session.pop("cart_coupon_code", None)
        if hasattr(session, "modified"):
            session.modified = True

    totals = cart_service.calculate_totals(request, discount=Decimal("0"))
    return {
        "success": True,
        "message": "Coupon removed.",
        "coupon_applied": False,
        "coupon_code": None,
        "discount": Decimal("0"),
        "badge": cart_service.get_badge_count(request),
        "lines_count": cart_service.get_lines_count(request),
        "items_count": cart_service.get_badge_count(request),
        "subtotal": totals.get("subtotal"),
        "shipping": totals.get("shipping"),
        "tax": totals.get("tax"),
        "total": totals.get("total"),
    }


def get_applied_coupon(request):
    """
    Read applied coupon from session and return validated info.
    Returns (normalized_code: str or None, is_applied: bool).
    Note: full validation (dates/usage/min_subtotal) is intended to be
    re-checked at apply time and at checkout; this function reads identity only.
    """
    session = getattr(request, "session", None)
    if session is None:
        return None, False
    code = session.get("cart_coupon_code", None)
    if code is None or str(code).strip() == "":
        return None, False
    return str(code).strip(), True


def get_coupon_discount(request, subtotal):
    """
    Compute validated discount for the current session coupon.
    Returns Decimal (authoritative server-calculated discount; 0 if invalid/stale).
    """
    code, is_applied = get_applied_coupon(request)
    if not is_applied:
        return Decimal("0")

    # Re-validate coupon against current DB state and subtotal.
    # This ensures stale/expired/usage-reached coupons are treated as no discount.
    is_valid, coupon_obj, message, discount = validate_coupon(
        request, code, subtotal
    )
    if not is_valid:
        return Decimal("0")
    return discount


# ------------------------------------------------------------------
# Session coupon state helpers (ready for endpoint / view integration)
# ------------------------------------------------------------------

def get_coupon_code(request):
    """Read coupon code from session (normalized or None)."""
    session = getattr(request, "session", None)
    if session is None:
        return None
    code = session.get("cart_coupon_code", None)
    return normalize_coupon_code(code) if code else None


def set_coupon_code(request, code):
    """Store normalized coupon code in session."""
    session = getattr(request, "session", None)
    if session is not None:
        session["cart_coupon_code"] = normalize_coupon_code(code)
        if hasattr(session, "modified"):
            session.modified = True


def clear_coupon_code(request):
    """Remove coupon code from session."""
    session = getattr(request, "session", None)
    if session is not None:
        session.pop("cart_coupon_code", None)
        if hasattr(session, "modified"):
            session.modified = True
