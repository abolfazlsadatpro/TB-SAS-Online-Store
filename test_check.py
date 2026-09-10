import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'tb_sas.settings')
import django
django.setup()
from django.conf import settings
settings.ALLOWED_HOSTS = ['*']
from django.test import Client

c = Client()
print('=== TEST 1: Initial cart page (empty) ===')
r = c.get('/cart')
content = r.content.decode('utf-8', errors='ignore')
print(f'  Status: {r.status_code}')
checks = [
    ('step indicator present', 'step-indicator' in content),
    ('Cart step is active', 'class="step is-current"' in content),
    ('Checkout step exists', '>Checkout<' in content),
    ('Payment step exists', '>Payment<' in content),
    ('breadcrumb present', 'cart-breadcrumb' in content),
    ('page heading present', 'Shopping Cart' in content),
    ('coupon section hidden when empty', 'cart-coupon' not in content),
    ('summary hidden when empty', 'cart-summary' not in content),
    ('checkout CTA hidden when empty', 'Proceed to Checkout' not in content),
    ('green checkout CSS class', 'cart-checkout-btn' in content or 'cart-empty' in content),
    ('no position: sticky in summary CSS', 'position: sticky' not in content),
    ('subtitle correctly uses pluralize', '0 products' in content and '0s' not in content),
    ('empty state visible', 'cart-empty' in content),
]
for label, ok in checks:
    print(f'  [{"OK" if ok else "FAIL"}] {label}')