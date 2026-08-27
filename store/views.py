from django.contrib import messages
from store.models import (
    VoteProduct, CommentVote, Product, Wishlist, Brand, AboutUsSection,
    SettingSite, Category, ProductSpecification, ProductAttribute, ProductAttributeValue
)
from store.forms import VoteSubmitForm
from django.shortcuts import render
from django.db.models import Avg, Count, Q, Min, Max, F, Exists, OuterRef, IntegerField, FloatField
from django.db.models.functions import Coalesce
from django.core.paginator import Paginator
from django.template.loader import render_to_string
from .forms import ContactMessageForm
from store.services.home_services import *
from django.contrib.auth.decorators import login_required
from django.shortcuts import get_object_or_404, redirect
from django.http import JsonResponse
from django.views.decorators.http import require_POST


def home_page(request):
    context = {

        "settings": get_site_setting(),

        "banners": get_active_banners(),

        "categories": get_home_categories(),

        "mega_categories": get_mega_categories(),

        "discount_products": get_discount_products(),

        "featured_products": get_featured_products(),

        "latest_products": get_latest_products(),

        "best_seller_products": get_best_seller_products(),

        "brands": get_brands(),

        "mobile_brands": get_mobile_brands(),

        "laptop_brands": get_laptop_brands(),

        "promo_banners": get_promo_banners(),

    }

    return render(
        request,
        "main/home_store.html",
        context
    )


CATEGORY_FILTERS = {
    "mobile": "Phone",
    "laptop": "Laptop_update",
}


def brand_page(request, slug):
    brand = get_object_or_404(
        Brand,
        slug=slug,
        is_active=True
    )

    cat = request.GET.get("cat", "")

    products = (
        Product.objects
        .filter(
            brand=brand.name,
            is_active=True,
            is_available=True,
        )
        .select_related("category")
        .prefetch_related("colors", "images")
        .order_by("-created_at")
    )

    current_cat = ""

    if cat in CATEGORY_FILTERS:
        current_cat = cat
        products = products.filter(
            category__name=CATEGORY_FILTERS[cat]
        )

    return render(
        request,
        "main/brand_page.html",
        {
            "brand": brand,
            "products": products,
            "current_cat": current_cat,
        }
    )


