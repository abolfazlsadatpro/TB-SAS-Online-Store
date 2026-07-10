from django.contrib import messages
from django.contrib.auth.decorators import login_required
from store.models import Product, VoteProduct, CommentVote
from store.forms import VoteSubmitForm
from django.shortcuts import render, redirect, get_object_or_404
from django.http import JsonResponse
from django.db.models import Avg, Count, Q
from .models import ContactMessage
from .forms import ContactMessageForm


def home_page(request):
    return render(request, 'main/home_store.html')


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
    product = get_object_or_404(Product, id=product_id)

    comments = VoteProduct.objects.filter(
        product=product,
        status=True
    ).annotate(
        likes=Count('votes', filter=Q(votes__vote=1)),
        dislikes=Count('votes', filter=Q(votes__vote=-1)),
    ).order_by('-created_at')

    average_rating = comments.aggregate(Avg('rating'))['rating__avg'] or 0
    full_stars = int(average_rating)
    half_star = (average_rating - full_stars) >= 0.5
    empty_stars = 5 - full_stars - (1 if half_star else 0)

    comments_count = comments.count()

    # وضعیت لایک/دیسلایک کاربر
    user_votes = {}
    if request.user.is_authenticated:
        votes = CommentVote.objects.filter(user=request.user)
        user_votes = {v.comment_id: v.vote for v in votes}

    context = {
        'product': product,
        'comments': comments,
        'average_rating': average_rating,
        'comments_count': comments_count,
        'full_stars': range(full_stars),
        'empty_stars': range(empty_stars),
        'user_votes': user_votes,
    }

    return render(request, 'main/product_detail.html', context)


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
            messages.success(request, 'Comment submitted successfully')

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
