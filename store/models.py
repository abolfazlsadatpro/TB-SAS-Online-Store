from decimal import Decimal

from django.db import models
from django.conf import settings
from users.models import PersonUser


# Create your models here.

class Customer(models.Model):
    user = models.OneToOneField(PersonUser, on_delete=models.CASCADE)
    phone = models.CharField(max_length=11)
    address = models.CharField(max_length=300)

    def __str__(self):
        return f'{self.user.email}'


class Category(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)
    parent = models.ForeignKey("self", on_delete=models.CASCADE, null=True, blank=True, related_name="children")
    level = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    show_in_home = models.BooleanField(default=False)
    # Filter display settings
    filter_display_order = models.PositiveIntegerField(default=0, verbose_name="ترتیب نمایش در فیلتر")
    show_in_filter = models.BooleanField(default=True, verbose_name="نمایش در فیلتر دسته‌بندی")
    filter_icon = models.CharField(max_length=50, blank=True, help_text="آیکون FontAwesome مثل fa-mobile-alt")

    class Meta:
        ordering = ["filter_display_order", "name"]

    def save(self, *args, **kwargs):
        if self.parent:
            self.level = self.parent.level + 1
        else:
            self.level = 0

        super().save(*args, **kwargs)

    @property
    def has_children(self):
        return self.children.exists()

    @property
    def total_products(self):
        return self.products.count()

    @property
    def active_products(self):
        return self.products.filter(is_active=True).count()

    @property
    def sub_categories(self):
        return self.children.count()

    def __str__(self):
        return self.name


class Product(models.Model):
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name="products")
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True, null=True)
    price = models.PositiveIntegerField()
    is_active = models.BooleanField(default=True)
    is_available = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)
    is_best_seller = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    meta_title = models.CharField(max_length=200, blank=True)
    meta_description = models.TextField(blank=True)
    meta_keywords = models.CharField(max_length=300, blank=True)
    discount_price = models.PositiveIntegerField(null=True, blank=True)
    views_count = models.PositiveIntegerField(default=0)
    sold_count = models.PositiveIntegerField(default=0)
    favorite_count = models.PositiveIntegerField(default=0)
    sku = models.CharField(max_length=100, blank=True, null=True)
    brand = models.CharField(max_length=100, blank=True)
    weight = models.PositiveIntegerField(default=0, help_text="Weight in gram.")
    warranty = models.CharField(max_length=200, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.name

    @property
    def final_price(self):
        return self.discount_price or self.price

    @property
    def total_stock(self):
        return sum(color.stock for color in self.colors.all())

    @property
    def stock(self):
        return self.total_stock

    @property
    def is_in_stock(self):
        return self.total_stock > 0

    @property
    def is_out_of_stock(self):
        return self.total_stock <= 0

    @property
    def total_images(self):
        return self.images.count()

    @property
    def images_count(self):
        return self.images.count()

    @property
    def specifications_count(self):
        return self.specifications.count()

    @property
    def colors_count(self):
        return self.colors.count()

    @property
    def total_comments(self):
        return self.comments.count()

    @property
    def total_colors(self):
        return self.colors.count()

    @property
    def total_specifications(self):
        return self.specifications.count()

    @property
    def has_discount(self):
        return (
                self.discount_price is not None
                and self.discount_price < self.price
        )

    @property
    def discount_percent(self):

        if not self.has_discount:
            return 0

        return int(
            ((self.price - self.discount_price) / self.price) * 100
        )

    @property
    def is_discounted(self):
        return self.has_discount

    @property
    def default_color(self):

        color = self.colors.filter(
            is_default=True
        ).first()

        if color:
            return color

        return self.colors.first()

    @property
    def main_image(self):

        color = self.default_color

        if color and color.image:
            return color.image

        image = self.images.first()

        if image:
            return image.image

        return None


class ProductColor(models.Model):
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="colors"
    )

    name = models.CharField(max_length=50)

    color_code = models.CharField(
        max_length=7,
        help_text="#FFFFFF"
    )

    image = models.ImageField(
        upload_to="products/colors/",
        blank=True,
        null=True
    )

    stock = models.PositiveIntegerField(default=0)

    is_default = models.BooleanField(
        default=False
    )

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return f"{self.product.name} - {self.name}"


