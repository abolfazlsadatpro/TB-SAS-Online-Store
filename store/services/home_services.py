from store.models import (
    Product,
    Category,
    BannerMain,
    SettingSite,
    Brand
)


def get_site_setting():
    return SettingSite.load()


def get_active_banners():
    return BannerMain.objects.filter(
        is_active=True,
        banner_type="slider",
    ).order_by(
        "order"
    )


def get_promo_banners():
    return BannerMain.objects.filter(
        is_active=True,
        banner_type="promo",
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
    ).prefetch_related(
        "colors",
        "images"
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
    ).prefetch_related(
        "colors",
        "images"
    ).order_by(
        "-created_at"
    )[:limit]


def get_latest_products(limit=8):
    return Product.objects.filter(
        is_active=True,
        is_available=True
    ).select_related(
        "category"
    ).prefetch_related(
        "colors",
        "images"
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
    ).prefetch_related(
        "colors",
        "images"
    ).order_by(
        "-created_at"
    )[:limit]


def get_brands(limit=15):
    return Brand.objects.filter(
        is_active=True
    ).order_by(
        "order",
        "name"
    )[:limit]


def _attach_product_images(brands, names):
    """برای هر برند، اولین محصول فعال همان برند را پیدا و عکسش را attach می‌کند.

    چون Product.brand یک CharField است (نه FK)، محصولات را یک‌جا می‌گیریم و
    نقشه {brand_name: first_product} می‌سازیم تا N+1 نشود. `main_image`
    از روی `colors` (prefetch) بدون کوئری اضافه کار می‌کند.
    """
    products = (
        Product.objects
        .filter(
            brand__in=names,
            is_active=True,
            is_available=True,
        )
        .prefetch_related("colors")
    )

    first_map = {}

    for p in products:
        first_map.setdefault(p.brand, p)

    for b in brands:
        prod = first_map.get(b.name)

        if prod and prod.main_image:
            b.main_product_image = prod.main_image
        else:
            # fallback: لوگوی برند (مثل Nokia که محصول ندارد)
            b.main_product_image = b.image or None

    return brands


def get_mobile_brands(limit=5):
    brands = Brand.objects.filter(
        is_active=True,
        is_mobile=True
    )[:limit]

    return _attach_product_images(brands, [b.name for b in brands])


def get_laptop_brands(limit=6):
    brands = Brand.objects.filter(
        is_active=True,
        is_laptop=True
    )[:limit]

    return _attach_product_images(brands, [b.name for b in brands])
