# TASK 13 — CART SESSION ARCHITECTURE DESIGN & VERIFICATION

**Status:** NO PRODUCTION FILES MODIFIED. NO MIGRATIONS CREATED. NO MODELS ADDED. NO ENDPOINTS IMPLEMENTED.
**Language:** English only (no Persian/Farsi anywhere).
**Verification method:** Direct re-inspection of `store/models.py`, `store/views.py`, `store/urls.py`, `store/untils.py`, `templates/main/cart.html`, `templates/main/product_detail.html`, `templates/main/checkout.html`, `templates/main/base/base_main.html`, `static/js/product_detail.js`, `static/js/products.js`, `store/services/home_services.py`.

---

## 1. RE-INSPECTED EXISTING ARCHITECTURE (VERIFIED AGAINST CURRENT CODE)

### 1.1 Models (`store/models.py` — verified by reading file)

| Model | Key Fields | Verification Note |
|---|---|---|
| `Product` | `price`, `discount_price`, `is_active`, `is_available`, `final_price` (property), `total_stock` (property via `colors`), `is_in_stock` | Confirmed. `final_price` = `discount_price or price`. |
| `ProductColor` | `product` (FK, `related_name="colors"`), `name`, `color_code`, `image`, `stock` (`PositiveIntegerField`, default 0), `is_default` | Confirmed. `stock` per variant exists. |
| `ProductImage` | `product` (FK), `image`, `alt_text`, `display_order` | Confirmed. |
| `ProductSpecification` | `product` (FK), `group`, `title`, `value`, `is_filterable` | Confirmed. Warranty text used in `product_detail.html` (`fa-shield-halved`). |
| `Order` | `customer` (FK `Customer`, `null=True`, `blank=True`), `is_paid` (`default=False`), `total_price` (`IntegerField`, `default=0`), `status` (`IntegerField`, `default=-1`), `created_at`, `note`, `method_auto` | Confirmed. `status=-1` = `Cancel` (per `store/untils.py`). `customer` allows anonymous orders (`null=True`). |
| `OrderItem` | `order` (FK), `product` (FK), `quantity` (`IntegerField`) | Confirmed. **NO `price` field. NO `color` reference.** |
| `Customer` | `user` (OneToOne `PersonUser`), `phone`, `address` | Confirmed. |
| `SettingSite` | `free_shipping_threshold` (`DecimalField`, default 0), `tax_percent` (`DecimalField`, default 0), `enable_coupon` (`default=True`), `enable_discount_code` (`default=True`), `enable_guest_checkout` (`default=True`) | Confirmed. |

### 1.2 Views (`store/views.py` — verified by reading file)

| View | Current Behavior |
|---|---|
| `cart_show(request)` | Returns `render(request, 'main/cart.html')`. **Zero context.** |
| `checkout_page(request)` | Returns `render(request, 'main/checkout.html')`. **Zero context.** |
| `product_detail(request, product_id)` | Complex view (`select_related`/`prefetch_related`). Passes `gallery_images`, `comments`, `average_rating`, etc. |

### 1.3 URLs (`store/urls.py` — verified by reading file)

```
path('cart', cart_show, name='cart'),
path('checkout/', checkout_page, name='checkout'),
```
Note: `cart` has no trailing slash; `checkout/` has a trailing slash. Existing inconsistency noted.

### 1.4 Utilities (`store/untils.py` — verified)

```
STATUS_CHOICES = {
    '-1': 'Cancel',
    '0': 'Pending Pay',
    '1': 'approved',
    '2': 'shipped',
    '3': 'delivered',
}
```
`Order.status` defaults to `-1` (`Cancel`). Checkout flow must create orders with `status=0` (`Pending Pay`).

### 1.5 Product Detail Template (`product_detail.html` — verified by reading file)

- `mini-cart-btn` (`data-cart="buybox"` / `data-cart="minicard"`) exists.
- `qty-row` contains `.qty-stepper` (minus, `.qty-value`, plus).
- `addToCartFeedback()` (in `product_detail.js`) creates a visual toast but makes **no server request**.
- `getActiveColor()` reads `.color-item.active`.
- Color selection updates `colorName`, `mainImage`, `miniProductImage`.

### 1.6 Product Card (`templates/main/includes/product_card.html` — verified)

- Contains wishlist (`data-wishlist`), quick view (`data-quickview`), image, name, rating, price (`p1-final` / `p1-old`), colors (`.p1-colors`), stock (`.p1-stock`).
- **No "Add to Cart" button** in product card.

### 1.7 AJAX Pattern (`static/js/products.js` — verified)

- `fetch()` with `method: 'GET'`, headers: `{'X-Requested-With': 'XMLHttpRequest', 'Accept': 'application/json'}`.
- Uses `AbortController` (`signal`).
- Response expected: `data.html`, `data.count`, `data.total_pages`.
- Quick View endpoint (`/get-product-details/<id>/`) returns JSON with `success`, `product`.
- Wishlist endpoint (`/wishlist/add/<id>/`) uses `POST` with `X-CSRFToken` from `getCookie('csrftoken')`.

### 1.8 Base Template (`templates/main/base/base_main.html` — verified)

- `nav-cart` links to `{% url 'cart' %}`.
- Badge: `<span class="cart-badge" id="cartBadge">0</span>` — always hardcoded `0`.

### 1.9 Checkout Template (`checkout.html` — verified)

- `checkout-card` (Customer Info, Shipping Address, Payment Method) has no `<form>` tag with `action` or `method`.
- `checkout-summary` hardcodes: `3 Items`, `Subtotal $5,451`, `Shipping Free`, `Discount -$100`, `Total $5,351`.
- `place-order-btn` has no event handler or form link.
- `address-selector` (`.add-address-btn`) has no interaction defined.

### 1.10 Settings (`store/models.py::SettingSite` — verified)

- `free_shipping_threshold`: `DecimalField(default=0)`. If `subtotal >= threshold`, shipping is free. No paid shipping price exists in the architecture.
- `tax_percent`: `DecimalField(default=0)`. If `0`, tax is `0`.
- `enable_coupon` / `enable_discount_code`: `True`. No `Coupon` model exists.

---

## 2. FINAL ARCHITECTURE GOAL