class ProductImage(models.Model):
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="images"
    )

    image = models.ImageField(
        upload_to="products/images/"
    )

    alt_text = models.CharField(
        max_length=200,
        blank=True
    )

    display_order = models.PositiveIntegerField(
        default=0
    )

    class Meta:
        ordering = [
            "display_order",
            "id"
        ]

    def __str__(self):
        return (
            f"{self.product.name}"
            f" - "
            f"{self.display_order}"
        )


class ProductSpecification(models.Model):
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="specifications"
    )

    group = models.CharField(
        max_length=100,
        blank=True,
        default=""
    )

    title = models.CharField(
        max_length=200
    )

    value = models.CharField(
        max_length=500
    )

    display_order = models.PositiveIntegerField(
        default=0
    )
    # Filter settings
    is_filterable = models.BooleanField(default=False, verbose_name="قابل فیلتر کردن")
    filter_display_name = models.CharField(max_length=100, blank=True, verbose_name="نام نمایش در فیلتر")

    class Meta:
        ordering = [
            "display_order"
        ]

    def __str__(self):
        return f"{self.title} : {self.value}"

    @property
    def full_specification(self):
        return f"{self.title}: {self.value}"


class ProductAttribute(models.Model):
    """ویژگی‌های قابل فیلتر برای محصولات (رنگ، حافظه، حافظه رم، سایز صفحه نمایش و...)"""
    name = models.CharField(max_length=100, unique=True, verbose_name="نام ویژگی")
    slug = models.SlugField(unique=True, verbose_name="اسلاگ")
    display_name = models.CharField(max_length=100, verbose_name="نام نمایشی")
    icon = models.CharField(max_length=50, blank=True, help_text="آیکون FontAwesome")
    display_order = models.PositiveIntegerField(default=0, verbose_name="ترتیب نمایش")
    is_active = models.BooleanField(default=True, verbose_name="فعال")
    # Filter display type
    FILTER_TYPES = (
        ('checkbox', 'چک‌باکس (چندانتخابی)'),
        ('radio', 'رادیو (تنها یک انتخاب)'),
        ('range', 'محدوده (برای مقادیر عددی)'),
        ('color', 'انتخاب رنگ'),
    )
    filter_type = models.CharField(max_length=20, choices=FILTER_TYPES, default='checkbox', verbose_name="نوع فیلتر")

    class Meta:
        ordering = ["display_order", "name"]
        verbose_name = "ویژگی محصول"
        verbose_name_plural = "ویژگی‌های محصول"

    def __str__(self):
        return self.display_name


class ProductAttributeValue(models.Model):
    """مقادیر ممکن برای هر ویژگی"""
    attribute = models.ForeignKey(ProductAttribute, on_delete=models.CASCADE, related_name="values")
    value = models.CharField(max_length=100, verbose_name="مقدار")
    display_value = models.CharField(max_length=100, blank=True, verbose_name="مقدار نمایشی")
    color_code = models.CharField(max_length=7, blank=True, help_text="کد رنگ برای نوع color مثل #FF0000")
    display_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["display_order", "value"]
        unique_together = ["attribute", "value"]
        verbose_name = "مقدار ویژگی"
        verbose_name_plural = "مقادیر ویژگی‌ها"

    def __str__(self):
        return f"{self.attribute.display_name}: {self.value}"


class ProductAttributeAssignment(models.Model):
    """انتساب مقادیر ویژگی به محصول"""
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="attribute_assignments")
    attribute = models.ForeignKey(ProductAttribute, on_delete=models.CASCADE)
    value = models.ForeignKey(ProductAttributeValue, on_delete=models.CASCADE)

    class Meta:
        unique_together = ["product", "attribute", "value"]
        verbose_name = "انتساب ویژگی به محصول"
        verbose_name_plural = "انتساب‌های ویژگی‌ها"

    def __str__(self):
        return f"{self.product.name} - {self.attribute.display_name}: {self.value.value}"


