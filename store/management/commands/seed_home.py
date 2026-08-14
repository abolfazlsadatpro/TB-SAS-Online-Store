import os
import shutil

from django.conf import settings
from django.core.files import File
from django.core.management.base import BaseCommand

from store.models import Brand, BannerMain, Category, Product, ProductColor, ProductImage


STATIC_DIR = settings.BASE_DIR / "static" / "images"


def copy_to_media(src_name, dest_dir, dest_name):
    """Copies a static image into media/ and returns a relative path or None."""
    src = STATIC_DIR / src_name

    if not src.exists():
        return None

    dest = settings.MEDIA_ROOT / dest_dir
    dest.mkdir(parents=True, exist_ok=True)

    out = dest / dest_name
    shutil.copy(src, out)

    return os.path.join(dest_dir, dest_name)


BRANDS = [
    # name, slug, logo file, image file, order, is_mobile, is_laptop
    ("Samsung", "samsung", "Logo_SAMSUNG.webp", "Sumsung.webp", 1, True, False),
    ("Apple", "apple", "Logo_Apple.webp", "Apple.webp", 2, True, True),
    ("Xiaomi", "xiaomi", "Logo_Xiaomi.webp", "Xiaomi.webp", 3, True, False),
    ("Nokia", "nokia", "Logo_NOKIA.webp", None, 4, True, False),
    ("Honor", "honor", None, "Honer.webp", 5, True, False),
    ("Poco", "poco", None, "Poco.webp", 6, True, False),
    ("MSI", "msi", None, "MSI.webp", 7, False, True),
    ("Acer", "acer", None, "Acer.webp", 8, False, True),
    ("Lenovo", "lenovo", None, "Lenovo.webp", 9, False, True),
    ("ASUS", "asus", "Logo_AUSU.webp", "ASUS.webp", 10, False, True),
    ("HP", "hp", None, "HP.webp", 11, False, True),
    ("JBL", "jbl", "Logo_JBL.webp", None, 12, False, False),
    ("Philips", "philips", "Logo_PHILIPS.webp", None, 13, False, False),
]

PRODUCTS = [
    # name, slug, price, discount, brand, category_name, featured, best_seller, color_name, color_code
    ("Samsung Galaxy S25 Ultra", "samsung-galaxy-s25-ultra", 1299, 1149, "Samsung", "Phone",
     True, False, "Titanium Black", "#1f2328"),
    ("Apple iPhone 16 Pro Max", "apple-iphone-16-pro-max", 1299, 1199, "Apple", "Phone",
     True, True, "Natural Titanium", "#8a8a8e"),
    ("Xiaomi 15 Pro", "xiaomi-15-pro", 799, 699, "Xiaomi", "Phone",
     True, False, "Black", "#111111"),
    ("Poco F7 Pro", "poco-f7-pro", 499, 429, "Poco", "Phone",
     True, False, "Blue", "#3a5ba0"),
    ("Honor Magic 7", "honor-magic-7", 899, None, "Honor", "Phone",
     False, False, "Silver", "#c0c0c0"),
    ("MSI Katana 15", "msi-katana-15", 1499, 1349, "MSI", "Laptop_update",
     True, True, "Black", "#1a1a1a"),
    ("Acer Nitro 16", "acer-nitro-16", 1199, None, "Acer", "Laptop_update",
     False, False, "Black", "#222222"),
    ("Lenovo Legion 5", "lenovo-legion-5", 1399, 1249, "Lenovo", "Laptop_update",
     True, False, "Phantom Grey", "#4a4a4a"),
    ("ASUS ROG Zephyrus", "asus-rog-zephyrus", 1799, None, "ASUS", "Laptop_update",
     False, False, "Grey", "#555555"),
    ("HP Pavilion 15", "hp-pavilion-15", 899, 799, "HP", "Laptop_update",
     False, False, "Silver", "#c8c8c8"),
]

