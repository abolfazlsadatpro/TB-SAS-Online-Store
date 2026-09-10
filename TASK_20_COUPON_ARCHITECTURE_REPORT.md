# TASK 20 — COUPON ARCHITECTURE AUDIT & DESIGN REPORT

**Status:** NO PRODUCTION FILES MODIFIED. Only temporary audit verification performed. No `Coupon` model created. No endpoint (`/cart/coupon/`) implemented. No `cart_service.py`, `views.py`, `models.py`, `urls.py`, `cart.html`, `cart.js`, `checkout/`, `payment/`, `users/`, or migrations changed.
**Language:** English only.

---

## 1. CURRENT STATE VERIFIED (READ ONLY)

Verified against actual current files (`store/services/cart_service.py`, `store/endpoints_tests.py`, `store/template_tests.py`, `store/urls.py`, `store/views.py`, `store/models.py`, `store/untils.py`, `templates/main/cart.html`, `templates/main/product_detail.html`, `templates/main/checkout.html`, `base_main.html`, `static/js/cart.js`, `.venv` Django version `6.0.0`):

- `store/services/cart_service.py`: `CART_SESSION_KEY = "cart_items"`; session stores `{"product_id:color_id": {"quantity": int}}`; `calculate_totals()` computes `subtotal`, `shipping` (`0`), `tax` (`tax_percent` applied after discount), `discount` (parameter `default=Decimal("0")`); `get_coupon_code()`, `set_coupon_code()`, `clear_coupon_code()` manage `request.session["cart_coupon_code"]`.
- `store/endpoints_tests.py`: 9 endpoint tests (add/update/remove/state/cart page/CSRF/method) pass; `GET /cart/state/` contract verified (`success`, `badge`, `lines_count`, `items_count`, `subtotal`, `discount`, `shipping`, `tax`, `total`, `items`, `warnings`).
- `store/template_tests.py`: 6 template tests pass (`cart_items` loop, empty state, subtitle, accessibility hooks).
- `store/urls.py`: `cart`, `cart_add`, `cart_update`, `cart_remove`, `cart_state` URLs exist.
- `store/views.py`: `cart_show` passes full context (`cart_items`, `badge`, `subtotal`, `discount`, `shipping`, `tax`, `total`, `lines_count`, `warnings`); endpoints return consistent JSON contracts (`success`, `message`, `badge`, `subtotal` as string `.2f`, etc.). Note: `store/views.py` contains a duplicate `cart_show` definition (line 620 empty; line 693 updated). This is a pre-existing discrepancy reported in TASK 19 audit but NOT fixed here (scope restriction: audit/design only).
- `store/untils.py`: `STATUS_CHOICES`: `-1` Cancel, `0` Pending Pay, `1` approved, `2` shipped, `3` delivered.
- `store/models.py`: `OrderItem` fields: `id`, `order`, `product`, `quantity`. **No `price` field. No `color` reference.** `SettingSite.load()` shows `free_shipping_threshold` = `Decimal("100.00")`, `tax_percent` = `Decimal("10.00")`, `enable_coupon` = `True`, `enable_discount_code` = `True`, `enable_guest_checkout` = `True`.

---

## 2. OVERALL ARCHITECTURE GOAL

**Type:** Design / Audit only.
**Scope:** Design a minimal, safe `Coupon` model and coupon integration that fits the existing session-based cart architecture without redesigning unrelated components.
**Constraints:**
- `session` remains temporary (`cart_items`: identity + quantity; no price snapshot).
- `Coupon` must integrate with existing `calculate_totals()` (accept `discount` parameter).
- `Coupon` validation must use database (`Coupon` model), never trust client-submitted amounts.
- `Checkout` must re-validate coupon before `Order` creation.
- `Guest checkout` (`enable_guest_checkout`) implies coupon works for both anonymous and authenticated users.
- `SettingSite.enable_coupon` (`True`) confirms coupon functionality is intended.

---

## 3. CURRENT DISCOUNT INFRASTRUCTURE (VERIFIED)

**Product-level discount (`Product` model):**
- `price`: `PositiveIntegerField` (`100` in audit test).
- `discount_price`: `PositiveIntegerField` (`null=True`, `blank=True`).
- `final_price` property: `self.discount_price or self.price`.
- `has_discount`: `discount_price is not None and discount_price < price`.
- `discount_percent`: `int(((price - discount_price) / price) * 100)`.
- `is_discounted`: alias for `has_discount`.

**Cart-level settings (`SettingSite` model):**
- `enable_coupon`: `True`.
- `enable_discount_code`: `True`.
- `free_shipping_threshold`: `Decimal("100.00")` (actual DB value verified).
- `tax_percent`: `Decimal("10.00")` (actual DB value verified — important for coupon design: tax applies after discount).
- `enable_guest_checkout`: `True`.

**No `Coupon` model:** Confirmed (`store/models.py` has no `Coupon` class). `store/admin.py` has no `CouponAdmin`. `store/forms.py` has no coupon form.

**No coupon endpoint logic:** Confirmed (`store/views.py` has no coupon endpoint; only references to `discount` in endpoint response assembly and `_serialize_money`). `store/urls.py` has no `cart/coupon/` URL.

**No coupon session logic beyond readiness:** Confirmed (`cart_service.py` has `get_coupon_code()`, `set_coupon_code()`, `clear_coupon_code()` managing `request.session["cart_coupon_code"]` — no validation logic; no `Coupon` reference).

---

## 4. DISTINCTION: PRODUCT DISCOUNT VS CART-LEVEL COUPON

**Product-level discount (`Product` / `final_price`):**
- Applied at product level (`discount_price` field).
- Already reflected in `final_price` property.
- No session storage needed (`final_price` read at resolution time).
- Discount amount = `price - discount_price` (computed from DB).

**Cart-level Coupon (`Coupon` / session `cart_coupon_code`):**
- Applied to cart subtotal (after product-level discounts), not per product.
- Must be validated independently (`is_active`, date range, usage limits, `min_subtotal`).
- Must not duplicate product-level discounts (no double discounting).
- Session only stores `cart_coupon_code` (`str`); `discount` amount computed by server at `calculate_totals()` time.
- Checkout must capture final `subtotal`, `discount`, `tax`, `shipping`, `total` into `Order`/`OrderItem`.

**Critical finding:** The current `calculate_totals()` accepts `discount` parameter (`Decimal`, default `0`). This confirms the architecture is ready for coupon integration: the service expects an external validated `discount` value to be passed in. The coupon layer (view/service) must validate `Coupon` model, compute `discount`, and pass it to `calculate_totals()`.

---

## 5. BUSINESS REQUIREMENTS DISCOVERY (CLASSIFIED BY EVIDENCE)