**Framework:** Django (session middleware enabled) + HTML templates + vanilla JavaScript (no React/Vue/Redux).
**Cart Type:** Session-based temporary cart (`request.session`).
**Checkout Conversion:** Session → `Order` (status=0) + `OrderItem`.
**Persistence:** Session survives page refresh (Django session cookie). No database model for temporary cart state.

---

## 3. SESSION STRUCTURE DESIGN (FINAL APPROVED)

### 3.1 Critical Analysis of Previous Design (`{product_id: {quantity, color_id}}`)

**Can it represent every valid state?** **NO.**

The previous structure uses `product_id` as the only dictionary key. This means:
- Same `product_id` + same `color_id`: increment quantity (works).
- Same `product_id` + different `color_id`: **key collision** — the second color overwrites the first instead of creating a separate line item.

Given `ProductColor` allows multiple variants (`ProductColor.stock` per variant, `ProductColor.is_default`), the business requires the ability to purchase the same product in different colors as separate items.

### 3.2 Final Approved Session Structure

```python
# Request session key
request.session["cart_items"] = {
    # Key format: "{product_id}:{color_id}"
    # For products with colors selected: color_id is integer (e.g., 5)
    # For products with no colors or no selection: color_id is 0 (placeholder)
    # Note: Django session dictionary values can be nested dicts or primitives.
    "42:5": {
        "quantity": 2,
        "product_id": 42,
        "color_id": 5,
    },
    "42:6": {
        "quantity": 1,
        "product_id": 42,
        "color_id": 6,
    },
    "99:0": {
        "quantity": 1,
        "product_id": 99,
        "color_id": None,  # No color selected / product has no colors
    },
}
```

**Why composite key (`"product_id:color_id"`) is required:**
- `ProductColor` is a first-class variant (separate `stock`, `image`, `name`).
- A user must be able to add Product A (Color Red) and Product A (Color Blue) simultaneously.
- A simple `{product_id}` key would cause data loss.

**Why `0` placeholder for no-color:**
- String keys must be consistent. Using integer `0` (or string `"0"`) ensures uniqueness and avoids `NoneType` string conversion issues (`"42:None"` vs `"42:0"`).
- At resolution time, `color_id` value `None` indicates no color selection; `color_id` value `5` indicates specific color.
- If `product.colors.exists()` is `False`, the endpoint must allow `color_id` to be omitted or set to `None`.

**Why nested value dictionary (`{"quantity": ...}`) instead of primitive (`{"42:5": 2}`):**
- A primitive quantity value is sufficient for basic cases but prevents future extension (e.g., custom notes, snapshot metadata for future price tracking, timestamp).
- Given the requirement for historical `Order` creation, keeping `product_id` and `color_id` explicitly inside the value improves readability and debugging.
- The overhead is minimal for typical cart sizes (< 50 items).

---

## 4. PRICE SOURCE OF TRUTH (FINAL RULE)

### 4.1 Principle

**Session stores identity + state ONLY. Database is the source of truth for price, discount, availability, and stock.**

### 4.2 Session Cart: NO Price Snapshot Required

The temporary session cart (`request.session["cart_items"]`) does **NOT** store `price`, `subtotal`, or `total`. It stores only:
- `key`
- `product_id`
- `color_id`
- `quantity`

**Reason:** Prices (`Product.price`, `Product.discount_price`) can change between "add to cart" and "checkout". The user must pay the current price at checkout time. Storing a price snapshot in the session cart would create stale price data and violate the principle that the database is the source of truth.

### 4.3 Price Calculation Pipeline (Every Server Request)

```
Session (identity + state)
    ↓
Resolve Product / ProductColor from DB
    ↓
Validate Product.is_active == True
Validate Product.is_available == True
Validate ProductColor exists (if color_id != 0/None)
Validate ProductColor.stock >= quantity
    ↓
Read current Product.final_price (property: discount_price or price)
    ↓
Compute line_subtotal = final_price * quantity
    ↓
Compute cart_subtotal = sum(line_subtotals)
    ↓
Apply validated coupon discount (if any)
    ↓
Compute shipping (see Section 13)
    ↓
Compute tax (see Section 14)
    ↓
Compute final_total
```

### 4.4 Historical Price Integrity (Future Requirement — Reported but Not Implemented)

`OrderItem` currently lacks:
- `price` (`IntegerField` or `DecimalField`) — to capture price at purchase time.
- `color` (`ForeignKey` to `ProductColor`, nullable) — to preserve selected variant.

**Conclusion:** A future model change is required for complete historical order integrity. The architecture design must account for this by computing the price at checkout and inserting it into the future `OrderItem.price` field (once added). The session cart does not need a snapshot, but the checkout conversion process must read `product.final_price` at the exact moment of `Order` creation and store it in the database.

---

## 5. PRODUCT COLOR / VARIANT MODEL (FINAL RULES)

### 5.1 Color Selection Identification

- `ProductColor.id` is the authoritative color identifier.
- `ProductColor.product` (FK) links color to product.
- `ProductColor.name` (e.g., "Orange", "Black", "Silver") is for display.
- `ProductColor.color_code` (e.g., `#ffa600`) is for visual swatch.
- `ProductColor.image` (optional) overrides product main image for that variant.

### 5.2 Mandatory vs Optional Color

- If a product has `colors.all().exists()` (at least one `ProductColor` record): `color_id` is **mandatory** for cart add/update.
- If `product.colors.count() == 0`: `color_id` is optional (`None` / `0` placeholder allowed).

### 5.3 What Happens When `color_id` Is Missing / Invalid

| Scenario | Server Behavior |
|---|---|
| `color_id` missing and product has colors | Return `success: false`, error: `"Please select a color."` |
| `color_id` provided but does not exist (`ProductColor.DoesNotExist`) | Return `success: false`, error: `"Invalid color selection."` |
| `color_id` belongs to another product (`ProductColor.product_id != product_id`) | Return `success: false`, error: `"Invalid color for this product."` |
| `color_id` exists but `stock == 0` | Return `success: false`, error: `"Selected color is out of stock."` |
| `color_id` valid and `stock > 0` | Proceed with add/update. |

### 5.4 Stock Validation Rules

- `Product.total_stock` = `sum(color.stock for color in self.colors.all())` (confirmed property).
- If `quantity` requested > `ProductColor.stock`: return error (`success: false`). Do not cap silently (capping creates hidden behavior; explicit error is safer).
- If `ProductColor.stock` drops to `0` after item is added: at next cart resolution (`get_cart_items()`), detect `stock == 0`, remove item, and return warning message (`"Item removed — out of stock."`).

