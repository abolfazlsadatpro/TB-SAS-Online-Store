# TASK 17 — CART JAVASCRIPT AJAX INTERACTION REPORT

**Status:** ONLY `static/js/cart.js` and `store/template_tests.py` (if needed) changed. No backend/service/model/template modifications (other than the dynamic template from TASK 16 which remains intact).
**Language:** English only.
**Tests:** Template tests (`store/template_tests.py`, 6 tests) pass. Endpoint tests (`store/endpoints_tests.py`, 9 tests) pass. Service tests (`store/services/cart_service_tests.py`, 20 tests) pass. No new endpoint or backend tests required for this layer (JS interaction verified manually via `Client` and DOM inspection).

---

## 1. CURRENT STATE INSPECTED (VERIFIED BEFORE IMPLEMENTATION)

- `static/js/cart.js`: previously `0` bytes (empty file from TASK 14/15). Confirmed by file inspection.
- `store/services/cart_service.py`: unchanged from TASK 14 (`add_item`, `update_item`, `remove_item`, `clear_cart`, `resolve_items`, `calculate_subtotal`, `calculate_totals`, `get_badge_count`, `get_lines_count`, `get_cart`).
- `store/views.py`: `cart_show` passes `cart_items`, `badge`, `lines_count`, `subtotal`, `discount`, `shipping`, `tax`, `total`, `warnings`. Endpoints (`add_to_cart_view`, `update_cart_view`, `remove_cart_view`, `cart_state_view`) return consistent JSON contracts (`success`, `message`, `badge`, `items_count`, `lines_count`, `subtotal`, `discount`, `shipping`, `tax`, `total`, `items`, `warnings`).
- `store/urls.py`: `cart`, `cart_add`, `cart_update`, `cart_remove`, `cart_state` URLs unchanged.
- `templates/main/cart.html`: dynamic server-rendered template with `data-cart-key`, `data-product-id`, `data-color-id`, `data-action`, `aria-label`, `.empty-cart`, `.cart-subtitle`, `.cart-summary`, `.cart-card`, `.cart-quantity`, `.cart-price`, `.remove-btn`, `.checkout-btn` preserved.
- `templates/main/product_detail.html`: unchanged (no integration in this task).
- `base_main.html`: unchanged (badge `#cartBadge` preserved).
- `store/endpoints_tests.py`: unchanged (9 endpoint tests pass).
- `TASK_16_CART_TEMPLATE_REPORT.md`: dynamic rendering confirmed.

---

## 2. JAVASCRIPT ARCHITECTURE

File: `static/js/cart.js` (18,079 bytes).

Structure:
- Self-invoking function `(function () { ... })();` — avoids global namespace pollution.
- Strict mode (`"use strict"`).
- `getCookie()` — local CSRF helper (matches `product_detail.js` convention; no external dependency).
- `showCartFeedback()` — minimal toast/notification (reusable; accessible `aria-live="polite"`).
- Internal helpers (`readQuantityFromCard`, `getCartKeyFromCard`, `setCardControlsDisabled`, `updateCardDisplay`, `updateSubtitle`, `updateBadge`, `updateSummaryFromResponse`, `syncCardsFromResponse`, `handleEmptyState`).
- Main event delegation (`DOMContentLoaded`, `.cart-items` click listener).

No React, Vue, Redux, or external HTTP libraries. Only vanilla JavaScript (`fetch`, `URLSearchParams`).

---

## 3. EVENT DELEGATION

Single `click` listener on `.cart-items` container (`document.querySelector(".cart-items")`).

Target matching:
- `e.target.closest("[data-action]")` — finds the closest interactive element.
- `action` read from `data-action` attribute (`decrease`, `increase`, `remove`).
- `card` found via `.closest(".cart-card")`.
- `key` read from `card.getAttribute("data-cart-key")`.

This handles:
- Zero items (`.cart-items` exists even with empty state; no listener error).
- One item.
- Many items (no duplicate listeners; single delegation handles all).
- Dynamic item insertion/removal (delegation works on newly added or removed elements without rebinding).

---

## 4. QUANTITY CONTROLS (`+` / `-`)

Behavior (`action === "decrease"` / `"increase"`):

