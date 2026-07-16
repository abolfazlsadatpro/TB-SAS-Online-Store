from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.db.models import Q
from django.http import JsonResponse
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import logout
from django.views.decorators.cache import never_cache
from django.views.generic import ListView, DetailView
from store.untils import get_tuple_status, STATUS_CHOICES
from admin_dashboard.forms import OrderStatusForm, CategoryForm, ProductForm, ProductColorFormSet, \
    ProductColorEditFormSet, BannerForm
from store.models import Order, OrderItem, Customer, VoteProduct, ContactMessage, Category, Product, \
    BannerMain
from users.models import PersonUser
from django.db import IntegrityError
from store.models import SettingSite
from admin_dashboard.forms import SettingSiteForm


# Create your views here.

def sign_out_admin(request):
    logout(request)
    return redirect('home')


@never_cache
@login_required(login_url='/')
def dashboard_admin(request):
    return render(request, "dashboard_admin/dashboard_main.html")


class LastUsers(ListView):
    model = PersonUser
    template_name = 'dashboard_admin/last_users.html'
    paginate_by = 10
    context_object_name = 'users'

    def get_queryset(self):
        queryset = PersonUser.objects.all().order_by('-id')

        query = self.request.GET.get('q')

        if query:
            queryset = queryset.filter(
                Q(first_name__icontains=query) |
                Q(last_name__icontains=query) |
                Q(email__icontains=query) |
                Q(phone_number__icontains=query)
            )

        return queryset


class ListOrders(ListView):
    model = Order
    template_name = 'dashboard_admin/all_orders_site.html'
    paginate_by = 10
    context_object_name = 'orders'

    def get_queryset(self):
        qs = Order.objects.select_related(
            "customer",
            "customer__user"
        ).order_by("-id")

        q = self.request.GET.get("q")

        if q:
            qs = qs.filter(
                Q(id__icontains=q) |
                Q(customer__user__first_name__icontains=q) |
                Q(customer__user__last_name__icontains=q) |
                Q(customer__user__email__icontains=q) |
                Q(customer__user__phone_number__icontains=q)
            )

        return qs

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)

        context["choices"] = get_tuple_status()

        context["orders"] = context["page_obj"]

        return context


def order_status_update(request):
    if request.method == 'POST':
        form = OrderStatusForm(request.POST)
        if form.is_valid():
            order_id = form.cleaned_data['order_id']
            status = form.cleaned_data['status']

            order = get_object_or_404(Order, id=order_id)
            order.status = status
            order.save()
    return redirect('all_orders_site')


class DetailOrderView(DetailView):
    model = Order
    template_name = 'dashboard_admin/detail_order.html'
    context_object_name = 'order'
    pk_url_kwarg = 'order_id'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['order_items'] = (OrderItem.objects.filter(order=self.object).select_related('product'))
        return context


def search_customers_item(request):
    if request.method == 'GET':
        query = request.GET.get('q', '')
        customers = Customer.objects.filter(
            Q(user__first_name__icontains=query) |
            Q(user__last_name__icontains=query)
        ).values('id', 'user__first_name', 'user__last_name')[:10]

        result = [
            {
                'id': customer['id'],
                'text': f"{customer['user__first_name']}{customer['user__last_name']}"
            }
            for customer in customers
        ]
        return JsonResponse(result, safe=False)


def search_product_item(request):
    if request.method == 'GET':
        query = request.GET.get('q', '')

        products = Product.objects.filter(
            Q(name__icontains=query) |
            Q(slug__icontains=query)
        )[:10]

        result = [

            {
                'id': product.id,
                'text': product.name
            }

            for product in products

        ]

        return JsonResponse(result, safe=False)