### 5.5 Availability Rules

- `Product.is_active` must be `True`.
- `Product.is_available` must be `True`.
- If either is `False`: item is removed from session at resolution time. Checkout is blocked if any unresolved item fails validation.

### 5.6 Selected Color in Cart Display

- Read `color_id` from session key (`"42:5"` → `color_id=5`).
- Resolve `ProductColor` (`ProductColor.objects.get(id=color_id)`).
- Display `ProductColor.name` (`Orange`, `Black`, etc.).
- Display `ProductColor.color_code` swatch (existing `.color-dot` CSS class: `.orange`, `.black`, `.silver`).
- If `color_id == 0` (None): display `"No Color"` or omit color section.

### 5.7 Two Colors of Same Product

- `"42:5"`: Product 42, Color 5 (`Orange`), quantity 2.
- `"42:6"`: Product 42, Color 6 (`Black`), quantity 1.
- These are **two separate line items** (`lines_count` = 2; `items_count` = 3).
- The session dictionary structure explicitly supports this.

---

## 6. CART ADD LOGIC (`POST /cart/add/`)

### 6.1 Required Fields

- `product_id` (integer, required).

### 6.2 Optional Fields

- `quantity` (integer, default `1`).
- `color_id` (integer or `None`, optional; mandatory if product has colors).

### 6.3 Validation Sequence (Exact Order)

```
1. Parse product_id → Product.objects.select_related('category').prefetch_related('colors').get(id=product_id)
2. Check Product.is_active == True and Product.is_available == True
3. Check color_id (if provided or required):
   a. If product.colors.exists() > 0: color_id must be provided and must exist for this product.
   b. If product.colors.exists() == 0: color_id optional (ignored or set to None).
4. Validate quantity:
   a. Must be integer.
   b. Must be >= 1.
   c. Must be <= ProductColor.stock (if color selected) or <= Product.total_stock (if no color).
5. Build session key: f"{product_id}:{color_id or 0}"
```

### 6.4 Duplicate Handling (Exact Behavior)

| Existing Key | Action |
|---|---|
| `"42:5"` exists, same `product_id` + same `color_id` | Increment quantity: `new_quantity = old_quantity + requested_quantity`. If new quantity exceeds `stock`, return error (`success: false`) and **do not modify session**. |
| `"42:5"` does not exist, `"42:6"` exists | Create new key `"42:6"`. Separate line. |
| `"42:5"` exists, request `quantity=0` | Return error (`"Quantity must be at least 1."`). Do not modify. `quantity=0` is handled by `/cart/remove/`, not add. |

### 6.5 Edge Case Behaviors (Defined for Every Scenario)

| Case | Behavior |
|---|---|
| A. Product not in cart | Create new session entry. |
| B. Product in cart (same color) | Increment quantity (additive). |
| C. Same product + different color | Create separate entry (`"42:5"` and `"42:6"`). |
| D. Quantity exceeds stock | Return `success: false`, error message. Session unchanged. |
| E. Product unavailable (`is_available=False`) | Return `success: false`. Session unchanged. |
| F. Color unavailable (deleted / stock=0) | Return `success: false`. Session unchanged. |
| G. Invalid `product_id` | Return `success: false`, error: `"Product not found."` |
| H. Invalid `color_id` | Return `success: false`, error: `"Invalid color selection."` |
| I. `quantity` == 0 | Return `success: false`. `0` is invalid for add. Use `/cart/remove/`. |
| J. Negative quantity | Return `success: false`, error: `"Quantity must be positive."` |
| K. Extremely large quantity (e.g., 9999) | Return `success: false`, error: `"Requested quantity exceeds available stock."` |

### 6.6 Response Contract (Exact JSON)

**Success:**
```json
{
  "success": true,
  "message": "Added to cart.",
  "badge": 5,
  "lines_count": 2,
  "items_count": 5,
  "subtotal": 5451.00,
  "discount": 0.00,
  "shipping": 0.00,
  "tax": 0.00,
  "total": 5451.00
}
```

**Error:**
```json
{
  "success": false,
  "error": "Requested quantity exceeds available stock.",
  "badge": 3,
  "items_count": 3,
  "subtotal": 2951.00
}
```

Note: `badge` = total quantity (`items_count`). `lines_count` = number of unique session keys.

---

## 7. CART UPDATE LOGIC (`POST /cart/update/`)

### 7.1 Required Fields

- `key`: string (`"42:5"`) — the session item identifier.
  - Alternative: `product_id` + `color_id`. But using `key` is simpler for client-side event delegation.
- `quantity`: integer.

### 7.2 Validation Sequence

```
1. Parse key → split by ":" → product_id_str, color_id_str
2. Resolve product_id (int), color_id (int or None if "0" or "none")
3. Verify session entry exists for this key
4. Verify Product.is_active == True, Product.is_available == True
5. Verify ProductColor exists (if color_id != 0/None)
6. Verify quantity >= 1
7. Verify quantity <= ProductColor.stock (or total_stock if no color)
```

### 7.3 Behavior Rules

| Requested State | Behavior |
|---|---|
| `quantity` >= 1 and <= `stock` | Update session entry to new quantity. |
| `quantity` > `stock` | Return `success: false`, error: `"Quantity exceeds available stock."` Session unchanged. |
| `quantity` == 0 | Treat as removal request (`success: true`, message: `"Item removed."`). Remove key from session. |
| Key does not exist | Return `success: false`, error: `"Item not found in cart."` |
| Product deleted / inactive | Return `success: false`, error: `"Product unavailable."` Session unchanged (stale removal handled separately by cart resolution). |
| Color deleted / unavailable | Return `success: false`, error: `"Selected variant unavailable."` |

### 7.4 Response Contract

Same as `/cart/add/` (success/error structure with updated totals, badge, counts).

---

## 8. REMOVE LOGIC (`POST /cart/remove/`)

### 8.1 Identification Strategy

- Required: `key` (string, format `"product_id:color_id"`).
- Alternative: `product_id` + `color_id`. But `key` is unambiguous and aligns with session dictionary structure.

### 8.2 Behavior

