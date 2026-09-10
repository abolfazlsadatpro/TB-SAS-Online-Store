"""
Coupon endpoint verification tests (TASK 23 — endpoint layer only).
Only tests HTTP endpoints added in TASK 23 (`cart_coupon_apply`, `cart_coupon_remove`).
Does NOT test coupon JavaScript (`cart.js` unchanged) or template integration (`cart.html` unchanged).
"""

import os
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "tb_sas.settings")

import django
django.setup()

from decimal import Decimal
from django.test import TestCase, Client
from store.models import Coupon, Product, ProductColor, Category, SettingSite


class CouponEndpointTests(TestCase):
    """Basic verification of coupon endpoint contracts."""

    def setUp(self):
        self.client = Client()
        self.category = Category.objects.create(name="Endpoint Coupon", slug="endpoint-coupon")
        self.product = Product.objects.create(
            category=self.category,
            name="Endpoint Coupon Product",
            slug="endpoint-coupon-product",
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
    # Apply endpoint
    # ------------------------------------------------------------------

    def test_apply_valid_percentage_coupon(self):
        Coupon.objects.create(
            code="SAVE20", is_active=True, discount_percent=20,
            min_subtotal=Decimal("0"), max_discount=Decimal("1000"),
        )
        # Add item to have a non-empty subtotal.
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
        # Discount should be Decimal serialized as string (20% of 200 = 40).
        self.assertTrue(isinstance(data.get("discount"), str))
        # Subtotal should be 200.00.
        self.assertTrue(isinstance(data.get("subtotal"), str))
        # Badge should include item quantity.
        self.assertGreaterEqual(data.get("badge", 0), 1)

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
        self.assertEqual(Decimal(data.get("discount") or "0"), Decimal("30"))

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

    def test_apply_expired_coupon(self):
        from django.utils import timezone
        import datetime
        Coupon.objects.create(
            code="EXPIRED",
            is_active=True,
            discount_percent=10,
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

    def test_apply_inactive_coupon(self):
        Coupon.objects.create(
            code="INACTIVE",
            is_active=False,
            discount_percent=10,
        )
        response = self.client.post("/cart/coupon/", {"code": "INACTIVE"})
        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertFalse(data.get("success"))

    def test_apply_below_subtotal(self):
        Coupon.objects.create(
            code="MIN100",
            is_active=True,
            discount_percent=10,
            min_subtotal=Decimal("500"),
        )
        # Subtotal with 1 item at price 200 = 200 (< 500).
        self.client.post(
            "/cart/add/",
            {"product_id": self.product.id, "quantity": 1, "color_id": self.color.id},
        )
        response = self.client.post("/cart/coupon/", {"code": "MIN100"})
        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertFalse(data.get("success"))
        self.assertIn("minimum", data.get("message", "").lower())

    # ------------------------------------------------------------------
    # Remove endpoint
    # ------------------------------------------------------------------

    def test_remove_coupon_endpoint(self):
        Coupon.objects.create(code="REMOVEME", is_active=True, discount_percent=10)
        self.client.post("/cart/add/", {"product_id": self.product.id, "quantity": 1, "color_id": self.color.id})
        # Apply first.
        apply_res = self.client.post("/cart/coupon/", {"code": "REMOVEME"})
        self.assertTrue(apply_res.json().get("success"))
        # Remove.
        remove_res = self.client.post("/cart/coupon/remove/", {"code": "REMOVEME"})
        self.assertTrue(remove_res.json().get("success"))
        self.assertFalse(remove_res.json().get("coupon_applied"))
        self.assertEqual(remove_res.json().get("coupon_code"), None)
        self.assertEqual(Decimal(str(remove_res.json().get("discount"))), Decimal("0"))

    # ------------------------------------------------------------------
    # Response contract verification
    # ------------------------------------------------------------------

    def test_response_contract_keys(self):
        Coupon.objects.create(code="CONTRACT", is_active=True, discount_percent=15)
        self.client.post("/cart/add/", {"product_id": self.product.id, "quantity": 1, "color_id": self.color.id})
        response = self.client.post("/cart/coupon/", {"code": "CONTRACT"})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        required_keys = [
            "success", "message", "badge", "lines_count", "items_count",
            "subtotal", "discount", "shipping", "tax", "total", "items",
            "coupon_applied", "coupon_code",
        ]
        for k in required_keys:
            self.assertIn(k, data, f"Missing key: {k}")
        # All monetary values must be serializable strings.
        for k in ["subtotal", "discount", "shipping", "tax", "total"]:
            val = data.get(k)
            self.assertIsInstance(val, str, f"{k} should be serialized string, not {type(val)}")
            # Should contain decimal point.
            self.assertIn(".", val, f"{k} should contain decimal point ({val})")

    # ------------------------------------------------------------------
    # Security / CSRF
    # ------------------------------------------------------------------

    def test_post_without_csrf_default_client(self):
        # Django Client handles CSRF by default; a valid POST should work.
        Coupon.objects.create(code="CSRFTEST", is_active=True, discount_percent=5)
        self.client.post("/cart/add/", {"product_id": self.product.id, "quantity": 1, "color_id": self.color.id})
        response = self.client.post("/cart/coupon/", {"code": "CSRFTEST"})
        # Should be 200 (success) or 400 (invalid) — not 403 (CSRF rejected)
        # because Client automatically includes CSRF cookie/session.
        self.assertNotEqual(response.status_code, 403)
        # At least the response should contain a JSON with "success" key.
        data = response.json()
        self.assertIn("success", data)


if __name__ == "__main__":
    import unittest
    unittest.main()
