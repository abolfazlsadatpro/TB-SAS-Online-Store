"""
Cart Service Layer — Session-based temporary cart.

No HTTP logic. No HTML generation. No AJAX contracts.
Only business logic: session resolution, validation, calculation,
item management, badge/line counts, and stale-data cleanup.

Architecture (TASK 13 approved):
- Session key: request.session["cart_items"]
- Session format (per item):
    {
        "42:5": {"quantity": 2},
        "99:0": {"quantity": 1}
    }
- Composite key: "{product_id}:{color_id}" where color_id = 0 means no color.
- Database is the source of truth for price, stock, availability.
- No price snapshot stored in session.
- No Coupon model used in this layer (ready for future integration via
  session coupon code only, not computed discount).
"""

from decimal import Decimal
from django.db import models

from store.models import Product, ProductColor, SettingSite

# ------------------------------------------------------------------
# Session constants
# ------------------------------------------------------------------
CART_SESSION_KEY = "cart_items"

# ------------------------------------------------------------------
# Internal helpers — key generation / parsing
# ------------------------------------------------------------------


def _make_key(product_id, color_id):
    """Build a consistent composite session key."""
    # color_id is normalized: integer id, or 0 when None / no selection.
    color_str = "0" if (color_id is None or color_id == 0) else str(int(color_id))
    return f"{int(product_id)}:{color_str}"


def _parse_key(key):
    """Parse a session key safely. Returns (product_id, color_id) or (None, None)."""
    try:
        raw = str(key)
        if ":" not in raw:
            return None, None
        parts = raw.split(":")
        if len(parts) != 2:
            return None, None
        product_id = int(parts[0])
        color_str = parts[1]
        color_id = None if color_str == "0" else int(color_str)
        return product_id, color_id
    except (ValueError, TypeError, IndexError, AttributeError):
        return None, None


# ------------------------------------------------------------------
# Internal — session reading with safety
# ------------------------------------------------------------------


def _get_session_cart(request):
    """Safely read the session cart dictionary. Never raises."""
    session = getattr(request, "session", None)
    if session is None:
        return {}
    cart = session.get(CART_SESSION_KEY)
    if isinstance(cart, dict):
        return cart
    # Corrupted / unexpected type — reset safely.
    session[CART_SESSION_KEY] = {}
    return session[CART_SESSION_KEY]


def _set_session_cart(request, cart_dict):
    """Write back the session cart and mark session modified."""
    session = getattr(request, "session", None)
    if session is not None:
        session[CART_SESSION_KEY] = cart_dict
        if hasattr(session, "modified"):
            session.modified = True


# ------------------------------------------------------------------
# Internal — validation / resolution pipeline
# ------------------------------------------------------------------