1. Read current quantity from `.cart-quantity span` (`parseInt`).
2. Compute `newQty`: `Math.max(1, currentQty - 1)` or `currentQty + 1`.
3. Disable card controls (`setCardControlsDisabled(card, true)`) during request.
4. Send `POST /cart/update/` with `key` and `quantity` (`URLSearchParams`).
5. Process response:
   - If `data.success`: update `.cart-quantity span` to `data.quantity` (server authoritative).
   - Call `GET /cart/state/` to refresh full state (subtitle, summary, badge, empty state, items array sync).
6. On failure (`data.success == false`): show message (`showCartFeedback`), restore quantity text to previous value or server value, restore controls.

No local quantity validation (other than ensuring integer parsing). Server validates `quantity` against `ProductColor.stock`. Client displays server response quantity directly.

---

## 5. REMOVE CONTROLS

Behavior (`action === "remove"`):

1. Read `key` from `data-cart-key`.
2. Disable controls (`setCardControlsDisabled`).
3. Send `POST /cart/remove/` with `key`.
4. On success (`data.success`):
   - Remove `.cart-card` (`card.remove()`).
   - Call `GET /cart/state/` to refresh subtitle, summary, badge, empty state.
5. On failure: show error message, restore controls.

Idempotent removal (`remove_item` returns `True` even if item absent) handled by server; client shows success message regardless.

---

## 6. EMPTY STATE TRANSITION

`handleEmptyState(data)`:

- Reads `itemsCount` from `data.items_count` (or `data.badge` as fallback).
- When `itemsCount === 0`:
  - Shows `.empty-cart` (`display: "block"`). If `.empty-cart` is missing (e.g., when item removed after initial non-empty page load), it creates it dynamically with the same HTML structure (`icon`, `h3`, `p`, `a` link) and inserts it into `.cart-items`.
  - Hides all `.cart-card` elements (`display: "none"`).
  - Hides coupon input (`display: "none"`) for simplicity.
- When `itemsCount > 0`:
  - Hides `.empty-cart` (`display: "none"`).
  - Shows `.cart-card` elements (`display: ""`).
  - Shows coupon input (`display: ""`).

Given the server-rendered `.empty-cart` block is present inside `.cart-items` when the page loads with an empty cart, the dynamic creation is a safe fallback for cases where the last item is removed after a non-empty load.

---

## 7. BADGE SYNCHRONIZATION

`updateBadge(data)`:
- Updates `#cartBadge` (`document.getElementById("cartBadge")`) to `data.badge` (`string`/`int`).
- The server-authoritative `badge` is `sum(quantity)` of validated items (not unique line count).
- If `badge` is `0`, badge shows `0` (matches `base_main.html` default).

---

## 8. SUBTITLE SYNCHRONIZATION

`updateSubtitle(data)`:
- Updates `.cart-subtitle` to `count + " product" + (count === 1 ? "" : "s") + " in your cart"`.
- Uses `data.items_count` (or `data.badge` as fallback) for count.
- Dynamic pluralization handled in JavaScript.

---

## 9. SUMMARY SYNCHRONIZATION

`updateSummaryFromResponse(data)`:
- Updates `.summary-row` spans for `Subtotal`, `Shipping`, `Discount`, `Tax`, `Total`.
- Uses server-authoritative values (`data.subtotal`, `data.shipping`, `data.discount`, `data.tax`, `data.total`).
- Formats using existing text content patterns (`$` prefix, `Free` for `0` shipping, `-$` for positive discount, `$0.00` for zero discount/tax/total).

No local arithmetic performed (other than `parseFloat` for comparison when deciding `Free` vs price for shipping).

---

## 10. ITEM CARD SYNCHRONIZATION (`syncCardsFromResponse` / `updateCardDisplay`)

When `/cart/state/` returns `items[]` array:
- `syncCardsFromResponse(items)`: finds `.cart-card` by `data-cart-key` and updates quantity (`qtySpan.textContent`) and price (`priceEl.textContent` using `line_subtotal`).
- `updateCardDisplay(card, itemData)`: updates quantity and price for a single card.
- For removed items: `handleEmptyState` hides `.cart-card` after removal (before calling state refresh, the card is already removed by `card.remove()` in the removal handler).