def filter_test(request):
    """صفحه تست نمایش پنج طرح مختلف فیلتر"""
    # Reuse same logic as products view to get real data
    # Get filter parameters
    current_cat = request.GET.get("category", "").strip()
    current_brands = request.GET.getlist("brand")
    price_min = request.GET.get("price_min", "").strip()
    price_max = request.GET.get("price_max", "").strip()
    search_q = request.GET.get("q", "").strip()
    sort_key = request.GET.get("sort", "").strip()

    # Attribute filters: attr_<attribute_slug>=value1,value2
    attr_filters = {}
    for key, value in request.GET.items():
        if key.startswith("attr_") and value:
            attr_slug = key[5:]  # Remove 'attr_' prefix
            attr_filters[attr_slug] = value.split(",")

    # Effective price annotation
    effective_price = Coalesce(F("discount_price"), F("price"), output_field=IntegerField())

    # Base queryset
    queryset = (
        Product.objects
        .filter(is_active=True, is_available=True)
        .annotate(
            avg_rating=Coalesce(
                Avg("comments__rating", filter=Q(comments__status=True)),
                0.0,
                output_field=FloatField(),
            ),
            rating_count=Count("comments__rating", filter=Q(comments__status=True)),
            annotated_final_price=effective_price,
        )
        .select_related("category")
        .prefetch_related("colors", "images", "attribute_assignments__attribute", "attribute_assignments__value")
    )

    # ---- Category filter ----
    if current_cat:
        prod_cats = Category.objects.filter(
            Q(slug=current_cat) | Q(parent__slug=current_cat)
        ).values_list("id", flat=True)
        queryset = queryset.filter(category_id__in=list(prod_cats))

    # ---- Brand filter ----
    if current_brands:
        queryset = queryset.filter(brand__in=current_brands)

    # ---- Price range filter ----
    try:
        if price_min:
            queryset = queryset.filter(annotated_final_price__gte=int(price_min))
    except ValueError:
        pass
    try:
        if price_max:
            queryset = queryset.filter(annotated_final_price__lte=int(price_max))
    except ValueError:
        pass

    # ---- Search ----
    if search_q:
        queryset = queryset.filter(
            Q(name__icontains=search_q)
            | Q(category__name__icontains=search_q)
            | Q(brand__icontains=search_q)
        )

    # ---- Attribute filters ----
    for attr_slug, values in attr_filters.items():
        queryset = queryset.filter(
            attribute_assignments__attribute__slug=attr_slug,
            attribute_assignments__value__value__in=values
        ).distinct()

    # ---- Sorting ----
    SORT_OPTIONS = {
        "newest": "-created_at",
        "cheapest": "annotated_final_price",
        "expensive": "-annotated_final_price",
        "best_selling": "-sold_count",
        "popular": "-views_count",
    }
    default_sort = SORT_OPTIONS["newest"]
    sort_field = SORT_OPTIONS.get(sort_key, default_sort)
    queryset = queryset.order_by(sort_field)

    # ---- Pagination ----
    PRODUCTS_PER_PAGE = 12
    paginator = Paginator(queryset, PRODUCTS_PER_PAGE)
    page_number = request.GET.get("page", 1)
    page_obj = paginator.get_page(page_number)

    # ---- Star rating helpers ----
    for p in page_obj.object_list:
        avg = float(p.avg_rating or 0)
        full = int(avg)
        half = (avg - full) >= 0.5
        p.star_full = range(full)
        p.star_empty = range(5 - full - (1 if half else 0))
        p.star_half = half

    # ---- Wishlist IDs ----
    wishlist_ids = set()
    if request.user.is_authenticated:
        wishlist_ids = set(
            Wishlist.objects.filter(user=request.user).values_list("product_id", flat=True)
        )

    # ---- Filter sidebar data ----
    # Categories for filter sidebar (only those with show_in_filter=True)
    filter_categories = Category.objects.filter(
        parent=None, is_active=True, show_in_filter=True
    ).prefetch_related("children").order_by("filter_display_order", "name")

    # Brands for filter sidebar
    filter_brands = Brand.objects.filter(is_active=True).order_by("order", "name")

    # Product attributes for filter sidebar (only active ones with values)
    filter_attributes = ProductAttribute.objects.filter(
        is_active=True
    ).prefetch_related("values").order_by("display_order", "name")

    # Only include attributes that have active values and are used by products in current queryset
    filter_attributes_with_data = []
    filter_attributes_dict = {}
    for attr in filter_attributes:
        active_values = attr.values.filter(is_active=True)
        if active_values.exists():
            # Check if any product in current queryset has this attribute
            used_values = ProductAttributeValue.objects.filter(
                attribute=attr,
                is_active=True,
                productattributeassignment__product__in=queryset
            ).distinct()
            if used_values.exists():
                attr.filter_values = used_values
                filter_attributes_with_data.append(attr)
                filter_attributes_dict[attr.slug] = attr

    # Price range for slider
    price_range = Product.objects.filter(
        is_active=True, is_available=True
    ).annotate(
        _eff=Coalesce(F("discount_price"), F("price"), output_field=IntegerField())
    ).aggregate(
        min_price=Min("_eff"),
        max_price=Max("_eff"),
    )

    context = {
        "mega_categories": get_mega_categories(),
        "settings": get_site_setting(),
        "categories": filter_categories,
        "brands": filter_brands,
        "filter_attributes": filter_attributes_with_data,
        "filter_attributes_dict": filter_attributes_dict,
        "price_range": price_range,
        "page_obj": page_obj,
        "products": page_obj.object_list,
        "total_count": paginator.count,
        "sort_options": SORT_OPTIONS,
        "current_sort": sort_key,
        "current_cat": current_cat,
        "current_brands": current_brands,
        "price_min": price_min,
        "price_max": price_max,
        "search_q": search_q,
        "wishlist_ids": wishlist_ids,
        "attr_filters": attr_filters,
    }

    return render(request, "main/filter_test.html", context)