class VoteProduct(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='product_comments')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='comments')
    rating = models.PositiveIntegerField()
    description = models.TextField()
    status = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.email} - {self.product.name}"


class Order(models.Model):
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='orders', null=True, blank=True)
    is_paid = models.BooleanField(default=False)
    total_price = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    status = models.IntegerField(default=-1)
    note = models.CharField(blank=True, null=True)
    method_auto = models.BooleanField(default=True)
    # TASK 26 — historical coupon data and idempotency protection.
    coupon_code = models.CharField(
        max_length=50,
        blank=True,
        default="",
        verbose_name="Applied coupon code",
        help_text="Coupon code used at order creation (historical record).",
    )
    discount_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0"),
        verbose_name="Discount amount",
        help_text="Discount amount applied at order creation (historical record).",
    )
    idempotency_key = models.CharField(
        max_length=64,
        unique=True,
        null=True,
        blank=True,
        verbose_name="Idempotency key",
        help_text="Server-side unique key to prevent duplicate order creation from repeated POST submissions.",
    )

    @property
    def total_items(self):
        return self.orderitem_set.count()

    @property
    def total_quantity(self):
        return sum(
            item.quantity
            for item in
            self.orderitem_set.all())

    def __str__(self):
        return f'order is :{self.id}'


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.IntegerField()
    # TASK 26 — historical price and selected color persistence (required for checkout/order integrity).
    price = models.PositiveIntegerField(
        default=0,
        verbose_name="Unit price at purchase",
        help_text="Snapshot of product final price at time of order creation.",
    )
    color = models.ForeignKey(
        ProductColor,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name="Selected color",
        help_text="ProductColor selected at time of order creation.",
    )

    def __str__(self):
        return f'{self.product.name} * {self.quantity}'


class CommentVote(models.Model):
    LIKE = 1
    DISLIKE = -1
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    comment = models.ForeignKey(VoteProduct, on_delete=models.CASCADE, related_name='votes')
    vote = models.SmallIntegerField(choices=[(LIKE, 'Like'), (DISLIKE, 'Dislike')])

    class Meta:
        unique_together = ('user', 'comment')


class ContactMessage(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True, blank=True)
    name = models.CharField(max_length=100)
    email = models.EmailField()
    subject = models.CharField(max_length=200)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.subject


class AboutUsSection(models.Model):
    SECTION_TYPES = (
        ("hero", "Hero"),
        ("mission", "Mission / Text"),
        ("stat", "Stat"),
        ("feature", "Feature"),
        ("team", "Team Member"),
        ("custom", "Custom"),
    )

    section_type = models.CharField(
        max_length=20, choices=SECTION_TYPES, default="custom"
    )
    title = models.CharField(max_length=200)
    content = models.TextField(blank=True)
    icon = models.CharField(max_length=50, blank=True, help_text="e.g. fa-solid fa-rocket")
    image = models.ImageField(upload_to="about_us/", blank=True, null=True)
    display_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["display_order", "id"]

    def __str__(self):
        return f"{self.get_section_type_display()} - {self.title}"


class BannerType(models.TextChoices):
    SLIDER = "slider", "Slider"
    PROMO = "promo", "Promo"


class BannerMain(models.Model):
    title = models.CharField(max_length=100)
    description = models.CharField(max_length=200, blank=True)
    picture = models.ImageField(upload_to="banners/")
    button_text = models.CharField(max_length=50, blank=True)
    button_link = models.CharField(max_length=300, blank=True)
    is_active = models.BooleanField(default=True)
    show_button = models.BooleanField(default=True)
    open_in_new_tab = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0)
    banner_type = models.CharField(
        max_length=10,
        choices=BannerType.choices,
        default=BannerType.SLIDER,
        verbose_name="Type",
    )

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return self.title

    @property
    def has_button(self):
        return bool(
            self.button_text and
            self.button_link
        )

    @property
    def target(self):
        if self.open_in_new_tab:
            return "_blank"

        return "_self"


