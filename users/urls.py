from django.urls import path

from users.views import show_login, show_register, CustomPasswordResetView, CustomPasswordResetConfirmView, \
    CustomPasswordResetComplete, CustomPasswordResetDone

urlpatterns = [
    path('show_register', show_register, name='show_register'),
    path('show_login', show_login, name='show_login'),

    # -------------------------------------------Forget Password----------------------------------

    path('forget_password', CustomPasswordResetView.as_view(), name='forget_password'),
    path('forget_password_done', CustomPasswordResetDone.as_view(), name='forget_password_done'),
    path('forget/<uidb64>/<token>/', CustomPasswordResetConfirmView.as_view(), name='forget_password_confirm'),
    path('forget/done/',CustomPasswordResetComplete.as_view(),name='forget_password_reset_done')
    # -------------------------------------------Forget Password----------------------------------

]