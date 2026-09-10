# TASK 12 — CART DEEP AUDIT FINAL REPORT

**Status:** NO PRODUCTION FILES MODIFIED (confirmed).
**Audit scope:** cart.html, cart.css, cart.js, store/views.py, store/urls.py, store/models.py, product/detail templates/JS, products templates/JS, checkout, base_main.html, users/models, settings.py, payment app, existing AJAX patterns.

---

## 1. OVERALL CART STATUS

**Classification:** UI-ONLY / NON-FUNCTIONAL / BROKEN.
- `cart.html` is a static demo with hardcoded products (iPhone, Galaxy, Xiaomi).
- `cart.js` is 0 bytes (verified: length 0).
- `store/views.py::cart_show()` returns `render(request, 'main/cart.html')` with zero context.
- There is no `Cart` or `CartItem` model, no session-based cart logic, and no backend endpoint that accepts "add/update/remove" from the product detail "Add to Cart" button.
- `base_main.html` shows `<span class="cart-badge" id="cartBadge">0</span>` — permanently 0.

---

## 2. CURRENT ARCHITECTURE

- **Framework:** Django 6.0 + vanilla JavaScript + Bootstrap 5 + FontAwesome.
- **Session middleware:** Enabled (`django.contrib.sessions.middleware.SessionMiddleware`).
- **Auth model:** `users.PersonUser` (email-based). `store.Customer` (OneToOne with PersonUser) exists.
- **Product architecture:** `Product` (price, discount_price, is_active, is_available, final_price property, total_stock property via `ProductColor` sum). `ProductColor` has `stock`, `is_default`, `image`, `name`, `color_code`. `ProductImage` has `display_order`, `alt_text`. `ProductSpecification` exists.
- **Order architecture:** `Order` (customer FK, is_paid, total_price, status default=-1, method_auto) and `OrderItem` (order FK, product FK, quantity) exist. `store/untils.py` defines `STATUS_CHOICES`: `-1` Cancel, `0` Pending Pay, `1` approved, `2` shipped, `3` delivered.
- **Settings (`SettingSite`):** `enable_coupon` (True), `enable_discount_code` (True), `free_shipping_threshold` (Decimal), `tax_percent` (Decimal), `enable_guest_checkout` (True), `enable_wishlist` (True).
- **Payment app:** `payment/models.py` empty, `payment/views.py` empty, `payment/urls.py` empty.
- **AJAX pattern observed:** `products.js` uses `fetch()` with `X-Requested-With: XMLHttpRequest`, `Accept: application/json`, and `getCookie('csrftoken')`. Server returns `{"html": ..., "count": ..., "total_pages": ...}`. Quick View endpoint (`/get-product-details/<int:product_id>/`) returns product JSON.
- **No session/cart usage anywhere** in `.py` files (excluding `.venv`).

---

## 3. WHAT ALREADY WORKS

- Template inheritance (`cart.html` extends `base_main.html`).
- CSS styling (`cart.css`) — grid layout, colors, sticky summary sidebar, breadcrumbs, coupon box, responsive mobile break (`max-width: 991px`).
- Breadcrumb navigation (visual).
- `Proceed to Checkout` link button (visual only; no `href` or form action).
- `Continue Shopping` link (`{% url 'products' %}`).
- Page title (`Shopping Cart`).
- Product card layout (image, info, quantity controls layout, price display, remove icon layout, warranty text layout).
- Summary layout (Subtotal, Shipping Free, Discount -$100, Total, HR, checkout button).

---

## 4. WHAT IS UI-ONLY (NO BACKEND CONNECTION)

Every interactive element in the cart is UI-only:
- Product cards (`.cart-card`) — hardcoded HTML, no `for` loop over cart items.
- `+` / `-` buttons (`cart-quantity`) — no event handlers (`cart.js` empty).
- `remove-btn` (`fa-trash`) — no event handlers.
- `coupon-box` input + `Apply Coupon` button — no event handlers, no validation, no server endpoint.
- `checkout-btn` — no form submit, no `action`, no endpoint.
- `cart-subtitle` (`3 products in your cart`) — hardcoded text.
- `summary-row` values (`Subtotal $5,451`, `Discount -$100`, `Total $5,351`) — hardcoded.
- `cart-price` (`$2,951`, `$1,800`, `$700`) — hardcoded.
- `cart-color` (Orange, Black, Silver dots) — hardcoded.

