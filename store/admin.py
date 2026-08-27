from django.contrib import admin

from store.models import (
    Category, Product, Customer, Order, OrderItem, Brand, AboutUsSection,
    ProductSpecification, ProductAttribute, ProductAttributeValue, ProductAttributeAssignment
)


# Register your models here.

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_per_page = 20
    list_display = ('name', 'slug', 'parent', 'is_active', 'show_in_home', 'filter_display_order', 'show_in_filter')
    list_editable = ('is_active', 'show_in_home', 'filter_display_order', 'show_in_filter')
    list_filter = ('is_active', 'show_in_home', 'parent')
    search_fields = ('name', 'slug')
    prepopulated_fields = {'slug': ('name',)}


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_per_page = 20
    list_display = ('name', 'slug', 'category', 'brand', 'price', 'is_active', 'is_available', 'is_featured')
    list_editable = ('is_active', 'is_available', 'is_featured')
    list_filter = ('is_active', 'is_available', 'is_featured', 'category', 'brand')
    search_fields = ('name', 'slug', 'brand')
    prepopulated_fields = {'slug': ('name',)}


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_per_page = 20
    list_display = ('phone', 'address', 'user')
    search_fields = ('phone', 'address', 'user__email')


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_per_page = 20
    list_display = ('id', 'customer', 'is_paid', 'total_price', 'status', 'created_at')
    list_filter = ('is_paid', 'status', 'created_at')
    search_fields = ('id', 'customer__user__email')


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_per_page = 20
    list_display = ('order', 'product', 'quantity')


@admin.register(Brand)
class BrandAdmin(admin.ModelAdmin):
    list_per_page = 20
    list_display = ('name', 'slug', 'is_active', 'is_mobile', 'is_laptop', 'order')
    list_editable = ('is_active', 'is_mobile', 'is_laptop', 'order')
    list_filter = ('is_active', 'is_mobile', 'is_laptop')
    prepopulated_fields = {'slug': ('name',)}


@admin.register(AboutUsSection)
class AboutUsSectionAdmin(admin.ModelAdmin):
    list_per_page = 20
    list_display = ('title', 'section_type', 'display_order', 'is_active')
    list_editable = ('display_order', 'is_active')
    ordering = ('display_order', 'id')


@admin.register(ProductSpecification)
class ProductSpecificationAdmin(admin.ModelAdmin):
    list_per_page = 20
    list_display = ('product', 'group', 'title', 'value', 'is_filterable', 'filter_display_name')
    list_editable = ('is_filterable', 'filter_display_name')
    list_filter = ('is_filterable', 'group', 'product__category')
    search_fields = ('title', 'value', 'product__name')


@admin.register(ProductAttribute)
class ProductAttributeAdmin(admin.ModelAdmin):
    list_per_page = 20
    list_display = ('display_name', 'name', 'filter_type', 'display_order', 'is_active')
    list_editable = ('display_order', 'is_active', 'filter_type')
    list_filter = ('filter_type', 'is_active')
    prepopulated_fields = {'slug': ('name',)}


@admin.register(ProductAttributeValue)
class ProductAttributeValueAdmin(admin.ModelAdmin):
    list_per_page = 30
    list_display = ('attribute', 'value', 'display_value', 'color_code', 'display_order', 'is_active')
    list_editable = ('display_order', 'is_active')
    list_filter = ('attribute', 'is_active')
    search_fields = ('value', 'display_value')


@admin.register(ProductAttributeAssignment)
class ProductAttributeAssignmentAdmin(admin.ModelAdmin):
    list_per_page = 30
    list_display = ('product', 'attribute', 'value')
    list_filter = ('attribute', 'product__category')
    search_fields = ('product__name', 'attribute__display_name', 'value__value')