def about_page(request):
    settings = SettingSite.load()

    sections = AboutUsSection.objects.filter(
        is_active=True
    ).order_by(
        "display_order",
        "id"
    )

    return render(
        request,
        'main/about_us.html',
        {
            "settings": settings,
            "about_sections": sections,
        }
    )


def contact_page(request):
    form = ContactMessageForm()

    if request.method == 'POST':

        data = request.POST.copy()

        if request.user.is_authenticated:
            data['name'] = (
                f"{request.user.first_name} "
                f"{request.user.last_name}"
            )

            data['email'] = request.user.email

        form = ContactMessageForm(data)

        if form.is_valid():

            contact = form.save(commit=False)

            if request.user.is_authenticated:
                contact.user = request.user

            contact.save()

            messages.success(
                request,
                'Your message has been sent successfully.'
            )

            return redirect('contact')

        else:
            print(form.errors)

    return render(request, 'main/contact_us.html', {'form': form})


def products(request):
    """صفحه لیست محصولات با فیلترهای کامل و پشتیبانی از AJAX"""

    # Get filter parameters
    current_cat = request.GET.get("category", "").strip()
    current_brands = request.GET.getlist("brand")
    price_min = request.GET.get("price_min", "").strip()
    price_max = request.GET.get("price_max", "").strip()
    search_q = request.GET.get("q", "").strip()
    sort_key = request.GET.get("sort", "").strip()

    # Attribute filters: attr_<attribute_slug>=value1,value2
    attr_filters = {}
    for key, value in request.GET.items():
        if key.startswith("attr_") and value:
            attr_slug = key[5:]  # Remove 'attr_' prefix
            attr_filters[attr_slug] = value.split(",")

    # Check if AJAX request
    is_ajax = request.headers.get("X-Requested-With") == "XMLHttpRequest" or request.GET.get("ajax") == "1"

    # Effective price annotation
    effective_price = Coalesce(F("discount_price"), F("price"), output_field=IntegerField())

    # Base queryset
    queryset = (
        Product.objects
        .filter(is_active=True, is_available=True)
        .annotate(
            avg_rating=Coalesce(
                Avg("comments__rating", filter=Q(comments__status=True)),
                0.0,
                output_field=FloatField(),
            ),
            rating_count=Count("comments__rating", filter=Q(comments__status=True)),
            annotated_final_price=effective_price,
        )
        .select_related("category")
        .prefetch_related("colors", "images", "attribute_assignments__attribute", "attribute_assignments__value")
    )

    # ---- Category filter ----
    if current_cat:
        prod_cats = Category.objects.filter(
            Q(slug=current_cat) | Q(parent__slug=current_cat)
        ).values_list("id", flat=True)
        queryset = queryset.filter(category_id__in=list(prod_cats))

    # ---- Brand filter ----
    if current_brands:
        queryset = queryset.filter(brand__in=current_brands)

    # ---- Price range filter ----
    try:
        if price_min:
            queryset = queryset.filter(annotated_final_price__gte=int(price_min))
    except ValueError:
        pass
    try:
        if price_max:
            queryset = queryset.filter(annotated_final_price__lte=int(price_max))
    except ValueError:
        pass

    # ---- Search ----
    if search_q:
        queryset = queryset.filter(
            Q(name__icontains=search_q)
            | Q(category__name__icontains=search_q)
            | Q(brand__icontains=search_q)
        )

    # ---- Attribute filters ----
    for attr_slug, values in attr_filters.items():
        queryset = queryset.filter(
            attribute_assignments__attribute__slug=attr_slug,
            attribute_assignments__value__value__in=values
        ).distinct()

    # ---- Sorting ----
    SORT_OPTIONS = {
        "newest": "-created_at",
        "cheapest": "annotated_final_price",
        "expensive": "-annotated_final_price",
        "best_selling": "-sold_count",
        "popular": "-views_count",
    }
    default_sort = SORT_OPTIONS["newest"]
    sort_field = SORT_OPTIONS.get(sort_key, default_sort)
    queryset = queryset.order_by(sort_field)

    # ---- Pagination ----
    PRODUCTS_PER_PAGE = 12
    paginator = Paginator(queryset, PRODUCTS_PER_PAGE)
    page_number = request.GET.get("page", 1)
    page_obj = paginator.get_page(page_number)

    # ---- Star rating helpers ----
    for p in page_obj.object_list:
        avg = float(p.avg_rating or 0)
        full = int(avg)
        half = (avg - full) >= 0.5
        p.star_full = range(full)
        p.star_empty = range(5 - full - (1 if half else 0))
        p.star_half = half

    # ---- Wishlist IDs ----
    wishlist_ids = set()
    if request.user.is_authenticated:
        wishlist_ids = set(
            Wishlist.objects.filter(user=request.user).values_list("product_id", flat=True)
        )

    # ---- Filter sidebar data ----
    # Categories for filter sidebar (only those with show_in_filter=True)
    filter_categories = Category.objects.filter(
        parent=None, is_active=True, show_in_filter=True
    ).prefetch_related("children").order_by("filter_display_order", "name")

    # Brands for filter sidebar
    filter_brands = Brand.objects.filter(is_active=True).order_by("order", "name")

    # Product attributes for filter sidebar (only active ones with values)
    filter_attributes = ProductAttribute.objects.filter(
        is_active=True
    ).prefetch_related("values").order_by("display_order", "name")

    # Only include attributes that have active values and are used by products in current queryset
    filter_attributes_with_data = []
    filter_attributes_dict = {}
    for attr in filter_attributes:
        active_values = attr.values.filter(is_active=True)
        if active_values.exists():
            # Check if any product in current queryset has this attribute
            used_values = ProductAttributeValue.objects.filter(
                attribute=attr,
                is_active=True,
                productattributeassignment__product__in=queryset
            ).distinct()
            if used_values.exists():
                attr.filter_values = used_values
                filter_attributes_with_data.append(attr)
                filter_attributes_dict[attr.slug] = attr

    # Price range for slider
    price_range = Product.objects.filter(
        is_active=True, is_available=True
    ).annotate(
        _eff=Coalesce(F("discount_price"), F("price"), output_field=IntegerField())
    ).aggregate(
        min_price=Min("_eff"),
        max_price=Max("_eff"),
    )

    context = {
        "mega_categories": get_mega_categories(),
        "settings": get_site_setting(),
        "categories": filter_categories,
        "brands": filter_brands,
        "filter_attributes": filter_attributes_with_data,
        "filter_attributes_dict": filter_attributes_dict,
        "price_range": price_range,
        "page_obj": page_obj,
        "products": page_obj.object_list,
        "total_count": paginator.count,
        "sort_options": SORT_OPTIONS,
        "current_sort": sort_key,
        "current_cat": current_cat,
        "current_brands": current_brands,
        "price_min": price_min,
        "price_max": price_max,
        "search_q": search_q,
        "wishlist_ids": wishlist_ids,
        "attr_filters": attr_filters,
    }

    if is_ajax:
        html = render_to_string(
            "main/products_ajax.html",
            context,
            request=request,
        )
        return JsonResponse({
            "html": html,
            "count": paginator.count,
            "total_pages": paginator.num_pages,
        })

    return render(request, "main/products.html", context)


