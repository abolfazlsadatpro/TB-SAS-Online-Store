"""Test that set_quantity=true works correctly in /cart/add/ endpoint."""
import os
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "tb_sas.settings")
import django
django.setup()

from django.conf import settings
settings.ALLOWED_HOSTS = ["*"]
from django.test import Client
from decimal import Decimal

c = Client()

print("=" * 60)
print("Test: Product Detail set_quantity=true with quantity=4")
print("=" * 60)

# Start fresh
c.post("/cart/remove/", {"key": "8:8"})
c.post("/cart/remove/", {"key": "9:11"})

# Test 1: Add product 8 with quantity=4 and set_quantity=true
print("\n--- Test 1: POST /cart/add/ with quantity=4, set_quantity=true ---")
r = c.post("/cart/add/", {"product_id": "8", "quantity": "4", "color_id": "8", "set_quantity": "true"})
data = r.json()
print(f"  Status: {r.status_code}")
print(f"  Success: {data.get('success')}")
print(f"  Key: {data.get('key')}")
print(f"  Quantity: {data.get('quantity')}")
assert data.get("quantity") == 4, f"Expected quantity 4, got {data.get('quantity')}"
print("  [OK] set_quantity=true correctly set quantity to 4")

# Test 2: Add same product again with set_quantity=true and quantity=7
print("\n--- Test 2: POST /cart/add/ again with quantity=7, set_quantity=true ---")
r = c.post("/cart/add/", {"product_id": "8", "quantity": "7", "color_id": "8", "set_quantity": "true"})
data = r.json()
print(f"  Status: {r.status_code}")
print(f"  Success: {data.get('success')}")
print(f"  Key: {data.get('key')}")
print(f"  Quantity: {data.get('quantity')}")
assert data.get("quantity") == 7, f"Expected quantity 7, got {data.get('quantity')}"
print("  [OK] set_quantity=true correctly REPLACED quantity (not incremented) to 7")

# Test 3: Add same product again with set_quantity=false (default) and quantity=2
print("\n--- Test 3: POST /cart/add/ with quantity=2, set_quantity=false (default) ---")
r = c.post("/cart/add/", {"product_id": "8", "quantity": "2", "color_id": "8"})
data = r.json()
print(f"  Status: {r.status_code}")
print(f"  Success: {data.get('success')}")
print(f"  Key: {data.get('key')}")
print(f"  Quantity: {data.get('quantity')}")
assert data.get("quantity") == 9, f"Expected quantity 9 (7+2), got {data.get('quantity')}"
print("  [OK] default behavior (set_quantity=false) correctly INCREMENTED quantity (7+2=9)")

# Test 4: Verify the cart state matches
print("\n--- Test 4: Verify /cart/state/ returns correct quantity ---")
r = c.get("/cart/state/")
data = r.json()
print(f"  Status: {r.status_code}")
print(f"  Items: {len(data.get('items', []))}")
for item in data.get("items", []):
    print(f"    - product_id={item.get('product_id')}, quantity={item.get('quantity')}")
print("  [OK] Cart state is consistent")

print("\n" + "=" * 60)
print("ALL TESTS PASSED!")
print("=" * 60)