def _resolve_items(request):
    """
    Resolve session items into validated database objects.

    Returns a tuple:
        (resolved_items, warnings, cleaned_session_dict)

    - resolved_items: list of dicts with resolved Product / ProductColor,
      validated quantity, line_subtotal.
    - warnings: list of strings describing stale/removal events.
    - cleaned_session_dict: session dict after removing invalid entries
      and applying stock adjustments.

    Rules applied (TASK 13 architecture):
      1. Product must exist, be active, and be available.
      2. If color_id != 0: ProductColor must exist, belong to the product,
         and have stock > 0 for inclusion (stock == 0 -> removal).
      3. If quantity exceeds current stock (> 0): cap to current stock,
         emit warning.
      4. If quantity > 0 but product/color invalid: remove entry, emit warning.
      5. If quantity == 0 or negative (corrupted session): remove entry,
         emit warning.
    """
    warnings = []
    cleaned = {}
    resolved_items = []

    raw_cart = _get_session_cart(request)
    settings_obj = SettingSite.load()

    for raw_key, value_dict in raw_cart.items():
        # Normalize value to dict with at least quantity.
        if isinstance(value_dict, dict):
            quantity = value_dict.get("quantity")
        elif isinstance(value_dict, (int, float)):
            quantity = value_dict
        else:
            warnings.append(f"Malformed cart entry removed: {raw_key}")
            continue

        # Ensure numeric positive quantity.
        try:
            quantity = int(quantity) if quantity is not None else 0
        except (ValueError, TypeError):
            warnings.append(f"Malformed quantity removed: {raw_key}")
            continue

        if quantity <= 0:
            warnings.append(f"Invalid quantity (<= 0) removed: {raw_key}")
            continue

        # Parse composite key.
        product_id, color_id = _parse_key(raw_key)
        if product_id is None:
            warnings.append(f"Malformed session key removed: {raw_key}")
            continue

        # Resolve Product.
        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            warnings.append(
                f"Product not found (deleted) removed: product_id={product_id}"
            )
            continue

        # Check product availability.
        if not product.is_active or not product.is_available:
            warnings.append(
                f"Product unavailable (inactive/unavailable) removed: {product.name} (id={product.id})"
            )
            continue

        # Resolve / validate ProductColor when selected.
        selected_color = None
        if color_id is not None and color_id != 0:
            try:
                selected_color = ProductColor.objects.get(
                    id=color_id, product=product
                )
            except ProductColor.DoesNotExist:
                warnings.append(
                    f"Invalid color removed: color_id={color_id} for product_id={product_id}"
                )
                continue

            # Color must have stock > 0 to remain (TASK 13: stock == 0 -> removal).
            if selected_color.stock <= 0:
                warnings.append(
                    f"Color out of stock removed: {selected_color.name} for {product.name}"
                )
                continue

            # If quantity exceeds current color stock: cap to stock.
            if quantity > selected_color.stock:
                warnings.append(
                    f"Quantity adjusted due to stock change: {product.name} / {selected_color.name} from {quantity} to {selected_color.stock}"
                )
                quantity = selected_color.stock
        else:
            # No selected color.
            # For products with colors, the architecture recommends that
            # color selection is mandatory. However, if the product has
            # no colors (colors.count() == 0), no selection is required.
            # If the product DOES have colors but session key uses 0,
            # this indicates either a missing selection or a legacy entry.
            # Per TASK 13 approved rules: when colors exist but none selected,
            # we treat the entry as invalid (remove with warning) because
            # the add logic enforces selection when colors exist.
            has_colors = product.colors.exists()
            if has_colors:
                warnings.append(
                    f"Color selection missing removed: {product.name} (id={product.id})"
                )
                continue
            # If no colors exist, use total product stock for validation.
            total_stock = product.total_stock if hasattr(product, "total_stock") else sum(
                c.stock for c in product.colors.all()
            )
            if total_stock <= 0:
                warnings.append(
                    f"Product out of stock removed: {product.name}"
                )
                continue
            if quantity > total_stock:
                warnings.append(
                    f"Quantity adjusted (no color) due to stock change: {product.name} from {quantity} to {total_stock}"
                )
                quantity = total_stock

        # At this point the item is valid. Build cleaned session entry.
        cleaned[raw_key] = {"quantity": quantity}
        # Optional: also store resolved identity explicitly (useful for views / templates).
        # We keep the shorter form per TASK 14 requirement but allow the
        # value to be just quantity. The resolved item carries full identity.

        # Build resolved item dict for calculations / templates.
        current_price = product.final_price if hasattr(product, "final_price") else (
            product.discount_price or product.price
        )
        line_subtotal = Decimal(str(current_price)) * Decimal(str(quantity))

        item_image_url = None
        # Try selected color image first, then product default.
        if selected_color and selected_color.image:
            item_image_url = selected_color.image.url if hasattr(
                selected_color.image, "url"
            ) else str(selected_color.image)
        elif product.main_image:
            item_image_url = product.main_image.url if hasattr(
                product.main_image, "url"
            ) else str(product.main_image)

        resolved_items.append(
            {
                "key": raw_key,
                "product_id": product.id,
                "product": product,
                "color_id": color_id,
                "selected_color": selected_color,
                "quantity": quantity,
                "unit_price": Decimal(str(current_price)),
                "line_subtotal": line_subtotal,
                "display_name": product.name,
                "image_url": item_image_url,
                "color_name": selected_color.name if selected_color else None,
                "color_code": selected_color.color_code if selected_color else None,
                "is_in_stock": True,
            }
        )

    return resolved_items, warnings, cleaned