Based on actual project evidence (`SettingSite.enable_coupon = True`, `SettingSite.enable_discount_code = True`, `free_shipping_threshold = 100.00`, `tax_percent = 10.00`, `enable_guest_checkout = True`, `store/services/cart_service.py` `calculate_totals()` design):

| Feature | Evidence | Classification |
|---|---|---|
| Basic coupon model (`Coupon`) | `enable_coupon` = `True`; no model exists | **REQUIRED NOW** (minimum to support any coupon feature) |
| Code field (`CharField`) | Standard coupon architecture; `SettingSite.enable_discount_code` implies text code input | **REQUIRED NOW** |
| Active/inactive (`is_active`) | Standard; allows quick disable | **REQUIRED NOW** |
| Normalization (`uppercase`, whitespace trim) | No existing convention; safe practice | **REQUIRED NOW** |
| Uniqueness (`unique=True` on code) | Prevent duplicate codes; standard | **REQUIRED NOW** |
| Percentage discount (`Decimal` or `IntegerField`) | Common; fits existing `tax_percent` (`Decimal`) and `free_shipping_threshold` (`Decimal`) | **REQUIRED NOW** (primary discount type) |
| Fixed amount discount | Common alternative; but no existing reference | **SHOULD HAVE** (add `discount_amount` field; allows both types) |
| Valid from / to (`valid_from`, `valid_until`) | Standard coupon lifecycle; no existing reference but safe design | **SHOULD HAVE** |
| Minimum subtotal (`min_subtotal`) | `free_shipping_threshold` exists; standard for coupons; fits `calculate_totals()` logic | **SHOULD HAVE** (critical for safe integration with `free_shipping_threshold`) |
| Maximum discount (`max_discount`) | Safety cap; common; prevents excessive discounts | **SHOULD HAVE** |
| Usage limit (`usage_limit`) | Standard; allows controlling promotion extent | **FUTURE** (not strictly required for basic coupon functionality) |
| Per-user usage limit (`per_user_limit`) | Would require linking to `PersonUser`/`Customer`; complex given anonymous guests (`enable_guest_checkout`); not required for basic coupon | **FUTURE** |
| Guest usage tracking | `enable_guest_checkout` implies anonymous users must use coupons; tracking requires session key or database link; basic coupon works without per-user tracking for guests | **FUTURE** |
| Product/category exclusions | No existing model references; could be added later | **FUTURE** |
| Coupon stacking (`multiple coupons`) | No existing architecture; adds complexity; not required for minimal first phase | **NOT NEEDED** |
| First-order restriction | No evidence in existing architecture | **NOT NEEDED** |
| Customer/authenticated-only restriction | `enable_guest_checkout` = `True`; basic coupon must work for guests | **NOT NEEDED** (must support both) |

**Evidence-based recommendation:** The minimal production-safe coupon architecture needs a `Coupon` model with: `code` (`CharField`, `unique`), `is_active` (`default=True`), `discount_percent` (`PositiveIntegerField` or `DecimalField`), `discount_amount` (`DecimalField` or `PositiveIntegerField` — optional for fixed amount), `valid_from` / `valid_until` (`DateTimeField`, nullable/default current time or future), `min_subtotal` (`DecimalField`, `default=0` — aligns with `free_shipping_threshold`), `usage_limit` (`PositiveIntegerField`, `default=1` or `null` if unlimited). Given the user's instructions say `Should have` features can be included if justified, I'll include them in the design but note which are required vs future.

---

## 6. RECOMMENDED COUPON MODEL (DESIGN ONLY — NOT CREATED)

Given the evidence (`enable_coupon`, `tax_percent`, `free_shipping_threshold`, session-based cart, no database cart), the minimal safe model design is:

```python
class Coupon(models.Model):
    code = models.CharField(max_length=50, unique=True, db_index=True)
    # Discount can be either percentage or fixed amount.
    # Design choice: support both with separate fields; only one active per coupon.
    discount_percent = models.PositiveIntegerField(default=0)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0"))
    # Validation rules (to be implemented in service/view):
    # At least one of discount_percent or discount_amount must be > 0.
    # If both are > 0, behavior must be defined (recommended: percentage takes precedence, or error).
    # For minimal first phase: recommend using only one type (percentage preferred).

    is_active = models.BooleanField(default=True)
    valid_from = models.DateTimeField(null=True, blank=True)
    valid_until = models.DateTimeField(null=True, blank=True)
    min_subtotal = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal("0")
    )
    max_discount = models.DecimalField(
        max_digits=10, decimal_places=2,
        default=Decimal("1000000"),  # Very high cap; 0 or negative means no cap.
        null=True, blank=True,
        help_text="Maximum discount amount. 0 or null means no cap."
    )
    usage_limit = models.PositiveIntegerField(
        default=1, null=True, blank=True,
        help_text="Global usage limit. None = unlimited."
    )
    usage_count = models.PositiveIntegerField(default=0)
    # Per-user limit could be added later (future).

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-is_active", "code"]
        indexes = [
            models.Index(fields=["is_active", "code"]),
        ]

    def clean(self):
        super().clean()
        # At least one discount type must be positive.
        if self.discount_percent <= 0 and self.discount_amount <= Decimal("0"):
            from django.core.exceptions import ValidationError
            raise ValidationError("At least one of discount_percent or discount_amount must be positive.")
        # Max discount must be >= 0 (if set).
        if self.max_discount is not None and self.max_discount < Decimal("0"):
            from django.core.exceptions import ValidationError
            raise ValidationError("max_discount must be non-negative.")

    def __str__(self):
        return f"Coupon: {self.code}"
```

**Field explanations:**
- `code`: `CharField`, `unique=True`. Normalized to uppercase/trimmed whitespace at lookup time (recommended; not enforced by DB index but by lookup logic).
- `discount_percent`: `PositiveIntegerField` (0–100 typically, though > 100 allowed; validation in view layer should cap or reject > 100 for percentage if business requires).
- `discount_amount`: `DecimalField`, default `0`. Allows fixed discounts.
- `is_active`: quick disable/re-enable.
- `valid_from` / `valid_until`: date window. `valid_until` can be `None` (no expiration) or future.
- `min_subtotal`: aligns with `free_shipping_threshold`. `DecimalField` ensures safe arithmetic with subtotal (`Decimal`).
- `max_discount`: cap on percentage discount (e.g., 20% off but max `$50`). `DecimalField`. `0` or `null` means no cap.
- `usage_limit`: `PositiveIntegerField`. `None` (or `blank=True`) means unlimited. `1` means single-use.
- `usage_count`: incremented transactionally at checkout.
- `clean()`: validates at least one positive discount and non-negative max discount.

**No migrations created. No database table created.** This is design only.

---

## 7. COUPON CODE RULES (DESIGN)

