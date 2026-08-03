from store.models import (
    Product,
    Category,
    BannerMain,
    SettingSite
)


def get_site_setting():
    return SettingSite.load()


def get_active_banners():
    return BannerMain.objects.filter(
        is_active=True
    ).order_by(
        "order"
    )


def get_home_categories():
    return Category.objects.filter(
        is_active=True,
        show_in_home=True
    )[:8]


def get_mega_categories():
    return Category.objects.filter(
        parent=None,
        is_active=True
    ).prefetch_related(
        "children"
    )


def get_discount_products(limit=8):
    return Product.objects.filter(
        discount_price__gt=0,
        is_active=True,
    ).select_related(
        "category"
    ).order_by(
        "-created_at"
    )[:limit]


def get_featured_products(limit=8):
    return Product.objects.filter(
        is_active=True,
        is_available=True,
        is_featured=True
    ).select_related(
        "category"
    ).order_by(
        "-created_at"
    )[:limit]


def get_latest_products(limit=8):
    return Product.objects.filter(
        is_active=True,
        is_available=True
    ).select_related(
        "category"
    ).order_by(
        "-created_at"
    )[:limit]


def get_best_seller_products(limit=8):
    return Product.objects.filter(
        is_active=True,
        is_available=True,
        is_best_seller=True
    ).select_related(
        "category"
    ).order_by(
        "-created_at"
    )[:limit]