# Fallback images used as product color images when a matching brand photo is missing
FALLBACKS = [
    "Apple.webp",
    "Sumsung.webp",
    "Xiaomi.webp",
    "Poco.webp",
    "Honer.webp",
    "MSI.webp",
    "Acer.webp",
    "Lenovo.webp",
    "ASUS.webp",
    "HP.webp",
]


class Command(BaseCommand):
    help = "Seeds brands and products for the home page demo."

    def handle(self, *args, **options):
        self._seed_brands()
        self._seed_categories()
        self._seed_products()
        self._seed_promos()
        self.stdout.write(self.style.SUCCESS("Seed complete!"))

    def _seed_promos(self):
        for order, filename in enumerate(["Advertisemenet 1.png", "Advertisemenet 2.png", "Advertisemenet 3.png"]):
            banner, created = BannerMain.objects.get_or_create(
                title=filename.replace(".png", ""),
                banner_type="promo",
                defaults={
                    "order": order,
                    "show_button": False,
                },
            )

            path = copy_to_media(filename, "promos", filename)

            if path:
                banner.picture.name = path
                banner.save()

            self.stdout.write(f"  promo: {banner.title} {'created' if created else 'exists'}")

    def _seed_brands(self):
        for name, slug, logo_file, image_file, order, is_mobile, is_laptop in BRANDS:
            brand, created = Brand.objects.get_or_create(
                slug=slug,
                defaults={
                    "name": name,
                    "order": order,
                    "description": f"{name} — quality products available at TBSAS.",
                },
            )

            brand.is_mobile = is_mobile
            brand.is_laptop = is_laptop

            if created or not brand.logo:
                if logo_file:
                    path = copy_to_media(logo_file, "brands/logos", logo_file)
                    if path:
                        brand.logo.name = path

            if created or not brand.image:
                if image_file:
                    path = copy_to_media(image_file, "brands/images", image_file)
                    if path:
                        brand.image.name = path

            brand.save()

            self.stdout.write(f"  brand: {name} {'created' if created else 'updated'}")

    def _seed_categories(self):
        for name in ("Phone", "Laptop_update"):
            cat = Category.objects.filter(name=name).first()

            if cat:
                cat.show_in_home = True
                cat.save()

    def _seed_products(self):
        for name, slug, price, discount, brand_name, cat_name, featured, best, color_name, color_code in PRODUCTS:
            category = Category.objects.filter(name=cat_name).first()

            if not category:
                self.stdout.write(f"  skip (no category {cat_name!r}): {name}")
                continue

            product, created = Product.objects.get_or_create(
                slug=slug,
                defaults={
                    "name": name,
                    "category": category,
                    "price": price,
                    "discount_price": discount,
                    "is_active": True,
                    "is_available": True,
                    "is_featured": featured,
                    "is_best_seller": best,
                    "brand": brand_name,
                },
            )

            if created:
                self._seed_color(product, brand_name, color_name, color_code)
                self.stdout.write(f"  product: {name} created")
            else:
                self.stdout.write(f"  product: {name} exists (skip)")

    def _seed_color(self, product, brand_name, color_name, color_code):
        """Adds a default color with an image copied from static images."""
        image_file = None

        # try to match a brand photo first
        candidates = [
            f"{brand_name}.webp",
            f"{brand_name} {product.name.split()[0]}.webp",
        ]

        for cand in candidates:
            if (STATIC_DIR / cand).exists():
                image_file = cand
                break

        if not image_file:
            for fallback in FALLBACKS:
                if (STATIC_DIR / fallback).exists():
                    image_file = fallback
                    break

        path = None

        if image_file:
            path = copy_to_media(image_file, "products/colors", f"{product.slug}_{color_name}.webp")

        color = ProductColor.objects.create(
            product=product,
            name=color_name,
            color_code=color_code,
            stock=25,
            is_default=True,
        )

        if path:
            color.image.name = path
            color.save()