def base_dashboard_admin(request):
    return render(request, 'dashboard_admin/base/base_dashboard_admin.html')


def base_dashboard_user(request):
    return render(request, 'dashboard_user/base/base_dashboard_user.html')


def cart_show(request):
    return render(request, 'main/cart.html')


def checkout_page(request):
    return render(request, 'main/checkout.html')


def product_detail(request, product_id):
    product = get_object_or_404(
        Product.objects.annotate(
            annotated_final_price=Coalesce(F("discount_price"), F("price"), output_field=IntegerField())
        ),
        id=product_id
    )
    is_wishlist = False

    if request.user.is_authenticated:
        is_wishlist = Wishlist.objects.filter(
            user=request.user,
            product=product
        ).exists()

    product.views_count += 1
    product.save(
        update_fields=[
            "views_count"
        ]
    )

    comments = (
        VoteProduct.objects
        .filter(
            product=product,
            status=True
        )
        .annotate(
            likes=Count(
                "votes",
                filter=Q(votes__vote=1)
            ),
            dislikes=Count(
                "votes",
                filter=Q(votes__vote=-1)
            ),
        )
        .order_by(
            "-created_at"
        )
    )

    average_rating = (
            comments.aggregate(
                Avg("rating")
            )["rating__avg"]
            or 0
    )

    full_stars = int(average_rating)

    half_star = (
                        average_rating - full_stars
                ) >= 0.5

    empty_stars = (
            5
            - full_stars
            - (1 if half_star else 0)
    )

    comments_count = comments.count()

    user_votes = {}
    if request.user.is_authenticated:
        votes = CommentVote.objects.filter(
            user=request.user
        )
        user_votes = {
            v.comment_id: v.vote
            for v in votes
        }

    gallery_images = []

    def add_gallery_image(url, name="", color="", kind="normal"):

        if not url:
            return

        existing = next(
            (item for item in gallery_images if item["url"] == url),
            None
        )

        if existing:

            # اگر قبلا normal بوده و الان color هست
            if kind == "color":
                existing["kind"] = "color"
                existing["name"] = name
                existing["color"] = color

            return

        gallery_images.append({
            "url": url,
            "name": name,
            "color": color,
            "kind": kind,
        })

    if product.main_image:
        add_gallery_image(
            product.main_image.url,
            product.name,
            "",
            "normal"
        )

    for color in product.colors.all():
        if color.image:
            add_gallery_image(
                color.image.url,
                color.name,
                color.name,
                "color"
            )

    for image in product.images.all():
        if image.image:
            add_gallery_image(
                image.image.url,
                product.name,
                "",
                "normal"
            )

    print(gallery_images)
    context = {

        "product": product,
        "comments": comments,
        "gallery_images": gallery_images,
        "average_rating": average_rating,
        "comments_count": comments_count,
        "full_stars": range(full_stars),
        "empty_stars": range(empty_stars),
        "user_votes": user_votes,
        "product_images": product.images.all(),
        "product_colors": product.colors.all(),
        "is_wishlist": is_wishlist,
        "related_products": (
            Product.objects
            .filter(
                category=product.category
            )
            .exclude(
                id=product.id
            )
            .annotate(
                annotated_final_price=Coalesce(F("discount_price"), F("price"), output_field=IntegerField())
            )[:8]
        ),
        "specification_groups": (
            product.specifications
            .values_list(
                "group",
                flat=True
            )
            .distinct()
        ),
        "default_color": product.default_color,
        "total_stock": product.total_stock,
        "is_in_stock": product.is_in_stock,
        "main_image": product.main_image,
        "discount_percent": product.discount_percent,
        "has_discount": product.has_discount,
        "total_images": product.total_images,
        "total_colors": product.total_colors,
        "total_specifications": product.total_specifications,
        "other_images": (
            product.images.exclude(
                id=product.images.first().id
            )
            if product.images.exists()
            else []
        ),
    }

    return render(
        request,
        "main/product_detail.html",
        context
    )