@never_cache
@login_required(login_url='/')
def new_order_site(request):
    if request.method == 'POST':
        customer_id = request.POST.get('customer')
        order_note = request.POST.get('note')
        status = request.POST.get('status')
        is_paid = request.POST.get('is_paid')
        manual = False
        order_items = request.POST.getlist('order_items[]')
        if not customer_id:
            messages.error(request, "Please Select a Customer")
        if not order_items:
            messages.error(request, "Please Add at Least on Order Item")

        is_paid = True if is_paid == 'True' else False

        try:
            customer = Customer.objects.get(id=customer_id)
            order = Order.objects.create(
                customer=customer,
                note=order_note,
                status=status,
                is_paid=is_paid,
                method_auto=manual
            )
            for item in order_items:
                pass
        except:
            pass

    statuses = STATUS_CHOICES
    return render(request, "dashboard_admin/new_order_site.html", context={'statuses': statuses})


class InboxManager(ListView):
    model = ContactMessage
    template_name = 'dashboard_admin/inbox_manager.html'
    context_object_name = 'inboxes'
    paginate_by = 10

    def get_queryset(self):
        qs = ContactMessage.objects.order_by("-created_at")

        q = self.request.GET.get("q")

        if q:
            qs = qs.filter(
                Q(name__icontains=q) |
                Q(email__icontains=q) |
                Q(subject__icontains=q) |
                Q(message__icontains=q)
            )

        return qs

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)

        context["inboxes"] = context["page_obj"]

        return context


def inbox_seen(request, pk):
    inbox = get_object_or_404(ContactMessage, id=pk)

    inbox.is_read = True

    inbox.save()

    return redirect("inbox_manager")


class VoteManager(ListView):
    model = VoteProduct
    template_name = 'dashboard_admin/vote_manager.html'
    context_object_name = 'votes'
    paginate_by = 10

    def get_queryset(self):
        qs = VoteProduct.objects.select_related(
            "user",
            "product"
        ).order_by("-created_at")

        q = self.request.GET.get("q")

        if q:
            qs = qs.filter(
                Q(user__first_name__icontains=q) |
                Q(user__last_name__icontains=q) |
                Q(user__email__icontains=q) |
                Q(product__name__icontains=q) |
                Q(description__icontains=q)
            )

        return qs

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)

        context["votes"] = context["page_obj"]

        return context


def change_publish_vote(request, pk):
    vote = get_object_or_404(VoteProduct, id=pk)
    vote.status = not vote.status
    vote.save()

    return redirect('vote_manager')


class CategoryManagement(ListView):
    model = Category
    template_name = "dashboard_admin/category_management.html"
    context_object_name = "categories"
    paginate_by = 10

    def get_queryset(self):
        qs = Category.objects.all().select_related("parent")

        q = self.request.GET.get("q")

        if q:
            qs = qs.filter(
                Q(name__icontains=q) |
                Q(slug__icontains=q) |
                Q(parent__name__icontains=q)
            )

        return qs

    def get_context_data(self, **kwargs):

        context = super().get_context_data(**kwargs)

        category = None

        if "id" in self.kwargs:
            category = get_object_or_404(Category, id=self.kwargs["id"])

        context["category"] = category
        context["forms"] = CategoryForm(instance=category)

        context["all_categories"] = Category.objects.filter(parent=None)

        context["categories"] = context["page_obj"]

        context["tree"] = build_category_tree()

        return context

    def post(self, request, *args, **kwargs):
        category = None

        if "id" in self.kwargs:
            category = get_object_or_404(Category, id=self.kwargs["id"])

        form = CategoryForm(request.POST, instance=category)

        if form.is_valid():
            try:
                form.save()

                if category:
                    messages.success(request, "Category updated successfully.")
                else:
                    messages.success(request, "Category created successfully.")

                return redirect("category_management")

            except IntegrityError:
                messages.error(request, "This slug already exists.")

        else:
            for field, errors in form.errors.items():
                for error in errors:
                    messages.error(request, f"{field.capitalize()} : {error}")

        self.object_list = self.get_queryset()

        context = self.get_context_data()
        context["forms"] = form

        return self.render_to_response(context)


def category_delete(request, pk):
    category = get_object_or_404(Category, id=pk)
    category.delete()
    if request.headers.get("X-Requested-With") == "XMLHttpRequest":
        return JsonResponse({"success": True})
    return redirect("category_management")