# ------------------------------------------------------------------
# Cart management functions
# ------------------------------------------------------------------


def get_cart(request):
    """Return the raw session cart dict (may be empty or malformed)."""
    return _get_session_cart(request)


def add_item(request, product_id, quantity=1, color_id=None, set_quantity=False):
    """
    Add or set a cart item.
    
    Args:
        request: Django request object
        product_id: Product ID
        quantity: Quantity to add/set (default: 1)
        color_id: Color ID (optional)
        set_quantity: If True, set quantity to the given value instead of incrementing
        
    Returns:
        dict: {
            "success": bool,
            "message": str,
            "key": str or None,
            "quantity": int,
            "badge": int,
        }
    """
    result = {
        "success": False,
        "message": "",
        "key": None,
        "quantity": 0,
        "badge": 0,
    }

    # Basic type validation.
    try:
        product_id = int(product_id)
    except (ValueError, TypeError):
        result["message"] = "Invalid product ID."
        return result

    # Normalize color.
    if color_id is not None:
        try:
            color_id = int(color_id)
            if color_id == 0:
                color_id = None
        except (ValueError, TypeError):
            result["message"] = "Invalid color selection."
            return result
    else:
        color_id = None

    try:
        quantity = int(quantity)
    except (ValueError, TypeError):
        result["message"] = "Quantity must be an integer."
        return result

    if quantity < 1:
        result["message"] = "Quantity must be at least 1."
        return result

    # Resolve product.
    try:
        product = Product.objects.get(id=product_id)
    except Product.DoesNotExist:
        result["message"] = "Product not found."
        return result

    # Check active / available.
    if not product.is_active or not product.is_available:
        result["message"] = "Product is not available."
        return result

    # Color validation and stock check.
    selected_color = None
    if color_id is not None:
        try:
            selected_color = ProductColor.objects.get(
                id=color_id, product=product
            )
        except ProductColor.DoesNotExist:
            result["message"] = "Invalid color selection for this product."
            return result
        if selected_color.stock < quantity:
            result["message"] = (
                f"Requested quantity exceeds available stock ({selected_color.stock})."
            )
            return result
    else:
        # No color selected.
        has_colors = product.colors.exists()
        if has_colors:
            result["message"] = "Please select a color for this product."
            return result
        # No colors: use total product stock.
        total_stock = product.total_stock if hasattr(product, "total_stock") else sum(
            c.stock for c in product.colors.all()
        )
        if total_stock < quantity:
            result["message"] = (
                f"Requested quantity exceeds available stock ({total_stock})."
            )
            return result

    # Session update.
    key = _make_key(product_id, color_id if selected_color else None)
    cart = _get_session_cart(request)

    existing = cart.get(key)
    if isinstance(existing, dict):
        old_qty = existing.get("quantity", 0)
    elif isinstance(existing, (int, float)):
        old_qty = int(existing)
    else:
        old_qty = 0

    # Determine new quantity based on set_quantity flag
    if set_quantity:
        new_qty = quantity
    else:
        new_qty = old_qty + quantity

    # After increment, verify stock again (for same-color increment case).
    if selected_color is not None:
        if selected_color.stock < new_qty:
            result["message"] = (
                f"Requested quantity exceeds available stock ({selected_color.stock})."
            )
            return result
    else:
        total_stock = product.total_stock if hasattr(product, "total_stock") else sum(
            c.stock for c in product.colors.all()
        )
        if total_stock < new_qty:
            result["message"] = (
                f"Requested quantity exceeds available stock ({total_stock})."
            )
            return result

    # Write back.
    cart[key] = {"quantity": new_qty}
    _set_session_cart(request, cart)

    # Recalculate badge.
    resolved_items, _, _ = _resolve_items(request)
    result["success"] = True
    result["message"] = "Added to cart."
    result["key"] = key
    result["quantity"] = new_qty
    result["badge"] = sum(
        item.get("quantity", 0) for item in resolved_items
    ) if isinstance(resolved_items, list) else 0
    return result


