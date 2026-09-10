"""
TASK 26 — Checkout / Order / Coupon integration tests.

Covers:
- Checkout success (Order + OrderItem creation, historical price, selected color, correct total, cart cleared)
- Server authority (client cannot override monetary values)
- Coupon integration (valid/invalid/expired/usage-limit, discount recalculation server-side)
- Failure handling (empty cart, missing customer info)
- Duplicate submission protection (server-side idempotency key)

All monetary values are verified as server-authoritative (never from POST).
"""

import os
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "tb_sas.settings")

import django
django.setup()

from decimal import Decimal

from django.test import TestCase, Client
from django.utils import timezone
import datetime

from store.models import (
    Order, OrderItem, Coupon, Product, ProductColor, Category, Customer,
    SettingSite,
)
from users.models import PersonUser
from store.services import cart_service, coupon_service


class CheckoutBaseTestCase(TestCase):
    """Shared setup for checkout tests."""

    def setUp(self):
        self.client = Client()
        self.category = Category.objects.create(
            name="Checkout Test", slug="checkout-test"
        )
        self.product = Product.objects.create(
            category=self.category,
            name="Checkout Product",
            slug="checkout-product",
            price=200,
            is_active=True,
            is_available=True,
        )
        self.color = ProductColor.objects.create(
            product=self.product,
            name="Red",
            color_code="#ff0000",
            stock=10,
        )
        # Test DB creates SettingSite with defaults (0.00).
        # Tests that need specific values set them explicitly.

    def _add_item(self, product_id=None, quantity=2, color_id=None):
        product_id = product_id or self.product.id
        color_id = color_id if color_id is not None else self.color.id
        response = self.client.post(
            "/cart/add/",
            {"product_id": product_id, "quantity": quantity, "color_id": color_id},
        )
        return response

    def _apply_coupon(self, code):
        return self.client.post("/cart/coupon/", {"code": code})

    def _valid_post_data(self, **overrides):
        data = {
            "full_name": "Test User",
            "email": "test@example.com",
            "phone": "01234567890",
            "address": "123 Test Street",
            "country": "Testland",
            "city": "Test City",
            "postal_code": "12345",
            "payment": "cash_on_delivery",
        }
        data.update(overrides)
        return data


class CheckoutSuccessTests(CheckoutBaseTestCase):
    """Valid checkout creates exactly one Order with correct OrderItems."""

    def test_valid_cart_creates_order(self):
        self._add_item(quantity=2)
        response = self.client.post("/checkout/", self._valid_post_data())
        self.assertEqual(Order.objects.count(), 1)
        order = Order.objects.first()
        self.assertIsNotNone(order)
        self.assertFalse(order.is_paid)  # unpaid — no payment processing exists
        self.assertEqual(order.status, 0)  # Pending Pay
        self.assertEqual(order.coupon_code, "")  # no coupon applied

    def test_order_items_created_correctly(self):
        self._add_item(quantity=3)
        self.client.post("/checkout/", self._valid_post_data())
        order = Order.objects.first()
        items = OrderItem.objects.filter(order=order)
        self.assertEqual(items.count(), 1)
        item = items.first()
        self.assertEqual(item.product_id, self.product.id)
        self.assertEqual(item.quantity, 3)
        self.assertEqual(item.color_id, self.color.id)

    def test_historical_price_stored(self):
        self._add_item(quantity=2)
        self.client.post("/checkout/", self._valid_post_data())
        order = Order.objects.first()
        item = OrderItem.objects.filter(order=order).first()
        # unit price = product final_price = 200 (no discount on product)
        self.assertEqual(item.price, 200)
        # Historical integrity: mutating product price after checkout must NOT
        # change the already-stored OrderItem.price.
        self.product.price = 999
        self.product.save()
        item.refresh_from_db()
        self.assertEqual(item.price, 200)

    def test_selected_color_stored(self):
        self._add_item(quantity=1)
        self.client.post("/checkout/", self._valid_post_data())
        order = Order.objects.first()
        item = OrderItem.objects.filter(order=order).first()
        self.assertEqual(item.color_id, self.color.id)

    def test_correct_total_stored(self):
        # Product price 200, qty 2 → subtotal 400. Test DB: tax 0, shipping 0.
        self._add_item(quantity=2)
        self.client.post("/checkout/", self._valid_post_data())
        order = Order.objects.first()
        self.assertEqual(order.total_price, 400)

    def test_cart_cleared_after_success(self):
        self._add_item(quantity=2)
        self.client.post("/checkout/", self._valid_post_data())
        # Session cart must be empty after successful checkout.
        response = self.client.get("/cart/state/")
        data = response.json()
        self.assertEqual(data["badge"], 0)
        self.assertEqual(data["items"], [])

    def test_coupon_code_recorded_on_order(self):
        Coupon.objects.create(
            code="SAVE10", is_active=True, discount_percent=10,
            min_subtotal=Decimal("0"),
        )
        self._add_item(quantity=2)  # subtotal 400
        self._apply_coupon("SAVE10")
        self.client.post("/checkout/", self._valid_post_data())
        order = Order.objects.first()
        self.assertEqual(order.coupon_code, "SAVE10")

    def test_discount_amount_recorded_on_order(self):
        Coupon.objects.create(
            code="SAVE10", is_active=True, discount_percent=10,
            min_subtotal=Decimal("0"),
        )
        self._add_item(quantity=2)  # subtotal 400
        self._apply_coupon("SAVE10")
        self.client.post("/checkout/", self._valid_post_data())
        order = Order.objects.first()
        # 10% of 400 = 40.
        self.assertEqual(order.discount_amount, Decimal("40.00"))

    def test_total_reflects_discount(self):
        Coupon.objects.create(
            code="SAVE10", is_active=True, discount_percent=10,
            min_subtotal=Decimal("0"),
        )
        self._add_item(quantity=2)  # subtotal 400
        self._apply_coupon("SAVE10")
        self.client.post("/checkout/", self._valid_post_data())
        order = Order.objects.first()
        # Test DB: tax 0, shipping 0. Total = 400 - 40 = 360.
        self.assertEqual(order.total_price, 360)


