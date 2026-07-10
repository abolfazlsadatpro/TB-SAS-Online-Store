function scrollToReviews() {

    const reviews = document.getElementById("review-section");

    if (reviews) {
        reviews.scrollIntoView({
            behavior: "smooth"
        });
    }

}

document.addEventListener("DOMContentLoaded", function () {

    const sliderSimilar = document.getElementById("productSliderSimilar");
    const leftSimilar = document.getElementById("slideLeftSimilar");
    const rightSimilar = document.getElementById("slideRightSimilar");

    if (sliderSimilar && leftSimilar && rightSimilar) {

        rightSimilar.addEventListener("click", () => {
            sliderSimilar.scrollBy({left: 300, behavior: "smooth"});
        });

        leftSimilar.addEventListener("click", () => {
            sliderSimilar.scrollBy({left: -300, behavior: "smooth"});
        });

    }

});
document.addEventListener("DOMContentLoaded", function () {

    const slider = document.getElementById("productSlider");
    const btnLeft = document.getElementById("slideLeft");
    const btnRight = document.getElementById("slideRight");

    if (!slider || !btnLeft || !btnRight) return;

    function getScrollAmount() {
        const card = slider.querySelector(".product-card");
        if (!card) return 300;

        const style = window.getComputedStyle(card);
        const marginRight = parseInt(style.marginRight) || 0;

        return card.offsetWidth + marginRight;
    }

    function updateButtons() {

        if (slider.scrollLeft <= 5) {
            btnLeft.style.opacity = "0";
            btnLeft.style.pointerEvents = "none";
        } else {
            btnLeft.style.opacity = "1";
            btnLeft.style.pointerEvents = "auto";
        }

        if (slider.scrollLeft + slider.clientWidth >= slider.scrollWidth - 5) {
            btnRight.style.opacity = "0";
            btnRight.style.pointerEvents = "none";
        } else {
            btnRight.style.opacity = "1";
            btnRight.style.pointerEvents = "auto";
        }

    }


    btnRight.addEventListener("click", () => {
        slider.scrollBy({
            left: getScrollAmount(),
            behavior: "smooth"
        });
    });

    btnLeft.addEventListener("click", () => {
        slider.scrollBy({
            left: -getScrollAmount(),
            behavior: "smooth"
        });
    });

    // وقتی اسکرول شد → وضعیت دکمه‌ها چک شود
    slider.addEventListener("scroll", updateButtons);

    // بار اول صفحه
    updateButtons();

});


// TABS
document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", function () {

        document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
        document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));

        this.classList.add("active");
        document.getElementById(this.dataset.tab).classList.add("active");

    });
});


// SHOW MORE SPECS
function toggleSpecs() {
    const more = document.getElementById("moreSpecs");

    if (more.style.display === "block") {
        more.style.display = "none";
    } else {
        more.style.display = "block";
    }
}

const btn = document.querySelector('.intro-toggle');
const content = document.querySelector('.intro-content');
const icon = btn.querySelector('i');

btn.onclick = () => {

    if (content.style.display === "block") {
        content.style.display = "none";
        icon.classList.remove("fa-chevron-up");
        icon.classList.add("fa-chevron-down");
    } else {
        content.style.display = "block";
        icon.classList.remove("fa-chevron-down");
        icon.classList.add("fa-chevron-up");
    }

}

function scrollToSection(id, el) {

    const headerOffset = 120;

    const element = document.getElementById(id);
    const elementPosition = element.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

    window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
    });

    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    el.classList.add("active");
}


const category = document.querySelector(".category-bar");

function hideCategory() {
    category.classList.add("hide");
    document.body.classList.add("cat-hidden");
}

function showCategory() {
    category.classList.remove("hide");
    document.body.classList.remove("cat-hidden");
}

const cat = document.querySelector('.category-bar');

const observer = new MutationObserver(() => {
    document.body.classList.toggle('cat-hidden', cat.classList.contains('hide'));
});

observer.observe(cat, {attributes: true});

const modal = document.getElementById("commentModal");

const openBtn = document.querySelector(".add-comment-btn");

const closeBtn = document.getElementById("closeCommentModal");

if (openBtn) {

    openBtn.addEventListener("click", () => {

        modal.classList.add("show");

    });

}

closeBtn.addEventListener("click", () => {

    modal.classList.remove("show");

});

modal.addEventListener("click", (e) => {

    if (e.target === modal) {
        modal.classList.remove("show");
    }

});

const stars = document.querySelectorAll(".star");
const ratingInput = document.getElementById("ratingValue");

stars.forEach(star => {

    star.addEventListener("click", function () {

        const rating = this.dataset.value;

        ratingInput.value = rating;

        stars.forEach(item => {

            if (item.dataset.value <= rating) {

                item.classList.remove("fa-regular");
                item.classList.add("fa-solid");

            } else {

                item.classList.remove("fa-solid");
                item.classList.add("fa-regular");

            }

        });

    });

});

function selectColor(el) {

    document.querySelectorAll(".color-item")
        .forEach(c => c.classList.remove("active"));

    el.classList.add("active");

    document.getElementById("colorName").innerText =
        el.dataset.name;

    document.getElementById("mainImage").src =
        el.dataset.image;
}

function changeImage(el) {

    document.getElementById("mainImage").src = el.src;

    const colorName = el.dataset.color;

    document.querySelectorAll(".color-item")
        .forEach(item => {

            item.classList.remove("active");

            if (item.dataset.name === colorName) {
                item.classList.add("active");

                document.getElementById("colorName").innerText =
                    colorName;
            }

        });

}

document.addEventListener("click", function (e) {
    if (e.target.closest(".like") || e.target.closest(".dislike")) {

        let btn = e.target.closest("button");
        let commentId = btn.getAttribute("data-id");
        let voteType = btn.classList.contains("like") ? "like" : "dislike";

        fetch("/vote_comment/", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "X-CSRFToken": getCookie("csrftoken"),
            },
            body: `comment_id=${commentId}&vote=${voteType}`
        })
            .then(res => res.json())
            .then(data => {
                // آپدیت عددها
                let parent = btn.parentElement;

                parent.querySelector(".like").innerHTML =
                    `<i class="fa-regular fa-thumbs-up"></i> ${data.likes}`;

                parent.querySelector(".dislike").innerHTML =
                    `<i class="fa-regular fa-thumbs-down"></i> ${data.dislikes}`;
            });
    }
});

function getCookie(name) {
    let cookieValue = null;

    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');

        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();

            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }

    return cookieValue;
}

document.addEventListener("DOMContentLoaded", function () {

    const comments = document.querySelectorAll(".comment-card");
    const btn = document.getElementById("loadMoreComments");

    if (!comments.length || !btn) return;

    let expanded = false;

    function hideComments() {

        comments.forEach((comment, index) => {

            if (index >= 5) {
                comment.style.display = "none";
            }

        });

        btn.innerHTML = `
    <i class="fa-solid fa-chevron-down me-2"></i>
    <span>Show More Comments</span>
`;
        expanded = false;

    }

    function showComments() {

        comments.forEach(comment => {
            comment.style.display = "block";
        });

        btn.innerHTML = `
    <i class="fa-solid fa-chevron-up me-2"></i>
    <span>Show Less Comments</span>
`;
        expanded = true;

    }

    hideComments();

    btn.addEventListener("click", function () {

        if (expanded) {

            hideComments();

            document.getElementById("review-section").scrollIntoView({
                behavior: "smooth",
                block: "start"
            });

        } else {

            showComments();

        }

    });

});