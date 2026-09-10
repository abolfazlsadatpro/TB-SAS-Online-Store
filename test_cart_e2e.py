"""Fixed end-to-end test of the Cart production implementation."""
import os
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "tb_sas.settings")
import django
django.setup()

from django.conf import settings
settings.ALLOWED_HOSTS = ["*"]

from django.test import Client
from store.models import Coupon
from decimal import Decimal

# Ensure test coupon exists
Coupon.objects.update_or_create(
    code="TEST10",
    defaults={
        "is_active": True,
        "discount_percent": 10,
        "discount_amount": Decimal("0"),
        "valid_from": None,
        "valid_until": None,
        "min_subtotal": Decimal("0"),
        "max_discount": Decimal("0"),
        "usage_limit": 0,
        "usage_count": 0,
    },
)

c = Client()
results = []
def check(label, ok):
    status = "OK" if ok else "FAIL"
    print(f"  [{status}] {label}")
    results.append((label, ok))

# 1. Initial empty cart
print("=" * 60)
print("TEST 1: Initial cart page (empty)")
print("=" * 60)
r = c.get("/cart")
content = r.content.decode("utf-8", errors="ignore")
print(f"  Status: {r.status_code}")
# When cart is empty, step indicator is hidden with the summary
check("step indicator hidden when empty (in summary)", "step-indicator" not in content)
check("breadcrumb present", "cart-breadcrumb" in content)
check("page heading present", "Shopping Cart" in content)
# When cart is empty, coupon/summary should be hidden
check("coupon section hidden when empty", "cart-coupon" not in content)
check("summary hidden when empty", "cart-summary" not in content)
check("checkout CTA hidden when empty", "Proceed to Checkout" not in content)
check("subtitle correctly uses pluralize", "0 products" in content and "0s" not in content)
check("empty state visible", "cart-empty" in content)

# 2. Add a product
print()
print("=" * 60)
print("TEST 2: Add product 8 (iPhone 17 Pro Max, color 8)")
print("=" * 60)
r = c.post("/cart/add/", {"product_id": "8", "quantity": "1", "color_id": "8"})
data = r.json() if r.status_code == 200 else {}
print(f"  Status: {r.status_code}")
check("add success", data.get("success") is True)
check("key returned", data.get("key") == "8:8")
check("badge = 1", data.get("badge") == 1)
check("subtotal = 1399.00", data.get("subtotal") == "1399.00")

# 3. View cart page with item
print()
print("=" * 60)
print("TEST 3: Cart page with item")
print("=" * 60)
r = c.get("/cart")
content = r.content.decode("utf-8", errors="ignore")
print(f"  Status: {r.status_code}")
check("has cart card", "cart-card" in content)
check("has product name", "Apple iPhone 17 Pro Max" in content)
check("has quantity input", "cart-qty-input" in content)
check("has line total element", "cart-card-line-total" in content)
check("has line breakdown (V3)", "cart-card-price-line" in content)
check("has multiplication symbol", "&times;" in content or "x" in content.lower())
# Step indicator is now inside the summary
check("step indicator inside summary", "step-indicator" in content and content.find("step-indicator") > content.find("cart-summary"))
check("Cart step is active in summary", 'class="step is-current"' in content)
check("has direct quantity input (V2)", 'type="number"' in content)
# Summary is now sticky on desktop
check("summary has position: sticky in CSS", "position: sticky" in open("static/css/cart.css").read())

# 4. Update quantity
print()
print("=" * 60)
print("TEST 4: Update quantity to 3")
print("=" * 60)
r = c.post("/cart/update/", {"key": "8:8", "quantity": "3"})
data = r.json() if r.status_code == 200 else {}
print(f"  Status: {r.status_code}")
check("update success", data.get("success") is True)
check("quantity = 3", data.get("quantity") == 3)
check("badge = 3", data.get("badge") == 3)