class ServerAuthorityTests(CheckoutBaseTestCase):
    """Client-supplied monetary values must never be trusted."""

    def test_client_cannot_override_total(self):
        self._add_item(quantity=2)
        # Client attempts to submit a fake total.
        self.client.post(
            "/checkout/", self._valid_post_data(total="1")
        )
        order = Order.objects.first()
        # Server-computed total is 400, not 1.
        self.assertEqual(order.total_price, 400)

    def test_client_cannot_override_discount(self):
        Coupon.objects.create(
            code="SAVE10", is_active=True, discount_percent=10,
            min_subtotal=Decimal("0"),
        )
        self._add_item(quantity=2)
        self._apply_coupon("SAVE10")
        # Client attempts to submit a fake discount.
        self.client.post(
            "/checkout/", self._valid_post_data(discount="999")
        )
        order = Order.objects.first()
        # Server-computed discount is 40 (10% of 400), not 999.
        self.assertEqual(order.discount_amount, Decimal("40.00"))

    def test_client_cannot_override_price_via_post(self):
        self._add_item(quantity=2)
        # Client attempts to submit a fake unit price.
        self.client.post(
            "/checkout/", self._valid_post_data(price="1")
        )
        order = Order.objects.first()
        item = OrderItem.objects.filter(order=order).first()
        # Server-resolved price is 200, not 1.
        self.assertEqual(item.price, 200)

    def test_client_cannot_override_subtotal(self):
        self._add_item(quantity=2)
        self.client.post(
            "/checkout/", self._valid_post_data(subtotal="1")
        )
        order = Order.objects.first()
        # Server-computed total (subtotal + tax + shipping - discount) is 400.
        self.assertEqual(order.total_price, 400)


