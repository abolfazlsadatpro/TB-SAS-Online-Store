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
    key = models.CharField(max_length=100)
    value = models.CharField(max_length=100)


class SettingSite(models.Model):
    # ==========================
    # General Information
    # ==========================

    website_name
    website_title
    website_short_description
    website_keywords

    website_logo
    website_logo_dark
    website_favicon

    # ==========================
    # Contact Information
    # ==========================

    email
    support_email

    phone_number
    support_phone_number

    address
    working_hours

    # ==========================
    # Social Media
    # ==========================

    instagram
    telegram
    github
    linkedin
    youtube
    twitter_x

    # ==========================
    # Footer Section
    # ==========================

    footer_description
    copyright_text

    # ==========================
    # SEO Settings
    # ==========================

    meta_title
    meta_description
    meta_keywords

    # ==========================
    # Site Features
    # ==========================

    maintenance_mode
    maintenance_message

    allow_registration
    allow_product_comments
    allow_contact_messages

    enable_wishlist
    enable_newsletter
    enable_contact_page
    enable_about_us_page

    # ==========================
    # Store Settings
    # ==========================

    free_shipping_threshold
    tax_percent

    enable_coupon
    enable_discount_code
    enable_guest_checkout

    # ==========================
    # Date & Time
    # ==========================

    created_at
    updated_at
