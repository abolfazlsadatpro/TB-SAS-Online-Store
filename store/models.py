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

    class Meta:
        ordering = ["name"]

    def save(self, *args, **kwargs):
        if self.parent:
            self.level = self.parent.level + 1
        else:
            self.level = 0

        super().save(*args, **kwargs)

    @property
    def has_children(self):
        return self.children.exists()

    def __str__(self):
        return self.name


class Product(models.Model):
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='products')
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True, null=True)
    price = models.IntegerField()
    stock = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class ProductColor(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="colors")
    name = models.CharField(max_length=50)
    color_code = models.CharField(max_length=7, help_text="#FFFFFF")
    image = models.ImageField(upload_to="products/colors/", blank=True, null=True)
    stock = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return f"{self.product.name} - {self.name}"


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

    def __str__(self):
        return f'order is :{self.id}'


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.IntegerField()

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


class BannerMain(models.Model):
    title = models.CharField(max_length=100)
    description = models.CharField(max_length=200)
    picture = models.ImageField(upload_to="banners/")


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
