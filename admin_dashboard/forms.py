from django import forms
from django.forms import inlineformset_factory
from store.models import Product, ProductColor, BannerMain, ProductImage, ProductSpecification, Category, Order
from store.untils import get_tuple_status
from store.models import SettingSite


class OrderStatusForm(forms.Form):
    order_id = forms.IntegerField(widget=forms.HiddenInput())
    status = forms.ChoiceField(choices=get_tuple_status())


class OrderManualForm(forms.Form):
    class Meta:
        model = Order
        fields = ['customer', 'status', 'total_price', 'note', 'method_auto']


class CategoryForm(forms.ModelForm):
    class Meta:
        model = Category

        fields = [
            "name",
            "slug",
            "parent"
        ]

        widgets = {

            "name": forms.TextInput(
                attrs={
                    "class": "form-control",
                    "placeholder": "Category Name"
                }
            ),

            "slug": forms.TextInput(
                attrs={
                    "class": "form-control",
                    "placeholder": "Category Slug"
                }
            ),

            "parent": forms.Select(
                attrs={
                    "class": "form-control"
                }
            )
        }


class ProductForm(forms.ModelForm):
    class Meta:
        model = Product

        fields = [
            "category",
            "name",
            "slug",
            "description",
            "price",
            "discount_price",

            "brand",
            "sku",
            "weight",
            "warranty",

            "is_active",
            "is_available",
            "is_featured",
            "is_best_seller",

            "meta_title",
            "meta_description",
            "meta_keywords",
        ]

        widgets = {

            # Product Information

            "category": forms.Select(
                attrs={
                    "class": "form-select"
                }
            ),

            "name": forms.TextInput(
                attrs={
                    "class": "form-control",
                    "placeholder": "Product Name"
                }
            ),

            "slug": forms.TextInput(
                attrs={
                    "class": "form-control",
                    "placeholder": "product-slug"
                }
            ),

            "description": forms.Textarea(
                attrs={
                    "class": "form-control",
                    "rows": 6,
                    "placeholder": "Product Description"
                }
            ),

            # Pricing

            "price": forms.NumberInput(
                attrs={
                    "class": "form-control"
                }
            ),

            "discount_price": forms.NumberInput(
                attrs={
                    "class": "form-control"
                }
            ),

            # Additional Information

            "brand": forms.TextInput(
                attrs={
                    "class": "form-control",
                    "placeholder": "Brand Name"
                }
            ),

            "sku": forms.TextInput(
                attrs={
                    "class": "form-control",
                    "placeholder": "Product SKU"
                }
            ),

            "weight": forms.NumberInput(
                attrs={
                    "class": "form-control",
                    "placeholder": "Weight in Gram"
                }
            ),

            "warranty": forms.TextInput(
                attrs={
                    "class": "form-control",
                    "placeholder": "Warranty Information"
                }
            ),

            # Product Status

            "is_active": forms.CheckboxInput(
                attrs={
                    "class": "form-check-input"
                }
            ),

            "is_available": forms.CheckboxInput(
                attrs={
                    "class": "form-check-input"
                }
            ),

            "is_featured": forms.CheckboxInput(
                attrs={
                    "class": "form-check-input"
                }
            ),

            "is_best_seller": forms.CheckboxInput(
                attrs={
                    "class": "form-check-input"
                }
            ),

            # SEO

            "meta_title": forms.TextInput(
                attrs={
                    "class": "form-control",
                    "placeholder": "Meta Title"
                }
            ),

            "meta_description": forms.Textarea(
                attrs={
                    "class": "form-control",
                    "rows": 5,
                    "placeholder": "Meta Description"
                }
            ),

            "meta_keywords": forms.TextInput(
                attrs={
                    "class": "form-control",
                    "placeholder": "apple, iphone, samsung"
                }
            ),
        }


class ProductColorForm(forms.ModelForm):
    class Meta:
        model = ProductColor

        fields = [

            "name",
            "color_code",
            "image",
            "stock",
            "is_default",

        ]

        widgets = {

            "name": forms.TextInput(
                attrs={
                    "class": "form-control",
                    "placeholder": "Color Name"
                }
            ),

            "is_default": forms.CheckboxInput(
                attrs={
                    "class": "form-check-input"
                }
            ),

            "color_code": forms.TextInput(
                attrs={
                    "class": "form-control form-control-color",
                    "type": "color"
                }
            ),

            "image": forms.ClearableFileInput(
                attrs={
                    "class": "form-control"
                }
            ),

            "stock": forms.NumberInput(
                attrs={
                    "class": "form-control"
                }
            ),

        }


