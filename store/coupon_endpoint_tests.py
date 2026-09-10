"""
Coupon endpoint verification tests (TASK 23 — endpoint layer only).
Only verifies HTTP endpoints (`/cart/coupon/`, `/cart/coupon/remove/`).
Does NOT test frontend (`cart.js` unchanged — no coupon interaction).
"""

import os
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "tb_sas.settings")

import django
django.setup()

from decimal import Decimal
from django.test import TestCase, Client
from django.utils import timezone
import datetime

from store.models import Coupon, Product, ProductColor, Category, SettingSite


class CouponEndpointTests(TestCase):
    """Basic endpoint contract verification for Coupon integration."""

    def setUp(self):
        self.client = Client()
        self.category = Category.objects.create(name="Endpoint Audit", slug="endpoint-audit")
        self.product = Product.objects.create(
            category=self.category,
            name="Endpoint Audit Product",
            slug="endpoint-audit-product",
            price=200,
            is_active=True,
            is_available=True,
        )
        self.color = ProductColor.objects.create(
            product=self.product,
            name="Blue",
            color_code="#0000ff",
            stock=5,
        )

    # ------------------------------------------------------------------
    # Apply endpoint contracts
    # ------------------------------------------------------------------

    def test_apply_percentage_coupon(self):
        Coupon.objects.create(
            code="SAVE20", is_active=True, discount_percent=20,
            min_subtotal=Decimal("0"), max_discount=Decimal("1000"), usage_limit=1,
        )
        self.client.post(
            "/cart/add/",
            {"product_id": self.product.id, "quantity": 1, "color_id": self.color.id},
        )
        response = self.client.post("/cart/coupon/", {"code": "SAVE20"})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data.get("success"))
        self.assertTrue(data.get("coupon_applied"))
        self.assertEqual(data.get("coupon_code"), "SAVE20")
        # Discount should be 20% of 200 = 40.00.
        self.assertEqual(str(data.get("discount")), "40.00")
        # Subtotal unchanged (current DB price = 200).
        self.assertEqual(str(data.get("subtotal")), "200.00")
        # Note: test database creates SettingSite with default values
        # (tax_percent=Decimal("0"), free_shipping_threshold=Decimal("0")),
        # so shipping = 0 and tax = 0. Therefore total = subtotal - discount.
        # Subtotal (price 200, qty 1) = 200; discount (20%) = 40; total = 160.
        self.assertEqual(str(data.get("total")), "160.00")
        # Response includes required contract keys.
        for k in ["badge", "lines_count", "items_count", "subtotal", "discount",
                  "shipping", "tax", "total", "items", "warnings"]:
            self.assertIn(k, data, f"Missing contract key: {k}")
        # Monetary values serialized as strings.
        for k in ["subtotal", "discount", "shipping", "tax", "total"]:
            val = data.get(k)
            self.assertIsInstance(val, str, f"{k} must be serialized string")

    def test_apply_fixed_amount_coupon(self):
        Coupon.objects.create(
            code="FIXED30", is_active=True, discount_percent=0,
            discount_amount=Decimal("30"), min_subtotal=Decimal("0"),
        )
        self.client.post(
            "/cart/add/",
            {"product_id": self.product.id, "quantity": 1, "color_id": self.color.id},
        )
        response = self.client.post("/cart/coupon/", {"code": "FIXED30"})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data.get("success"))
        self.assertEqual(str(data.get("discount")), "30.00")
        # Note: test database defaults (tax_percent=Decimal("0"), free_shipping_threshold=Decimal("0")).
        # Subtotal = 200; discount (fixed 30) = 30; total = 170.
        self.assertEqual(str(data.get("total")), "170.00")

    def test_apply_invalid_code(self):
        response = self.client.post("/cart/coupon/", {"code": "BADCODE"})
        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertFalse(data.get("success"))
        self.assertIn("message", data)

    def test_apply_empty_code(self):
        response = self.client.post("/cart/coupon/", {"code": ""})
        self.assertIn(response.status_code, [200, 400])
        data = response.json()
        if response.status_code == 400:
            self.assertFalse(data.get("success"))
            self.assertIn("message", data)

    def test_apply_expired_coupon(self):
        from django.utils import timezone
        import datetime
        Coupon.objects.create(
            code="EXPIRED", is_active=True, discount_percent=10,
            valid_until=timezone.now() - datetime.timedelta(days=1),
        )
        self.client.post(
            "/cart/add/",
            {"product_id": self.product.id, "quantity": 1, "color_id": self.color.id},
        )
        response = self.client.post("/cart/coupon/", {"code": "EXPIRED"})
        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertFalse(data.get("success"))
        self.assertIn("expired", data.get("message", "").lower())

    def test_apply_both_positive_discounts_use_percentage_precedence(self):
        # Design choice: when both percent and amount positive, percent takes precedence.
        Coupon.objects.create(
            code="DUAL", is_active=True,
            discount_percent=20, discount_amount=Decimal("50"),
            min_subtotal=Decimal("0"),
        )
        self.client.post(
            "/cart/add/",
            {"product_id": self.product.id, "quantity": 2, "color_id": self.color.id},
        )
        response = self.client.post("/cart/coupon/", {"code": "DUAL"})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        # Subtotal with quantity 2 at price 200 = 400.
        # 20% of 400 = 80 (precedence over fixed 50).
        self.assertEqual(str(data.get("discount")), "80.00")

    def test_apply_below_subtotal(self):
        Coupon.objects.create(
            code="MIN500",
            is_active=True,
            discount_percent=10,
            min_subtotal=Decimal("500"),
        )
        # Subtotal with 1 item at 200 = 200 (< 500).
        self.client.post(
            "/cart/add/",
            {"product_id": self.product.id, "quantity": 1, "color_id": self.color.id},
        )
        response = self.client.post("/cart/coupon/", {"code": "MIN500"})
        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertFalse(data.get("success"))
        self.assertIn("minimum", data.get("message", "").lower())

    def test_apply_max_discount_cap(self):
        Coupon.objects.create(
            code="MAX50",
            is_active=True,
            discount_percent=30,
            max_discount=Decimal("50"),
            min_subtotal=Decimal("0"),
        )
        # Subtotal = 200. 30% = 60. Cap to 50.
        self.client.post(
            "/cart/add/",
            {"product_id": self.product.id, "quantity": 1, "color_id": self.color.id},
        )
        response = self.client.post("/cart/coupon/", {"code": "MAX50"})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data.get("success"))
        self.assertEqual(str(data.get("discount")), "50.00")

    # ------------------------------------------------------------------
    # Remove endpoint
    # ------------------------------------------------------------------

    def test_remove_existing_coupon(self):
        Coupon.objects.create(code="REMOVEME", is_active=True, discount_percent=10)
        self.client.post("/cart/add/", {"product_id": self.product.id, "quantity": 1, "color_id": self.color.id})
        apply_res = self.client.post("/cart/coupon/", {"code": "REMOVEME"})
        self.assertTrue(apply_res.json().get("success"))
        remove_res = self.client.post("/cart/coupon/remove/", {"code": "REMOVEME"})
        self.assertTrue(remove_res.json().get("success"))
        self.assertFalse(remove_res.json().get("coupon_applied"))
        self.assertEqual(str(remove_res.json().get("discount")), "0.00")

    def test_remove_nonexistent_coupon_idempotent(self):
        # Removing when no coupon applied should be idempotent (success).
        response = self.client.post("/cart/coupon/remove/", {"code": "REMOVEME"})
        self.assertTrue(response.json().get("success"))
        self.assertFalse(response.json().get("coupon_applied"))

    # ------------------------------------------------------------------
    # Empty Cart interaction
    # ------------------------------------------------------------------

    def test_apply_coupon_to_empty_cart_rejected(self):
        # Design choice: applying a coupon to an empty cart is meaningless.
        Coupon.objects.create(code="EMPTY", is_active=True, discount_percent=10)
        response = self.client.post("/cart/coupon/", {"code": "EMPTY"})
        # Should return failure (400) because cart is empty (subtotal 0 <= 0 check in service).
        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertFalse(data.get("success"))
        self.assertIn("positive", data.get("message", "").lower())

    # ------------------------------------------------------------------
    # Response contract verification
    # ------------------------------------------------------------------

    def test_response_contract_keys(self):
        Coupon.objects.create(code="CONTRACT", is_active=True, discount_percent=5)
        self.client.post("/cart/add/", {"product_id": self.product.id, "quantity": 1, "color_id": self.color.id})
        response = self.client.post("/cart/coupon/", {"code": "CONTRACT"})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        required = [
            "success", "message", "badge", "lines_count", "items_count",
            "subtotal", "discount", "shipping", "tax", "total", "items",
            "coupon_applied", "coupon_code",
        ]
        for k in required:
            self.assertIn(k, data, f"Missing response key: {k}")
        # Monetary serialization.
        for k in ["subtotal", "discount", "shipping", "tax", "total"]:
            val = data.get(k)
            self.assertIsInstance(val, str, f"{k} must be serialized string")
            self.assertIn(".", val, f"{k} should contain decimal point ({val})")

    # ------------------------------------------------------------------
    # Security / CSRF
    # ------------------------------------------------------------------

    def test_post_without_csrf_default_client(self):
        # Django Client handles session cookies automatically; CSRF middleware should not reject.
        Coupon.objects.create(code="CSRFTEST", is_active=True, discount_percent=5)
        response = self.client.post("/cart/coupon/", {"code": "CSRFTEST"})
        # Should be 200 (success with non-empty subtotal) — not 403.
        self.assertNotEqual(response.status_code, 403)
        data = response.json()
        self.assertIn("success", data)


if __name__ == "__main__":
    import unittest
    unittest.main()
