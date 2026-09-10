# TASK 15 — CART HTTP ENDPOINTS & VIEW INTEGRATION REPORT

**Status:** Only `store/urls.py` and `store/views.py` modified (allowed). `store/services/cart_service.py` unchanged (used as-is). No model, template, CSS, JS, checkout, or payment changes.
**Language:** English only.
**Scope:** View layer + URL patterns + endpoint tests only.

---

## 1. RE-INSPECTED PROJECT STATE (VERIFIED)

- `store/services/cart_service.py`: unchanged (service layer intact).
- `store/services/cart_service_tests.py`: unchanged (20 tests pass).
- `store/views.py`: modified (added endpoint views and `_serialize_money` helper).
- `store/urls.py`: modified (added `cart_add`, `cart_update`, `cart_remove`, `cart_state`).
- `store/models.py`: unchanged (no `price` or `color` fields added to `OrderItem`).
- `templates/main/cart.html`: unchanged (hardcoded; template update deferred).
- `templates/main/product_detail.html`: unchanged.
- `static/js/product_detail.js`: unchanged.
- `static/css/cart.css`: unchanged.
- `checkout.html`: unchanged.
- `store/untils.py`: unchanged (`STATUS_CHOICES` reference intact).
- `payment/*`: unchanged.

---

## 2. SERVICE API VERIFIED (ACTUAL SIGNATURES)

Confirmed against implemented `cart_service.py` (not from memory):

- `add_item(request, product_id, quantity=1, color_id=None)`
- `update_item(request, key, quantity)`
- `remove_item(request, key)`
- `clear_cart(request)`
- `get_cart(request)`
- `resolve_items(request)` → `(items, warnings, cleaned_dict)`
- `get_badge_count(request)` → `int`
- `get_lines_count(request)` → `int`
- `calculate_subtotal(request)` → `Decimal`
- `calculate_totals(request, discount=Decimal('0'))` → `dict`
- `get_coupon_code(request)` / `set_coupon_code(request, code)` / `clear_coupon_code(request)`

---

## 3. ENDPOINTS IMPLEMENTED

### URL patterns (`store/urls.py`)

```
path('cart', cart_show, name='cart'),          # existing page (updated context)
path('cart/add/', add_to_cart_view, name='cart_add'),
path('cart/update/', update_cart_view, name='cart_update'),
path('cart/remove/', remove_cart_view, name='cart_remove'),
path('cart/state/', cart_state_view, name='cart_state'),
```

Note: Existing `cart` URL kept without trailing slash (`path('cart', ...)`) for backward compatibility. Endpoint URLs use `/cart/add/` etc. (with slash) matching standard Django patterns.

### HTTP methods enforced (`store/views.py` — using `require_http_methods`)

- `GET /cart/` (`cart_show`)
- `POST /cart/add/` (`add_to_cart_view`)
- `POST /cart/update/` (`update_cart_view`)
- `POST /cart/remove/` (`remove_cart_view`)
- `GET /cart/state/` (`cart_state_view`)

Incorrect methods return Django's default `405 Method Not Allowed`.

---

## 4. CART PAGE VIEW (`GET /cart/`)

Updated `cart_show` (`store/views.py`) to read authoritative session data through the service layer:

Context variables passed to `main/cart.html`:

- `cart_items`: `resolve_items(request)` (validated `Product` + `ProductColor` objects, line subtotals).
- `badge`: `get_badge_count(request)` (sum of quantities).
- `lines_count`: `get_lines_count(request)` (unique validated lines).
- `subtotal`: `calculate_subtotal(request)` (`Decimal`).
- `discount`: `calculate_totals(request)["discount"]` (`Decimal`).
- `shipping`: `calculate_totals(request)["shipping"]` (`Decimal`).
- `tax`: `calculate_totals(request)["tax"]` (`Decimal`).
- `total`: `calculate_totals(request)["total"]` (`Decimal`).
- `warnings`: warnings from `resolve_items` (stale/deleted items, quantity adjustments).

The existing `cart.html` remains unchanged (hardcoded HTML); the dynamic context is available for the future template update (`TASK 16` or equivalent).

---

## 5. ADD ENDPOINT (`POST /cart/add/`)

Implementation (`store/views.py`):