---

## 5. WHAT IS BROKEN

- `cart.js` — 0 bytes. All interactivity broken.
- `store/views.py::cart_show` — no context passed to template. Template cannot render real cart data.
- `base_main.html::cartBadge` — always `0`. No dynamic update mechanism.
- `product_detail.html::mini-cart-btn` (`data-cart="buybox"` / `data-cart="minicard"`) — triggers `initQtyRowToggle()` which only toggles quantity row UI; second click calls `addToCartFeedback()` which shows a visual toast (`showCartToast`) but makes **zero server requests**. There is no `fetch()` to any cart endpoint.
- `checkout.html` — all summary values (`3 Items`, `$5,451`, `$5,351`) are static text with no server connection. Customer info form has no `action`, no `method`, no validation. Payment radios have no backend linkage.
- `checkout_page` view — returns empty render (`render(request, 'main/checkout.html')`) with zero context.
- No `Cart` or `CartItem` model exists; therefore cart persistence (database or session) is impossible as-is.

---

## 6. WHAT IS MISSING

- **Empty cart state:** No empty state message, image, or CTA in `cart.html`.
- **Dynamic product list:** Template uses hardcoded `<div class="cart-card">` blocks instead of iterating a context variable.
- **Product links:** Cart product names are `<h4>` text, not links to product detail.
- **Quantity validation:** No min/max limits tied to `ProductColor.stock`.
- **Stock awareness:** `cart-card` does not show in-stock / out-of-stock status or quantity limits.
- **Price source of truth:** Template hardcodes prices instead of reading `product.final_price` or `product.color` price snapshot.
- **Color selection in cart:** No mechanism to change selected `ProductColor` from cart.
- **Subtotal calculation:** Hardcoded `$5,451` instead of computed from quantities and prices.
- **Shipping logic:** Hardcoded `Free` instead of comparing against `SettingSite.free_shipping_threshold`.
- **Tax logic:** Not referenced anywhere in cart/checkout (`tax_percent` exists but unused).
- **Discount/coupon persistence:** `enable_coupon` exists but no `Coupon` model or validation logic.
- **Cart persistence:** No session key (`request.session`), no cookie mechanism, no DB table.
- **AJAX endpoints:** No `/cart/add/`, `/cart/update/`, `/cart/remove/`, `/cart/apply-coupon/` URLs or views.
- **Cart badge update:** No JS to read session/DB cart count and update `#cartBadge`.
- **Checkout integration:** `checkout.html` is disconnected from any `Order` creation logic (`store/views.py` has no checkout processing view).
- **Order creation flow:** No mechanism to convert cart items into `Order`/`OrderItem` records.
- **Authentication linkage:** No distinction between anonymous guest cart (`enable_guest_checkout` exists but unused) and authenticated user cart.
- **Accessibility:** `quantity` buttons lack `aria-label`. `remove-btn` lacks `aria-label`. `coupon-box` input lacks `<label>`. No `aria-live` region for feedback.
- **Loading/error states:** No skeleton loader, no disabled button state during AJAX, no error message container.

---

## 7. FULL PRODUCT → CART → CHECKOUT → PAYMENT FLOW ANALYSIS

### Step 1: Product Card (`templates/main/includes/product_card.html`)
- **Status:** COMPLETE (visual).
- **Connection to Cart:** MISSING. No `Add to Cart` button in product card.

### Step 2: Product Detail (`product_detail.html`)
- **Status:** PARTIALLY IMPLEMENTED (visual + quantity stepper).
- **Add to Cart button (`mini-cart-btn`):** UI ONLY. No `fetch()` to server. No endpoint.
- **Quantity stepper (`qty-stepper`):** Works visually (`initQuantitySteppers()` / `initQtyRowToggle()`).
- **Color selection (`color-item`):** Works visually (`selectColor()` updates image and `colorName`).
- **Quick View (`p1-quickview`):** Connected to `/get-product-details/<id>/` (AJAX JSON works).
- **Wishlist (`wishlist-btn`):** Connected (`/wishlist/add/<id>/` POST with CSRF cookie).

### Step 3: Add to Cart (intended transition)
- **Status:** MISSING / BROKEN.
- **Endpoint:** Does not exist in `store/urls.py`.
- **Data passed:** None.
- **Server-side:** None.
- **Client-side:** Only toast animation.
- **Persistence:** None (no session, no DB record).

