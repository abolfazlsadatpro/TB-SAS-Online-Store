from django.contrib.auth.forms import PasswordResetForm
from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login
from django.contrib import messages
from django.contrib.auth.views import (
    PasswordResetView,
    PasswordResetDoneView,
    PasswordResetConfirmView,
    PasswordResetCompleteView,
)
from django.urls import reverse_lazy

from users.forms import RegisterForm
from users.models import PersonUser

print("USERS VIEWS LOADED")


def show_register(request):
    form = RegisterForm(request.POST or None)

    if request.method == "POST":
        if form.is_valid():
            user = PersonUser.objects.create_user(
                email=form.cleaned_data["email"],
                password=form.cleaned_data["password"],
                first_name=form.cleaned_data["first_name"],
                last_name=form.cleaned_data["last_name"],
                phone_number=form.cleaned_data["phone_number"],
            )

            login(request, user)
            messages.success(request, "You Are Register Successful!")
            return redirect("dashboard_admin")

        for field, errors in form.errors.items():
            for error in errors:
                messages.error(request, error)

    return render(request, "main/register.html", {"form": form})


def show_login(request):
    if request.method == "POST":
        email = request.POST.get("email")
        password = request.POST.get("password")

        user = authenticate(
            request,
            email=email,
            password=password
        )

        if user is not None:
            login(request, user)
            return redirect("dashboard_admin")

        messages.error(request, "Email or password is wrong!")

    return render(request, "main/login.html")


class CustomPasswordResetView(PasswordResetView):
    template_name = "main/forget/forget_password.html"
    email_template_name = "main/forget/email_template.html"
    success_url = reverse_lazy("forget_password_done")
    form_class = PasswordResetForm


class CustomPasswordResetDone(PasswordResetDoneView):
    template_name = "main/forget/forget_password_done.html"


class CustomPasswordResetConfirmView(PasswordResetConfirmView):
    template_name = 'main/forget/password_confirm.html'
    success_url = reverse_lazy('forget_password_reset_done')

    def get_form(self, form_class=None):
        form = super().get_form(form_class)

        form.fields['new_password1'].widget.attrs.update({
            'placeholder': 'Enter your new password',
            'class': 'custom-input'
        })

        form.fields['new_password2'].widget.attrs.update({
            'placeholder': 'Confirm your new password',
            'class': 'custom-input'
        })

        return form


class CustomPasswordResetComplete(PasswordResetCompleteView):
    template_name = "main/forget/password_reset_complete.html"