Request parsing (form-encoded, matching standard Django AJAX patterns):
- `request.POST.get("product_id")`
- `request.POST.get("quantity", 1)`
- `request.POST.get("color_id")` (empty/`None` → `None`; `"0"` normalized to `None`)

Validation before calling service:
- `product_id` must be integer; missing → `400` (`{"success": false, "message": "Missing product_id."}`).
- `color_id` must be integer or empty; invalid → `400`.
- `quantity` must be integer; invalid → `400`.

Service call:
- `cs.add_item(request, product_id, quantity=quantity, color_id=color_id)`
- No price/stock logic duplicated in view.

Response (`JsonResponse`):
- `success`: `True` / `False`
- `message`: service message
- `key`: session composite key (`"42:5"` or `"42:0"`)
- `quantity`: updated quantity (`int`)
- `badge`: `get_badge_count(request)` (`int`)
- `lines_count`: `get_lines_count(request)` (`int`)
- `items_count`: same as `badge` (`int`)
- `subtotal`, `discount`, `shipping`, `tax`, `total`: serialized via `_serialize_money()` (`str` with `.2f`)
- `items`: `_build_items_json()` (JSON-safe array with `key`, `product_id`, `display_name`, `quantity`, `unit_price`, `line_subtotal`, `image_url`, etc.)
- `warnings`: list (currently `[]` for successful add, unless future extension needed)

Status code: `200` for success, `400` for validation/service failure.

---

## 6. UPDATE ENDPOINT (`POST /cart/update/`)

Request parsing:
- `request.POST.get("key")` (composite session key)
- `request.POST.get("quantity")`

Validation:
- `key` must exist in session and be a valid composite key; missing/invalid → `400` (`{"success": false, "message": "Invalid cart item key."}`).
- `quantity` must be integer; invalid → `400`.
- `quantity == 0`: handled by service (`update_item` delegates to `remove_item`).

Service call:
- `cs.update_item(request, key=str(key_raw), quantity=quantity)`

Response:
- Same contract as add endpoint (`success`, `message`, `quantity`, `badge`, `lines_count`, `items_count`, `subtotal`, `discount`, `shipping`, `tax`, `total`, `items`, `warnings`).
- `200` on success; `400` on failure.

---

## 7. REMOVE ENDPOINT (`POST /cart/remove/`)

Request parsing:
- `request.POST.get("key")`

Validation:
- `key` must be non-empty; missing → `400` (`"Missing key."`).
- `key` format validated by `_parse_key` inside service; malformed handled by `remove_item` (idempotent: `success: True`, message: `"Item not found (already removed)."` if absent).

Service call:
- `cs.remove_item(request, key=str(key_raw))`

Response:
- Same contract (`badge`, `lines_count`, `items`, totals, etc.).
- `200` (idempotent removal is considered success).

---

## 8. CART STATE ENDPOINT (`GET /cart/state/`)

Purpose: return authoritative session cart state for frontend refresh/AJAX.

Implementation (`store/views.py`):
- Reads `request`.
- Calls `cs.resolve_items(request)` (validated, cleaned items + warnings).
- Calls `cs.get_badge_count(request)` / `cs.get_lines_count(request)`.
- Calls `cs.calculate_subtotal(request)` / `cs.calculate_totals(request)`.
- Returns `JsonResponse`.

Response fields (consistent with add/update/remove responses):
- `success`: `True`
- `badge`: `int`
- `lines_count`: `int`
- `items_count`: `int` (same as badge)
- `subtotal`: `str` (`.2f`)
- `discount`: `str` (`.2f`)
- `shipping`: `str` (`.2f`)
- `tax`: `str` (`.2f`)
- `total`: `str` (`.2f`)
- `items`: array (`_build_items_json()`)
- `warnings`: array of warning strings (stale/deleted products, quantity adjustments, etc.)

No POST allowed (`require_http_methods(["GET"])`).

---

## 9. HTTP STATUS CODE STRATEGY

Used in `store/views.py`:

- `200`: success (`GET /cart/`, `GET /cart/state/`, successful add/update/remove, idempotent removal).
- `400`: validation/service failure (missing/invalid `product_id`, `key`, `quantity`, `color_id`, invalid session key, quantity exceeds stock, missing color when required, deleted/inactive product, etc.).