- If `key` exists in `request.session["cart_items"]`: delete the entry.
- If `key` does not exist: return `success: true`, message: `"Item not found (already removed)."` (idempotent removal prevents errors from duplicate clicks).

### 8.3 Response Contract

Same JSON contract with updated totals and counts.

---

## 9. CART BADGE STRATEGY (FINAL DECISION)

### 9.1 Definition

`badge` = **total quantity** (`sum(quantity for each item in cart_items)`).

**Not** unique line count (`len(items)`).

**Reason:**
- Standard e-commerce behavior (Amazon, Shopify): badge reflects total items being purchased, not just distinct SKUs.
- A user buying `Product A × 3` and `Product B × 2` expects badge `5`, not `2`.
- The existing `base_main.html` badge (`cartBadge`) is a small numeric indicator; total quantity is the standard interpretation.

### 9.2 Calculation Source

- Read from `request.session["cart_items"]`.
- Sum `item["quantity"]` for all valid items (after validation, before stale removal? Actually: after resolution/cleaning, use final validated quantities).
- Recalculated server-side for every AJAX response and page load. **Never read from JavaScript DOM (`innerText`).**

---

## 10. ANONYMOUS + AUTHENTICATED USERS (FINAL STRATEGY)

### 10.1 Anonymous User (`request.user.is_authenticated == False`)

- Cart is stored in `request.session["cart_items"]` only.
- Page refresh: session cookie (`sessionid`) persists; session data survives.
- Browser close: session cookie may expire depending on session settings (`SESSION_COOKIE_AGE`); default Django session cookie is session-based (expires on browser close) unless configured otherwise.
- Checkout: `checkout_page` passes `cart_items` to template. Customer info form collects `name`, `email`, `phone`. `Order` is created with `customer=None` (allowed: `null=True`). `Customer` model is not required for anonymous checkout.
- `SettingSite.enable_guest_checkout` (`True`) confirms this is intended.

### 10.2 Authenticated User (`request.user.is_authenticated == True`)

- Same session-based cart (`request.session["cart_items"]`).
- `Customer` model (`OneToOne` with `PersonUser`) can be linked at checkout: `order.customer = request.user.customer` (if `Customer` exists).
- Login/logout: no merge logic required. The session cart is independent of any database cart model. Since no `Cart` DB model exists, there is nothing to merge.
- If in the future a database `Cart` model is added, merge logic (`login` event → merge session into DB → clear session) would be required. **Not needed now.**

### 10.3 Final Decision on Merging

**No merge logic required.** The architecture uses session-only temporary cart. At checkout, the session is converted to `Order`. There is no persistent user-associated cart database record to merge with.

---

## 11. CART CLEANUP / STALE DATA HANDLING (FINAL RULES)

### 11.1 Resolution Process (`get_cart_items()` — service function)

Every time cart is read (page load, AJAX state, checkout validation):

```
For each entry in request.session.get("cart_items", {}):
    1. Resolve product_id → Product
    2. Check Product.is_active and Product.is_available
    3. Resolve color_id (if not 0/None) → ProductColor
    4. Check ProductColor exists for this product
    5. Check ProductColor.stock >= quantity
    6. If any check fails:
        a. Remove entry from session
        b. Add warning message (e.g., "Item removed: Product unavailable.")
        c. Continue
    7. If all checks pass:
        a. Keep entry
        b. Compute current final_price
        c. Add to validated_items list
```

### 11.2 Behavior for Each Stale Scenario

| Stale Condition | Behavior |
|---|---|
| Product deleted (`DoesNotExist`) | Remove entry. Warning. |
| Product `is_active == False` | Remove entry. Warning: `"Product no longer available."` |
| Product `is_available == False` | Remove entry. Warning: `"Product out of stock."` |
| `ProductColor` deleted (`DoesNotExist`) | Remove entry. Warning: `"Selected variant no longer available."` |
| `ProductColor.stock` reduced to `0` | Remove entry. Warning: `"Item removed — out of stock."` |
| `ProductColor.stock` reduced below `quantity` (but > 0) | Cap quantity to current `stock`. Warning: `"Quantity adjusted due to stock changes."` |

### 11.3 Checkout Block Condition

Before creating `Order`:
- Call `validate_cart_items()` (or equivalent in service layer).
- If any item is removed or capped due to stale data: return error (`success: false`, `message: "Some items are unavailable. Please review your cart."`)
- Block `Order` creation until user fixes cart.

---

## 12. CART TOTAL CALCULATION (FINAL PIPELINE)

### 12.1 Calculation Sequence (Authoritative — Server Only)

```
validated_items = resolve_and_validate_cart_items(request)
subtotal = sum(
    Product.objects.get(id=item.product_id).final_price * item.quantity
    for item in validated_items
)
discount = calculate_discount(request, subtotal)  # coupon validated server-side
shipping = 0.00 if (subtotal - discount) >= SettingSite.load().free_shipping_threshold else 0.00
# Note: No paid shipping price exists in current architecture. See Section 13.
tax_base = max(subtotal - discount, 0.00)
tax = tax_base * float(SettingSite.load().tax_percent) / 100.00
# Note: tax_percent is DecimalField. Convert to float/int for arithmetic.
total = subtotal - discount + shipping + tax
```

### 12.2 When Values Must Be Recalculated

- Every `GET /cart/` (page load).
- Every AJAX response (`add`, `update`, `remove`, `coupon`, `state`).
- At checkout (`POST /checkout/`) before `Order` creation.
- **Never** read `subtotal`, `total`, or `discount` from JavaScript `innerText`, `data-*` attributes, or request body.

---

## 13. SHIPPING (FINAL RULE — BASED ON EXISTING ARCHITECTURE ONLY)

### 13.1 Existing Evidence

- `SettingSite.free_shipping_threshold` (`DecimalField`, default `0`).
- **No `shipping_price` model or field exists.**
- `checkout.html` hardcodes `Shipping: Free`.
- `cart.html` hardcodes `Shipping: Free`.

### 13.2 Final Shipping Rule

```
if (subtotal - discount) >= float(SettingSite.load().free_shipping_threshold):
    shipping = Decimal("0.00")
else:
    shipping = Decimal("0.00")  # Default: no paid shipping model exists.
```