### Step 4: Cart Page (`cart.html`)
- **Status:** UI ONLY / BROKEN.
- **Data source:** Hardcoded HTML.
- **Quantity changes:** No endpoint.
- **Remove item:** No endpoint.
- **Coupon apply:** No endpoint / no model.

### Step 5: Update Quantity (intended transition)
- **Status:** MISSING.
- **AJAX endpoint:** Missing.
- **Validation:** None.

### Step 6: Remove Item (intended transition)
- **Status:** MISSING.
- **AJAX endpoint:** Missing.
- **Feedback:** None.

### Step 7: Coupon (intended transition)
- **Status:** MISSING.
- **Model:** No `Coupon` model (only `SettingSite.enable_coupon`).
- **Validation:** None.
- **Calculation:** None.

### Step 8: Checkout (`checkout.html`)
- **Status:** UI ONLY / BROKEN.
- **View (`checkout_page`):** Empty render. No context.
- **Form:** No `action`, no `method`, no `csrf_token` tag.
- **Data connection:** Hardcoded (`3 Items`, prices).
- **Order creation:** None.

### Step 9: Payment (`payment/`)
- **Status:** EMPTY.
- **App:** `models.py` empty, `views.py` empty, `urls.py` empty.

### Step 10: Persistence / Refresh
- **Status:** BROKEN.
- Adding/removing items does not survive page refresh because nothing is stored.

---

## 8. RECOMMENDED CART ARCHITECTURE

**Choice:** Session-based temporary cart (dictionary in `request.session`), with checkout converting session data to `Order` + `OrderItem`.

**Why session-based fits best:**
- `django.contrib.sessions.middleware.SessionMiddleware` is already enabled.
- `SettingSite.enable_guest_checkout` implies anonymous users must be supported.
- No new DB table is strictly required for temporary cart storage (aligns with "DO NOT overengineer").
- Existing `Order`/`OrderItem` can represent finalized orders after checkout.
- Existing `ProductColor` provides color selection and stock (`stock` field).
- Existing `SettingSite` provides coupon settings (`enable_coupon`, `free_shipping_threshold`, `tax_percent`).

**Session structure proposal:**
```python
request.session['cart'] = {
    str(product.id): {
        'quantity': int,
        'color_id': int,  # references ProductColor.id
        'price_snapshot': int,  # product.final_price at time of add
    }
}
```

**Why price snapshot is required:**
- Server must remain source of truth for price (`Product.final_price`), discount, and stock.
- Client-side `addToCartFeedback()` currently shows toast without server validation — this must not be trusted.

**Why `color_id` is required:**
- `ProductColor` has `stock` and `is_default`. The cart item must reference a specific color to validate availability and compute subtotals correctly.

---

## 9. DATABASE / MODEL ANALYSIS (WHAT EXISTS VS WHAT'S NEEDED)

**Existing relevant models (no new DB model required for basic session cart):**

| Model | Key Fields | Relevance to Cart |
|---|---|---|
| `Product` | `price`, `discount_price`, `final_price` (property), `is_active`, `is_available` | Source of truth for item identity, price, availability |
| `ProductColor` | `product` (FK), `name`, `color_code`, `image`, `stock`, `is_default` | Source of truth for selected variant, stock validation |
| `ProductImage` | `product` (FK), `image`, `alt_text`, `display_order` | Image display in cart |
| `ProductSpecification` | `product` (FK), `group`, `title`, `value` | Optional specs display (e.g., warranty text) |
| `Order` | `customer` (FK, nullable), `is_paid`, `total_price`, `status` (default -1), `created_at` | Final order record after checkout |
| `OrderItem` | `order` (FK), `product` (FK), `quantity` | Final order line item |
| `Customer` | `user` (FK, OneToOne), `phone`, `address` | Checkout address/data linkage |
| `SettingSite` | `enable_coupon`, `enable_discount_code`, `free_shipping_threshold`, `tax_percent`, `enable_guest_checkout` | Cart settings (shipping thresholds, tax, guest checkout) |

**What is NOT needed immediately:**
- A dedicated `Cart` / `CartItem` DB model (session-based approach avoids it).
- A `Coupon` DB model is optional for the first phase; coupon validation can start with a basic `SettingSite`-linked mechanism or a new lightweight `Coupon` model if required later.