@login_required
def submit_review(request, product_id):
    product = get_object_or_404(Product, id=product_id)

    if request.method == 'POST':
        form = VoteSubmitForm(request.POST)

        if form.is_valid():
            vote = form.save(commit=False)
            vote.user = request.user
            vote.product = product
            vote.save()
            messages.success(request, 'Your comment has been submitted and is awaiting approval.')

    return redirect('product_detail', product_id=product.id)


@login_required
def vote_comment(request):
    if request.method == "POST":

        comment_id = request.POST.get("comment_id")
        vote_type = request.POST.get("vote")

        comment = get_object_or_404(VoteProduct, id=comment_id)

        vote_value = 1 if vote_type == "like" else -1

        obj, created = CommentVote.objects.get_or_create(
            user=request.user,
            comment=comment,
            defaults={'vote': vote_value}
        )

        if not created:
            if obj.vote == vote_value:
                obj.delete()  # toggle off
            else:
                obj.vote = vote_value
                obj.save()

        likes = CommentVote.objects.filter(comment=comment, vote=1).count()
        dislikes = CommentVote.objects.filter(comment=comment, vote=-1).count()

        return JsonResponse({
            "likes": likes,
            "dislikes": dislikes,
        })


@login_required
@require_POST
def add_to_wishlist(request, id):
    product = get_object_or_404(
        Product,
        id=id
    )

    wishlist = Wishlist.objects.filter(
        user=request.user,
        product=product
    )

    if wishlist.exists():
        wishlist.delete()

        return JsonResponse({
            "success": True,
            "action": "removed",
            "total": Wishlist.objects.filter(
                user=request.user
            ).count()
        })

    Wishlist.objects.create(
        user=request.user,
        product=product
    )

    return JsonResponse({
        "success": True,
        "action": "added",
        "total": Wishlist.objects.filter(
            user=request.user
        ).count()
    })