**Ambiguity Note:** The current architecture defines a `free_shipping_threshold` but does not define a paid shipping price (`shipping_price`). Without a paid price definition, the only safe behavior is:
- If `subtotal >= threshold`: free shipping (`0`).
- Otherwise: `0` (no charge) or display `"Shipping: Calculated at checkout"`.

**Recommendation:** Since no paid shipping model exists, treat shipping as `0` for all cases initially. If a paid shipping model is required later, add `SettingSite.shipping_price` or a dedicated `Shipping` model.

---

## 14. TAX (FINAL RULE — BASED ON EXISTING ARCHITECTURE)

### 14.1 Existing Evidence

- `SettingSite.tax_percent` (`DecimalField`, default `0`).
- No tax calculation appears in `cart.html`, `checkout.html`, `store/untils.py`, or `store/views.py`.

### 14.2 Final Tax Rule (Safest Default)

```
tax_percent = float(SettingSite.load().tax_percent)  # default 0.0
if tax_percent > 0:
    tax = max(subtotal - discount, Decimal("0.00")) * Decimal(str(tax_percent)) / Decimal("100.00")
else:
    tax = Decimal("0.00")
```

**Calculation Order:** Tax is applied **after discount**, **before or including shipping**? Given standard e-commerce practices and ambiguity:
- **Recommended:** Tax applies to `(subtotal - discount)`. Shipping is excluded from tax base initially. If jurisdiction requires tax on shipping, a configuration flag (`tax_on_shipping`) must be added to `SettingSite`.
- **Display:** Show `Tax: $0.00` if `tax_percent == 0`. If `tax_percent > 0`, display calculated value.

---

## 15. COUPON ARCHITECTURE (FINAL DESIGN — NO IMPLEMENTATION YET)

### 15.1 Existing Infrastructure

- `SettingSite.enable_coupon` (`True`).
- `SettingSite.enable_discount_code` (`True`).
- No `Coupon` model exists.

### 15.2 Recommended Coupon Model (For Future Implementation)

```
class Coupon(models.Model):
    code = models.CharField(max_length=50, unique=True)
    discount_percent = models.PositiveIntegerField(default=0)  # or discount_amount (Decimal)
    is_active = models.BooleanField(default=True)
    valid_from = models.DateTimeField(null=True, blank=True)
    valid_to = models.DateTimeField(null=True, blank=True)
    min_order_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    usage_limit = models.PositiveIntegerField(default=1)
    used_count = models.PositiveIntegerField(default=0)
```

### 15.3 Session Coupon Storage

- Session stores only the `code` string (`request.session["cart_items"]["coupon_code"] = "SUMMER20"`) or `None`.
- **Never** stores computed discount amount (`discount` value from JS).
- At calculation time (`calculate_discount()`):
  1. Read `code` from session.
  2. Query `Coupon` model (`is_active`, date range, `min_order_amount` met by `subtotal`).
  3. If valid: compute `discount = subtotal * percent / 100` (or fixed amount).
  4. If invalid: set `discount = 0`, return error message, optionally clear `coupon_code`.

---

## 16. CHECKOUT BOUNDARY (FINAL RULE)

### 16.1 Definition

- **Cart Responsibility:** Temporary user intent (`session`). Stores identity (`product_id`, `color_id`) and quantity.
- **Checkout Responsibility:** Final purchase validation, total calculation, customer info collection, and persistent `Order` creation.

### 16.2 Boundary Rules

| Action | Responsibility |
|---|---|
| Read session items | Cart (service layer) |
| Validate products/colors/stock | Checkout (before `Order` creation) |
| Calculate current prices | Checkout (from `Product.final_price`) |
| Apply coupon | Checkout (validate `Coupon` model at checkout time) |
| Collect customer info | Checkout (form in `checkout.html`) |
| Create `Order` (`status=0`, `is_paid=False`) | Checkout (`checkout_page` POST handler) |
| Create `OrderItem` (with future `price` and `color` fields) | Checkout |
| Capture price snapshot | Checkout (read `Product.final_price` at exact creation time) |
| Capture selected color | Checkout (read `ProductColor.id` from session key) |
| Clear session cart after successful order | Checkout |
| Redirect to payment | Checkout / Payment app (`payment/` — currently empty) |

### 16.3 Checkout Block Conditions

Before creating `Order`:
- `request.session["cart_items"]` must exist and not be empty.
- All items must pass `validate_cart_items()` (no deleted/inactive/unavailable products; no out-of-stock variants; quantities valid).
- Customer info must be provided (`name`, `email`, `phone` for anonymous; `customer` link for authenticated).
- `subtotal`, `total` must be computed server-side and must equal the sum of validated items.
- `OrderItem.quantity` must be `>= 1`.

---

## 17. ORDER / ORDERITEM COMPATIBILITY (VERIFIED + REPORTED)

### 17.1 Current Schema Gaps (Verified from `store/models.py`)

| Missing Field | Impact |
|---|---|
| `OrderItem.price` (`IntegerField` or `DecimalField`) | Historical price at purchase is lost. If `Product.price` changes after purchase, `OrderItem` cannot show original price. |
| `OrderItem.color` (`ForeignKey` to `ProductColor`, `null=True`, `blank=True`) | Selected variant at purchase is lost. `OrderItem` only references `Product`, not `ProductColor`. |

### 17.2 Required Future Model Change

To support complete order history:
- Add `price = models.PositiveIntegerField()` to `OrderItem`.
- Add `color = models.ForeignKey(ProductColor, on_delete=models.SET_NULL, null=True, blank=True)` to `OrderItem`.

**For this architecture design:** The checkout conversion process must be designed to populate these fields once added. The session cart does not need a price snapshot, but the checkout view must read `Product.final_price` and `ProductColor.id` at creation time and pass them to the future `OrderItem` constructor.

---

## 18. AJAX RESPONSE CONTRACT (FINAL DESIGN)

### 18.1 Standard Response Structure

All cart endpoints (`/cart/add/`, `/cart/update/`, `/cart/remove/`, `/cart/coupon/`, `/cart/state/`) return JSON.

**Success (`success: true`):**
```json
{
  "success": true,
  "message": "String description",
  "badge": 5,
  "lines_count": 2,
  "items_count": 5,
  "subtotal": 5451.00,
  "discount": 100.00,
  "shipping": 0.00,
  "tax": 0.00,
  "total": 5351.00,
  "items": [
    {"key": "42:5", "product_id": 42, "name": "Apple iPhone 17 Pro Max", "color_name": "Orange", "quantity": 2, "line_subtotal": 5902.00},
    {"key": "55:0", "product_id": 55, "name": "Xiaomi 15T", "color_name": null, "quantity": 1, "line_subtotal": 700.00}
  ]
}
```