**Important note on `Order` default status:**
- `Order.status` defaults to `-1` (`Cancel` per `store/untils.py`). A new checkout flow should create orders with `status=0` (`Pending Pay`) when the user initiates checkout.

---

## 10. SECURITY / DATA INTEGRITY AUDIT

**Findings:**

1. **No server-side price protection:** `cart.html` hardcodes `price` (`$2,951`, `$1,800`, `$700`). If this were dynamic, the server must compute `final_price` from `Product` model, not trust client values.
2. **No CSRF on non-existent endpoints:** Since no cart endpoints exist, there is no CSRF exposure, but any new endpoint (`/cart/add/`, etc.) must use `@csrf_exempt` only if necessary and must include CSRF for POST (`getCookie('csrftoken')` is the existing pattern in `product_detail.js`).
3. **No stock validation:** `ProductColor.stock` is available but never checked during add/update/remove.
4. **No quantity validation:** Client-side quantity buttons (`qty-minus`, `qty-plus`) have no server-side max/min validation tied to stock.
5. **No product existence check:** A malicious request could reference non-existent `product_id`; server must validate with `get_object_or_404` or equivalent.
6. **No price manipulation protection:** Any future AJAX endpoint must re-calculate subtotal from `request.session['cart']` using `product.final_price`, never using prices submitted by JavaScript.
7. **Anonymous vs authenticated:** `enable_guest_checkout` implies both anonymous (`request.session`) and authenticated (`request.user.customer`) must work. Session cart should work for both; at checkout, anonymous users provide info, authenticated users use `Customer` model.

**Recommendations:**
- Server must recalculate totals from session data at every request.
- Client-side `cart.js` can send `product_id`, `quantity`, `color_id`, but server must verify price/stock/availability independently.
- Do not trust any `total` or `subtotal` value sent by JavaScript.

---

## 11. AJAX ARCHITECTURE RECOMMENDATION

**Reuse existing pattern (`products.js`):**

- `GET` for loading state (filter/sort).
- `POST` for actions requiring state change (add/update/remove/coupon).
- Headers: `X-Requested-With: XMLHttpRequest`, `Accept: application/json`.
- CSRF: `X-CSRFToken` from `getCookie('csrftoken')` (existing function in `product_detail.js`).
- Response structure:
  - Success: `{"success": true, "cart": {...}, "badge": 5, "subtotal": 2951, ...}`
  - Error: `{"success": false, "error": "Product out of stock."}`

**Ideal endpoint design (to match existing patterns):**

| Action | Method | URL Pattern | Request Body | Response Key Data |
|---|---|---|---|---|
| Add to Cart | POST | `/cart/add/` | `product_id`, `quantity`, `color_id` | `cart`, `badge`, `item_subtotal` |
| Update Quantity | POST | `/cart/update/` | `product_id`, `quantity`, `color_id` | `cart`, `badge`, `subtotal` |
| Remove Item | POST | `/cart/remove/` | `product_id` | `cart`, `badge`, `subtotal` |
| Apply Coupon | POST | `/cart/coupon/` | `code` | `cart`, `discount`, `subtotal`, `total` |
| Get Cart State | GET | `/cart/state/` | — | `cart`, `badge`, `subtotal`, `total` |

**Loading states:**
- `cart.js` should create a temporary overlay (`.loading-overlay`) or disable buttons (`btn.disabled = true`) during `fetch()`.
- `hideLoadingState()` / `showLoadingState()` patterns from `products.js` should be reused.

**Success feedback:**
- `showCartToast()` (existing in `product_detail.js`) can be reused or adapted.
- Badge update (`#cartBadge`) must update from response (`data.badge`).

---

## 12. UX / UI AUDIT

### Visual Hierarchy
- **Good:** Clear grid layout (`cart-layout`: `2fr 380px`), sticky `cart-summary` sidebar, breadcrumb, subtitle count.
- **Poor:** `cart-subtitle` (`3 products in your cart`) is hardcoded. Should read from session/cart count.

### Product Information Clarity
- **Good:** Image, name, color dot (`.color-dot`), warranty (`.cart-warranty` with `fa-shield-halved`).
- **Poor:** No link from product name (`<h4>`) to `product_detail`. No category label. No `sku` or `brand` reference.