class CheckoutCouponTests(CheckoutBaseTestCase):
    """Coupon re-validation and usage consumption at checkout."""

    def test_valid_coupon_applied(self):
        Coupon.objects.create(
            code="SAVE10", is_active=True, discount_percent=10,
            min_subtotal=Decimal("0"),
        )
        self._add_item(quantity=2)
        self._apply_coupon("SAVE10")
        self.client.post("/checkout/", self._valid_post_data())
        order = Order.objects.first()
        self.assertEqual(order.coupon_code, "SAVE10")
        self.assertEqual(order.discount_amount, Decimal("40.00"))

    def test_invalid_coupon_rejected(self):
        # No coupon exists.
        self._add_item(quantity=2)
        self._apply_coupon("BADCODE")
        self.client.post("/checkout/", self._valid_post_data())
        order = Order.objects.first()
        # Invalid coupon is not recorded.
        self.assertEqual(order.coupon_code, "")

    def test_expired_coupon_rejected(self):
        Coupon.objects.create(
            code="EXPIRED", is_active=True, discount_percent=10,
            valid_until=timezone.now() - datetime.timedelta(days=1),
        )
        self._add_item(quantity=2)
        self._apply_coupon("EXPIRED")
        self.client.post("/checkout/", self._valid_post_data())
        order = Order.objects.first()
        # Expired coupon is not recorded.
        self.assertEqual(order.coupon_code, "")
        self.assertEqual(order.discount_amount, Decimal("0"))

    def test_usage_limit_full_coupon_rejected_at_apply(self):
        """Coupon already at usage_limit must be rejected at apply time, not consume slot."""
        coupon = Coupon.objects.create(
            code="LIMITFULL", is_active=True, discount_percent=10,
            usage_limit=1, usage_count=1, min_subtotal=Decimal("0"),
        )
        self._add_item(quantity=2)
        apply_response = self._apply_coupon("LIMITFULL")
        # Apply rejected because usage_count (1) >= usage_limit (1).
        self.assertFalse(apply_response.json()["success"])
        coupon.refresh_from_db()
        # usage_count stays at 1 — apply must not consume slot.
        self.assertEqual(coupon.usage_count, 1)

    def test_usage_limit_increment_at_checkout_respects_atomic_filter(self):
        """Checkout increment is gated by usage_count__lt usage_limit."""
        coupon = Coupon.objects.create(
            code="LIMIT1", is_active=True, discount_percent=10,
            usage_limit=1, usage_count=0, min_subtotal=Decimal("0"),
        )
        self._add_item(quantity=2)
        apply_response = self._apply_coupon("LIMIT1")
        self.assertTrue(apply_response.json()["success"])
        self.client.post("/checkout/", self._valid_post_data())
        coupon.refresh_from_db()
        # usage_count incremented to 1.
        self.assertEqual(coupon.usage_count, 1)

    def test_usage_limit_not_exceeded_via_stale_session_coupon(self):
        """Even if a stale session coupon bypasses apply-time validation,
        the server-side revalidation at checkout + atomic F() filter
        prevents usage_count from exceeding usage_limit.
        """
        coupon = Coupon.objects.create(
            code="LIMIT1", is_active=True, discount_percent=10,
            usage_limit=1, usage_count=0, min_subtotal=Decimal("0"),
        )
        # First checkout consumes the slot.
        self._add_item(quantity=2)
        apply_response = self._apply_coupon("LIMIT1")
        self.assertTrue(apply_response.json()["success"])
        self.client.post("/checkout/", self._valid_post_data())
        coupon.refresh_from_db()
        self.assertEqual(coupon.usage_count, 1)
        # Second attempt: apply is rejected (validate sees usage_count >= limit).
        self._add_item(quantity=2)
        apply_response2 = self._apply_coupon("LIMIT1")
        self.assertFalse(apply_response2.json()["success"])
        # Even if a stale coupon code is manually forced into the session
        # (simulating a race where apply succeeded but limit was reached
        # before checkout), checkout revalidation + atomic filter block it.
        session = self.client.session
        session["cart_coupon_code"] = "LIMIT1"
        session.save()
        self._add_item(quantity=2)
        self.client.post("/checkout/", self._valid_post_data())
        coupon.refresh_from_db()
        # usage_count stays at 1 — atomic F() filter blocked over-consumption.
        self.assertEqual(coupon.usage_count, 1)

    def test_unlimited_coupon_usage_not_incremented_by_limit_logic(self):
        # usage_limit=None means unlimited — no increment is applied
        # (preserves the existing NULL semantics).
        coupon = Coupon.objects.create(
            code="UNLIMITED", is_active=True, discount_percent=10,
            usage_limit=None, usage_count=0, min_subtotal=Decimal("0"),
        )
        self._add_item(quantity=2)
        self._apply_coupon("UNLIMITED")
        self.client.post("/checkout/", self._valid_post_data())
        coupon.refresh_from_db()
        # Existing NULL semantics preserved: no usage increment logic runs.
        self.assertEqual(coupon.usage_count, 0)

    def test_coupon_discount_recalculated_server_side(self):
        # Coupon minimum subtotal check uses current server-computed subtotal.
        Coupon.objects.create(
            code="MIN500", is_active=True, discount_percent=10,
            min_subtotal=Decimal("500"),
        )
        self._add_item(quantity=2)  # subtotal 400 < 500
        self._apply_coupon("MIN500")
        self.client.post("/checkout/", self._valid_post_data())
        order = Order.objects.first()
        # Coupon did not meet min_subtotal — not consumed.
        self.assertEqual(order.coupon_code, "")
        self.assertEqual(order.discount_amount, Decimal("0"))

    def test_coupon_min_subtotal_met(self):
        Coupon.objects.create(
            code="MIN300", is_active=True, discount_percent=10,
            min_subtotal=Decimal("300"),
        )
        self._add_item(quantity=2)  # subtotal 400 >= 300
        self._apply_coupon("MIN300")
        self.client.post("/checkout/", self._valid_post_data())
        order = Order.objects.first()
        self.assertEqual(order.coupon_code, "MIN300")
        self.assertEqual(order.discount_amount, Decimal("40.00"))