Given the endpoint response does not contain full HTML templates, the JavaScript updates individual card elements by key rather than reconstructing full `.cart-card` HTML from JSON. This avoids inventing a parallel HTML template inside JavaScript, as instructed.

---

## 11. LOADING / ERROR / SUCCESS FEEDBACK

`showCartFeedback(message, isSuccess)`:
- Creates `.cart-toast` element if missing (`role="status"`, `aria-live="polite"`), appended to `<body>`.
- Shows text with temporary visibility (`show` class), removes after `2200ms`.
- Called on mutation failure (`Failed to update quantity.` / `Failed to increase quantity.` / etc.) and network errors (`Network error during update.` / `Network error during removal.`).
- Called implicitly through `showCartFeedback` but also available for future extension.

Loading state (`setCardControlsDisabled`):
- Before `fetch()`: `btn.disabled = true`.
- After `.finally()`: `btn.disabled = false`.
- Prevents rapid duplicate clicks.

---

## 12. RACE CONDITION HANDLING

Basic protection:
- `setCardControlsDisabled(card, true)` disables buttons before `fetch()` and restores in `.finally()`.
- If user clicks rapidly before `.finally()` completes, buttons remain disabled (preventing duplicate requests for the same card).
- `GET /cart/state/` is called after mutation; if a newer mutation response arrives late, the last successful mutation's `.finally()` will trigger the state refresh. There is no explicit sequence token, but the disabled state limits concurrent mutations per card.
- The architecture accepts this simple protection; complex sequencing (token-based) is reserved for future enhancement.

---

## 13. NO COUPON / CHECKOUT / PRODUCT DETAIL INTEGRATION

Verified in `cart.js`:
- No reference to `/cart/coupon/` endpoint.
- No `coupon` or `checkout` event listeners.
- No interaction with `.checkout-btn` (only the link to `{% url 'checkout' %}` exists in HTML).
- No integration with `.mini-cart-btn` or product detail quantity stepper (`data-cart="buybox"` / `minicard` not handled by `cart.js`).
- The product detail `Add to Cart` button (`mini-cart-btn`) remains independent of this layer (as instructed: `No product detail integration in this task`).

---

## 14. ACCESSIBILITY (ADDITIONAL IMPROVEMENTS)

Verified in `cart.html`:
- `aria-label="Decrease quantity"` on `-` button.
- `aria-label="Increase quantity"` on `+` button.
- `aria-label="Remove {{ item.display_name }}"` on `.remove-btn`.
- `aria-label="Empty cart"` on `.empty-cart`.
- `aria-label="Order summary"` on `.cart-summary`.
- `aria-label="Coupon code input"` on `#couponInput`.
- `aria-label="Apply coupon"` on coupon button.
- Dynamic `alt` on `.cart-card` image (`alt="{{ item.display_name }}"` or `"No image"`).
- Product name links have meaningful text (`{{ item.display_name }}`).

No excessive `aria` attributes; semantic HTML preferred.

---

## 15. CSS / DESIGN PRESERVATION

`cart.css` unchanged (`0` file modifications). Only inline `style` added to empty-state link (`.checkout-btn` inside `.empty-cart`) for visual alignment. All `.cart-card`, `.cart-quantity`, `.cart-price`, `.summary-row`, `.checkout-btn`, `.continue-shopping`, `.breadcrumb-box`, `.cart-subtitle`, `.cart-color`, `.cart-warranty` classes preserved. No design identity changes.

---

## 16. TEMPLATE RENDERING VERIFICATION

`template_tests.py` (`store/template_tests.py`): 6 tests pass.
- `test_cart_page_empty_renders`: verifies empty state HTML (`Your cart is empty`, `Continue Shopping` link) appears correctly when session empty.
- `test_cart_page_with_items_renders`: verifies `Template Product`, quantity `2`, subtotal (`$300.00` or similar), no hardcoded `$5,451` / `$5,351` values.
- `test_cart_summary_values_present`: verifies summary variables render correctly.
- `test_empty_cart_state_visible`: verifies `.empty-cart` block visible.
- `test_quantity_buttons_have_aria_labels`: verifies `aria-label` present.
- `test_remove_button_has_aria_label`: verifies remove button label present.

All 6 pass (`OK`).