### Quantity Controls
- **Good:** Centered flex layout (`cart-quantity`), green buttons (`#198754`), clear `+` / `-` labels.
- **Poor:** Buttons too small (`35px`) for mobile touch targets. No `aria-label` on buttons (`-` means "decrease" or "remove"?). No `min`/`max` indicator.

### Remove Interaction
- **Good:** Red trash icon (`fa-trash`) clearly indicates destructive action.
- **Poor:** No confirmation dialog, no `aria-label`, no hover tooltip.

### Coupon UX
- **Good:** Flex layout (`coupon-box`), rounded input (`border-radius: 10px`), green apply button.
- **Poor:** No `<label>` for input. No error/success message area. No persistence state display.

### Summary Clarity
- **Good:** `summary-row` aligns text left/value right, `summary-total` bold and larger (`20px`), `checkout-btn` full width (`100%`), green (`#198754`).
- **Poor:** Hardcoded values. No tax line (`tax_percent` exists but not shown). No `free_shipping_threshold` comparison logic.

### CTA Hierarchy
- **Good:** Primary `checkout-btn` (green, full width). Secondary `continue-shopping` link (text, green, centered).
- **Poor:** No disabled/loading state for checkout button.

### Empty State
- **Missing:** No `.empty-cart` container, no message (`"Your cart is empty."`), no image/icon, no CTA (`"Continue Shopping"`).

### Loading / Error / Success States
- **Missing:** No loading skeleton. No error message container. Success feedback relies on external toast mechanism (not implemented for cart).

### Mobile Layout
- `@media (max-width: 991px)`: `cart-layout` becomes `1fr`, `.cart-card` grid becomes `1fr`, text centered, image centered (`margin: auto`). `cart-summary` loses sticky (`position: static`).
- **Issues:** `.cart-card` grid (`grid-template-columns: 120px 1fr 130px 120px 50px`) collapses to single column (`1fr`), which is safe. However, quantity buttons (`35px`) and price text (`18px`) may become too small for touch at `375px` width.

### Accessibility
- `breadcrumb-box` has no `aria-label="Breadcrumb"` (exists in `products.html` but not `cart.html`).
- `cart-quantity` buttons have no `aria-label`.
- `remove-btn` has no `aria-label`.
- `checkout-btn` has no `aria-label`.
- `continue-shopping` link has `href` but no descriptive text beyond visual.
- `cart-subtitle` is a `<p>` with no semantic count reference (`aria-live` needed for updates).

---

## 13. RESPONSIVE AUDIT

### Breakpoints tested (based on `cart.css` and `checkout.css`):

| Breakpoint | Behavior | Issues |
|---|---|---|
| `1366×768` (desktop) | `grid-template-columns: 2fr 380px`. Sticky sidebar (`top: 120px`). | None major. `container` max-width `1624px` safe. |
| `1024×768` (tablet landscape) | Same as desktop; `380px` sidebar may become narrow but acceptable. | `.cart-card` image (`100px`) + info (`1fr`) + quantity (`130px`) + price (`120px`) + remove (`50px`) = fits within `~800px` content width. Safe. |
| `768×1024` (tablet portrait) | `grid-template-columns: 2fr 380px`. At `768px`, `380px` sidebar takes ~50% width; content area ~`384px`. | `.cart-card` single row (`120px + 1fr + 130px + 120px + 50px`) may overflow `384px`. Needs verification; `gap: 20px` makes it tight. Potential overflow. |
| `390×844` (mobile) | `grid-template-columns: 1fr` (stacked). `.cart-card` becomes `1fr`, centered. `.cart-summary` `position: static`. | `.cart-card` stacked is safe. `.coupon-box` (`flex`) may wrap poorly; safe. `.checkout-summary` sticky removed (`static`) — safe. |
| `375×667` (small mobile) | Same as above. | `.cart-card` image (`100px` width) + centered text fits. `.checkout-btn` (`width: 100%`, `padding: 14px`) fits. No overflow expected. |

**Potential overflow risks:**
- At `768px` portrait, `.cart-card` fixed-width grid may overflow. Consider `minmax(0, 1fr)` or allowing wrap (`grid-template-columns: repeat(auto-fit, ...)`). Not critical for initial implementation but should be monitored.
- `.checkout-layout` (`grid-template-columns: 2fr 380px`) at `768px` portrait: `380px` sidebar may squeeze content. Already handled (`1fr` at `991px`).

