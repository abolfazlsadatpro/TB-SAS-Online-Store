import os

from django.conf import settings


def _file_mtime(rel_path):
    path = os.path.join(settings.BASE_DIR, "static", rel_path)

    try:
        mtime = os.path.getmtime(path)
    except OSError:
        return "1"

    # small granularity so edits within the same second are picked up
    return str(int(mtime * 10))


def static_versions(request):
    """Adds a per-file version (mtime) so browsers re-fetch changed assets."""
    names = {
        "css_style": "css/style.css",
        "css_wishlist": "css/wishlist.css",
        "js_wishlist": "js/wishlist.js",
        "js_product_detail": "js/product_detail.js",
        "js_cart": "js/cart.js",
        "js_checkout": "js/checkout.js",
    }

    versions = {
        key: _file_mtime(rel)
        for key, rel in names.items()
    }

    return {
        "static_versions": versions,
    }