@login_required
@require_POST
def remove_from_wishlist(request, id):
    product = get_object_or_404(
        Product,
        id=id
    )

    Wishlist.objects.filter(
        user=request.user,
        product=product
    ).delete()

    return JsonResponse({
        "success": True,
        "removed": True,
        "total": request.user.total_wishlist
    })


@login_required
def wishlist(request):
    wishlists = (
        Wishlist.objects
        .filter(user=request.user)
        .select_related("product")
        .annotate(
            annotated_final_price=Coalesce(F("product__discount_price"), F("product__price"), output_field=IntegerField())
        )
        .order_by("-created_at")
    )

    wishlist_ids = [item.product_id for item in wishlists]

    discount_count = sum(
        1 for item in wishlists
        if item.product.has_discount
    )

    total_value = sum(
        item.annotated_final_price
        for item in wishlists
    )

    popular_products = (
        Product.objects
        .filter(is_active=True, is_available=True)
        .exclude(id__in=wishlist_ids)
        .annotate(
            annotated_final_price=Coalesce(F("discount_price"), F("price"), output_field=IntegerField())
        )
        .order_by("-views_count")[:8]
    )

    context = {
        "wishlists": wishlists,
        "wishlist_ids": wishlist_ids,
        "discount_count": discount_count,
        "total_value": total_value,
        "popular_products": popular_products,
    }

    return render(
        request,
        "main/wishlist.html",
        context
    )


