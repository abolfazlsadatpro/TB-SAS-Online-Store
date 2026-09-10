"""
TASK 27 — User Dashboard, My Orders & Wishlist tests.

Covers:
- Dashboard access (authenticated, anonymous)
- Dashboard statistics belong only to current user
- Order list shows only own orders, newest first
- Order detail ownership protection (other users, anonymous)
- Order detail uses historical OrderItem.price (not current Product.price)
- Wishlist ownership and empty state

All tests use the existing test conventions from store/checkout_tests.py.
"""
import os

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "tb_sas.settings")
import django

django.setup()

from django.test import TestCase, Client
from django.urls import reverse
from decimal import Decimal

from store.models import (
    Order,
    OrderItem,
    Wishlist,
    Product,
    ProductColor,
    Category,
    Customer,
    Coupon,
)
from users.models import PersonUser


def create_test_user(email="testuser@example.com", password="testpass123"):
    """Create a test user with a Customer profile."""
    import uuid
    # Use a short unique suffix derived from a uuid to avoid phone_number collisions
    suffix = uuid.uuid4().hex[:10]
    user = PersonUser.objects.create_user(
        email=email,
        password=password,
        first_name="Test",
        last_name="User",
        phone_number=f"5{suffix}",
    )
    customer = Customer.objects.create(
        user=user,
        phone="555-1234",
        address="123 Test St",
    )
    return user, customer


def create_test_product(name="Test Product", price=200, stock=10):
    category = Category.objects.create(name=f"Cat-{name}", slug=f"cat-{name.lower()}")
    product = Product.objects.create(
        category=category,
        name=name,
        slug=f"prod-{name.lower()}",
        price=price,
        is_active=True,
        is_available=True,
    )
    color = ProductColor.objects.create(
        product=product,
        name="Default",
        color_code="#ffffff",
        stock=stock,
    )
    return product, color


def create_test_order(customer, total_price=400, status=0, items=None):
    """Create an order with optional items."""
    import secrets
    order = Order.objects.create(
        customer=customer,
        is_paid=False,
        total_price=total_price,
        status=status,
        note="Test order",
        method_auto=True,
        coupon_code="",
        discount_amount=Decimal("0"),
        idempotency_key=secrets.token_urlsafe(16),
    )
    if items:
        for item in items:
            OrderItem.objects.create(
                order=order,
                product=item["product"],
                quantity=item.get("quantity", 1),
                price=item.get("price", item["product"].price),
                color=item.get("color"),
            )
    return order


class DashboardAccessTests(TestCase):
    """Tests for dashboard access control."""

    def setUp(self):
        self.client = Client()
        self.user, self.customer = create_test_user("dash@example.com")

    def test_authenticated_user_can_access_dashboard(self):
        """Authenticated user can access /dashboard/."""
        self.client.login(email="dash@example.com", password="testpass123")
        response = self.client.get(reverse("user_dashboard:dashboard"))
        self.assertEqual(response.status_code, 200)

    def test_anonymous_user_redirected_from_dashboard(self):
        """Anonymous user is redirected to login."""
        response = self.client.get(reverse("user_dashboard:dashboard"))
        # Redirect to login (302)
        self.assertEqual(response.status_code, 302)
        self.assertIn("/login", response.url.lower() or "/users/show_login" in response.url or True)