class ProductImageForm(forms.ModelForm):
    class Meta:
        model = ProductImage

        fields = (
            "image",
            "alt_text",
            "display_order",
        )

        widgets = {

            "image": forms.ClearableFileInput(
                attrs={
                    "class": "form-control"
                }
            ),

            "alt_text": forms.TextInput(
                attrs={
                    "class": "form-control",
                    "placeholder": "Image alt text"
                }
            ),

            "display_order": forms.NumberInput(
                attrs={
                    "class": "form-control",
                    "placeholder": "Display order"
                }
            ),

        }


class ProductSpecificationForm(forms.ModelForm):
    class Meta:
        model = ProductSpecification

        fields = (

            "group",
            "title",
            "value",
            "display_order",

        )

        widgets = {

            "group": forms.TextInput(
                attrs={
                    "class": "form-control",
                    "placeholder": "Display"
                }
            ),

            "title": forms.TextInput(
                attrs={
                    "class": "form-control",
                    "placeholder": "RAM"
                }
            ),

            "value": forms.TextInput(
                attrs={
                    "class": "form-control",
                    "placeholder": "16 GB"
                }
            ),

            "display_order": forms.NumberInput(
                attrs={
                    "class": "form-control"
                }
            ),

        }


ProductSpecificationFormSet = inlineformset_factory(
    Product,
    ProductSpecification,
    form=ProductSpecificationForm,
    extra=1,
    can_delete=True
)

ProductColorFormSet = inlineformset_factory(
    Product,
    ProductColor,
    form=ProductColorForm,
    extra=1,
    can_delete=True
)

ProductColorEditFormSet = inlineformset_factory(
    Product,
    ProductColor,
    form=ProductColorForm,
    extra=0,
    can_delete=True
)

ProductImageFormSet = inlineformset_factory(
    Product,
    ProductImage,
    form=ProductImageForm,
    extra=1,
    can_delete=True
)


class BannerForm(forms.ModelForm):
    class Meta:
        model = BannerMain

        fields = "__all__"

        widgets = {

            "title": forms.TextInput(
                attrs={
                    "class": "form-control banner-input",
                    "placeholder": "Enter banner title"
                }
            ),

            "description": forms.Textarea(
                attrs={
                    "class": "form-control banner-textarea",
                    "rows": 5,
                    "placeholder": "Write banner description..."
                }
            ),

            "picture": forms.ClearableFileInput(
                attrs={
                    "class": "form-control banner-file"
                }
            ),

            "button_text": forms.TextInput(
                attrs={
                    "class": "form-control banner-input",
                    "placeholder": "Shop Now"
                }
            ),

            "button_link": forms.URLInput(
                attrs={
                    "class": "form-control banner-input",
                    "placeholder": "/products/"
                }
            ),

            "order": forms.NumberInput(
                attrs={
                    "class": "form-control banner-input",
                    "min": "0"
                }
            ),

            "is_active": forms.CheckboxInput(
                attrs={
                    "class": "form-check-input"
                }
            ),

        }


class SettingSiteForm(forms.ModelForm):
    class Meta:
        model = SettingSite

        fields = "__all__"

        widgets = {

            # ==========================
            # General Information
            # ==========================

            "website_name": forms.TextInput(),
            "website_title": forms.TextInput(),
            "website_short_description": forms.Textarea(
                attrs={"rows": 3}
            ),
            "website_keywords": forms.Textarea(
                attrs={"rows": 3}
            ),

            # ==========================
            # Contact Information
            # ==========================

            "email": forms.EmailInput(),
            "support_email": forms.EmailInput(),

            "phone_number": forms.TextInput(),
            "support_phone_number": forms.TextInput(),

            "address": forms.Textarea(
                attrs={"rows": 3}
            ),

            "working_hours": forms.TextInput(),

            # ==========================
            # Social Media
            # ==========================

            "instagram": forms.URLInput(),
            "telegram": forms.URLInput(),
            "github": forms.URLInput(),
            "linkedin": forms.URLInput(),
            "youtube": forms.URLInput(),
            "twitter_x": forms.URLInput(),

            # ==========================
            # Footer Section
            # ==========================

            "footer_description": forms.Textarea(
                attrs={"rows": 4}
            ),

            "copyright_text": forms.TextInput(),

            # ==========================
            # SEO Settings
            # ==========================

            "meta_title": forms.TextInput(),

            "meta_description": forms.Textarea(
                attrs={"rows": 4}
            ),

            "meta_keywords": forms.Textarea(
                attrs={"rows": 3}
            ),

            # ==========================
            # Site Features
            # ==========================

            "maintenance_message": forms.Textarea(
                attrs={"rows": 4}
            ),

            # ==========================
            # Store Settings
            # ==========================

            "free_shipping_threshold": forms.NumberInput(),

            "tax_percent": forms.NumberInput(),

        }