class CheckoutFailureTests(CheckoutBaseTestCase):
    """Checkout failure must not corrupt cart/order/coupon state."""

    def test_empty_cart_rejected(self):
        response = self.client.post("/checkout/", self._valid_post_data())
        # No order created.
        self.assertEqual(Order.objects.count(), 0)

    def test_missing_customer_info_rejected(self):
        self._add_item(quantity=2)
        # Missing full_name.
        data = self._valid_post_data()
        data["full_name"] = ""
        response = self.client.post("/checkout/", data)
        # No order created.
        self.assertEqual(Order.objects.count(), 0)

    def test_failed_checkout_preserves_cart(self):
        self._add_item(quantity=2)
        # Submit with missing customer info — checkout fails.
        data = self._valid_post_data()
        data["full_name"] = ""
        self.client.post("/checkout/", data)
        # Cart must NOT be cleared.
        response = self.client.get("/cart/state/")
        data = response.json()
        self.assertEqual(data["badge"], 2)
        self.assertEqual(len(data["items"]), 1)

    def test_failed_checkout_does_not_consume_coupon(self):
        coupon = Coupon.objects.create(
            code="SAVE10", is_active=True, discount_percent=10,
            usage_limit=5, usage_count=0, min_subtotal=Decimal("0"),
        )
        self._add_item(quantity=2)
        self._apply_coupon("SAVE10")
        # Submit with missing customer info — checkout fails.
        data = self._valid_post_data()
        data["full_name"] = ""
        self.client.post("/checkout/", data)
        coupon.refresh_from_db()
        # usage_count must NOT be incremented on failed checkout.
        self.assertEqual(coupon.usage_count, 0)

    def test_failed_checkout_preserves_idempotency_key(self):
        """Validation failure must re-render with the SAME idempotency key."""
        self._add_item(quantity=2)
        key = "test-preserve-key-123"
        data = self._valid_post_data()
        data["full_name"] = ""  # triggers validation failure
        data["idempotency_key"] = key
        response = self.client.post("/checkout/", data)
        # No order created.
        self.assertEqual(Order.objects.count(), 0)
        # The re-rendered page context must contain the same key.
        # We can't easily inspect template context in TestCase, so verify
        # by submitting again with the same key — if key was preserved,
        # second submission is duplicate and returns existing order (none).
        # Actually, the first POST returned 200 (re-render), not redirect.
        # Just verify the hidden field would have the key by checking
        # the response renders the key. Use render_to_string or check
        # the response content for the key value.
        self.assertContains(response, 'idempotency_key" value="%s"' % key)

    def test_stale_product_in_cart_rejected(self):
        self._add_item(quantity=2)
        # Delete the product — cart becomes stale.
        self.product.delete()
        response = self.client.post("/checkout/", self._valid_post_data())
        # No order created (stale cart resolved to empty).
        self.assertEqual(Order.objects.count(), 0)