class SettingSite(models.Model):
    # ==========================
    # General Information
    # ==========================

    website_name = models.CharField(max_length=150)
    website_title = models.CharField(max_length=200)
    website_short_description = models.CharField(max_length=300, blank=True)
    website_keywords = models.CharField(max_length=500, blank=True)
    website_logo = models.ImageField(upload_to="settings/logo/", blank=True, null=True)
    website_logo_dark = models.ImageField(upload_to="settings/logo_dark/", blank=True, null=True)
    website_favicon = models.ImageField(upload_to="settings/favicon/", blank=True, null=True)

    # ==========================
    # Contact Information
    # ==========================

    email = models.EmailField(blank=True)
    support_email = models.EmailField(blank=True)
    phone_number = models.CharField(max_length=30, blank=True)
    support_phone_number = models.CharField(max_length=30, blank=True)
    address = models.TextField(blank=True)
    working_hours = models.CharField(max_length=200, blank=True)

    # ==========================
    # Social Media
    # ==========================

    instagram = models.URLField(blank=True)
    telegram = models.URLField(blank=True)
    github = models.URLField(blank=True)
    linkedin = models.URLField(blank=True)
    youtube = models.URLField(blank=True)
    twitter_x = models.URLField(blank=True)

    # ==========================
    # Footer Section
    # ==========================

    footer_description = models.TextField(blank=True)
    copyright_text = models.CharField(max_length=300, blank=True)

    # ==========================
    # SEO Settings
    # ==========================

    meta_title = models.CharField(max_length=200, blank=True)
    meta_description = models.TextField(blank=True)
    meta_keywords = models.CharField(max_length=500, blank=True)

    # ==========================
    # Site Features
    # ==========================

    maintenance_mode = models.BooleanField(default=False)
    maintenance_message = models.TextField(blank=True)
    allow_registration = models.BooleanField(default=True)
    allow_product_comments = models.BooleanField(default=True)
    allow_contact_messages = models.BooleanField(default=True)
    enable_wishlist = models.BooleanField(default=True)
    enable_newsletter = models.BooleanField(default=True)
    enable_contact_page = models.BooleanField(default=True)
    enable_about_us_page = models.BooleanField(default=True)

    # ==========================
    # Store Settings
    # ==========================

    free_shipping_threshold = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tax_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    enable_coupon = models.BooleanField(default=True)
    enable_discount_code = models.BooleanField(default=True)
    enable_guest_checkout = models.BooleanField(default=True)

    # ==========================
    # Home Page Section Titles
    # ==========================

    home_mobile_title = models.CharField(
        max_length=100,
        blank=True,
        default="Mobile Bests",
        verbose_name="Mobile Section Title",
    )
    home_laptop_title = models.CharField(
        max_length=100,
        blank=True,
        default="Best Laptops",
        verbose_name="Laptop Section Title",
    )

    # ==========================
    # Date & Time
    # ==========================

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @classmethod
    def load(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj

    class Meta:
        verbose_name = "Site Setting"
        verbose_name_plural = "Site Settings"

    def __str__(self):
        return self.website_name


class Brand(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)
    logo = models.ImageField(upload_to="brands/logos/", blank=True, null=True)
    image = models.ImageField(upload_to="brands/images/", blank=True, null=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    is_mobile = models.BooleanField(default=False, verbose_name="Show in Mobile Bests")
    is_laptop = models.BooleanField(default=False, verbose_name="Show in Best Laptops")
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "name"]

    def __str__(self):
        return self.name


class Wishlist(models.Model):
    user = models.ForeignKey(
        PersonUser,
        on_delete=models.CASCADE,
        related_name="wishlists"
    )

    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="wishlists"
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    @property
    def total_wishlist(self):
        return self.wishlists.count()

    class Meta:
        verbose_name = "Wishlist"
        verbose_name_plural = "Wishlists"

        unique_together = (
            "user",
            "product",
        )

        ordering = [
            "-created_at",
        ]

    def __str__(self):
        return f"{self.user.email} - {self.product.name}"


class Coupon(models.Model):
    """Minimal first-phase Coupon architecture (TASK 21 design approved)."""

    code = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        verbose_name="Coupon code",
        help_text="Normalized to uppercase at lookup.",
    )
    is_active = models.BooleanField(default=True, verbose_name="Active")
    discount_percent = models.PositiveIntegerField(
        default=0,
        verbose_name="Discount percent",
        help_text="Percentage off (0 = no percentage discount). Must be non-negative.",
    )
    discount_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0"),
        verbose_name="Fixed discount amount",
        help_text="Fixed amount off (0 = no fixed discount). Must be non-negative.",
    )
    valid_from = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Valid from",
        help_text="Optional start date/time.",
    )
    valid_until = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Valid until",
        help_text="Optional expiration date/time.",
    )
    min_subtotal = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0"),
        verbose_name="Minimum subtotal",
        help_text="Subtotal must meet or exceed this value for coupon to apply.",
    )
    max_discount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("1000000"),
        null=True,
        blank=True,
        verbose_name="Maximum discount",
        help_text="Cap on percentage-based discount. Null/blank = no cap.",
    )
    usage_limit = models.PositiveIntegerField(
        default=1,
        null=True,
        blank=True,
        verbose_name="Usage limit",
        help_text="Maximum redemptions. Null/blank = unlimited.",
    )
    usage_count = models.PositiveIntegerField(
        default=0,
        verbose_name="Usage count",
        help_text="Number of times redeemed (updated at checkout).",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Coupon"
        verbose_name_plural = "Coupons"
        ordering = ["-is_active", "code"]
        indexes = [
            models.Index(fields=["is_active", "code"]),
        ]

    def clean(self):
        from django.core.exceptions import ValidationError
        errors = {}
        percent = int(self.discount_percent) if self.discount_percent is not None else 0
        amount = Decimal(str(self.discount_amount)) if self.discount_amount is not None else Decimal("0")
        if percent <= 0 and amount <= Decimal("0"):
            errors["discount_percent"] = ValidationError(
                "At least one of discount_percent or discount_amount must be positive.",
                code="invalid_discount",
            )
        if not self.code or not str(self.code).strip():
            errors["code"] = ValidationError(
                "Coupon code cannot be empty.", code="required"
            )
        if percent < 0:
            errors["discount_percent"] = ValidationError(
                "Discount percent cannot be negative.", code="negative"
            )
        if amount < Decimal("0"):
            errors["discount_amount"] = ValidationError(
                "Discount amount cannot be negative.", code="negative"
            )
        if Decimal(str(self.min_subtotal or "0")) < Decimal("0"):
            errors["min_subtotal"] = ValidationError(
                "Minimum subtotal cannot be negative.", code="negative"
            )
        if self.max_discount is not None and Decimal(str(self.max_discount)) < Decimal("0"):
            errors["max_discount"] = ValidationError(
                "Maximum discount cannot be negative.", code="negative"
            )
        if self.usage_count is not None and int(self.usage_count) < 0:
            errors["usage_count"] = ValidationError(
                "Usage count cannot be negative.", code="negative"
            )
        if self.usage_limit is not None and int(self.usage_limit) < 0:
            errors["usage_limit"] = ValidationError(
                "Usage limit cannot be negative.", code="negative"
            )
        if self.valid_from is not None and self.valid_until is not None:
            from django.utils import timezone
            now = timezone.now()
            if self.valid_until < self.valid_from:
                errors["valid_until"] = ValidationError(
                    "Valid until must be after valid from.", code="invalid_range"
                )
        if errors:
            raise ValidationError(errors)

    def __str__(self):
        return f"Coupon: {self.code}"