**Error (`success: false`):**
```json
{
  "success": false,
  "error": "Requested quantity exceeds available stock.",
  "badge": 3,
  "lines_count": 1,
  "items_count": 3,
  "subtotal": 2951.00,
  "total": 2951.00
}
```

### 18.2 Endpoint URLs (Recommended — Aligned with Existing Patterns)

```
/cart/              (GET)  → cart page (existing, needs context fix)
/cart/add/         (POST) → add/update item
/cart/update/     (POST) → explicit quantity update
/cart/remove/     (POST) → remove item by key
/cart/coupon/     (POST) → apply/remove coupon
/cart/state/      (GET)  → return current session state (for page load / refresh)
```

Note: `cart/` (with trailing slash) is recommended for consistency with `checkout/`, but existing URL `cart` (no slash) must be either kept or redirected. The architecture design supports both; the endpoint patterns above assume `cart/` as base.

---

## 19. SERVICE LAYER DECISION (FINAL RECOMMENDATION)

### 19.1 Recommendation: Create Light Service Layer (`store/services/cart_service.py`)

**Justification:**
- `store/views.py` currently contains complex logic (`product_detail`, `products`, `filter_test`). Adding session resolution, validation, calculation, and checkout conversion directly into `views.py` will make it unmanageable.
- `store/services/home_services.py` already exists (`get_site_setting()`, `get_featured_products()`, etc.). A `cart_service.py` aligns with existing architecture.
- Service layer separates HTTP logic (`views.py`) from business logic (`cart_service.py`).

### 19.2 Service Responsibilities (Exact Definition)

**File:** `store/services/cart_service.py` (new file for TASK 14; architecture approved here).

**Functions:**

```python
# Read and resolve session cart
def get_cart_items(request) -> dict: ...
# Validate all items, remove stale, return clean list + warnings
def validate_cart_items(request) -> (list, list): ...
# Calculate totals from validated items
def calculate_cart_totals(items: list) -> dict: ...
# Get badge count (total quantity)
def get_cart_badge(request) -> int: ...
# Clear session
def clear_cart(request) -> None: ...
# Add item (used by view endpoint)
def add_cart_item(request, product_id, quantity=1, color_id=None) -> (bool, str, dict): ...
# Update item
def update_cart_item(request, key: str, quantity: int) -> (bool, str, dict): ...
# Remove item
def remove_cart_item(request, key: str) -> (bool, str, dict): ...
# Apply coupon (future implementation)
def apply_coupon(request, code: str) -> (bool, str, dict): ...
```

### 19.3 View Responsibilities (Exactly What Views Do)

**`store/views.py`:**
- Receive `request`.
- Call `cart_service.get_cart_items(request)` for page context.
- Call `cart_service.validate_cart_items(request)` before checkout.
- Call `cart_service.add_cart_item()` / `update_cart_item()` / `remove_cart_item()` for AJAX endpoints.
- Return `JsonResponse()` (for AJAX) or `render()` (for HTML page).
- **Never calculate totals manually in the view.** Use service layer.

---

## 20. URL / VIEW DESIGN (FINAL)

### 20.1 Recommended URL Pattern

Based on existing `store/urls.py` patterns (`path('cart', ...)` vs `path('checkout/', ...)`):

```
# Page views (existing / updated)
path('cart/', cart_show, name='cart'),        # Update from 'cart' (no slash) for consistency; add redirect if needed
path('checkout/', checkout_page, name='checkout'),  # Existing

# Cart action endpoints (new — for TASK 14+ implementation)
path('cart/add/', add_to_cart_view, name='cart_add'),
path('cart/update/', update_cart_view, name='cart_update'),
path('cart/remove/', remove_cart_view, name='cart_remove'),
path('cart/coupon/', apply_coupon_view, name='cart_coupon'),
path('cart/state/', cart_state_view, name='cart_state'),
```

**Note:** The existing `path('cart', cart_show, name='cart')` uses no trailing slash. To maintain backward compatibility, either:
- Keep `path('cart', ...)` as the page URL and use `path('cart/add/', ...)` for endpoints (mixed consistency).
- Update to `path('cart/', ...)` and add redirect (`RedirectView`) from `/cart` to `/cart/`.

**Architecture design recommendation:** Use `cart/` (with slash) for consistency with `checkout/`. Add redirect.

---

## 21. JAVASCRIPT RESPONSIBILITIES (FINAL RULES)

### 21.1 `cart.js` SHOULD Do

- Attach event delegation to `.cart-items` for `+`, `-`, `.remove-btn`.
- Send `fetch()` POST to `/cart/update/` or `/cart/remove/`.
- Send `fetch()` POST to `/cart/add/` (called from `product_detail.js` or integrated into `cart.js`).
- Read `getCookie('csrftoken')` and include in `X-CSRFToken` header.
- Display loading state (`btn.disabled = true`, `.loading-overlay` or `.spinner`).
- Read JSON response (`data.success`, `data.error`, `data.badge`).
- Update `#cartBadge` (navbar badge) from response.
- Update `.summary-row` values (subtotal, discount, shipping, tax, total) from response.
- Show toast / inline message on success (`"Added to cart."`) or error (`data.error`).
- Update quantity text (`.qty-value`) after update.

### 21.2 `cart.js` SHOULD NOT Do

- Calculate authoritative prices (`final_price` is server-only).
- Decide whether `stock` is valid (server validates).
- Read `subtotal` or `total` from DOM (`innerText`) and send it back to server.
- Trust any `data-subtotal`, `data-price` attributes from HTML.
- Modify `request.session` directly (impossible from browser; must use server endpoints).

### 21.3 Communication Between `product_detail.js` and `cart.js`

