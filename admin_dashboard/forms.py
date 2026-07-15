from django import forms
from django.forms import inlineformset_factory
from store.models import Product, ProductColor, BannerMain
from store.models import Order, Category
from store.untils import get_tuple_status


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
            "stock",
        ]

        widgets = {

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

            "price": forms.NumberInput(
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


class ProductColorForm(forms.ModelForm):
    class Meta:
        model = ProductColor

        fields = [
            "name",
            "color_code",
            "image",
            "stock",
        ]

        widgets = {

            "name": forms.TextInput(
                attrs={
                    "class": "form-control",
                    "placeholder": "Color Name"
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


class BannerForm(forms.ModelForm):
    class Meta:
        model = BannerMain

        fields = "__all__"

        widgets = {

            "title": forms.TextInput(attrs={

                "class": "form-control banner-input",

                "placeholder": "Enter banner title"

            }),

            "description": forms.Textarea(attrs={

                "class": "form-control banner-textarea",

                "rows": 5,

                "placeholder": "Write banner description..."

            }),

            "picture": forms.ClearableFileInput(attrs={

                "class": "form-control banner-file"

            }),

        }