---

## 14. EXACT IMPLEMENTATION ROADMAP

**Task names tailored to this project (not generic):**

### TASK 13 — SESSION-BASED CART ARCHITECTURE
- **Files:** `store/views.py`, `store/urls.py`, `store/services/cart_service.py` (new utility, optional).
- **Why:** No `Cart` model exists; session middleware enabled; `enable_guest_checkout` requires anonymous support.
- **Changes:**
  - Define `request.session['cart']` structure (`{product_id: {'quantity': int, 'color_id': int}}`).
  - Helper functions: `get_cart_items()`, `get_cart_subtotal()`, `get_cart_badge()`.
  - Reuse `store/untils.py` patterns (if needed, create `store/services/cart_service.py` instead of cluttering `views.py`).
- **Risk:** Low.
- **Dependencies:** None.

### TASK 14 — ADD TO CART (SERVER ENDPOINT + JS)
- **Files:** `store/views.py`, `store/urls.py`, `templates/main/product_detail.html` (update button behavior), `static/js/cart.js` (new file) or reuse `product_detail.js`.
- **Why:** `product_detail.js::addToCartFeedback()` is visual only. Must connect to server.
- **Changes:**
  - POST endpoint (e.g., `/cart/add/`) receiving `product_id`, `quantity`, `color_id`.
  - Server validates `Product` exists (`get_object_or_404`), `is_active`, `is_available`, `ProductColor` exists if `color_id` provided, `quantity <= color.stock`, `quantity >= 1`.
  - Updates `request.session['cart']`.
  - Returns JSON `{"success": true, "badge": N, ...}`.
  - Update `mini-cart-btn` event listener in `product_detail.js` (or `cart.js`) to call `fetch()` with `getCookie('csrftoken')`.
- **Security:** Do not trust prices from JS; compute `product.final_price` server-side.
- **Risk:** Medium (affects product detail interaction).

### TASK 15 — CART RENDERING (DYNAMIC TEMPLATE + VIEW)
- **Files:** `store/views.py` (`cart_show`), `templates/main/cart.html`, `store/services/cart_service.py`.
- **Why:** `cart.html` is static; `cart_show` passes no context.
- **Changes:**
  - `cart_show` reads `request.session['cart']`, validates products/colors, builds context `cart_items` list with computed fields (`image`, `name`, `color_name`, `price`, `subtotal`, `total_quantity`).
  - Template loops `{% for item in cart_items %}` replacing hardcoded `.cart-card` blocks.
  - Dynamic `cart-subtitle` (`{{ total_quantity }} products in your cart`).
  - Dynamic `cart-price` (`{{ item.subtotal }}`).
  - Dynamic `cart-summary` values computed from `cart_items` (subtotal, discount from coupon, total).
- **Risk:** Low.
- **Dependencies:** TASK 13.

### TASK 16 — QUANTITY / REMOVE AJAX + CART BADGE
- **Files:** `store/views.py` (new endpoints), `store/urls.py`, `static/js/cart.js` (new, non-empty), `templates/main/base/base_main.html` (badge update logic).
- **Why:** `cart.js` is empty; `base_main.html` badge is always 0.
- **Changes:**
  - POST `/cart/update/` (`product_id`, `quantity`, `color_id`) — validates quantity, updates session, returns updated totals and badge.
  - POST `/cart/remove/` (`product_id`) — removes from session, returns updated totals and badge.
  - `cart.js`: event delegation (`document.querySelector('.cart-items').addEventListener('click', ...)`) for `+`/`-` and `remove-btn`.
  - `base_main.html`: add small inline script (or `cart.js` included globally) to update `#cartBadge` after AJAX responses.
  - Empty cart detection: if `cart_items` is empty, render `.empty-cart` section (new HTML block).
- **Security:** Re-calculate totals server-side; never trust client totals.
- **Risk:** Medium (interactive core).
- **Dependencies:** TASK 13, TASK 14.

