from django.urls import path
from . import views

app_name = 'user_dashboard'

urlpatterns = [
    path('', views.dashboard, name='dashboard'),
    path('orders/', views.order_list, name='order_list'),
    path('orders/<int:order_id>/', views.order_detail, name='order_detail'),
    path('wishlist/', views.wishlist, name='wishlist'),
]