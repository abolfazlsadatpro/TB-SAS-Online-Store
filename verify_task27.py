"""End-to-end verification script for TASK 27."""
import os

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "tb_sas.settings")
import django

django.setup()

from django.test import Client
from django.urls import reverse
from store.models import Order, OrderItem, Wishlist, Product, ProductColor, Category, Customer
from users.models import PersonUser
import uuid


def verify():
    print("=" * 60)
    print("TASK 27 — End-to-End Verification")
    print("=" * 60)

    # Setup
    from django.test.utils import setup_test_environment, teardown_test_environment
    from django.test.runner import DiscoverRunner

    runner = DiscoverRunner(verbosity=0)
    old_config = runner.setup_databases()
    setup_test_environment()

    try:
        # Create test data
        print("\n1. Creating test data...")
        suffix = uuid.uuid4().hex[:10]
        user = PersonUser.objects.create_user(
            email="e2e_test@example.com",
            password="testpass123",
            first_name="E2E",
            last_name="Test",
            phone_number=f"5{suffix}",
        )
        customer = Customer.objects.create(
            user=user, phone="555-1234", address="123 E2E St"
        )
        cat = Category.objects.create(name="E2E Cat", slug="e2e-cat")
        prod = Product.objects.create(
            category=cat, name="E2E Product", slug="e2e-product",
            price=100, is_active=True, is_available=True
        )
        color = ProductColor.objects.create(
            product=prod, name="Blue", color_code="#0000ff", stock=10
        )
        # Create an order
        import secrets
        order = Order.objects.create(
            customer=customer,
            is_paid=False,
            total_price=200,
            status=0,
            note="E2E test order",
            method_auto=True,
            coupon_code="",
            discount_amount=0,
            idempotency_key=secrets.token_urlsafe(16),
        )
        OrderItem.objects.create(
            order=order, product=prod, quantity=2, price=100, color=color
        )
        # Add to wishlist
        Wishlist.objects.create(user=user, product=prod)
        print("   [OK] Test data created")

        # Test with client
        client = Client()
        client.login(email="e2e_test@example.com", password="testpass123")

        # Test dashboard
        print("\n2. Testing dashboard...")
        response = client.get(reverse("user_dashboard:dashboard"))
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert response.context["total_orders"] == 1
        assert response.context["wishlist_count"] == 1
        print("   [OK] Dashboard accessible and shows correct stats")

        # Test order list
        print("\n3. Testing order list...")
        response = client.get(reverse("user_dashboard:order_list"))
        assert response.status_code == 200
        orders = response.context["orders"]
        assert orders.count() == 1
        assert orders[0].id == order.id
        print("   [OK] Order list shows user's own orders")

        # Test order detail
        print("\n4. Testing order detail...")
        response = client.get(
            reverse("user_dashboard:order_detail", args=[order.id])
        )
        assert response.status_code == 200
        items = response.context["order_items"]
        assert items[0].price == 100  # Historical price
        assert items[0].line_total == 200  # price * quantity
        print("   [OK] Order detail accessible with historical pricing")

        # Test ownership protection
        print("\n5. Testing ownership protection...")
        # Create another user with their own order
        user_b = PersonUser.objects.create_user(
            email="e2e_b@example.com",
            password="testpass456",
            first_name="E2EB",
            last_name="User",
            phone_number=f"6{uuid.uuid4().hex[:10]}",
        )
        customer_b = Customer.objects.create(
            user=user_b, phone="555-5678", address="456 Other St"
        )
        order_b = Order.objects.create(
            customer=customer_b,
            is_paid=False,
            total_price=999,
            status=0,
            method_auto=True,
            idempotency_key=secrets.token_urlsafe(16),
        )

        response = client.get(
            reverse("user_dashboard:order_detail", args=[order_b.id])
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("   [OK] User cannot access other user's order (404)")

        # Test wishlist
        print("\n6. Testing wishlist...")
        response = client.get(reverse("user_dashboard:wishlist"))
        assert response.status_code == 200
        wishlists = response.context["wishlists"]
        assert wishlists.count() == 1
        assert wishlists[0].product_id == prod.id
        print("   [OK] Wishlist shows user's own items")

        # Test anonymous protection
        print("\n7. Testing anonymous protection...")
        anon_client = Client()
        for url_name, args in [
            ("user_dashboard:dashboard", []),
            ("user_dashboard:order_list", []),
            ("user_dashboard:wishlist", []),
            ("user_dashboard:order_detail", [order.id]),
        ]:
            response = anon_client.get(reverse(url_name, args=args))
            assert response.status_code == 302, f"Expected 302 for {url_name}, got {response.status_code}"
        print("   [OK] Anonymous users are redirected to login for all dashboard pages")

        # Test historical pricing
        print("\n8. Testing historical pricing independence...")
        prod.price = 999
        prod.save()
        response = client.get(
            reverse("user_dashboard:order_detail", args=[order.id])
        )
        items = response.context["order_items"]
        assert items[0].price == 100, f"Historical price changed! Got {items[0].price}"
        print("   [OK] Historical price preserved after product price change")

        print("\n" + "=" * 60)
        print("ALL VERIFICATIONS PASSED!")
        print("=" * 60)

    finally:
        teardown_test_environment()
        runner.teardown_databases(old_config)


if __name__ == "__main__":
    verify()