class DuplicateSubmissionTests(CheckoutBaseTestCase):
    """Server-side idempotency prevents duplicate order creation."""

    def test_duplicate_key_returns_existing_order(self):
        self._add_item(quantity=2)
        # First submission with a known key.
        self.client.post(
            "/checkout/", self._valid_post_data(idempotency_key="test-key-123")
        )
        self.assertEqual(Order.objects.count(), 1)
        # Second submission with the same key — must not create a new order.
        self.client.post(
            "/checkout/", self._valid_post_data(idempotency_key="test-key-123")
        )
        # Still exactly one order.
        self.assertEqual(Order.objects.count(), 1)

    def test_duplicate_key_does_not_consume_coupon_twice(self):
        coupon = Coupon.objects.create(
            code="SAVE10", is_active=True, discount_percent=10,
            usage_limit=5, usage_count=0, min_subtotal=Decimal("0"),
        )
        self._add_item(quantity=2)
        self._apply_coupon("SAVE10")
        self.client.post(
            "/checkout/", self._valid_post_data(idempotency_key="dup-key-1")
        )
        coupon.refresh_from_db()
        self.assertEqual(coupon.usage_count, 1)
        # Duplicate submission.
        self.client.post(
            "/checkout/", self._valid_post_data(idempotency_key="dup-key-1")
        )
        coupon.refresh_from_db()
        # usage_count NOT incremented again.
        self.assertEqual(coupon.usage_count, 1)

    def test_different_keys_create_different_orders(self):
        self._add_item(quantity=2)
        self.client.post(
            "/checkout/", self._valid_post_data(idempotency_key="key-a")
        )
        # Re-add an item (cart was cleared by the first checkout).
        self._add_item(quantity=1)
        self.client.post(
            "/checkout/", self._valid_post_data(idempotency_key="key-b")
        )
        self.assertEqual(Order.objects.count(), 2)

    def test_idempotency_key_stored_on_order(self):
        self._add_item(quantity=2)
        self.client.post(
            "/checkout/", self._valid_post_data(idempotency_key="stored-key")
        )
        order = Order.objects.first()
        self.assertEqual(order.idempotency_key, "stored-key")


class CheckoutRegressionTests(CheckoutBaseTestCase):
    """Regression: existing TASK 21–25 behavior remains intact."""

    def test_cart_endpoints_still_work(self):
        # Cart add/update/remove/state endpoints unchanged.
        self._add_item(quantity=2)
        response = self.client.post(
            "/cart/update/",
            {"key": f"{self.product.id}:{self.color.id}", "quantity": 3},
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["success"])

    def test_coupon_endpoints_still_work(self):
        Coupon.objects.create(
            code="SAVE10", is_active=True, discount_percent=10,
            min_subtotal=Decimal("0"),
        )
        self._add_item(quantity=2)
        response = self.client.post("/cart/coupon/", {"code": "SAVE10"})
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["success"])
        remove_response = self.client.post("/cart/coupon/remove/", {})
        self.assertTrue(remove_response.json()["success"])

    def test_coupon_usage_not_incremented_by_apply(self):
        # Apply must NOT increment usage (only checkout does).
        coupon = Coupon.objects.create(
            code="SAVE10", is_active=True, discount_percent=10,
            usage_limit=5, usage_count=0, min_subtotal=Decimal("0"),
        )
        self._add_item(quantity=2)
        self._apply_coupon("SAVE10")
        coupon.refresh_from_db()
        # usage_count NOT incremented at apply time.
        self.assertEqual(coupon.usage_count, 0)


class CheckoutFormContractTests(CheckoutBaseTestCase):
    """Verify the checkout template contains all required form fields."""

    def test_form_contains_required_name_attributes(self):
        """The checkout form must submit the exact field names expected by checkout_page."""
        self._add_item(quantity=2)
        # GET the checkout page and inspect the rendered HTML.
        response = self.client.get("/checkout/")
        self.assertEqual(response.status_code, 200)
        content = response.content.decode("utf-8")

        # Required hidden idempotency key.
        self.assertIn('name="idempotency_key"', content)

        # Customer info fields.
        self.assertIn('name="full_name"', content)
        self.assertIn('name="email"', content)
        self.assertIn('name="phone"', content)
        self.assertIn('name="address"', content)
        self.assertIn('name="country"', content)
        self.assertIn('name="city"', content)
        self.assertIn('name="postal_code"', content)

        # Payment radio with explicit values.
        self.assertIn('name="payment"', content)
        self.assertIn('value="cash_on_delivery"', content)
        self.assertIn('value="online_payment"', content)

        # Place Order button connected to form via form="checkout-form".
        self.assertIn('form="checkout-form"', content)
        self.assertIn('type="submit"', content)

    def test_post_submits_all_expected_fields(self):
        """A valid POST with all expected field names creates an Order."""
        self._add_item(quantity=2)
        data = self._valid_post_data()
        # Explicitly include all expected field names.
        data.update({
            "full_name": "Test User",
            "email": "test@example.com",
            "phone": "01234567890",
            "address": "123 Test Street",
            "country": "Testland",
            "city": "Test City",
            "postal_code": "12345",
            "payment": "cash_on_delivery",
        })
        response = self.client.post("/checkout/", data)
        self.assertEqual(response.status_code, 302)  # redirect on success
        self.assertEqual(Order.objects.count(), 1)


if __name__ == "__main__":
    import unittest
    unittest.main()