- `product_detail.js` handles quantity stepper (`initQtyRowToggle`) and color selection (`selectColor`).
- When user clicks `.mini-cart-btn` (first click opens quantity row; second click or dedicated "Add" action triggers add):
  - `product_detail.js` reads `product_id` (from button or closest container), `quantity` (`.qty-value` text), `color_id` (`.color-item.active` `data-color` or `data-id`).
  - `product_detail.js` calls `fetch('/cart/add/', {method: 'POST', headers: {...}, body: new URLSearchParams({product_id, quantity, color_id})})`.
  - `cart.js` (if included globally) updates `#cartBadge` upon receiving any cart AJAX response. Alternatively, `product_detail.js` updates the badge directly (but this creates duplication). **Recommended:** `cart.js` listens to a custom event (`document.dispatchEvent(new CustomEvent('cart:updated', {detail: data}))`) fired by both `product_detail.js` and `cart.js`. `cart.js` updates badge and totals when this event fires.

---

## 22. PRODUCT DETAIL INTEGRATION (FINAL DESIGN)

### 22.1 Add to Cart Flow (From Product Detail)

```
User clicks .mini-cart-btn (data-cart="buybox")
    ↓
initQtyRowToggle() opens .qty-row (first click) OR
second click (when qty-row is open) triggers add
    ↓
Read:
  product_id: from closest container (button dataset or hidden input)
  quantity: document.querySelector('.qty-value').textContent → parseInt
  color_id: document.querySelector('.color-item.active') ? (dataset.id || dataset.name mapped to color_id) : null
    ↓
POST /cart/add/
Body: product_id=42, quantity=2, color_id=5
    ↓
Response: {success: true, badge: 5, ...}
    ↓
Show toast (existing addToCartFeedback mechanism) OR inline update
Update navbar badge (#cartBadge) via event listener
```

### 22.2 Color Selection Requirement

- If product has `.colors` and `.color-item` exists:
  - Before sending `/cart/add/`, verify `.color-item.active` exists.
  - If no active color: show error (`"Please select a color."`), do not send request.
- If product has no colors (`product.colors.count() == 0` in template logic):
  - Send `color_id` as `0` or omit it. The endpoint treats it as `None`.

---

## 23. SECURITY RULES (FINAL APPROVAL)

### 23.1 What Browser Controls (Allowed Client Input)

- `product_id`: must reference existing `Product`. Server validates with `get_object_or_404`.
- `color_id`: must reference existing `ProductColor` for that product. Server validates.
- `quantity`: integer. Server validates `>= 1` and `<= stock`.
- `key`: session dictionary key. Server validates against session (not user input directly; derived from session state).
- `code` (coupon): string. Server validates against `Coupon` model.

### 23.2 What Only Server Decides (Never Trust Client)

- `final_price`: computed from `Product.final_price` at request time.
- `stock`: read from `ProductColor.stock` at request time.
- `subtotal`: `sum(final_price * quantity)` computed server-side.
- `discount`: validated against `Coupon` model (not `request.POST` value used as amount).
- `shipping`: computed from `subtotal` and `free_shipping_threshold`.
- `tax`: computed from `(subtotal - discount) * tax_percent / 100`.
- `total`: `subtotal - discount + shipping + tax`.
- `badge`: `sum(quantity)` computed from validated session items.
- `lines_count`: `len(validated_items)` computed server-side.

### 23.3 CSRF Protection

- All `POST` endpoints (`/cart/add/`, `/cart/update/`, `/cart/remove/`, `/cart/coupon/`) must require `X-CSRFToken` header.
- `getCookie('csrftoken')` (existing function in `product_detail.js`) must be reused.
- `product_detail.js` and `cart.js` must include `headers: {'X-CSRFToken': getCookie('csrftoken')}` in all `fetch()` POST requests.

### 23.4 Authentication Boundaries

- Cart endpoints must work for anonymous users (`request.user.is_authenticated == False`) because `SettingSite.enable_guest_checkout` is `True`.
- Checkout (`checkout_page`) must work for both anonymous (`customer=None`) and authenticated (`customer=request.user.customer` if exists) users.
- `login_required` decorator must **NOT** be applied to `/cart/` or `/cart/add/` (anonymous must access). It may be applied to `/checkout/` if business requires login for checkout, but given `enable_guest_checkout`, it must remain optional.

---

## 24. EDGE CASE MATRIX (FINAL)

| # | Scenario | Expected Behavior |
|---|---|---|
| 1 | Empty cart (`request.session["cart_items"]` empty or missing) | Cart page shows `.empty-cart` message. Subtotal = `0`. Badge = `0`. Checkout blocked. |
| 2 | One product, one color (`"42:5": {"quantity": 1}`) | Normal display. Badge = `1`. |
| 3 | Multiple products (`42`, `55`) | Separate `.cart-card` blocks. Badge = sum quantities. |
| 4 | Same product + same color (`"42:5"` quantity `3`) | Single line item (`lines_count` = 1, `items_count` = 3). |
| 5 | Same product + different colors (`"42:5"` quantity 2, `"42:6"` quantity 1) | Two line items (`lines_count` = 2, `items_count` = 3). |
| 6 | Product deleted (`Product.DoesNotExist`) | At resolution: remove entry, display warning. Checkout blocked if unresolved. |
| 7 | Product `is_active == False` | Remove entry, warning. Checkout blocked. |
| 8 | Color deleted (`ProductColor.DoesNotExist`) | Remove entry, warning: `"Selected variant no longer available."` Checkout blocked. |
| 9 | Color unavailable (`ProductColor.stock == 0`) | Remove entry, warning: `"Item removed — out of stock."` Checkout blocked. |
| 10 | Stock = 0 (`total_stock == 0`) | `Product.is_in_stock == False`. At add/update: error. At resolution: remove entry. |
| 11 | Quantity exceeds `stock` (`quantity > ProductColor.stock`) | Return `success: false`, error. Session unchanged. |
| 12 | Product price changed (`Product.final_price` changed) | No session price snapshot. At checkout: `OrderItem` captures current `final_price`. Session unchanged. |
| 13 | User logs in (authenticated) | Session `cart_items` remains. Checkout links `customer`. No merge needed (no DB cart model). |
| 14 | User logs out | Session `cart_items` remains (session cookie independent of auth). Checkout creates `Order` with `customer=None`. |
| 15 | Coupon invalid (`Coupon` does not exist / inactive / expired) | `discount` = `0`. Return error message. `coupon_code` remains or cleared based on policy (recommended: keep in session, show error). |
| 16 | Coupon expires (date passed) | `discount` = `0`. Return error: `"Coupon expired."` |
| 17 | Shipping threshold reached (`subtotal - discount >= threshold`) | `shipping` = `0`. Display `"Free"`. |
| 18 | Tax enabled (`tax_percent > 0`) | `tax` = `(subtotal - discount) * percent / 100`. Display tax line. |
| 19 | Guest checkout (`request.user.is_authenticated == False`, `enable_guest_checkout == True`) | Checkout form collects info. `Order.customer = None`. Session cleared after order creation. |
| 20 | Checkout with stale cart data (item deleted/inactive/unavailable) | `validate_cart_items()` removes stale items. If any removed: `success: false`, message: `"Some items unavailable. Review cart."` `Order` creation blocked. |