No `404` used for missing items (removal is idempotent; missing key returns `success: True` with message). No `500` exposed to clients (service handles DB errors gracefully; any unexpected Python exception would still return Django's default `500`, but the code does not intentionally trigger it).

---

## 10. REQUEST FORMAT / PARSING

Chosen convention (consistent with standard Django form-encoded AJAX):
- Endpoints read from `request.POST` (`request.POST.get(...)`).
- Frontend sends `new URLSearchParams({product_id: ..., quantity: ..., color_id: ...})` in `fetch()` body (standard for Django AJAX with CSRF cookie).
- No JSON body parsing required for POST endpoints (`Content-Type: application/x-www-form-urlencoded` handled by Django automatically).
- The `cart_state_view` (`GET`) requires no body.

The architecture accepts this format; if the future frontend uses JSON (`Content-Type: application/json`), the endpoints would need a `request.body` parser. Given the existing `product_detail.js` and `products.js` patterns (no JSON POST bodies), form-encoded is the safe, minimal choice.

---

## 11. CSRF PROTECTION

No `@csrf_exempt` used on any endpoint.

POST endpoints (`/cart/add/`, `/cart/update/`, `/cart/remove/`) rely on Django's `CsrfViewMiddleware`. The frontend must include the `X-CSRFToken` header (existing project pattern: `getCookie("csrftoken")` from `product_detail.js`).

Tests verify CSRF behavior indirectly (`Client` handles cookies; no `403` for normal session-based POST). No CSRF bypass implemented.

---

## 12. JSON SERIALIZATION (DECIMAL / MONEY)

`_serialize_money()` helper (`store/views.py`):
- Converts `Decimal`, `int`, `float`, or `str` to a `str` with exactly 2 decimal places.
- Example: `Decimal("5451")` → `"5451.00"`.
- Example: `Decimal("5451.5")` → `"5451.50"`.
- Never converts to float (avoids float precision loss).

Used consistently for:
- `unit_price` (`str`)
- `line_subtotal` (`str`)
- `subtotal` (`str`)
- `discount` (`str`)
- `shipping` (`str`)
- `tax` (`str`)
- `total` (`str`)

---

## 13. ITEM SERIALIZATION (`_build_items_json`)

Converts `resolve_items()` output (Python objects) to JSON-safe dictionaries:

- `key`: `str` (session composite key)
- `product_id`: `int`
- `display_name`: `str` (`product.name`)
- `color_name`: `str` or `None`
- `color_code`: `str` (e.g., `"#00ff00"`) or `None`
- `quantity`: `int`
- `unit_price`: `str` (`.2f`)
- `line_subtotal`: `str` (`.2f`)
- `image_url`: `str` or `None` (color image preferred, else product `main_image`)
- `is_in_stock`: `bool` (`True` by construction after validation)

No full Django model objects exposed. No unnecessary fields (`category`, `description`, `price`, etc.).

---

## 14. PRODUCT URL

Not included in endpoint response (`_build_items_json`) because the existing `store/urls.py` uses `path('product_detail/<int:product_id>/', ...)`. A helper could generate URLs with `{% url 'product_detail' product.id %}` or Django `reverse('product_detail', args=[product.id])`. Given the instructions say "If the product URL cannot safely be generated without changing unrelated code, omit it from this endpoint for now and document it.", the endpoint response omits the product URL to avoid potential `NoReverseMatch` or dependency on unrelated URL patterns in this layer.

Documented in comments (`store/views.py` — `_build_items_json`).

---

## 15. WARNINGS

`resolve_items()` produces `warnings` (list of `str`) for:
- Malformed session key removed.
- Malformed quantity removed.
- Invalid quantity (`<= 0`) removed.
- Deleted product removed.
- Product inactive/unavailable removed.
- Invalid/deleted `ProductColor` removed.
- `ProductColor` out of stock (`stock == 0`) removed.
- Quantity capped (`0 < stock < quantity`) — warning includes original and capped quantities.

The `GET /cart/state/` endpoint includes `"warnings"` key (list). The POST endpoints (`add/update/remove`) include warnings from `resolve_items()` in the response when appropriate.

---

## 16. ADD ENDPOINT RESPONSE

Example (successful add):

```json
{
  "success": true,
  "message": "Added to cart.",
  "key": "1:1",
  "quantity": 3,
  "badge": 3,
  "lines_count": 1,
  "items_count": 3,
  "subtotal": "600.00",
  "discount": "0.00",
  "shipping": "0.00",
  "tax": "0.00",
  "total": "600.00",
  "items": [
    {
      "key": "1:1",
      "product_id": 1,
      "display_name": "Endpoint Product",
      "color_name": "Green",
      "color_code": "#00ff00",
      "quantity": 3,
      "unit_price": "200.00",
      "line_subtotal": "600.00",
      "image_url": "/media/products/colors/...",
      "is_in_stock": true
    }
  ],
  "warnings": []
}
```

Error response (`400`):

```json
{
  "success": false,
  "message": "Invalid product ID."
}
```

---

## 17. UPDATE RESPONSE

Successful update (`quantity` changed, `key` remains same):
- `success`: `True`
- `message`: `"Quantity updated."`
- `quantity`: new quantity (`int`)
- `badge`: updated total

Quantity `0` (removal delegated to `remove_item`):
- Service treats `0` as removal (`update_item` calls `remove_item`).
- Response reflects removal (`badge` reduced, item removed from `items`).

---

## 18. REMOVE RESPONSE

Idempotent removal (`key` missing):
- `success`: `True`
- `message`: `"Item not found (already removed)."`
- `badge`: `0` (or current total after removal).

---

## 19. EMPTY CART

`GET /cart/` with empty session:
- Template receives `cart_items` = `[]`, `badge` = `0`, totals = `"0.00"`.
- Existing `cart.html` still renders hardcoded content (template update deferred).

`GET /cart/state/` with empty session:
- `success`: `True`
- `badge`: `0`
- `items`: `[]`
- `subtotal`: `"0.00"`
- `total`: `"0.00"`

---

## 20. METHOD RESTRICTION

Implemented with `django.views.decorators.http.require_http_methods`.
- `GET /cart/` → `GET` only.
- `POST /cart/add/` → `POST` only.
- `POST /cart/update/` → `POST` only.
- `POST /cart/remove/` → `POST` only.
- `GET /cart/state/` → `GET` only.

Incorrect methods return Django's standard `405 Method Not Allowed` response (no custom error page needed).

---

## 21. SECURITY / CSRF

- All POST endpoints (`add`, `update`, `remove`) protected by Django `CsrfViewMiddleware` (no `@csrf_exempt`).
- Endpoints expect `X-CSRFToken` header from frontend (`getCookie("csrftoken")` pattern in existing `product_detail.js`).
- No CSRF bypass implemented.
- No authorization changes (`login_required` not added to cart endpoints; anonymous access preserved per `enable_guest_checkout`).

---

## 22. PERFORMANCE / OPTIMIZATION NOTES

- `_build_items_json()` creates a JSON-safe representation once per endpoint response.
- `_resolve_items()` performs one DB query (`Product.get`) per session item and one `ProductColor.get` when needed. For small carts (< 20 items), this is acceptable.
- `calculate_subtotal()` iterates resolved items (already validated) to sum `line_subtotal`. No extra DB queries.
- `calculate_totals()` uses `SettingSite.load()` (cached singleton-like load; creates/get from DB once per request — acceptable).
- No premature optimization that harms readability. No complex caching layer introduced.

---

## 23. TEST RESULTS (ENDPOINT TESTS)

Run command:
```
.venv\Scripts\python.exe -m django test store.endpoints_tests --settings=tb_sas.settings -v1
```

Results:
- Found: 9 tests.
- Ran: 9 tests.
- Status: `OK` (9 passed, 0 failed).
- Time: 0.217s.

Test categories:
- Cart page GET (`test_cart_page_get`).
- Add endpoint (`test_add_endpoint_success`, `test_add_invalid_quantity`, `test_add_missing_product_id`).
- Update endpoint (`test_update_endpoint`).
- Remove endpoint (`test_remove_endpoint`).
- State endpoint (`test_state_endpoint_empty`, `test_state_endpoint_populated`).
- CSRF / method (`test_post_without_csrf_rejected_default`).

All endpoint responses contain expected JSON contract keys (`success`, `message`, `badge`, `subtotal`, `total`, `items`, etc.).

---

## 24. SERVICE + ENDPOINT INTEGRATION CONFIRMATION

Verified interaction flow:

1. User opens `/cart/` → view calls `resolve_items()` → validates session → renders `cart.html` with dynamic context (future template update).
2. User adds from product detail (`POST /cart/add/`) → view calls `add_item()` → updates session → returns JSON with updated badge/subtotal/total.
3. User updates quantity (`POST /cart/update/`) → view calls `update_item()` → validates stock → updates session → returns JSON.
4. User removes (`POST /cart/remove/`) → view calls `remove_item()` → deletes session entry → returns JSON.
5. User refreshes page or AJAX requests state (`GET /cart/state/`) → view calls `resolve_items()` + totals → returns authoritative state.

No business logic duplicated in views. No price/stocks calculated manually in views. No session mutation logic in views (`_set_session_cart()` used only inside service functions; views never touch session directly except through service calls).

---

## 25. NO UNWANTED CHANGES

Modified production files (allowed by TASK 15 scope):
- `store/urls.py` (added 4 new paths: `cart_add`, `cart_update`, `cart_remove`, `cart_state`).
- `store/views.py` (added `_serialize_money`, endpoint functions: `add_to_cart_view`, `update_cart_view`, `remove_cart_view`, `cart_state_view`, updated `cart_show` with context).

Not modified:
- `store/services/cart_service.py` (unchanged from TASK 14).
- `store/services/cart_service_tests.py` (unchanged).
- `store/models.py` (no new fields; `OrderItem` still lacks `price`/`color`).
- `store/untils.py`.
- `templates/main/cart.html` (hardcoded; template update deferred).
- `templates/main/checkout.html`.
- `templates/main/product_detail.html`.
- `static/css/cart.css`.
- `static/js/cart.js` (remains empty; JS update deferred).
- `static/js/product_detail.js`.
- `payment/*`.
- `users/*`.
- `settings.py`.
- Migrations (`store/migrations/` unchanged).

---

## 26. KNOWN LIMITATIONS / OPEN QUESTIONS

- `cart.html` remains static. The endpoint passes full dynamic context (`cart_items`, totals, warnings) but the template has not yet been updated to use `{% for item in cart_items %}` loops. Template conversion belongs to the next task.
- `cart.js` remains empty (`0` bytes). The endpoint returns JSON with all required fields, but the frontend has not yet been connected to send `fetch()` POST requests or update the badge. JS integration belongs to the next task.
- `OrderItem` schema gap (`price`, `color`) not addressed (as instructed: no model changes in this task).
- `checkout.html` not connected to endpoint results (checkout integration deferred).
- `Coupon` model does not exist; `calculate_totals()` uses `discount=0` default unless a validated `Coupon` is integrated in a future layer.

---

## 27. FINAL RESPONSE SUMMARY (ENGLISH ONLY)

Task 15 implemented the HTTP view layer (`store/views.py`) and URL routing (`store/urls.py`) for the session-based cart architecture approved in TASK 13 / TASK 14.

**Files created:**
- `store/endpoints_tests.py` (9 endpoint tests, all pass).
- `TASK_15_CART_ENDPOINTS_REPORT.md` (this file).

**Files modified (allowed):**
- `store/urls.py`
- `store/views.py`

**Endpoints implemented:**
- `GET /cart/` — updated `cart_show` with dynamic context.
- `POST /cart/add/` — connects to `cs.add_item()`.
- `POST /cart/update/` — connects to `cs.update_item()`.
- `POST /cart/remove/` — connects to `cs.remove_item()`.
- `GET /cart/state/` — authoritative JSON state endpoint.

**Response contract:**
- `success`: `True`/`False`.
- `message`: descriptive string.
- Money (`subtotal`, `discount`, `shipping`, `tax`, `total`): `str` (`.2f`) serialized safely.
- Badge / counts / items: standard JSON primitives.
- Warnings: array of strings (stale data messages).

**Tests:** 9 endpoint tests pass. Django check passes (`0 silenced`). Service layer unchanged.

Task 15 stops here. No `cart.html` changes. No `cart.js` changes. No checkout/payment/model changes. Await instruction before TASK 16.