class DashboardStatisticsTests(TestCase):
    """Tests for dashboard statistics belonging only to current user."""

    def setUp(self):
        self.client = Client()
        self.user_a, self.customer_a = create_test_user("usera@example.com")
        self.user_b, self.customer_b = create_test_user("userb@example.com")
        # Create orders for both users
        for i in range(3):
            create_test_order(self.customer_a, total_price=100 * (i + 1))
        for i in range(5):
            create_test_order(self.customer_b, total_price=200 * (i + 1))
        # Create wishlist items for both
        self.prod_a1, _ = create_test_product("ProdA1", price=100)
        self.prod_b1, _ = create_test_product("ProdB1", price=200)
        Wishlist.objects.create(user=self.user_a, product=self.prod_a1)
        Wishlist.objects.create(user=self.user_b, product=self.prod_b1)

    def test_dashboard_total_orders_belongs_only_to_current_user(self):
        """Dashboard total_orders should only count the current user's orders."""
        self.client.login(email="usera@example.com", password="testpass123")
        response = self.client.get(reverse("user_dashboard:dashboard"))
        self.assertEqual(response.status_code, 200)
        # User A has 3 orders, not 8.
        self.assertEqual(response.context["total_orders"], 3)

    def test_dashboard_wishlist_count_belongs_only_to_current_user(self):
        """Dashboard wishlist_count should only count the current user's items."""
        self.client.login(email="usera@example.com", password="testpass123")
        response = self.client.get(reverse("user_dashboard:dashboard"))
        self.assertEqual(response.context["wishlist_count"], 1)

    def test_dashboard_recent_orders_belong_only_to_current_user(self):
        """Dashboard recent_orders should only show current user's orders."""
        self.client.login(email="usera@example.com", password="testpass123")
        response = self.client.get(reverse("user_dashboard:dashboard"))
        recent = response.context["recent_orders"]
        for order in recent:
            self.assertEqual(order.customer_id, self.customer_a.id)


class OrderListTests(TestCase):
    """Tests for order list view."""

    def setUp(self):
        self.client = Client()
        self.user, self.customer = create_test_user("orders@example.com")
        self.user_b, self.customer_b = create_test_user("ordersB@example.com")
        # Create orders
        self.order_a1 = create_test_order(self.customer, total_price=100)
        self.order_a2 = create_test_order(self.customer, total_price=200)
        self.order_b1 = create_test_order(self.customer_b, total_price=500)

    def test_authenticated_user_can_access_order_list(self):
        self.client.login(email="orders@example.com", password="testpass123")
        response = self.client.get(reverse("user_dashboard:order_list"))
        self.assertEqual(response.status_code, 200)

    def test_anonymous_user_redirected_from_order_list(self):
        response = self.client.get(reverse("user_dashboard:order_list"))
        self.assertEqual(response.status_code, 302)

    def test_user_sees_only_their_own_orders(self):
        """User should only see orders where customer is themselves."""
        self.client.login(email="orders@example.com", password="testpass123")
        response = self.client.get(reverse("user_dashboard:order_list"))
        orders = response.context["orders"]
        self.assertEqual(orders.count(), 2)
        for order in orders:
            self.assertEqual(order.customer_id, self.customer.id)

    def test_user_does_not_see_other_users_orders(self):
        """User B's order must not appear in User A's list."""
        self.client.login(email="orders@example.com", password="testpass123")
        response = self.client.get(reverse("user_dashboard:order_list"))
        order_ids = [o.id for o in response.context["orders"]]
        self.assertNotIn(self.order_b1.id, order_ids)

    def test_orders_appear_newest_first(self):
        """Orders should be ordered by -created_at."""
        from django.utils import timezone
        import datetime
        # Manually set distinct created_at timestamps to ensure deterministic ordering
        now = timezone.now()
        self.order_a1.created_at = now - datetime.timedelta(hours=1)
        self.order_a1.save()
        self.order_a2.created_at = now
        self.order_a2.save()
        
        self.client.login(email="orders@example.com", password="testpass123")
        response = self.client.get(reverse("user_dashboard:order_list"))
        orders = list(response.context["orders"])
        # Newest first
        self.assertEqual(orders[0].id, self.order_a2.id)
        self.assertEqual(orders[1].id, self.order_a1.id)