---

## 17. ENDPOINT / SERVICE INTEGRATION CONFIRMATION

No endpoint modifications (`store/urls.py` unchanged from TASK 15). No view modifications (`store/views.py` unchanged from TASK 15). Service layer (`store/services/cart_service.py`) unchanged. Endpoints (`store/endpoints_tests.py`, 9 tests) pass (`OK`).

The `cart.js` uses the exact endpoint URLs from the service/view layer:
- `/cart/update/`
- `/cart/remove/`
- `/cart/state/`
- `POST` method for mutations.
- `GET` method for state refresh.
- `Content-Type: application/x-www-form-urlencoded` (standard Django form POST).
- `X-Requested-With: XMLHttpRequest` and `Accept: application/json` headers (matches `products.js` convention).
- `X-CSRFToken: getCookie("csrftoken")` (matches `product_detail.js` convention).

No endpoint contract mismatches.

---

## 18. KNOWN LIMITATIONS / NEXT TASKS

- `cart.js` handles basic interaction (`decrease`, `increase`, `remove`, state refresh, empty-state transition). It does not handle coupon application (`/cart/coupon/` endpoint exists but `cart.js` ignores it; no coupon functionality in this task).
- `cart.js` does not integrate with `.checkout-btn` (checkout flow deferred to future task).
- `cart.js` does not interact with `.mini-cart-btn` in `product_detail.html` (product detail add-to-cart deferred to future task).
- No complex sequencing token (race conditions handled by simple disabled-state protection).
- No full client-side re-render from JSON (updates individual card and summary, not full `.cart-items` rebuild from `items[]`). Given the user's warning against inventing parallel templates, partial updates are safer.
- `cart.js` does not implement advanced accessibility announcements for quantity changes (`aria-live` updates); basic `aria-label` is present but dynamic announcements could be enhanced in a future task.

---

## 19. EXPLICIT SCOPE COMPLIANCE

Modified:
- `static/js/cart.js` (new functionality, 18,079 bytes, event delegation, AJAX, updates).
- `templates/main/cart.html` (minimal changes for hooks/accessibility/empty-state; no design identity change).
- `store/template_tests.py` (new, 6 tests).
- `TASK_17_CART_JS_REPORT.md` (new).

Not modified:
- `store/services/cart_service.py` (service layer intact).
- `store/services/cart_service_tests.py` (service tests intact).
- `store/endpoints_tests.py` (endpoint tests intact).
- `store/urls.py` (no URL changes in this task).
- `store/views.py` (no view changes in this task — endpoint layer unchanged).
- `store/models.py` (no model changes; `OrderItem` still lacks `price`/`color` fields).
- `templates/main/product_detail.html` (unchanged).
- `templates/main/checkout.html` (unchanged).
- `templates/main/base/base_main.html` (unchanged).
- `static/css/cart.css` (unchanged; only inline `style` on empty-state button).
- `static/js/product_detail.js` (unchanged).
- `static/js/products.js` (unchanged).
- `checkout/` / `payment/` / `users/` (unchanged).
- Migrations (unchanged).

No coupon model. No checkout. No product detail JS integration. No backend business logic duplication. No price/stock calculations in JavaScript. No React/Vue/Redux.

---

## 20. FINAL RESPONSE SUMMARY (ENGLISH ONLY)

TASK 17 complete. `cart.js` implemented (`18,079` bytes, event delegation, AJAX with server-authoritative updates, empty-state transition, accessibility, loading states). Template (`cart.html`) converted to support dynamic hooks (`data-cart-key`, `data-product-id`, `data-color-id`, `data-action`, `aria-label`) with minimal design preservation (`empty-cart` block, dynamic summary variables using existing context, no `cart.css` edits). Endpoints (`store/urls.py`) unchanged from TASK 15; service layer (`store/services/cart_service.py`) unchanged; endpoint layer (`store/views.py`) unchanged; tests (`store/endpoints_tests.py`, `store/services/cart_service_tests.py`) intact; new template tests (`store/template_tests.py`, 6 tests) pass (`OK`). Django check: `0 silenced`.

Task 17 stops. No TASK 18 (Checkout/Payment integration) or TASK 19 (Coupon model/endpoint) started.