### TASK 17 — COUPON (BASIC VALIDATION + CALCULATION)
- **Files:** `store/models.py` (optional `Coupon` model), `store/views.py`, `store/urls.py`, `templates/main/cart.html`.
- **Why:** `SettingSite.enable_coupon` exists; no `Coupon` model or logic.
- **Changes:**
  - Option A (lightweight): Create `Coupon` model (`code`, `discount_amount`/`percent`, `is_active`, `valid_from`, `valid_to`).
  - Option B (minimal): Basic hardcoded coupon validation for first phase (if user wants minimal implementation). But since audit requires understanding architecture, recommend Option A.
  - POST `/cart/coupon/` (`code`).
  - Validation: code exists, active, within date range (optional for first phase).
  - Apply discount to session or compute dynamically in `cart_service`.
  - Update `summary-row` (`Discount`) dynamically.
  - Template shows applied coupon name/code and allows removal (`Remove` button next to input).
- **Risk:** Low-Medium.
- **Dependencies:** TASK 13 (session structure).

### TASK 18 — CHECKOUT INTEGRATION (VIEW + FORM + ORDER CREATION)
- **Files:** `store/views.py` (`checkout_page`), `templates/main/checkout.html`, `store/urls.py` (if new checkout POST needed), `store/models.py` (if new model needed; not needed if using existing `Order`/`OrderItem`).
- **Why:** `checkout.html` is static; `checkout_page` returns empty render.
- **Changes:**
  - `checkout_page` passes `cart_items`, `subtotal`, `shipping`, `discount`, `total` to template.
  - `checkout.html` fills summary rows (`summary-row`) dynamically (`{{ cart_items|length }} Items`).
  - Customer info form connects to `Customer` model for authenticated users; anonymous users provide info in form (stored temporarily or passed to order creation).
  - Add `action` and `method="POST"` to checkout form (or separate form sections with AJAX for simplicity, or standard POST).
  - POST endpoint `/checkout/` validates cart is not empty, creates `Order` (`status=0`, `customer=request.user.customer` if authenticated else `None`), creates `OrderItem` records, clears `request.session['cart']`.
  - Redirect to `checkout` or show success page (`checkout.html` can include success message block).
- **Security:** Validate all prices/subtotals server-side before creating `Order`. Ensure `total_price` equals computed sum.
- **Risk:** High (affects data persistence and user flow).
- **Dependencies:** TASK 13, TASK 15, TASK 16.

### TASK 19 — PRODUCT DETAIL ADD-TO-CART REFINEMENT
- **Files:** `templates/main/product_detail.html`, `static/js/product_detail.js`.
- **Why:** Existing `mini-cart-btn` only shows quantity row. Must send data to server.
- **Changes:**
  - Modify `initQtyRowToggle()` so that second click on open quantity row (or a dedicated `Add to Cart` action) sends `fetch()` POST to `/cart/add/`.
  - Pass `product_id` (`btn.closest('.buy-box, .mini-product-card').dataset.productId` or derived from button context), `quantity` (`qty-value` text), `color_id` (`document.querySelector('.color-item.active')` dataset).
  - Show loading state on button; update `cartBadge` in `base_main.html` upon response.
- **Risk:** Low.
- **Dependencies:** TASK 14.

### TASK 20 — RESPONSIVE / UX POLISH + ACCESSIBILITY
- **Files:** `static/css/cart.css`, `templates/main/cart.html`, `static/js/cart.js`.
- **Why:** Mobile quantity controls, missing `aria-label`, no empty state.
- **Changes:**
  - Add `.empty-cart` HTML block (`.cart-page` > `.empty-state`).
  - Add `aria-label` to `+`/`-` buttons (`"Increase quantity"`, `"Decrease quantity"` or `"Remove item"` when at 1).
  - Add `aria-label` to `.remove-btn` (`"Remove product"`).
  - Add `<label for="couponInput">` linking to coupon input.
  - Improve touch target size for `.cart-quantity button` (`min-width: 44px`, `min-height: 44px` for mobile).
  - Add `aria-live="polite"` region in `.cart-summary` (or near `.checkout-btn`) for AJAX updates.
  - Ensure `.cart-card` does not overflow at `768px` (add `min-width: 0` to grid columns or allow wrap if needed).
- **Risk:** Low.
- **Dependencies:** TASK 15, TASK 16.

---

## 15. EXACT FILES THAT WOULD CHANGE PER TASK

