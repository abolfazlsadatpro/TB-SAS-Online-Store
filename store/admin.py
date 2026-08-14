from django.contrib import admin

from store.models import Category, Product, Customer, Order, OrderItem, Brand, AboutUsSection


# Register your models here.

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_per_page = 4
    list_display = ('name', 'slug')


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_per_page = 4
    list_display = ('name', 'slug')


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_per_page = 4
    list_display = ('phone', 'address')


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_per_page = 4

@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_per_page = 4


@admin.register(Brand)
class BrandAdmin(admin.ModelAdmin):
    list_per_page = 10
    list_display = ('name', 'slug', 'is_active', 'order')


@admin.register(AboutUsSection)
class AboutUsSectionAdmin(admin.ModelAdmin):
    list_per_page = 20
    list_display = ('title', 'section_type', 'display_order', 'is_active')
    list_editable = ('display_order', 'is_active')
    ordering = ('display_order', 'id')


