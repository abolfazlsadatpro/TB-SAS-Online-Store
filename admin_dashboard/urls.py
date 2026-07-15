from django.urls import path
from .views import dashboard_admin, ListOrders, new_order_site, InboxManager, VoteManager, \
    sign_out_admin, CategoryManagement, product_add, ProductList, setting_admin, LastUsers, \
    DetailOrderView, order_status_update, search_customers_item, change_publish_vote, category_delete, product_delete, \
    delete_banner, BannerManagement, inbox_seen, search_product_item

urlpatterns = [
    path('', dashboard_admin, name='dashboard_admin'),
    path('last_users', LastUsers.as_view(), name='last_users'),
    path('all_orders_site', ListOrders.as_view(), name='all_orders_site'),
    path('detail_order_show/<int:order_id>/', DetailOrderView.as_view(), name='detail_order_show'),
    path('order_status_update/', order_status_update, name='order_status_update'),
    path('new_order_site', new_order_site, name='new_order_site'),

    path('InboxManager/', InboxManager.as_view(), name='inbox_manager'),
    path('inbox_seen/<int:pk>/', inbox_seen, name='inbox_seen'),

    path('vote_manager/', VoteManager.as_view(), name='vote_manager'),
    path('change_publish_vote/<int:pk>/', change_publish_vote, name='change_publish_vote'),

    path('banner_management/', BannerManagement.as_view(), name='banner_management'),
    path('delete_banner/<int:pk>', delete_banner, name='delete_banner'),
    path("banner_management/<int:id>/", BannerManagement.as_view(), name="banner_edit"),

    path('category_management/', CategoryManagement.as_view(), name='category_management'),
    path('category_management/<int:id>/', CategoryManagement.as_view(), name='category_edit'),
    path('category_delete/<int:pk>', category_delete, name='category_delete'),

    path('product_add/<int:id>', product_add, name='product_edit'),
    path('product_add/', product_add, name='product_add'),
    path('list_product/', ProductList.as_view(), name='list_product'),
    path("product/delete/<int:pk>/", product_delete, name="product_delete"),

    path('sign_out_admin/', sign_out_admin, name='sign_out_admin'),
    path('setting_admin/', setting_admin, name='setting_admin'),
    path('search_customers_item/', search_customers_item, name='search_customers_item'),
    path('search_product_item/',search_product_item,name='search_product_item'),
]
