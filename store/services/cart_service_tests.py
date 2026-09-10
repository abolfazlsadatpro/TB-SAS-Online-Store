"""
Temporary verification tests for store/services/cart_service.py.
Not a replacement for the full Django test suite.
"""

import os
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "tb_sas.settings")

import django
django.setup()

from decimal import Decimal
from django.test import RequestFactory, TestCase, Client
from django.contrib.sessions.middleware import SessionMiddleware

from store.services import cart_service
from store.models import Product, ProductColor, Category, SettingSite


class CartServiceVerificationTests(TestCase):
    """Basic verification of the approved session-based cart architecture."""

    def setUp(self):
        # Minimal product setup for verification.
        self.category = Category.objects.create(
            name="Test Category", slug="test-category"
        )
        self.product = Product.objects.create(
            category=self.category,
            name="Test Product",
            slug="test-product",
            price=100,
            is_active=True,
            is_available=True,
        )
        self.color = ProductColor.objects.create(
            product=self.product,
            name="Red",
            color_code="#ff0000",
            stock=5,
        )
        # Ensure a session-enabled request.
        self.factory = RequestFactory()
        self.client = Client()

    def _session_request(self):
        """Build a request with an active session."""
        request = self.factory.get("/cart/")
        middleware = SessionMiddleware(lambda req: None)
        middleware.process_request(request)
        request.session.save()
        return request

    # ------------------------------------------------------------------
    # Basic session key generation / parsing (TASK 13 architecture)
    # ------------------------------------------------------------------

    def test_make_key_no_color(self):
        key = cart_service._make_key(42, None)
        self.assertEqual(key, "42:0")

    def test_make_key_with_color(self):
        key = cart_service._make_key(42, 5)
        self.assertEqual(key, "42:5")

    def test_parse_key_valid(self):
        self.assertEqual(cart_service._parse_key("42:5"), (42, 5))
        self.assertEqual(cart_service._parse_key("99:0"), (99, None))

    def test_parse_key_invalid(self):
        self.assertEqual(cart_service._parse_key("bad"), (None, None))
        self.assertEqual(cart_service._parse_key("42"), (None, None))

    # ------------------------------------------------------------------
    # Empty cart behavior
    # ------------------------------------------------------------------

    def test_empty_cart_read(self):
        request = self._session_request()
        cart = cart_service.get_cart(request)
        self.assertEqual(cart, {})

    def test_badge_empty(self):
        request = self._session_request()
        self.assertEqual(cart_service.get_badge_count(request), 0)
        self.assertEqual(cart_service.get_lines_count(request), 0)

    # ------------------------------------------------------------------
    # Add item (same product + same color -> increment)
    # ------------------------------------------------------------------

    def test_add_new_item(self):
        request = self._session_request()
        result = cart_service.add_item(request, self.product.id, quantity=2, color_id=self.color.id)
        self.assertTrue(result["success"])
        self.assertEqual(result["key"], "1:1")
        self.assertEqual(result["quantity"], 2)
        self.assertGreaterEqual(result["badge"], 2)

    def test_add_same_key_increments(self):
        request = self._session_request()
        cart_service.add_item(request, self.product.id, quantity=2, color_id=self.color.id)
        result = cart_service.add_item(request, self.product.id, quantity=1, color_id=self.color.id)
        self.assertTrue(result["success"])
        self.assertEqual(result["quantity"], 3)

    # ------------------------------------------------------------------
    # Same product + different colors (TASK 13 architecture approval)
    # ------------------------------------------------------------------

    def test_different_colors_create_separate_lines(self):
        # Create a second color for the same product.
        color2 = ProductColor.objects.create(
            product=self.product,
            name="Blue",
            color_code="#0000ff",
            stock=3,
        )
        request = self._session_request()
        result1 = cart_service.add_item(request, self.product.id, quantity=2, color_id=self.color.id)
        result2 = cart_service.add_item(request, self.product.id, quantity=1, color_id=color2.id)
        self.assertTrue(result1["success"])
        self.assertTrue(result2["success"])
        # Keys must be different.
        self.assertNotEqual(result1["key"], result2["key"])
        # Lines count should be 2.
        self.assertEqual(cart_service.get_lines_count(request), 2)
        # Badge count should be 3 (2 + 1).
        self.assertEqual(cart_service.get_badge_count(request), 3)

    # ------------------------------------------------------------------
    # No color products
    # ------------------------------------------------------------------

    def test_add_no_color_for_product_without_colors(self):
        # Per existing model logic: Product.total_stock = sum(color.stock).
        # If a product has zero ProductColor records, total_stock is 0.
        # Therefore such products are treated as out of stock by the service.
        product_no_color = Product.objects.create(
            category=self.category,
            name="No Color Product",
            slug="no-color",
            price=50,
            is_active=True,
            is_available=True,
        )
        request = self._session_request()
        result = cart_service.add_item(request, product_no_color.id, quantity=1, color_id=None)
        # Because total_stock == 0 (no colors), the service correctly rejects.
        self.assertFalse(result["success"])
        self.assertIn("stock", result["message"].lower())

    # ------------------------------------------------------------------
    # Update / remove / clear
    # ------------------------------------------------------------------

    def test_update_quantity(self):
        request = self._session_request()
        cart_service.add_item(request, self.product.id, quantity=2, color_id=self.color.id)
        result = cart_service.update_item(request, "1:1", 4)
        self.assertTrue(result["success"])
        self.assertEqual(result["quantity"], 4)

    def test_update_to_zero_removes_item(self):
        request = self._session_request()
        cart_service.add_item(request, self.product.id, quantity=2, color_id=self.color.id)
        result = cart_service.update_item(request, "1:1", 0)
        self.assertTrue(result["success"])
        self.assertEqual(cart_service.get_lines_count(request), 0)

    def test_remove_item(self):
        request = self._session_request()
        cart_service.add_item(request, self.product.id, quantity=1, color_id=self.color.id)
        result = cart_service.remove_item(request, "1:1")
        self.assertTrue(result["success"])
        self.assertEqual(cart_service.get_badge_count(request), 0)

    def test_clear_cart(self):
        request = self._session_request()
        cart_service.add_item(request, self.product.id, quantity=1, color_id=self.color.id)
        result = cart_service.clear_cart(request)
        self.assertTrue(result["success"])
        self.assertEqual(cart_service.get_badge_count(request), 0)

    # ------------------------------------------------------------------
    # Stale data handling
    # ------------------------------------------------------------------

    def test_stale_deleted_product_removed(self):
        request = self._session_request()
        cart_service.add_item(request, self.product.id, quantity=1, color_id=self.color.id)
        # Delete product from DB (simulates deletion after cart creation).
        product_deleted_id = self.product.id
        self.product.delete()
        # Resolution should remove the entry and emit a warning.
        items, warnings, cleaned = cart_service.resolve_items(request)
        self.assertEqual(len(items), 0)
        self.assertTrue(any("deleted" in w.lower() or "not found" in w.lower() for w in warnings))

    # ------------------------------------------------------------------
    # Subtotal / totals
    # ------------------------------------------------------------------

    def test_subtotal_and_totals(self):
        request = self._session_request()
        cart_service.add_item(request, self.product.id, quantity=2, color_id=self.color.id)
        subtotal = cart_service.calculate_subtotal(request)
        # Price is 100, quantity 2 => 200.
        self.assertEqual(subtotal, Decimal("200"))
        totals = cart_service.calculate_totals(request)
        self.assertEqual(totals["subtotal"], Decimal("200"))
        self.assertEqual(totals["shipping"], Decimal("0"))
        self.assertEqual(totals["tax"], Decimal("0"))
        self.assertEqual(totals["total"], Decimal("200"))

    # ------------------------------------------------------------------
    # Security / validation
    # ------------------------------------------------------------------

    def test_add_invalid_quantity(self):
        request = self._session_request()
        result = cart_service.add_item(request, self.product.id, quantity=-1, color_id=self.color.id)
        self.assertFalse(result["success"])

    def test_add_exceeds_stock(self):
        request = self._session_request()
        # Color stock is 5.
        result = cart_service.add_item(request, self.product.id, quantity=10, color_id=self.color.id)
        self.assertFalse(result["success"])

    # ------------------------------------------------------------------
    # Coupon session helpers
    # ------------------------------------------------------------------

    def test_coupon_session_state(self):
        request = self._session_request()
        self.assertIsNone(cart_service.get_coupon_code(request))
        cart_service.set_coupon_code(request, "TESTCODE")
        self.assertEqual(cart_service.get_coupon_code(request), "TESTCODE")
        cart_service.clear_coupon_code(request)
        self.assertIsNone(cart_service.get_coupon_code(request))

    # ------------------------------------------------------------------
    # Key parsing edge cases
    # ------------------------------------------------------------------

    def test_parse_malformed_keys_gracefully(self):
        # Malformed keys must not crash resolution.
        request = self._session_request()
        # Manually inject a bad session entry (simulating corruption).
        cart_service.get_cart(request)["badkey"] = {"quantity": 1}
        items, warnings, cleaned = cart_service.resolve_items(request)
        # The bad entry should be removed with a warning.
        bad_key_removed = any("Malformed" in w for w in warnings)
        self.assertTrue(bad_key_removed)


if __name__ == "__main__":
    import unittest
    unittest.main()