def update_item(request, key, quantity):
    """Explicit quantity update (e.g., from cart quantity buttons)."""
    result = {
        "success": False,
        "message": "",
        "quantity": 0,
        "badge": 0,
    }

    product_id, color_id = _parse_key(key)
    if product_id is None:
        result["message"] = "Invalid cart item key."
        return result

    try:
        quantity = int(quantity)
    except (ValueError, TypeError):
        result["message"] = "Quantity must be an integer."
        return result

    if quantity < 0:
        result["message"] = "Quantity cannot be negative."
        return result

    # If quantity is 0, treat as removal.
    if quantity == 0:
        return remove_item(request, key)

    # Resolve product.
    try:
        product = Product.objects.get(id=product_id)
    except Product.DoesNotExist:
        result["message"] = "Product not found."
        return result

    if not product.is_active or not product.is_available:
        result["message"] = "Product is no longer available."
        return result

    # Resolve / validate color.
    selected_color = None
    if color_id is not None:
        try:
            selected_color = ProductColor.objects.get(
                id=color_id, product=product
            )
        except ProductColor.DoesNotExist:
            result["message"] = "Invalid color selection for this product."
            return result
        if selected_color.stock < quantity:
            result["message"] = (
                f"Requested quantity exceeds available stock ({selected_color.stock})."
            )
            return result
    else:
        has_colors = product.colors.exists()
        if has_colors:
            result["message"] = "Please select a color for this product."
            return result
        total_stock = product.total_stock if hasattr(product, "total_stock") else sum(
            c.stock for c in product.colors.all()
        )
        if total_stock < quantity:
            result["message"] = (
                f"Requested quantity exceeds available stock ({total_stock})."
            )
            return result

    # Update session.
    cart = _get_session_cart(request)
    if key not in cart:
        result["message"] = "Item not found in cart."
        return result

    cart[key] = {"quantity": quantity}
    _set_session_cart(request, cart)

    result["success"] = True
    result["message"] = "Quantity updated."
    result["quantity"] = quantity
    # Recalculate badge from cleaned session.
    resolved_items, _, _ = _resolve_items(request)
    result["badge"] = sum(
        item.get("quantity", 0) for item in resolved_items
    ) if isinstance(resolved_items, list) else 0
    return result


def remove_item(request, key):
    """Remove a cart item by its session key."""
    result = {
        "success": False,
        "message": "",
        "badge": 0,
    }
    product_id, color_id = _parse_key(key)
    if product_id is None:
        result["message"] = "Invalid cart item key."
        return result

    cart = _get_session_cart(request)
    if key in cart:
        del cart[key]
        result["success"] = True
        result["message"] = "Item removed."
    else:
        # Idempotent: already absent.
        result["success"] = True
        result["message"] = "Item not found (already removed)."

    _set_session_cart(request, cart)
    resolved_items, _, _ = _resolve_items(request)
    result["badge"] = sum(
        item.get("quantity", 0) for item in resolved_items
    ) if isinstance(resolved_items, list) else 0
    return result


def clear_cart(request):
    """Completely clear the session cart."""
    result = {"success": True, "message": "Cart cleared.", "badge": 0}
    session = getattr(request, "session", None)
    if session is not None:
        session[CART_SESSION_KEY] = {}
        if hasattr(session, "modified"):
            session.modified = True
    return result


# ------------------------------------------------------------------
# Resolution / validation
# ------------------------------------------------------------------


def resolve_items(request):
    """
    Main resolution pipeline used by the view/service for rendering or
    validation.

    Returns (items_list, warnings_list, cleaned_dict).
    """
    return _resolve_items(request)