**Normalization (recommended for lookup):**
- Before lookup: `code = request.POST.get("code", "").strip().upper()`.
- Lookup uses normalized `code` against `Coupon.objects.filter(code=normalized_code, is_active=True)`.
- `CharField` stores original input; normalization done at lookup time (not enforced at DB level, to allow case-insensitive lookup without changing user input display; `unique=True` ensures uniqueness of exact input, but normalization handles lookup variations).
- Alternative: enforce uppercase at save (`clean` or `save` method). Recommended but optional for first phase.

**Allowed characters:** Alphanumeric (`A–Z`, `0–9`), underscore, hyphen. Recommended `max_length=50`. Validation: `^[A-Z0-9_-]+$` at lookup time (optional; not strictly required for basic functionality).

**Empty code:** `POST /cart/coupon/` with empty `code` (`""`) should return `success: False`, `message: "Please enter a coupon code."`.

---

## 8. DISCOUNT TYPE DESIGN (PERCENTAGE + FIXED AMOUNT)

Given the minimal first-phase recommendation and the existing `tax_percent` (`DecimalField`), percentage is preferred for consistency.

**Calculation rules (design only):**
- If `discount_percent > 0`: `discount = (subtotal * discount_percent) / 100`.
- If `max_discount` set (`> 0`): `discount = min(calculated_discount, max_discount)`.
- If `discount_amount > 0`: `discount = min(discount_amount, subtotal)` (fixed amount capped at subtotal; discount never exceeds subtotal).
- If both `discount_percent > 0` and `discount_amount > 0`: recommend error or precedence rule. Design recommendation: only one active at a time; if both positive, return validation error (`"Coupon must use either percentage or fixed amount, not both."`).
- `min_subtotal`: `subtotal` (before discount) must be `>= min_subtotal` for coupon to apply. If not met: `success: False`, `message: "Subtotal does not meet minimum requirement."`, `discount` remains `0`.

**No double discounting:** `Product.final_price` already includes `Product.discount_price` (if any). The coupon applies to `subtotal` (sum of `final_price * quantity`), so product discounts are already included in the base. No additional reduction needed for product-level discounts.

**Tax interaction:** Tax applies to `(subtotal - discount)` (as approved in TASK 13 architecture, with `tax_percent = 10.00` verified in DB). The design keeps this order: tax after discount.

---

## 9. MINIMUM SUBTOTAL DESIGN

Given `free_shipping_threshold` (`Decimal("100.00")`), the minimum subtotal field aligns naturally:
- `min_subtotal`: `DecimalField` (`default=Decimal("0")`).
- Validation: `if (subtotal - discount) < min_subtotal`? Or `subtotal < min_subtotal`?

Standard practice: `min_subtotal` applies to the cart subtotal (before or after product-level discounts? Standard: before coupon discount). Given the existing architecture (`subtotal` = sum of `final_price`), recommend: `subtotal` (before coupon) must be `>= min_subtotal`. The coupon discount then applies to the subtotal.

If business requires minimum after product discounts: since product discounts are already in `final_price`, `subtotal` is already post-product-discount. So `min_subtotal` applies naturally to `subtotal`.

Design: `min_subtotal` compared to `subtotal` (current server-authoritative subtotal from `calculate_subtotal()`).

---

## 10. MAXIMUM DISCOUNT DESIGN

Given the first-phase design includes `max_discount` (`DecimalField`, `default=Decimal("1000000")`, `null=True`, `blank=True`):

- If `max_discount` is `None` or `0`: no cap.
- If `max_discount > 0`: cap applies to percentage discount (`min(calculated_discount, max_discount)`).
- Fixed amount (`discount_amount`) is naturally capped by `min(discount_amount, subtotal)` (cannot exceed subtotal).
- Design recommendation: cap applies only to percentage-based discounts (most common use). Fixed amount discounts don't need a cap beyond subtotal.

---

## 11. VALIDITY / ACTIVE STATE DESIGN

Validation sequence (`POST /cart/coupon/`) — design only:

1. Read `request.POST.get("code", "").strip()`.
2. If empty: return error.
3. Normalized code lookup: `Coupon.objects.filter(code__iexact=normalized_code, is_active=True)` or `filter(code=normalized_code, is_active=True)` depending on normalization strategy.
4. Check `valid_from`: if set and `now < valid_from`: return error (`"Coupon is not yet valid."`).
5. Check `valid_until`: if set and `now > valid_until`: return error (`"Coupon has expired."`).
6. Check `min_subtotal`: compare to current `subtotal` (`calculate_subtotal(request)`). If `subtotal < min_subtotal`: return error (`"Subtotal does not meet minimum requirement ($...)"` or generic message).
7. Check `usage_limit`: `usage_count < usage_limit`. If reached: return error (`"Coupon usage limit reached."`).
8. Check `max_discount`: apply cap to calculated percentage discount.
9. If all valid: store normalized code in session (`request.session["cart_coupon_code"] = normalized_code`). Return `success: True`, `message`, `coupon_applied`, `discount`, updated totals.

No endpoint implemented. No `Coupon` model created.

---

## 12. USAGE LIMITS / TRACKING (DESIGN)

Given the minimal first-phase recommendation:

- `usage_limit`: `PositiveIntegerField` (`default=1`, `null=True`, `blank=True`).
  - `None` or `blank=True` means unlimited.
  - `1` means single-use.
  - `> 1` means multi-use with a cap.
- `usage_count`: `PositiveIntegerField` (`default=0`).
- Usage increment: must occur transactionally at checkout (`checkout_view` future, not implemented here). The design recommends incrementing `usage_count` only when `Order` is successfully created and `is_paid` remains `False` initially? Or at the point of checkout confirmation? Standard: increment when coupon is redeemed (checkout completed). Given the architecture (guest checkout allowed), usage tracking for guests is complex (requires session-based tracking without user association). For the minimal first phase:
  - Usage tracking (`usage_limit` / `usage_count`) applies to all users, but `per-user` tracking is deferred (`FUTURE`).
  - `usage_count` increments at checkout order creation (transactionally, with `transaction.atomic()`).
  - If checkout fails, `usage_count` does not increase.
  - If `usage_limit` is `None`: no tracking needed (`usage_count` remains `0` or not checked).

---

## 13. SESSION STORAGE (DESIGN ONLY)

As approved in TASK 13 architecture and verified in `store/services/cart_service.py`:

