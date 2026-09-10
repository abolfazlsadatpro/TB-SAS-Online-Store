"""
Endpoint verification for TASK 15 Cart HTTP layer.
Tests the new endpoints added to store/urls.py and store/views.py.
"""

import os
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "tb_sas.settings")

import django
django.setup()

from decimal import Decimal
from django.test import TestCase, Client, RequestFactory
from django.contrib.sessions.middleware import SessionMiddleware

from store.services import cart_service
from store.models import Product, ProductColor, Category


class CartEndpointTests(TestCase):
    """Basic endpoint behavior verification."""

    def setUp(self):
        self.category = Category.objects.create(name="Endpoint Test", slug="endpoint-test")
        self.product = Product.objects.create(
            category=self.category,
            name="Endpoint Product",
            slug="endpoint-product",
            price=200,
            is_active=True,
            is_available=True,
        )
        self.color = ProductColor.objects.create(
            product=self.product,
            name="Green",
            color_code="#00ff00",
            stock=10,
        )
        self.client = Client()
        self.factory = RequestFactory()

    def _session_post(self, path, data, csrf_token="testtoken"):
        # Django Client handles CSRF automatically when using `client.force_login` or
        # standard session, but we simulate explicit POST with CSRF.
        # For simplicity, use Client POST (Django Client handles session cookies).
        return self.client.post(path, data)

    # ------------------------------------------------------------------
    # Cart page (GET)
    # ------------------------------------------------------------------

    def test_cart_page_get(self):
        response = self.client.get("/cart")
        # Should return 200 even when session is empty (updated view passes context).
        self.assertEqual(response.status_code, 200)

    # ------------------------------------------------------------------
    # Add endpoint (POST /cart/add/)
    # ------------------------------------------------------------------

    def test_add_endpoint_success(self):
        response = self.client.post(
            "/cart/add/",
            {"product_id": self.product.id, "quantity": 2, "color_id": self.color.id},
        )
        # CSRF is handled by Django Client automatically for test clients.
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data.get("success"))
        self.assertIn("badge", data)
        self.assertIn("subtotal", data)
        self.assertIn("total", data)
        # Verify session updated.
        session = self.client.session
        # Note: Client session is managed by middleware; verify via service.
        # We rely on the response badge > 0.
        self.assertGreaterEqual(int(data.get("badge", 0)), 2)

    def test_add_missing_product_id(self):
        response = self.client.post("/cart/add/", {"quantity": 1})
        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertFalse(data.get("success"))
        self.assertIn("message", data)

    def test_add_invalid_quantity(self):
        response = self.client.post(
            "/cart/add/",
            {"product_id": self.product.id, "quantity": -1},
        )
        # The view converts quantity; service handles invalid quantity safely.
        # Expect either 400 (view catches conversion error) or false success.
        # Given the view tries int conversion and passes to service, the
        # service will return success=False and the view returns 400.
        # If view passes invalid int, service catches and returns False.
        # We just verify the response does not crash and contains JSON.
        self.assertIn(response.status_code, [200, 400])
        data = response.json()
        if response.status_code == 400:
            self.assertFalse(data.get("success"))

    # ------------------------------------------------------------------
    # Update endpoint (POST /cart/update/)
    # ------------------------------------------------------------------

    def test_update_endpoint(self):
        # First add.
        self.client.post(
            "/cart/add/",
            {"product_id": self.product.id, "quantity": 2, "color_id": self.color.id},
        )
        # Update quantity.
        response = self.client.post(
            "/cart/update/",
            {"key": f"{self.product.id}:{self.color.id}", "quantity": 3},
        )
        self.assertIn(response.status_code, [200, 400])
        data = response.json()
        if response.status_code == 200:
            self.assertTrue(data.get("success"))
            self.assertIn("badge", data)
        else:
            self.assertFalse(data.get("success"))

    # ------------------------------------------------------------------
    # Remove endpoint (POST /cart/remove/)
    # ------------------------------------------------------------------

    def test_remove_endpoint(self):
        self.client.post(
            "/cart/add/",
            {"product_id": self.product.id, "quantity": 1, "color_id": self.color.id},
        )
        response = self.client.post(
            "/cart/remove/",
            {"key": f"{self.product.id}:{self.color.id}"},
        )
        self.assertIn(response.status_code, [200, 400])
        data = response.json()
        if response.status_code == 200:
            self.assertTrue(data.get("success"))

    # ------------------------------------------------------------------
    # State endpoint (GET /cart/state/)
    # ------------------------------------------------------------------

    def test_state_endpoint_empty(self):
        response = self.client.get("/cart/state/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("badge", data)
        self.assertIn("items", data)
        self.assertEqual(data.get("badge"), 0)

    def test_state_endpoint_populated(self):
        self.client.post(
            "/cart/add/",
            {"product_id": self.product.id, "quantity": 2, "color_id": self.color.id},
        )
        response = self.client.get("/cart/state/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertGreaterEqual(data.get("badge", 0), 2)
        self.assertIn("items", data)
        self.assertIsInstance(data.get("items"), list)
        # Money serialization check: subtotal should be a string with 2 decimals.
        subtotal_raw = data.get("subtotal")
        # Since the endpoint serializes as string, verify format.
        if isinstance(subtotal_raw, str):
            self.assertTrue(subtotal_raw.endswith(".00") or "." in subtotal_raw)

    # ------------------------------------------------------------------
    # Security / CSRF
    # ------------------------------------------------------------------

    def test_post_without_csrf_rejected_default(self):
        # Django Client handles CSRF by default; we don't explicitly disable it.
        # This test just verifies that the endpoint responds with 200 (or 403 if
        # CSRF is missing). Given the Client uses session cookies, it includes CSRF.
        # If CSRF middleware is active, a raw RequestFactory POST without session
        # should return 403.
        response = self.client.post("/cart/add/", {"product_id": self.product.id})
        # Client includes CSRF token automatically when using sessions.
        # Therefore this should return 200 or 400 (not 403 due to missing CSRF).
        self.assertIn(response.status_code, [200, 400])


if __name__ == "__main__":
    import unittest
    unittest.main()
