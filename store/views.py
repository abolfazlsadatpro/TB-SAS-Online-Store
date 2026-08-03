from django.contrib import messages
from store.models import VoteProduct, CommentVote, Product, Wishlist
from store.forms import VoteSubmitForm
from django.shortcuts import render
from django.db.models import Avg, Count, Q
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

    }

    return render(
        request,
        "main/home_store.html",
        context
    )


def about_page(request):
    return render(request, 'main/about_us.html')


def contact_page(request):
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
    return render(request, 'main/products.html')


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
        Product,
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
    print(request.user)
    print(id)
    product = get_object_or_404(
        Product,
        id=id
    )
    print(product)

    wishlist = Wishlist.objects.filter(
        user=request.user,
        product=product
    )

    if wishlist.exists():
        wishlist.delete()

        return JsonResponse({
            "success": True,
            "action": "removed",
            "total": request.user.total_wishlist
        })

    Wishlist.objects.create(
        user=request.user,
        product=product
    )

    return JsonResponse({
        "success": True,
        "action": "added",
        "total": request.user.total_wishlist
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
        .order_by("-created_at")
    )

    context = {
        "wishlists": wishlists,
    }

    return render(
        request,
        "main/wishlist.html",
        context
    )