- Session key: `request.session["cart_coupon_code"]` (`str` or `None`).
- Only the coupon `code` stored. No `discount_amount`, `subtotal`, `total`, `tax`, `shipping`, or `percentage` snapshot stored in session.
- `calculate_totals(request, discount=...)` accepts `discount` parameter. The view (`cart_show`, endpoint responses) passes the validated `discount` value (computed from `Coupon` model at request time, not from session) to `calculate_totals()`.
- If coupon is invalid at any point (`POST /cart/add/` doesn't use coupon; `GET /cart/` re-validates if session has `cart_coupon_code`), the `calculate_totals()` should treat `discount` as `0`.
- The `cart_show` view currently passes `totals.get("discount")` (always `0` because no `Coupon` model exists). Once `Coupon` is implemented, `cart_show` should read `get_coupon_code(request)`, validate it, compute `discount`, and pass it to `calculate_totals()`.

---

## 14. VALIDATION LAYER (DESIGN — NOT IMPLEMENTED)

Given the minimal design recommendation (`Coupon` model + basic validation + session storage):

The validation layer should be a dedicated service or view-level function. Given the existing `store/services/cart_service.py` structure, the recommended approach is:

Option A (recommended for minimal phase):
- Add `store/services/cart_service.py`: `validate_coupon(request, code)` → `(is_valid: bool, coupon: Coupon or None, message: str)`.
- Add `store/services/cart_service.py`: `apply_coupon_to_totals(request, totals_dict, coupon)` → updates `discount` in totals.
- Modify `cart_show` (`store/views.py`) to read session coupon code, validate, and pass `discount` to `calculate_totals()`.
- Modify endpoint responses (`add_to_cart_view`, etc.) to include validated `discount` if session has coupon code.

Option B (alternative):
- Create `store/services/coupon_service.py` (separate service layer). Over-engineered for minimal phase.

**Recommendation:** Option A. Use existing `cart_service.py`. No separate coupon service needed for minimal phase.

---

## 15. CART TOTAL PIPELINE WITH COUPON (DESIGN)

Updated pipeline (future implementation):

```
Session cart items (identity + quantity)
↓
Resolve Product / ProductColor (DB)
↓
Validate availability / stock
↓
Calculate subtotal (final_price * quantity)
↓
Read session coupon code (cart_coupon_code)
↓
Validate Coupon (exists, active, dates, min_subtotal, usage_limit)
↓
Calculate discount (percent or fixed, capped by max_discount)
↓
Calculate tax ((subtotal - discount) * tax_percent / 100)
↓
Calculate shipping (0 if subtotal >= free_shipping_threshold; else 0 — no paid price exists; future change if paid price added)
↓
Calculate total (subtotal - discount + shipping + tax)
```

This aligns exactly with the existing `calculate_totals()` pipeline (`subtotal`, `discount` parameter, `shipping`, `tax`, `total`).

---

## 16. PRODUCT DISCOUNT + COUPON INTERACTION (DESIGN — CRITICAL)

Given the verified `Product` model (`final_price` = `discount_price or price`; `discount_percent` computed from `price` and `discount_price`):

**Rule (recommended design):**
- `subtotal` = `sum(final_price * quantity)` for each validated item.
- `final_price` already includes `Product.discount_price` (if any).
- `Coupon` discount applies to `subtotal` (post-product-discount).
- No double discounting (product discount not removed or reduced by coupon; coupon applies to final price).
- Example: Product (`price=200`, `discount_price=150`, `final_price=150`) + Coupon (`20%` off `subtotal`) → `subtotal=150`, `discount=30` (`20%` of `150`), `tax` on `120`, `total=120 + shipping + tax`.

**No conflict:** The service does not need to distinguish between product discount and coupon discount for `subtotal` calculation; it uses `final_price` (already discounted) as the base. This avoids double-discounting errors.

---

## 17. SHIPPING INTERACTION WITH COUPON (DESIGN)

Given the verified `SettingSite` (`free_shipping_threshold`: `Decimal("100.00")`):

- Shipping calculation uses `subtotal` (before coupon discount) or `(subtotal - discount)`?
- Standard practice: shipping thresholds usually apply to the pre-coupon subtotal (`subtotal` before discount) or post-coupon (`subtotal - discount`).
- Given no explicit business rule exists, recommend the safer default: `shipping` applies to `subtotal` (before coupon discount), because coupons are promotions and shipping thresholds are independent logistics rules.
- Alternative: apply to `(subtotal - discount)` if business prefers to reward coupon use with free shipping.

**Design recommendation (minimal phase):**
- `free_shipping_threshold` compared to `subtotal` (before discount) for simplicity and independence.
- Once `Coupon` model exists, the endpoint/view can easily adjust the comparison base (`subtotal` vs `subtotal - discount`) without changing the service layer (`calculate_totals()` accepts `subtotal` and `discount` separately).

---

## 18. TAX INTERACTION WITH COUPON (DESIGN — CRITICAL)

Verified `tax_percent`: `Decimal("10.00")` in DB (`store/services/cart_service_tests.py` and `.venv` Python verification).

Given `calculate_totals()` design (`tax = (subtotal - discount) * tax_percent / 100`):

**Rule:** Tax applies to `(subtotal - discount)` (after coupon discount). This is the standard for most jurisdictions (discount reduces taxable amount). Given no contradictory evidence in the project, this rule is safe.

**Future change:** If jurisdiction requires tax on `(subtotal - discount + shipping)`, the pipeline can be extended (add `taxable_amount` parameter or adjust `tax` calculation) without redesigning the coupon architecture.

---

## 19. APPLY / REMOVE FLOW (DESIGN)

**Apply (`POST /cart/coupon/` — design only):**
1. Read `request.POST.get("code", "").strip()`.
2. If empty: return `400`, `{"success": false, "message": "Please enter a coupon code."}`.
3. Normalized lookup (`code.upper()` recommended; exact match on `Coupon.code`).
4. Validate `Coupon` model (`is_active`, dates, `usage_limit`, `min_subtotal`, `max_discount`).
5. If invalid: return `400`, `{"success": false, "message": "..."}` (specific error message based on failure reason: `"Invalid coupon code."`, `"Coupon has expired."`, `"Coupon not yet active."`, `"Subtotal does not meet minimum ($...)."`, `"Usage limit reached."`).
6. If valid: store `normalized_code` in session (`request.session["cart_coupon_code"] = code`), return `200`, updated totals (`discount` computed from `Coupon`), `message: "Coupon applied."`.

**Remove:**
- Option: `POST /cart/coupon/remove/` (separate endpoint) or `POST /cart/coupon/` with empty `code`.
- Design recommendation: separate endpoint (`/cart/coupon/remove/`) for clarity; or treat empty code submission on `/cart/coupon/` as removal.
- Behavior: clear `request.session["cart_coupon_code"]`, return `success: True`, `message: "Coupon removed."`, totals with `discount: "0.00"`.

---

## 20. INVALID / EXPIRED / USAGE-REACHED BEHAVIOR (DESIGN)

Defined behavior (for future endpoint):

- `Invalid code` (`DoesNotExist`): `success: False`, `message: "Invalid coupon code."`.
- `Inactive` (`is_active == False`): `success: False`, `message: "Coupon is inactive."`.
- `Not yet active` (`valid_from` set, `now < valid_from`): `success: False`, `message: "Coupon is not yet active."`.
- `Expired` (`valid_until` set, `now > valid_until`): `success: False`, `message: "Coupon has expired."`.
- `Subtotal below minimum` (`subtotal < min_subtotal`): `success: False`, `message: "Subtotal does not meet minimum requirement ($...)."` (or generic message if exact amount not required in response).
- `Usage limit reached` (`usage_count >= usage_limit`): `success: False`, `message: "Usage limit reached."`.
- `Maximum discount cap` (if `max_discount` set and `calculated_discount > max_discount`): `discount` capped to `max_discount`; no error (cap is a feature, not a failure). `message` could note cap (`"Maximum discount applied ($...)."`).

---

## 21. CHECKOUT BOUNDARY WITH COUPON (DESIGN)

Updated checkout pipeline (future integration):

1. Read session (`cart_items`, `cart_coupon_code`).
2. Resolve/validate cart items (via `resolve_items()` from service).
3. Read `Subtotal` (`calculate_subtotal()`).
4. Read `Coupon` from session code (`get_coupon_code()`).
5. Validate `Coupon` (re-validate at checkout to prevent stale/expired coupons from being used at checkout time).
6. Calculate `Discount` (`calculate_totals(request, discount=computed_discount)`).
7. Create `Order` (`status=0`, `customer` = user.customer or `None` for guest).
8. Create `OrderItem` (requires future `price` and `color` fields; see TASK 19 audit).
9. Capture `subtotal`, `discount`, `shipping`, `tax`, `total` into `Order.total_price` (after all calculations).
10. If `usage_limit` applies: increment `usage_count` transactionally (`transaction.atomic()` recommended).
11. Clear session (`clear_cart()` + `clear_coupon_code()`).
12. Redirect to `checkout` confirmation or `payment` app.

**No `OrderItem` schema change in this design task.** Only design recommendation (`price` and `color` fields needed for historical integrity).

---

## 22. GUEST USER STRATEGY (DESIGN — VERIFIED FROM PROJECT)

Given `SettingSite.enable_guest_checkout` (`True`) and `Customer.user` (`OneToOne`, nullable not enforced on `Customer` because `Order.customer` allows `null=True`):

- Anonymous users (`request.user.is_authenticated == False`) can apply coupons.
- Session `cart_coupon_code` works independently of user authentication.
- No `per_user_limit` tracking required for basic first-phase coupon (if added in future, tracking would require either session-based tracking or `PersonUser` association; for guests, session tracking would be necessary, which introduces complexity — deferred to future).
- Checkout creates `Order` with `customer=None`. `Coupon` usage is tracked by `usage_count` globally (not per user) in the minimal phase.

---

## 23. AUTHENTICATED USER STRATEGY (DESIGN)

Given `users.PersonUser` (email-based) and `Customer` (`OneToOne`):

- Authenticated users use the same session cart (`request.session["cart_items"]`).
- At checkout, `Order.customer` links to `request.user.customer` (if `Customer` exists; else `None`).
- `Coupon` usage tracking (`usage_count`) applies globally (not per user) in minimal phase. If `per_user_limit` is added in future, it would require `user` FK on `Coupon` usage model (`CouponUsage` or similar).

---

## 24. ADMIN REQUIREMENTS (DESIGN ONLY — NOT IMPLEMENTED)

Given the existing `store/admin.py` patterns (`CategoryAdmin`, `ProductAdmin`, `OrderAdmin`, etc.):

A future `CouponAdmin` could be minimal:

```python
@admin.register(Coupon)
class CouponAdmin(admin.ModelAdmin):
    list_display = ("code", "is_active", "discount_percent", "discount_amount",
                    "valid_from", "valid_until", "usage_limit", "usage_count")
    list_filter = ("is_active",)
    search_fields = ("code",)
```

No admin code created in this task.

---

## 25. DATABASE CONSTRAINTS (DESIGN — NOT IMPLEMENTED)

Recommended constraints for `Coupon` model (future migration):

- `code`: `CharField(max_length=50, unique=True, db_index=True)`.
- `discount_percent`: `PositiveIntegerField(default=0)` (optional cap at `100` recommended via `clean()` or view validation).
- `min_subtotal`: `DecimalField(default=Decimal("0"), max_digits=10, decimal_places=2)`.
- `usage_limit`: `PositiveIntegerField(default=1, null=True, blank=True)` (`None` = unlimited).
- Index: `models.Index(fields=["is_active", "code"])` (speed lookup for active coupons).
- `clean()`: validate at least one positive discount (`percent > 0` or `amount > Decimal("0")`), `max_discount >= 0`, `min_subtotal >= 0`.

No migration created.

---

## 26. DECIMAL / MONEY RULES (DESIGN — ALIGNS WITH EXISTING ARCHITECTURE)

Given `store/services/cart_service.py`: `Decimal` arithmetic (`Decimal(str(current_price)) * Decimal(str(quantity))`), `Decimal("0")` defaults, `Decimal("100.00")` for thresholds, `Decimal("10.00")` for tax.

Coupon design uses `DecimalField` for `discount_amount`, `min_subtotal`, `max_discount`, and `tax_percent` reference remains `Decimal`.

Calculation rules:
- `discount_amount` (fixed): `min(amount, subtotal)`.
- `discount_percent`: `(subtotal * percent) / Decimal("100")` → capped by `max_discount` if set.
- No floating point arithmetic (`float`) used anywhere in coupon or cart calculations.
- `Decimal` preserved through JSON serialization (`_serialize_money()` uses `str` with `.2f` format).

---

## 27. SECURITY RULES (DESIGN — NOT IMPLEMENTED)

Given the architecture (`session` temporary; `Coupon` model authoritative; endpoint validates server-side):

- `POST /cart/coupon/` must read `request.POST.get("code")` only.
- Never read `discount` from `request.POST` or `request.body` (client never submits amount).
- `Coupon` lookup uses normalized `code` against DB (`is_active`, dates, `usage_limit`, `min_subtotal`).
- `calculate_totals()` receives `discount` parameter (validated `Decimal` from service, never from client). Client cannot manipulate `subtotal`, `shipping`, `tax`, or `total` through POST parameters (endpoint ignores them).
- Session `cart_coupon_code` is only for identity (`str`); `discount` value computed by server.
- CSRF protected (`POST` endpoints protected by middleware; `cart.js` must include `X-CSRFToken`).
- `usage_limit`: incremented transactionally at checkout (`transaction.atomic()` recommended); not incremented at coupon apply (only at successful `Order` creation) to prevent usage consumption for failed orders.
- No brute-force protection required beyond Django's standard middleware (optional: rate-limiting or CAPTCHA for excessive `POST /cart/coupon/` attempts; not required for minimal phase).

---

## 28. PERFORMANCE (DESIGN — NOT IMPLEMENTED)

Given the minimal first-phase recommendation:
- `Coupon` lookup: `filter(code=normalized_code, is_active=True)` (indexed on `is_active` + `code`).
- No complex multi-table joins required for basic validation (only `Coupon` table + `UsageCount` if usage tracking added later).
- Session update (`request.session["cart_coupon_code"]`) is lightweight.
- `calculate_totals()` recalculates from session items (`O(n)`) plus `Coupon` lookup (`O(1)` with index).
- No performance concern for typical cart sizes (< 50 items).

---

## 29. FUTURE AJAX CONTRACT (DESIGN — NOT IMPLEMENTED)

Future endpoint (`POST /cart/coupon/`) response contract (designed to align with existing endpoint contracts from TASK 15):

```json
{
  "success": true,
  "message": "Coupon applied.",
  "coupon_code": "SAVE20",
  "coupon_applied": true,
  "badge": 5,
  "lines_count": 2,
  "items_count": 5,
  "subtotal": "5451.00",
  "discount": "545.10",
  "shipping": "0.00",
  "tax": "490.59",
  "total": "4996.49",
  "items": [...],
  "warnings": []
}
```

Future endpoint (`POST /cart/coupon/remove/`) or `POST /cart/coupon/` with empty `code`:

```json
{
  "success": true,
  "message": "Coupon removed.",
  "coupon_applied": false,
  "badge": 5,
  "lines_count": 2,
  "items_count": 5,
  "subtotal": "5451.00",
  "discount": "0.00",
  "shipping": "0.00",
  "tax": "545.10",
  "total": "5996.10",
  "items": [...],
  "warnings": []
}
```

Note: `tax` recalculated based on `subtotal - discount`. `shipping` remains `0` (or applies `free_shipping_threshold` to `subtotal` or `subtotal - discount` depending on future design choice).

---

## 30. FRONTEND BEHAVIOR DESIGN (NOT IMPLEMENTED)

Given the instructions: `cart.js` remains unchanged in this task (`TASK 16` JS layer intact; `TASK 17` JS layer intact; `TASK 17` `handleEmptyState` creates `.empty-cart` dynamically; event delegation preserves `data-cart-key`).

Future `cart.js` behavior for coupon:
- Read `#couponInput` value.
- On button click: `fetch("/cart/coupon/", {method: "POST", headers: {...CSRF...}, body: new URLSearchParams({code: value})})`.
- On response (`success`): update `.summary-row` (`Discount` value changes from `"$0.00"` to `"-$545.10"` or `"-$0.00"` if removed), update `.summary-total` (`Total`), update subtitle (`badge` unchanged by coupon), show `showCartFeedback()` message (`"Coupon applied."` / `"Coupon removed."` / error message).
- If `success: false`: show message (`"Invalid coupon code."` / `"Subtotal does not meet minimum."` / `"Usage limit reached."` etc.).
- If `warnings` array non-empty: display warnings in `.cart-summary` or via temporary notification.

No JavaScript implemented in this audit/design task.

---

## 31. EDGE CASE MATRIX (VERIFIED / DESIGNED)

| # | Scenario | Expected Behavior (Architecture Design) |
|---|---|---|
| 1 | `SettingSite.enable_coupon` = `True`, `Enable_guest_checkout` = `True` | Coupon works for both anonymous and authenticated users (session-based). |
| 2 | Basic `Coupon` (`SAVE20`, `20%` off) | `subtotal` = `sum(final_price * qty)`; `discount` = `subtotal * 20 / 100`; capped by `max_discount` if set. |
| 3 | Basic fixed `Coupon` (`SAVE50`, `amount=50`) | `discount` = `min(50, subtotal)`. If `subtotal` < `50`, `discount` = `subtotal` (no negative total). |
| 4 | `min_subtotal` set (`100`); `subtotal` = `80` | `success: False`, message: `"Subtotal does not meet minimum ($100)."`, `discount` = `"0.00"`. |
| 5 | `min_subtotal` set (`100`); `subtotal` = `150` | `success: True`, `discount` calculated normally. |
| 6 | `valid_until` passed (`now > valid_until`) | `success: False`, message: `"Coupon has expired."`. |
| 7 | `valid_from` future (`now < valid_from`) | `success: False`, message: `"Coupon is not yet active."`. |
| 8 | `is_active` = `False` | `success: False`, message: `"Coupon is inactive."`. |
| 9 | `usage_limit` reached (`usage_count >= 1` for single-use coupon) | `success: False`, message: `"Usage limit reached."`. |
| 10 | Product price changes after coupon applied (`final_price` changes) | `calculate_subtotal()` reads new `final_price`; `discount` recalculated if coupon still valid. No price snapshot issue (session has no price data). |
| 11 | Cart becomes empty after coupon applied (`add_item` then `clear_cart`) | `GET /cart/state/` returns `badge: 0`, `subtotal: "0.00"`, `items: []`, `discount: "0.00"`. Session `cart_coupon_code` remains but doesn't affect totals (no items to discount). |
| 12 | Coupon removed after application (`clear_coupon_code`) | `GET /cart/state/` returns `discount: "0.00"`. Session `cart_coupon_code` cleared. |
| 13 | Guest checkout with coupon (`enable_guest_checkout`) | `POST /cart/add/` and `/cart/coupon/` work for anonymous users. `checkout_page` creates `Order` with `customer=None`. `usage_limit` applies globally (not per user) in minimal phase. |
| 14 | Authenticated user with coupon (`PersonUser`) | Same session-based coupon works. `checkout_page` links `customer` to `request.user.customer`. `usage_limit` applies globally. |
| 15 | Checkout with coupon (`POST /checkout/` future) | `checkout_view` validates coupon (re-reads `Coupon` model), calculates `subtotal`, `discount`, `shipping`, `tax`, `total`, creates `Order` (`status=0`), creates `OrderItem` (with future `price`/`color` fields), clears session (`clear_cart()`, `clear_coupon_code()`), increments `usage_count` (if `usage_limit` set) transactionally (`transaction.atomic()`). |
| 16 | Concurrent redemption (`usage_limit` = `1`, 2 users click simultaneously) | `transaction.atomic()` recommended at checkout; without it, race condition possible. Documented as limitation for minimal phase. |
| 17 | `Product` has `discount_price` (`final_price` = `150`) + Coupon (`20%`) | `subtotal` = `150`; `discount` = `30`; `tax` = `(150 - 30) * 10 / 100` = `12.00`; `total` = `132.00` (plus `shipping`). No double discount. |
| 18 | Empty `POST /cart/coupon/` (`code` missing or `""`) | `success: False`, message: `"Please enter a coupon code."` (or generic `"Invalid coupon code."` if empty string mapped to invalid lookup). |
| 19 | Malformed `code` (`"bad!@#"`) | Lookup fails (`DoesNotExist`); return `success: False`, message: `"Invalid coupon code."`. |
| 20 | Empty cart (`cart_items` empty) with coupon applied (`cart_coupon_code` set but no items) | `subtotal` = `"0.00"`; `discount` = `"0.00"`; `total` = `"0.00"`. Session coupon remains but no effect until items added (or checkout blocked). |
| 21 | `max_discount` cap (`20%` off but max `$50`) on `subtotal` = `$400` | `calculated_discount` = `80`; capped to `50`; `discount` = `50`; `message` could note cap (`"Maximum discount applied ($50)."`). |
| 22 | `max_discount` = `0` (no cap) | `calculated_discount` applied fully; `max_discount` field ignores `0` as cap (treats as no cap or error — design recommendation: `0` or `null` = no cap). |
| 23 | `free_shipping_threshold` (`100.00`) with coupon (`subtotal` after discount `= 80`) | `shipping` = `0` (threshold applies to `subtotal` before discount by design recommendation; if applied to post-discount: `shipping` = `0` since `80 < 100`). Design recommendation: apply threshold to `subtotal` (before discount) for simplicity; document as design choice. |
| 24 | Tax (`tax_percent` = `10.00`) with coupon (`subtotal` = `150`, `discount` = `30`) | `tax` = `(150 - 30) * 10 / 100` = `12.00`. Confirmed by existing `calculate_totals()` design. |

---

## 30. MINIMAL FIRST-PHASE RECOMMENDATION (FINAL DECISION)

Based on verified evidence (`SettingSite`: `enable_coupon=True`, `tax_percent=10.00`, `free_shipping_threshold=100.00`, `enable_guest_checkout=True`; `store/services/cart_service.py`: session-based cart with `calculate_totals()` discount parameter; `store/endpoints_tests.py`: JSON contracts include `discount`; `store/urls.py`: `cart_state` endpoint exists):

**APPROVED MINIMAL FIRST-PHASE COUPON ARCHITECTURE:**

### Required (`REQUIRED NOW`):
- `Coupon` model (new DB table + future migration).
- Fields: `code` (`CharField` unique), `is_active` (`default=True`), `discount_percent` (`PositiveIntegerField`), `valid_from`/`valid_until` (`DateTimeField` nullable), `min_subtotal` (`DecimalField` default `0`), `max_discount` (`DecimalField` default `1000000` or `null` for no cap).
- Normalization (`strip().upper()` at lookup; optional `clean()` enforcing uppercase save).
- Validation layer (`service/view`): check active, dates, `usage_limit`, `min_subtotal`, compute `discount`, cap by `max_discount`.
- Session storage (`request.session["cart_coupon_code"]` — `str` or `None`).
- Endpoint (`POST /cart/coupon/` — new but NOT implemented in this audit; design approved).
- Integration with `cart_service.py`: `calculate_totals()` accepts `discount` parameter; `cart_show` passes validated `discount`; endpoint responses include `discount`.
- Checkout integration (`checkout_view` future): validate coupon (re-check DB), calculate totals, create `Order`/`OrderItem`, increment `usage_count` transactionally, clear session coupon.

### Should Have (`SHOULD HAVE`) — can be included in minimal phase without over-engineering:
- `discount_amount` (`DecimalField`) — allows fixed amount coupons alongside percentage.
- `usage_limit` (`PositiveIntegerField`, `default=1`, `null=True`, `blank=True`).
- `usage_count` (`PositiveIntegerField`, `default=0`).
- `clean()` validation: at least one positive discount (`percent > 0` or `amount > 0`), `max_discount >= 0`, `min_subtotal >= 0`.

### Future (`FUTURE`) — deferred to later architecture phases:
- `per_user_limit` (requires user association or session tracking for guests).
- `CouponUsage` model (per-user/per-guest usage tracking beyond global count).
- Product/category exclusions.
- Coupon stacking.
- Rate-limiting / brute-force protection (optional middleware).
- Advanced frontend (real-time coupon input with validation feedback, not basic POST form).

### Not Needed (`NOT NEEDED`) — explicitly excluded:
- Coupon model modifications to `Product` (no `coupon` FK needed).
- Complex multi-table joins (only `Coupon` table needed for basic validation).
- `cart_service.py` rewrites (current `calculate_totals()` already supports `discount` parameter).
- `cart.html` redesign (minimal coupon input/button sufficient for basic functionality).

---

## 31. IMPLEMENTATION ROADMAP (DESIGN ONLY — NOT IMPLEMENTED)

Proposed sequence for Coupon architecture implementation (
future tasks, not started):

1. **TASK 21 — Coupon Model & Migration:** Create `store/models.py` `Coupon`; add migration (`store/migrations/`). Create basic fields (`code`, `discount_percent`, `discount_amount`, `is_active`, `valid_from`, `valid_until`, `min_subtotal`, `max_discount`, `usage_limit`, `usage_count`).
2. **TASK 22 — Coupon Service Layer (`store/services/cart_service.py` or new `store/services/coupon_service.py`):** Add `validate_coupon(code)`, `calculate_coupon_discount(subtotal, coupon)`, `apply_coupon_to_totals(request, totals_dict, coupon)`, `clear_coupon(request)`.
3. **TASK 23 — Coupon Endpoint (`store/urls.py` + `store/views.py`):** `POST /cart/coupon/` (form-encoded `code`). Returns JSON contract (`success`, `message`, `coupon_code`, `badge`, `subtotal`, `discount`, `shipping`, `tax`, `total`, `items`, `warnings`). `GET /cart/state/` already provides full state; `POST /cart/coupon/remove/` or empty code removal handled separately.
4. **TASK 24 — Cart Template Update (`templates/main/cart.html`):** Add coupon feedback message container (`{% if warnings %}` or dedicated coupon status block), ensure `id="couponInput"` works with endpoint (already present from TASK 16).
5. **TASK 25 — Cart JavaScript (`static/js/cart.js`):** Connect coupon input/button to `/cart/coupon/` endpoint (`fetch()` POST with `key` not needed; `body: new URLSearchParams({code: value})`). Update `.summary-row` (`Discount`) from response. Show `showCartFeedback()` for valid/invalid/expired/usage-reached messages.
6. **TASK 26 — Checkout Integration (`store/views.py`):** Modify `checkout_page` (`POST`) to read session coupon code, validate `Coupon`, pass `discount` to `calculate_totals()`, include `discount` in `Order.total_price`, create `OrderItem` with future `price`/`color` fields, increment `usage_count` transactionally (`transaction.atomic()`), clear session coupon.

No implementation performed in TASK 20.

---

## 32. NO-GO / GO DECISION

**Decision: GO** — The architecture is clear, minimal, and safe. The existing session-based cart (`cart_service.py`), endpoint contracts (`endpoints_tests.py`), template hooks (`cart.html`), and settings (`SettingSite`) provide a solid foundation for Coupon integration. The only open design questions (`shipping` interaction with `free_shipping_threshold`, `tax_on_shipping` future flag, `per_user_limit` tracking) are clearly documented and deferred to future phases without blocking minimal implementation.

**Critical design finding (not a blocker):** The actual `SettingSite` DB values (`free_shipping_threshold` = `Decimal("100.00")`, `tax_percent` = `Decimal("10.00")`) differ from the model defaults (`0`). The coupon architecture accounts for these actual values correctly (`calculate_totals()` uses `Decimal` arithmetic, `shipping` compares `subtotal` against threshold, `tax` applies `10%` to `(subtotal - discount)`). The design notes that `shipping` applies to `subtotal` (before discount) for simplicity; if business rules change this, the pipeline allows easy adjustment.

---

## 33. OPEN QUESTIONS / AMBIGUITIES

- **Shipping interaction:** Should `free_shipping_threshold` apply to `subtotal` (before discount) or `(subtotal - discount)`? Recommended: `subtotal` (before discount) for independence; document as design choice.
- **Tax interaction:** Should tax apply to `(subtotal - discount)` or `(subtotal - discount + shipping)`? Recommended: `(subtotal - discount)` (no shipping tax by default); document as design choice.
- `OrderItem` schema gap (`price`, `color` fields) remains. Required for complete checkout/order history. This is documented in TASK 19 audit and remains unaddressed. Must be resolved before checkout/order history can fully preserve purchase price and selected variant.
- `Per-user usage tracking`: Not required for minimal phase (global `usage_limit` only). If future business requires per-user tracking, a separate `CouponUsage` model (with `user` FK or session tracking for guests) must be designed.
- `Product.detail` (`addToCartFeedback`) remains disconnected from `/cart/add/`. This is out of scope for TASK 20 but must be completed in a future Product Detail integration task (`TASK 18` or equivalent).
- `cart.html` coupon input (`id="couponInput"`) exists but no endpoint handles it (`/cart/coupon/` not implemented). This is expected and reserved for future Coupon endpoint implementation.

---

## 34. FINAL DECISION SUMMARY (APPROVED MINIMAL FIRST PHASE)

- **New DB model (`Coupon`)**: Required (`REQUIRED NOW`).
- **Fields**: `code`, `is_active`, `discount_percent`, `discount_amount` (`SHOULD HAVE` — allows both types), `valid_from`/`valid_until` (`SHOULD HAVE`), `min_subtotal` (`SHOULD HAVE` — aligns with `free_shipping_threshold`), `max_discount` (`SHOULD HAVE`), `usage_limit` (`SHOULD HAVE` — allows future tracking), `usage_count` (`SHOULD HAVE` — required for `usage_limit` tracking).
- **No `CouponUsage` table** (`FUTURE`).
- **No product exclusions**, **no category exclusions** (`FUTURE`).
- **No per-user tracking** (`FUTURE`).
- **No stacking** (`NOT NEEDED` for minimal phase).
- **Session storage**: `request.session["cart_coupon_code"]` (`str` or `None`). Only identity, no computed amount.
- **Validation**: `service/view` validates `Coupon` model (`is_active`, dates, `usage_limit`, `min_subtotal`, `max_discount`).
- **Calculation**: `calculate_totals()` receives validated `discount` (`Decimal`). Tax = `(subtotal - discount) * tax_percent / 100`. Shipping applies to `subtotal` (before discount) — design choice documented.
- **Checkout integration**: `checkout_view` validates coupon, calculates totals, creates `Order` (`status=0`), creates `OrderItem` (with future `price`/`color` fields needed), increments `usage_count` transactionally, clears session coupon.
- **Guest/authenticated**: Both supported (`enable_guest_checkout` = `True`). Anonymous checkout uses session coupon; `customer` = `None` for `Order`.
- **Future endpoint design (`POST /cart/coupon/`):** Form-encoded (`request.POST.get("code")`). Returns consistent JSON contract aligned with existing endpoint responses (`success`, `message`, `badge`, `subtotal`, `discount`, `shipping`, `tax`, `total`, `items`, `warnings`).

---

## 35. FINAL RESPONSE SUMMARY (ENGLISH ONLY)

TASK 20 audit complete (`TASK_20_COUPON_ARCHITECTURE_REPORT.md`: written, English only).

**Audit decision:** `GO` — Coupon architecture approved for minimal first-phase implementation.

**Key verified facts:**
- `SettingSite.load()`: `enable_coupon` = `True`, `tax_percent` = `Decimal("10.00")`, `free_shipping_threshold` = `Decimal("100.00")`, `enable_guest_checkout` = `True`.
- `store/services/cart_service.py`: session structure (`cart_items`), no price snapshot, `calculate_totals()` accepts `discount` parameter, coupon session helpers (`get_coupon_code`, `set_coupon_code`, `clear_coupon_code`) ready.
- `store/endpoints_tests.py`: endpoint contracts verified (`success`, `message`, `badge`, `subtotal`, `discount`, `shipping`, `tax`, `total`, `items`, `warnings`).
- `store/models.py`: `ProductColor.stock` (`PositiveIntegerField`), `Product.final_price`, `SettingSite` fields, `OrderItem` lacks `price`/`color` (documented gap).
- No `Coupon` model exists; no coupon endpoint exists (`store/urls.py`); no coupon logic in `store/views.py`; `cart.html` coupon input exists (`id="couponInput"`) but no backend connection.

**Critical design finding (no blocker):** The actual `SettingSite` DB values (`tax_percent` = `10.00`, `free_shipping_threshold` = `100.00`) differ from model defaults (`0`). The coupon architecture accounts for these actual values correctly (`tax` applies `10%`, `shipping` compares against `100.00` threshold — design recommends applying threshold to `subtotal` before discount for simplicity; document as design choice).

**No production files modified.** Only `TASK_20_COUPON_ARCHITECTURE_REPORT.md` created (temporary audit file). `store/services/cart_service.py`, `store/endpoints_tests.py`, `store/template_tests.py`, `store/urls.py`, `store/views.py`, `store/models.py`, `templates/main/cart.html`, `checkout/`, `payment/`, `users/`, migrations unchanged.

Task 20 stops. No TASK 21 (Coupon model/endpoint implementation) started.
