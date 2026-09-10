from django.urls import path
from .views import home_page, about_page, contact_page, products, product_detail, get_product_details, base_dashboard_admin, \
    base_dashboard_user, cart_show, checkout_page, submit_review, vote_comment, \
    add_to_cart_view, update_cart_view, remove_cart_view, cart_state_view, cart_coupon_apply, cart_coupon_remove
from . import views

urlpatterns = [
    path('', home_page, name='home'),
    path('about_us/', about_page, name='about'),
    path('contact_us/', contact_page, name='contact'),
    path('products/', products, name='products'),
    path('product_detail/<int:product_id>/', product_detail, name='product_detail'),
    path('get-product-details/<int:product_id>/', get_product_details, name='get_product_details'),

    path('submit_review/<int:product_id>/', submit_review, name='submit_review'),
    path('base_dashboard_admin/', base_dashboard_admin, name='base_dashboard_admin'),
    path('base_dashboard_user/', base_dashboard_user, name='base_dashboard_user'),
    path('cart', cart_show, name='cart'),
    path('cart/add/', add_to_cart_view, name='cart_add'),
    path('cart/update/', update_cart_view, name='cart_update'),
    path('cart/remove/', remove_cart_view, name='cart_remove'),
    path('cart/coupon/', cart_coupon_apply, name='cart_coupon_apply'),
    path('cart/coupon/remove/', cart_coupon_remove, name='cart_coupon_remove'),
    path('cart/state/', cart_state_view, name='cart_state'),
    path('checkout/', checkout_page, name='checkout'),
    path('vote_comment/', vote_comment, name='vote_comment'),
    path("wishlist/", views.wishlist, name="wishlist"),
    path("wishlist/add/<int:id>/", views.add_to_wishlist, name="add_to_wishlist"),
    path("wishlist/remove/<int:id>/", views.remove_from_wishlist, name="remove_from_wishlist"),
    path("brand/<slug:slug>/", views.brand_page, name="brand_page"),
]