@login_required(login_url="/")
@never_cache
def product_add(request, id=None):
    if id:
        product = get_object_or_404(Product, id=id)
        FormSet = ProductColorEditFormSet
    else:
        product = None
        FormSet = ProductColorFormSet
    if request.method == "POST":
        form = ProductForm(request.POST, request.FILES, instance=product)
        formset = FormSet(request.POST, request.FILES, instance=product, prefix="colors")
        if form.is_valid() and formset.is_valid():
            try:
                product = form.save()
                formset.instance = product
                formset.save()
                if id:
                    messages.success(request, "Product updated successfully.")
                else:
                    messages.success(request, "Product created successfully.")
                return redirect("product_add")
            except IntegrityError:
                messages.error(request, "Slug already exists.")

        else:
            for field, errors in form.errors.items():
                for error in errors:
                    messages.error(request, f"{field.capitalize()} : {error}")
            for error in formset.non_form_errors():
                messages.error(request, error)
    else:
        form = ProductForm(instance=product)
        formset = FormSet(instance=product, prefix="colors")
    return render(request, "dashboard_admin/product_add.html",
                  {"forms": form, "formset": formset, "product": product, })


class ProductList(ListView):
    paginate_by = 10
    context_object_name = 'products'
    model = Product
    template_name = "dashboard_admin/list_product.html"

    def get_queryset(self):
        qs = super().get_queryset().select_related("category").prefetch_related("colors")
        q = self.request.GET.get("q")
        if q:
            qs = qs.filter(Q(name__icontains=q) | Q(slug__icontains=q))
        return qs


def product_delete(request, pk):
    product = get_object_or_404(Product, id=pk)
    product.delete()
    return redirect("list_product")


def delete_banner(request, pk):
    banner = get_object_or_404(BannerMain, id=pk)
    banner.delete()
    return redirect("banner_management")


class BannerManagement(ListView):
    model = BannerMain
    template_name = "dashboard_admin/new_banner_site.html"
    context_object_name = "banners"
    paginate_by = 10

    def get_queryset(self):
        qs = BannerMain.objects.all().order_by("-id")

        q = self.request.GET.get("q")

        if q:
            qs = qs.filter(
                Q(title__icontains=q) |
                Q(description__icontains=q)
            )

        return qs

    def get_context_data(self, **kwargs):

        context = super().get_context_data(**kwargs)

        banner = None

        if "id" in self.kwargs:
            banner = get_object_or_404(
                BannerMain,
                id=self.kwargs["id"]
            )

        context["banner"] = banner

        context["forms"] = BannerForm(instance=banner)

        context["banners"] = context["page_obj"]

        return context

    def post(self, request, *args, **kwargs):

        banner = None

        if "id" in self.kwargs:
            banner = get_object_or_404(
                BannerMain,
                id=self.kwargs["id"]
            )

        form = BannerForm(
            request.POST,
            request.FILES,
            instance=banner
        )

        if form.is_valid():

            form.save()

            if banner:
                messages.success(
                    request,
                    "Banner updated successfully."
                )
            else:
                messages.success(
                    request,
                    "Banner created successfully."
                )

            return redirect("banner_management")

        self.object_list = self.get_queryset()

        context = self.get_context_data()

        context["forms"] = form

        return self.render_to_response(context)


def build_category_tree(parent=None):
    tree = []

    categories = Category.objects.filter(parent=parent).order_by("name")

    for category in categories:
        tree.append({
            "item": category,
            "children": build_category_tree(category)
        })

    return tree


def setting_site(request):
    setting = SettingSite.load()

    if request.method == "POST":

        form = SettingSiteForm(
            request.POST,
            request.FILES,
            instance=setting
        )

        if form.is_valid():
            form.save()

            return redirect(
                "setting_site"
            )

    else:

        form = SettingSiteForm(
            instance=setting
        )

    context = {
        "form": form,
    }

    return render(
        request,
        "dashboard_admin/setting_site.html",
        context
    )