---

## 25. FINAL APPROVED ARCHITECTURE (EXECUTIVE SUMMARY)

### 25.1 Session Structure (Approved)

```python
request.session["cart_items"] = {
    "42:5": {"quantity": 2, "product_id": 42, "color_id": 5},
    "42:6": {"quantity": 1, "product_id": 42, "color_id": 6},
    "99:0": {"quantity": 1, "product_id": 99, "color_id": None},
}
```

Key format: `"{product_id}:{color_id}"` (integer `0` as placeholder for no color).

### 25.2 Price / Data Source (Approved)

- Session: identity (`product_id`, `color_id`) + quantity.
- Database: price (`final_price`), discount (`Coupon` model — future), stock (`ProductColor.stock`), availability (`is_active`, `is_available`).
- Server calculates all totals at every request. Client never sends prices.

### 25.3 Badge (Approved)

`badge` = total quantity (`sum(quantity)`). Not unique line count.

### 25.4 Anonymous / Authenticated (Approved)

- Session-based only (`request.session`).
- Anonymous checkout allowed (`enable_guest_checkout`). `Order.customer = None`.
- Authenticated checkout links `Customer` (`request.user.customer`).
- No database `Cart` model. No merge logic needed.

### 25.5 Stale Data Handling (Approved)

- Resolution removes unavailable/deleted/inactive items.
- If `stock < quantity`: cap quantity (warning) or remove item (`stock == 0`).
- Checkout blocked until cart is clean.

### 25.6 Shipping / Tax / Discount (Approved)

- Shipping: `0` (free) when `subtotal >= free_shipping_threshold`; otherwise `0` (no paid price model exists). Ambiguity noted.
- Tax: `max(subtotal - discount, 0) * tax_percent / 100`. Tax after discount. Tax base excludes shipping (default; future flag if needed).
- Discount: validated `Coupon` model (`enable_coupon` confirms intent). Session stores `code` string only; server computes amount.

### 25.7 Checkout Boundary (Approved)

- Cart: temporary session.
- Checkout: validates session, calculates totals, creates `Order` (status=0), creates `OrderItem` (requires future `price` and `color` fields), clears session.
- `OrderItem` schema gap identified: `price` and `color` fields must be added for historical integrity.

### 25.8 AJAX Contract (Approved)

Standard JSON (`success`, `message`/`error`, `badge`, `lines_count`, `items_count`, `subtotal`, `discount`, `shipping`, `tax`, `total`, `items` array).

### 25.9 Service Layer (Approved)

Create `store/services/cart_service.py` for business logic. `store/views.py` handles HTTP only.

### 25.10 URL Design (Approved)

Keep `cart/` (with redirect from `cart` if changed). Add `/cart/add/`, `/cart/update/`, `/cart/remove/`, `/cart/coupon/`, `/cart/state/`.

---

## 26. OPEN QUESTIONS / AMBIGUITIES (REMAINING)

1. **Paid Shipping Price:** `SettingSite` has `free_shipping_threshold` but no `shipping_price`. The architecture treats paid shipping as `0` by default. A future `shipping_price` model or setting is needed if the business requires non-free shipping.

2. **Tax Application Base:** Should tax apply to `(subtotal - discount + shipping)` or `(subtotal - discount)`? The current architecture applies tax to `(subtotal - discount)` and excludes shipping by default. If jurisdiction requires tax on shipping, a `tax_on_shipping` flag must be added.

3. **Price Snapshot in `OrderItem`:** Confirmed gap (`OrderItem` has no `price` or `color` field). A future migration must add these.

4. **Checkout Form Submission Method:** Should checkout use a single `POST` form (`checkout.html`) or multi-step AJAX? The architecture supports both. Recommended: standard `POST` form for simplicity, with server-side validation and redirect to a success page.

---

## 27. IMPLEMENTATION ORDER FOR TASK 14+ (APPROVED SEQUENCE)

Based on this architecture design:

1. **TASK 14:** Create `store/services/cart_service.py` (service layer design implemented here; code creation starts next).
2. **TASK 15:** Implement `/cart/add/`, `/cart/update/`, `/cart/remove/` endpoints (`store/views.py` + `store/urls.py` + `store/services/cart_service.py`).
3. **TASK 16:** Rewrite `templates/main/cart.html` to use `{% for item in cart_items %}` loop; write `static/js/cart.js` (non-empty).
4. **TASK 17:** Add empty cart state (`.empty-cart`), `aria-label` improvements, mobile touch target fixes (`cart.css`).
5. **TASK 18:** Implement `/cart/coupon/` endpoint (`Coupon` model may be needed; if minimal phase is preferred, basic validation can use a lightweight model or settings-based approach).
6. **TASK 19:** Update `checkout.html` to receive real context (`cart_items`, totals); update `checkout_page` view to pass context and handle `POST` order creation (`Order` + `OrderItem` with future price/color fields).
7. **TASK 20:** Connect `product_detail.js` `mini-cart-btn` to `/cart/add/` endpoint; implement event-based badge update.
8. **TASK 21:** Final responsive/accessibility polish and validation testing (manual browser tests for anonymous/authenticated, refresh persistence, stock changes, checkout flow).

---

## CONFIRMATION

- **No production files edited.** Verified by inspection of file modification timestamps (all unchanged from audit start).
- **No migrations created.** Confirmed (`store/migrations/` unchanged).
- **No new `.py` production files created.** Only this report (`TASK_13_CART_ARCHITECTURE_REPORT.md`) was written.
- **All analysis in English.** Confirmed.

---

END OF TASK 13 ARCHITECTURE REPORT.

STOP. Do NOT proceed to TASK 14 until instructed.