# ------------------------------------------------------------------
# Counts
# ------------------------------------------------------------------


def get_badge_count(request):
    """Return total quantity of all validated cart items."""
    resolved_items, _, _ = _resolve_items(request)
    total_qty = sum(
        item.get("quantity", 0) for item in resolved_items
    ) if isinstance(resolved_items, list) else 0
    return int(total_qty)


def get_lines_count(request):
    """Return number of unique cart lines (validated)."""
    resolved_items, _, _ = _resolve_items(request)
    count = len(resolved_items) if isinstance(resolved_items, list) else 0
    return int(count)


# ------------------------------------------------------------------
# Subtotal / total calculation helpers
# ------------------------------------------------------------------


def calculate_subtotal(request):
    """Calculate authoritative cart subtotal from current database prices."""
    resolved_items, _, _ = _resolve_items(request)
    subtotal = Decimal("0")
    for item in resolved_items:
        line_sub = item.get("line_subtotal", Decimal("0"))
        subtotal += line_sub
    return subtotal


def calculate_totals(request, discount=Decimal("0")):
    """
    Authoritative total calculation pipeline.

    Returns dict:
        {
            "subtotal": Decimal,
            "discount": Decimal,
            "shipping": Decimal,
            "tax": Decimal,
            "total": Decimal,
        }
    """
    settings_obj = SettingSite.load()
    resolved_items, warnings, _ = _resolve_items(request)

    # Subtotal from validated items (current DB prices only).
    subtotal = Decimal("0")
    for item in resolved_items:
        subtotal += item.get("line_subtotal", Decimal("0"))

    # Discount: only from validated session coupon state (not implemented)
    # or from a validated Coupon model (future). For now, default is 0.
    # The function accepts `discount` parameter for future coupon integration.
    discount = Decimal(str(discount)) if discount is not None else Decimal("0")
    if discount < Decimal("0"):
        discount = Decimal("0")

    # Shipping: based on existing SettingSite (TASK 13 approved: no paid
    # shipping price exists; treat as 0, free if threshold met).
    free_threshold = settings_obj.free_shipping_threshold
    if free_threshold is None:
        free_threshold = Decimal("0")
    else:
        free_threshold = Decimal(str(free_threshold))

    # If no paid shipping price is defined by the existing architecture,
    # the only safe behavior is 0 regardless of threshold.
    # Once a paid shipping price model exists, this logic should change.
    shipping = Decimal("0")
    # Future extension point: if paid price exists:
    #   shipping = Decimal("0") if (subtotal - discount) >= free_threshold else Decimal(str(paid_price))

    # Tax: based on tax_percent (DecimalField). Apply after discount.
    tax_percent_val = settings_obj.tax_percent
    if tax_percent_val is None:
        tax_percent_val = Decimal("0")
    else:
        tax_percent_val = Decimal(str(tax_percent_val))

    taxable_amount = max(subtotal - discount, Decimal("0"))
    tax = (taxable_amount * tax_percent_val) / Decimal("100")

    total = subtotal - discount + shipping + tax

    return {
        "subtotal": subtotal,
        "discount": discount,
        "shipping": shipping,
        "tax": tax,
        "total": total,
    }


# ------------------------------------------------------------------
# Coupon session state helpers (ready for future Coupon model)
# ------------------------------------------------------------------


def get_coupon_code(request):
    """Read coupon code from session (future integration point)."""
    session = getattr(request, "session", None)
    if session is None:
        return None
    return session.get("cart_coupon_code", None)


def set_coupon_code(request, code):
    """Store coupon code in session. Validation must be done by caller."""
    session = getattr(request, "session", None)
    if session is not None:
        session["cart_coupon_code"] = str(code) if code else None
        if hasattr(session, "modified"):
            session.modified = True


def clear_coupon_code(request):
    """Remove coupon code from session."""
    session = getattr(request, "session", None)
    if session is not None:
        session.pop("cart_coupon_code", None)
        if hasattr(session, "modified"):
            session.modified = True