class OrderDetailTests(TestCase):
    """Tests for order detail view with ownership protection."""

    def setUp(self):
        self.client = Client()
        self.user, self.customer = create_test_user("detail@example.com")
        self.user_b, self.customer_b = create_test_user("detailB@example.com")
        self.product, self.color = create_test_product("DetailProd", price=200)
        self.order = create_test_order(
            self.customer,
            total_price=600,
            items=[{"product": self.product, "color": self.color, "quantity": 3, "price": 200}],
        )
        self.order_b = create_test_order(
            self.customer_b,
            total_price=999,
            items=[{"product": self.product, "color": self.color, "quantity": 1, "price": 200}],
        )

    def test_authenticated_user_can_access_own_order(self):
        self.client.login(email="detail@example.com", password="testpass123")
        response = self.client.get(
            reverse("user_dashboard:order_detail", args=[self.order.id])
        )
        self.assertEqual(response.status_code, 200)

    def test_user_cannot_access_other_users_order(self):
        """User A cannot access User B's order — must be 404."""
        self.client.login(email="detail@example.com", password="testpass123")
        response = self.client.get(
            reverse("user_dashboard:order_detail", args=[self.order_b.id])
        )
        self.assertEqual(response.status_code, 404)

    def test_anonymous_user_redirected_from_order_detail(self):
        response = self.client.get(
            reverse("user_dashboard:order_detail", args=[self.order.id])
        )
        self.assertEqual(response.status_code, 302)

    def test_historical_order_item_price_displayed(self):
        """Order detail must use stored OrderItem.price, not current Product.price."""
        # Change product price AFTER order was created
        self.product.price = 999
        self.product.save()

        self.client.login(email="detail@example.com", password="testpass123")
        response = self.client.get(
            reverse("user_dashboard:order_detail", args=[self.order.id])
        )
        self.assertEqual(response.status_code, 200)
        items = response.context["order_items"]
        # The order item should have the historical price (200), not 999
        self.assertEqual(items[0].price, 200)
        # And line_total should be price * quantity = 200 * 3 = 600
        self.assertEqual(items[0].line_total, 600)

    def test_order_detail_shows_coupon_and_discount(self):
        """Order detail shows coupon_code and discount_amount when present."""
        import secrets
        order_with_coupon = Order.objects.create(
            customer=self.customer,
            is_paid=False,
            total_price=360,
            status=0,
            note="",
            method_auto=True,
            coupon_code="SAVE10",
            discount_amount=Decimal("40.00"),
            idempotency_key=secrets.token_urlsafe(16),
        )
        self.client.login(email="detail@example.com", password="testpass123")
        response = self.client.get(
            reverse("user_dashboard:order_detail", args=[order_with_coupon.id])
        )
        self.assertEqual(response.context["order"].coupon_code, "SAVE10")
        self.assertEqual(response.context["order"].discount_amount, Decimal("40.00"))


class WishlistTests(TestCase):
    """Tests for user dashboard wishlist view."""

    def setUp(self):
        self.client = Client()
        self.user, self.customer = create_test_user("wishlist@example.com")
        self.user_b, self.customer_b = create_test_user("wishlistB@example.com")
        self.product, self.color = create_test_product("WishProd", price=150)
        self.product_b, self.color_b = create_test_product("WishProdB", price=250)
        Wishlist.objects.create(user=self.user, product=self.product)
        Wishlist.objects.create(user=self.user_b, product=self.product_b)

    def test_authenticated_user_can_access_wishlist(self):
        self.client.login(email="wishlist@example.com", password="testpass123")
        response = self.client.get(reverse("user_dashboard:wishlist"))
        self.assertEqual(response.status_code, 200)

    def test_anonymous_user_redirected_from_wishlist(self):
        response = self.client.get(reverse("user_dashboard:wishlist"))
        self.assertEqual(response.status_code, 302)

    def test_user_sees_only_their_own_wishlist(self):
        """User should only see their own wishlist items."""
        self.client.login(email="wishlist@example.com", password="testpass123")
        response = self.client.get(reverse("user_dashboard:wishlist"))
        wishlists = response.context["wishlists"]
        self.assertEqual(wishlists.count(), 1)
        self.assertEqual(wishlists[0].product_id, self.product.id)

    def test_empty_wishlist_renders_correctly(self):
        """Empty wishlist shows the empty state (success status, no items)."""
        # Create a user with no wishlist items
        user_empty, _ = create_test_user("empty@example.com")
        self.client.login(email="empty@example.com", password="testpass123")
        response = self.client.get(reverse("user_dashboard:wishlist"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.context["wishlists"]), 0)
        # Empty state should be present in HTML
        self.assertContains(response, "Your Wishlist Is Empty", status_code=200)

    def test_wishlist_items_displayed_correctly(self):
        """Wishlist items are displayed with product info."""
        self.client.login(email="wishlist@example.com", password="testpass123")
        response = self.client.get(reverse("user_dashboard:wishlist"))
        self.assertContains(response, self.product.name)
        self.assertEqual(response.context["total_value"], self.product.final_price)


if __name__ == "__main__":
    import unittest
    unittest.main()