from django.urls import path
from .views import home_page, about_page, contact_page, products, product_detail, base_dashboard_admin, \
    base_dashboard_user, cart_show, checkout_page, submit_review, vote_comment


urlpatterns = [
    path('', home_page, name='home'),
    path('about_us/', about_page, name='about'),
    path('contact_us/', contact_page, name='contact'),
    path('products/', products, name='products'),
    path('product_detail/<int:product_id>/', product_detail, name='product_detail'),
    path('submit_review/<int:product_id>/', submit_review, name='submit_review'),
    path('base_dashboard_admin/', base_dashboard_admin, name='base_dashboard_admin'),
    path('base_dashboard_user/', base_dashboard_user, name='base_dashboard_user'),
    path('cart', cart_show, name='cart'),
    path('checkout/', checkout_page, name='checkout'),
    path('vote_comment/', vote_comment, name='vote_comment'),
]