| Task | Files to Modify / Create |
|---|---|
| TASK 13 | `store/services/cart_service.py` (new, optional), `store/urls.py`, `store/views.py` |
| TASK 14 | `store/urls.py`, `store/views.py`, `static/js/cart.js` (new/rewrite), `templates/main/product_detail.html` (minor), `static/js/product_detail.js` (modify listener) |
| TASK 15 | `store/views.py`, `templates/main/cart.html`, `store/services/cart_service.py` |
| TASK 16 | `store/urls.py`, `store/views.py`, `templates/main/cart.html` (empty state block), `static/js/cart.js` (new/rewrite), `templates/main/base/base_main.html` (badge script) |
| TASK 17 | `store/models.py` (optional `Coupon`), `store/urls.py`, `store/views.py`, `templates/main/cart.html` |
| TASK 18 | `store/views.py`, `store/urls.py`, `templates/main/checkout.html`, `store/untils.py` (optional status helper) |
| TASK 19 | `static/js/product_detail.js`, `templates/main/product_detail.html` |
| TASK 20 | `static/css/cart.css`, `templates/main/cart.html`, `static/js/cart.js` |

---

## 16. RISK ASSESSMENT

| Task | Risk Level | Reason |
|---|---|---|
| TASK 13 | Low | Session dictionary; no DB migration needed. |
| TASK 14 | Medium | Changes product detail interaction; must handle `ProductColor` selection correctly. |
| TASK 15 | Low | Template loop; uses session data only. |
| TASK 16 | Medium | Core interactive behavior; affects quantity/remove/coupon flow; needs robust error handling. |
| TASK 17 | Low-Medium | Optional model creation (`Coupon`); requires validation logic. |
| TASK 18 | High | Creates persistent `Order` records; must prevent duplicate orders, validate totals, handle anonymous/authenticated users correctly. |
| TASK 19 | Low | Extends existing `product_detail.js` event flow. |
| TASK 20 | Low | CSS/accessibility tweaks; no logic changes. |

---

## 17. VALIDATION STRATEGY

For every task, validate as follows:

1. **Manual browser test:** Add item from `product_detail.html`, navigate to `/cart/`, verify dynamic rendering.
2. **Quantity test:** Click `+` / `-`, verify session updates and totals recalculate (not hardcoded).
3. **Remove test:** Click trash, verify item removed and `#cartBadge` updates.
4. **Refresh persistence:** Refresh `/cart/` after add/update/remove; session must persist.
5. **Anonymous test:** Test in incognito mode (no login); session must work (`enable_guest_checkout` must be respected).
6. **Authenticated test:** Login; verify `Customer` link available but session cart works independently.
7. **Checkout test:** Proceed to checkout; verify `checkout.html` receives real totals; submit creates `Order` with `status=0` and correct `OrderItem` records; session cleared.
8. **Security test:** Send malicious `quantity` (`9999`) or `color_id` (non-existent); server must return `success: false` and not corrupt session.
9. **Responsive test:** Resize to `390px`, `768px`, `1024px`; verify no overflow and touch targets work.
10. **Accessibility test:** Use keyboard navigation (`Tab`, `Enter`) on quantity buttons, coupon input, checkout button; verify focus states (`outline`) visible.

---

## 18. CONFIRMATION: NO PRODUCTION FILES MODIFIED

Confirmed by inspection:
- `cart.html`, `cart.css`, `cart.js`, `store/views.py`, `store/urls.py`, `store/models.py`, `templates/main/checkout.html`, `templates/main/product_detail.html`, `templates/main/base/base_main.html`, `static/js/product_detail.js`, `static/js/products.js`, `store/untils.py`, `payment/*`, `users/*`, `tb_sas/settings.py` — **all unchanged**.
- Only temporary audit commands executed (`Get-ChildItem`, `Select-String`, `cat` equivalent via `Read` tool) — no edits, no writes to production paths.
- `cart.js` remains 0 bytes.

---

## SUMMARY

**Current state:** The Cart page is a static UI demo (`UI ONLY`) with a broken interaction chain (`cart.js` empty, no backend endpoints, hardcoded data). The project has all the foundational components (`ProductColor` for stock, `Order`/`OrderItem` for checkout, session middleware, AJAX patterns in `products.js`, CSRF cookie handling) to build a real session-based cart without inventing unnecessary architecture. The recommended approach is session-based (`request.session['cart']`), with checkout converting to existing `Order` records, avoiding unnecessary new DB models for temporary cart storage.

**Next step:** Wait for instruction before starting implementation tasks (TASK 13+).