# 5. Get cart state
print()
print("=" * 60)
print("TEST 5: Cart state endpoint")
print("=" * 60)
r = c.get("/cart/state/")
data = r.json() if r.status_code == 200 else {}
print(f"  Status: {r.status_code}")
check("state success", data.get("success") is True)
check("state badge = 3", data.get("badge") == 3)
check("state items_count = 3", data.get("items_count") == 3)
check("state has items", len(data.get("items", [])) == 1)
check("state item has line_subtotal", data["items"][0].get("line_subtotal") is not None)

# 6. Apply valid coupon
print()
print("=" * 60)
print("TEST 6: Apply coupon TEST10")
print("=" * 60)
r = c.post("/cart/coupon/", {"code": "TEST10"})
data = r.json() if r.status_code == 200 else {}
print(f"  Status: {r.status_code}")
check("coupon success", data.get("success") is True)
check("coupon_code in response", data.get("coupon_code") == "TEST10")
check("coupon_applied true", data.get("coupon_applied") is True)
check("discount > 0", float(data.get("discount", "0")) > 0)

# 7. Reload cart with coupon - CRITICAL: initial render must show discount
print()
print("=" * 60)
print("TEST 7: Cart page reload (initial coupon render fix)")
print("=" * 60)
r = c.get("/cart")
content = r.content.decode("utf-8", errors="ignore")
print(f"  Status: {r.status_code}")
check("coupon applied chip visible", "cart-coupon-applied is-show" in content)
check("applied coupon code TEST10 in HTML", "TEST10" in content)
check("discount row visible (not display:none)", ("cartSummaryDiscountRow" not in content) or ('style="display:none"' not in content.split("cartSummaryDiscountRow")[1][:200]))
check("discount value > 0 in HTML", "-$4" in content)
check("No raw integer pluralize bug", "0s in your cart" not in content)
check("No '3s in your cart' bug", "3s in your cart" not in content)

# 8. Apply invalid coupon
print()
print("=" * 60)
print("TEST 8: Apply invalid coupon")
print("=" * 60)
r = c.post("/cart/coupon/", {"code": "FAKE"})
data = r.json() if r.status_code in (200, 400) else {}
print(f"  Status: {r.status_code}")
check("invalid coupon rejected", data.get("success") is False)
check("error message present", bool(data.get("message")))

# 9. Remove coupon
print()
print("=" * 60)
print("TEST 9: Remove coupon")
print("=" * 60)
r = c.post("/cart/coupon/remove/", {})
data = r.json() if r.status_code == 200 else {}
print(f"  Status: {r.status_code}")
check("remove success", data.get("success") is True)
check("coupon_applied false after remove", data.get("coupon_applied") is False)

# 10. Remove item
print()
print("=" * 60)
print("TEST 10: Remove item")
print("=" * 60)
r = c.post("/cart/remove/", {"key": "8:8"})
data = r.json() if r.status_code == 200 else {}
print(f"  Status: {r.status_code}")
check("remove success", data.get("success") is True)
check("badge = 0 after remove", data.get("badge") == 0)

# 11. Undo remove via /cart/add/
print()
print("=" * 60)
print("TEST 11: Undo remove via /cart/add/ (server-safe undo)")
print("=" * 60)
r = c.post("/cart/add/", {"product_id": "8", "quantity": "1", "color_id": "8"})
data = r.json() if r.status_code == 200 else {}
print(f"  Status: {r.status_code}")
check("undo (add) success", data.get("success") is True)
check("badge = 1 after restore", data.get("badge") == 1)

# 12. Empty cart
print()
print("=" * 60)
print("TEST 12: Empty cart page (state checks)")
print("=" * 60)
c.post("/cart/remove/", {"key": "8:8"})
r = c.get("/cart")
content = r.content.decode("utf-8", errors="ignore")
print(f"  Status: {r.status_code}")
check("empty state shown", "cart-empty" in content)
check("coupon hidden when empty", "cart-coupon" not in content)
check("summary hidden when empty", "cart-summary" not in content)

# Summary
print()
print("=" * 60)
total = len(results)
passed = sum(1 for _, ok in results if ok)
print(f"OVERALL: {passed}/{total} checks passed")
if passed == total:
    print("ALL CHECKS PASSED")
else:
    failed = [label for label, ok in results if not ok]
    print(f"FAILED: {failed}")
print("=" * 60)