def filter_mockups(request):
    """
    نمایش پنج variante فیلتر با داده‌های واقعی (همان منطق filter-test)
    اما در مسیر mockups/filter/ برای مقایسه visualization.
    """
    # ----- همان logique filter-test -----
    current_cat = request.GET.get("category", "").strip()
    current_brands = request.GET.getlist("brand")
    price_min = request.GET.get("price_min", "").strip()
    price_max = request.GET.get("price_max", "").strip()
    search_q = request.GET.get("q", "").strip()
    sort_key = request.GET.get("sort", "").strip()

    attr_filters = {}
    for key, value in request.GET.items():
        if key.startswith("attr_") and value:
            attr_slug = key[5:]      # حذف 'attr_'
            attr_filters[attr_slug] = value.split(",")

    effective_price = Coalesce(F("discount_price"), F("price"), output_field=IntegerField())

    queryset = (
        Product.objects
        .filter(is_active=True, is_available=True)
        .annotate(
            avg_rating=Coalesce(
                Avg("comments__rating", filter=Q(comments__status=True)),
                0.0,
                output_field=FloatField(),
            ),
            rating_count=Count("comments__rating", filter=Q(comments__status=True)),
            annotated_final_price=effective_price,
        )
        .select_related("category")
        .prefetch_related(
            "colors",
            "images",
            "attribute_assignments__attribute",
            "attribute_assignments__value"
        )
    )

    if current_cat:
        prod_cats = Category.objects.filter(
            Q(slug=current_cat) | Q(parent__slug=current_cat)
        ).values_list("id", flat=True)
        queryset = queryset.filter(category_id__in=list(prod_cats))

    if current_brands:
        queryset = queryset.filter(brand__in=current_brands)

    try:
        if price_min:
            queryset = queryset.filter(annotated_final_price__gte=int(price_min))
    except ValueError:
        pass
    try:
        if price_max:
            queryset = queryset.filter(annotated_final_price__lte=int(price_max))
    except ValueError:
        pass

    if search_q:
        queryset = queryset.filter(
            Q(name__icontains=search_q)
            | Q(category__name__icontains=search_q)
            | Q(brand__icontains=search_q)
        )

    for attr_slug, values in attr_filters.items():
        queryset = queryset.filter(
            attribute_assignments__attribute__slug=attr_slug,
            attribute_assignments__value__value__in=values
        ).distinct()

    SORT_OPTIONS = {
        "newest": "-created_at",
        "cheapest": "annotated_final_price",
        "expensive": "-annotated_final_price",
        "best_selling": "-sold_count",
        "popular": "-views_count",
    }
    default_sort = SORT_OPTIONS["newest"]
    sort_field = SORT_OPTIONS.get(sort_key, default_sort)
    queryset = queryset.order_by(sort_field)

    PRODUCTS_PER_PAGE = 12
    paginator = Paginator(queryset, PRODUCTS_PER_PAGE)
    page_number = request.GET.get("page", 1)
    page_obj = paginator.get_page(page_number)

    for p in page_obj.object_list:
        avg = float(p.avg_rating or 0)
        full = int(avg)
        half = (avg - full) >= 0.5
        p.star_full = range(full)
        p.star_empty = range(5 - full - (1 if half else 0))
        p.star_half = half

    wishlist_ids = set()
    if request.user.is_authenticated:
        wishlist_ids = set(
            Wishlist.objects.filter(user=request.user).values_list("product_id", flat=True)
        )

    filter_categories = Category.objects.filter(
        parent=None, is_active=True, show_in_filter=True
    ).prefetch_related("children").order_by("filter_display_order", "name")

    filter_brands = Brand.objects.filter(is_active=True).order_by("order", "name")

    filter_attributes = ProductAttribute.objects.filter(
        is_active=True
    ).prefetch_related("values").order_by("display_order", "name")

    filter_attributes_with_data = []
    for attr in filter_attributes:
        active_values = attr.values.filter(is_active=True)
        if active_values.exists():
            # Check if any product in current queryset has this attribute
            used_values = ProductAttributeValue.objects.filter(
                attribute=attr,
                is_active=True,
                productattributeassignment__product__in=queryset
            ).distinct()
            if used_values.exists():
                attr.filter_values = used_values
                filter_attributes_with_data.append(attr)

    price_range = Product.objects.filter(
        is_active=True, is_available=True
    ).annotate(
        _eff=Coalesce(F("discount_price"), F("price"), output_field=IntegerField())
    ).aggregate(
        min_price=Min("_eff"),
        max_price=Max("_eff")
    )

    context = {
        "mega_categories": get_mega_categories(),
        "settings": get_site_setting(),
        "categories": filter_categories,
        "brands": filter_brands,
        "filter_attributes": filter_attributes_with_data,
        "price_range": price_range,
        "page_obj": page_obj,
        "products": page_obj.object_list,
        "total_count": paginator.count,
        "sort_options": SORT_OPTIONS,
        "current_sort": sort_key,
        "current_cat": current_cat,
        "current_brands": current_brands,
        "price_min": price_min,
        "price_max": price_max,
        "search_q": search_q,
        "wishlist_ids": wishlist_ids,
        "attr_filters": attr_filters,
    }
    # -------------------------------------------------

    return render(request, "main/mockups/filter/index.html", context)
