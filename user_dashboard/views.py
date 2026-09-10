from django.contrib.auth.decorators import login_required
from django.shortcuts import render, get_object_or_404
from django.db.models import Count, Sum, Q, F, IntegerField
from django.db.models.functions import Coalesce
from store.models import Order, OrderItem, Wishlist, Product
from store.untils import display_status


@login_required
def dashboard(request):
    """User dashboard landing page with order summary and wishlist summary."""
    # Get or create customer for this user
    try:
        customer = request.user.customer
    except:
        customer = None

    # Order statistics for this user
    if customer:
        orders = Order.objects.filter(customer=customer)
        total_orders = orders.count()
        recent_orders = orders.order_by('-created_at')[:5]
        pending_orders = orders.filter(status=0).count()
        # Calculate total spent (sum of total_price for completed orders)
        total_spent = orders.filter(status__in=[1, 2, 3]).aggregate(
            total=Sum('total_price')
        )['total'] or 0
    else:
        total_orders = 0
        recent_orders = []
        pending_orders = 0
        total_spent = 0

    # Wishlist statistics
    wishlist_count = Wishlist.objects.filter(user=request.user).count()

    context = {
        'customer': customer,
        'total_orders': total_orders,
        'recent_orders': recent_orders,
        'pending_orders': pending_orders,
        'total_spent': total_spent,
        'wishlist_count': wishlist_count,
        'display_status': display_status,
    }
    return render(request, 'dashboard_user/index.html', context)


@login_required
def order_list(request):
    """User-facing order history page."""
    try:
        customer = request.user.customer
    except:
        customer = None

    if customer:
        orders = Order.objects.filter(customer=customer).order_by('-created_at')
    else:
        orders = Order.objects.none()

    context = {
        'orders': orders,
        'customer': customer,
        'display_status': display_status,
    }
    return render(request, 'dashboard_user/orders.html', context)


@login_required
def order_detail(request, order_id):
    """User-facing order detail page."""
    try:
        customer = request.user.customer
    except:
        customer = None

    # Only allow access to user's own orders
    order = get_object_or_404(
        Order.objects.filter(customer=customer).select_related('customer__user'),
        id=order_id
    )

    order_items = OrderItem.objects.filter(order=order).select_related(
        'product', 'color'
    )

    # Calculate line totals from stored historical prices
    for item in order_items:
        item.line_total = item.price * item.quantity

    context = {
        'order': order,
        'order_items': order_items,
        'customer': customer,
        'display_status': display_status,
    }
    return render(request, 'dashboard_user/order_detail.html', context)


@login_required
def wishlist(request):
    """User-facing wishlist page."""
    wishlists = Wishlist.objects.filter(user=request.user).select_related(
        'product__category'
    ).annotate(
        # We don't need annotation here since template uses product properties
    ).order_by('-created_at')

    wishlist_ids = [item.product_id for item in wishlists]

    discount_count = sum(
        1 for item in wishlists
        if item.product.has_discount
    )

    total_value = sum(
        item.product.final_price
        for item in wishlists
    )

    popular_products = (
        Product.objects
        .filter(is_active=True, is_available=True)
        .exclude(id__in=wishlist_ids)
        .annotate(
            annotated_final_price=Coalesce(F("discount_price"), F("price"), output_field=IntegerField())
        )
        .order_by("-views_count")[:8]
    )

    context = {
        'wishlists': wishlists,
        'wishlist_ids': wishlist_ids,
        'discount_count': discount_count,
        'total_value': total_value,
        'popular_products': popular_products,
    }
    return render(request, 'dashboard_user/wishlist.html', context)