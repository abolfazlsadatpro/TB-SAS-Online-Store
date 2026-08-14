function getCookie(name){

    let cookieValue = null;

    if(document.cookie && document.cookie !== ""){

        const cookies = document.cookie.split(";");

        for(let cookie of cookies){

            cookie = cookie.trim();

            if(cookie.startsWith(name + "=")){

                cookieValue = decodeURIComponent(
                    cookie.substring(name.length + 1)
                );

                break;
            }
        }
    }

    return cookieValue;
}

function scrollToReviews() {

    const reviews = document.getElementById("review-section");

    if (reviews) {
        reviews.scrollIntoView({
            behavior: "smooth"
        });
    }

}

function scrollToSection(id, el) {

    const headerOffset = 120;
    const element = document.getElementById(id);

    if (!element) return;

    const elementPosition = element.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

    window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
    });

    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));

    if (el) {
        el.classList.add("active");
    }

}

function toggleSpecs() {

    const more = document.getElementById("moreSpecs");

    if (!more) return;

    if (more.style.display === "block") {
        more.style.display = "none";
    } else {
        more.style.display = "block";
    }

}

function parseGalleryImages() {

    const dataEl = document.getElementById("product-gallery-data");

    if (dataEl) {
        try {
            const parsed = JSON.parse(dataEl.textContent || "[]");
            if (Array.isArray(parsed)) {
                return parsed;
            }
        } catch (e) {
            console.error("Failed to parse gallery data:", e);
        }
    }

    if (Array.isArray(window.PRODUCT_GALLERY_IMAGES)) {
        return window.PRODUCT_GALLERY_IMAGES;
    }

    return [];

}

function syncMiniProductImage(imageSrc) {

    const miniImageEl = document.getElementById("miniProductImage");

    if (miniImageEl && imageSrc) {
        miniImageEl.src = imageSrc;
    }

}

function syncMainImage(imageSrc) {

    const mainImageEl = document.getElementById("mainImage");

    if (mainImageEl && imageSrc) {
        mainImageEl.src = imageSrc;
    }

}

function syncColorName(colorName) {

    const colorNameEl = document.getElementById("colorName");

    if (colorNameEl && colorName) {
        colorNameEl.innerText = colorName;
    }

}

function openGallery(index = 0) {

    if (!galleryImages.length) return;

    currentGalleryIndex = index;

    const galleryModal = document.getElementById("galleryModal");
    if (!galleryModal) return;

    renderGallery();
    galleryModal.classList.add("show");

}

function selectColor(el) {

    if (!el) return;

    document.querySelectorAll(".color-item")
        .forEach(c => c.classList.remove("active"));

    el.classList.add("active");

    const colorName = el.dataset.name || "";
    const imageSrc = el.dataset.image || "";

    syncColorName(colorName);
    syncMainImage(imageSrc);
    syncMiniProductImage(imageSrc);

}

function changeImage(el) {

    if (!el) return;

    const kind = el.dataset.galleryKind || "normal";

    if (kind === "color") {
        selectColorThumb(el);
        return;
    }

    const galleryIndex = Number(
        el.dataset.galleryIndex || 0
    );

    openGallery(galleryIndex);

}

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

function getGalleryImages() {

    const data = document.getElementById(
        "product-gallery-data"
    );

    if (!data) {
        return [];
    }

    try {

        return JSON.parse(
            data.textContent
        );

    } catch (e) {

        console.error(
            "Gallery JSON Error:",
            e
        );

        return [];

    }

}

document.addEventListener("DOMContentLoaded", function () {

    galleryImages = getGalleryImages();

    // Similar slider if exists
    const sliderSimilar = document.getElementById("productSliderSimilar");
    const leftSimilar = document.getElementById("slideLeftSimilar");
    const rightSimilar = document.getElementById("slideRightSimilar");

    if (sliderSimilar && leftSimilar && rightSimilar) {

        rightSimilar.addEventListener("click", () => {
            sliderSimilar.scrollBy({ left: 300, behavior: "smooth" });
        });

        leftSimilar.addEventListener("click", () => {
            sliderSimilar.scrollBy({ left: -300, behavior: "smooth" });
        });

    }

    // Main slider
    const slider = document.getElementById("productSlider");
    const btnLeft = document.getElementById("slideLeft");
    const btnRight = document.getElementById("slideRight");

    if (slider && btnLeft && btnRight) {

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

        slider.addEventListener("scroll", updateButtons);
        updateButtons();

    }

    // Intro toggle
    const introBtn = document.querySelector(".intro-toggle");
    const introContent = document.querySelector(".intro-content");

    if (introBtn && introContent) {

        const icon = introBtn.querySelector("i");

        introBtn.onclick = () => {

            if (introContent.style.display === "block") {

                introContent.style.display = "none";

                if (icon) {
                    icon.classList.remove("fa-chevron-up");
                    icon.classList.add("fa-chevron-down");
                }

            } else {

                introContent.style.display = "block";

                if (icon) {
                    icon.classList.remove("fa-chevron-down");
                    icon.classList.add("fa-chevron-up");
                }

            }

        };

    }

    // Category bar observer
    const categoryBar = document.querySelector(".category-bar");

    if (categoryBar) {

        const observer = new MutationObserver(() => {
            document.body.classList.toggle('cat-hidden', categoryBar.classList.contains('hide'));
        });

        observer.observe(categoryBar, { attributes: true });

    }

    // Comment modal
    const commentModal = document.getElementById("commentModal");
    const openCommentBtn = document.querySelector(".add-comment-btn, #openCommentModal");
    const closeCommentBtn = document.getElementById("closeCommentModal");

    if (commentModal && openCommentBtn) {

        openCommentBtn.addEventListener("click", (e) => {
            e.preventDefault();
            commentModal.classList.add("show");
        });

    }

    if (commentModal && closeCommentBtn) {

        closeCommentBtn.addEventListener("click", (e) => {
            e.preventDefault();
            commentModal.classList.remove("show");
        });

    }

    if (commentModal) {

        commentModal.addEventListener("click", (e) => {
            if (e.target === commentModal || e.target.classList.contains("comment-modal-overlay")) {
                commentModal.classList.remove("show");
            }
        });

    }

    // Rating stars
    const stars = document.querySelectorAll(".star");
    const ratingInput = document.getElementById("ratingValue");

    stars.forEach(star => {

        star.addEventListener("click", function () {

            const rating = Number(this.dataset.value || 0);

            if (ratingInput) {
                ratingInput.value = rating;
            }

            stars.forEach(item => {

                const itemValue = Number(item.dataset.value || 0);

                if (itemValue <= rating) {
                    item.classList.remove("fa-regular");
                    item.classList.add("fa-solid");
                } else {
                    item.classList.remove("fa-solid");
                    item.classList.add("fa-regular");
                }

            });

        });

    });

    // Vote like/dislike
    document.addEventListener("click", function (e) {
        const voteButton = e.target.closest(".like, .dislike");

        if (!voteButton) return;

        const commentId = voteButton.getAttribute("data-id");
        const voteType = voteButton.classList.contains("like") ? "like" : "dislike";

        fetch("/vote_comment/", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "X-CSRFToken": getCookie("csrftoken"),
            },
            body: `comment_id=${encodeURIComponent(commentId)}&vote=${encodeURIComponent(voteType)}`
        })
            .then(res => res.json())
            .then(data => {
                const parent = voteButton.parentElement;
                if (!parent) return;

                const likeBtn = parent.querySelector(".like");
                const dislikeBtn = parent.querySelector(".dislike");

                if (likeBtn) {
                    likeBtn.innerHTML = `<i class="fa-regular fa-thumbs-up"></i> ${data.likes}`;
                }

                if (dislikeBtn) {
                    dislikeBtn.innerHTML = `<i class="fa-regular fa-thumbs-down"></i> ${data.dislikes}`;
                }
            });

    });

    // Show more / less comments
    const comments = document.querySelectorAll(".comment-card");
    const loadMoreBtn = document.getElementById("loadMoreComments");

    if (comments.length && loadMoreBtn) {

        let expanded = false;

        function hideComments() {

            comments.forEach((comment, index) => {
                if (index >= 5) {
                    comment.style.display = "none";
                }
            });

            loadMoreBtn.innerHTML = `
                <i class="fa-solid fa-chevron-down me-2"></i>
                <span>Show More Comments</span>
            `;

            expanded = false;

        }

        function showComments() {

            comments.forEach(comment => {
                comment.style.display = "block";
            });

            loadMoreBtn.innerHTML = `
                <i class="fa-solid fa-chevron-up me-2"></i>
                <span>Show Less Comments</span>
            `;

            expanded = true;

        }

        hideComments();

        loadMoreBtn.addEventListener("click", function () {

            if (expanded) {

                hideComments();

                const reviewSection = document.getElementById("review-section");
                if (reviewSection) {
                    reviewSection.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });
                }

            } else {

                showComments();

            }

        });

    }

});

function normalizeText(text) {
    return (text || "").trim().toLowerCase();
}

function selectColor(el) {

    if (!el) return;

    document
        .querySelectorAll(".color-item")
        .forEach(item => item.classList.remove("active"));

    el.classList.add("active");

    const colorName = (
        el.dataset.name || ""
    ).trim().toLowerCase();

    const imageSrc =
        el.dataset.image || "";

    syncColorName(
        el.dataset.name
    );

    syncMainImage(
        imageSrc
    );

    syncMiniProductImage(
        imageSrc
    );

    // Sync thumbs
    document
        .querySelectorAll(".thumbs img")
        .forEach(img => {

            img.classList.remove(
                "active-thumb"
            );

            const thumbName =
                (
                    img.dataset.colorName
                    || ""
                )
                .trim()
                .toLowerCase();

            if (
                thumbName === colorName
            ) {

                img.classList.add(
                    "active-thumb"
                );

            }

        });

}

function selectColorThumb(el) {

    if (!el) return;

    const colorName =
        (
            el.dataset.colorName
            || ""
        )
        .trim()
        .toLowerCase();

    syncColorName(
        el.dataset.colorName
    );

    syncMainImage(
        el.src
    );

    syncMiniProductImage(
        el.src
    );

    document
        .querySelectorAll(".thumbs img")
        .forEach(img => {

            img.classList.remove(
                "active-thumb"
            );

        });

    el.classList.add(
        "active-thumb"
    );

    document
        .querySelectorAll(".color-item")
        .forEach(item => {

            const itemName =
                (
                    item.dataset.name
                    || ""
                )
                .trim()
                .toLowerCase();

            item.classList.toggle(
                "active",
                itemName === colorName
            );

        });

}

/*==================================================
                GALLERY MODAL
==================================================*/

const galleryModal = document.getElementById("galleryModal");

const galleryMainImage = document.getElementById("galleryMainImage");

const galleryClose = document.querySelector(".gallery-close");

const galleryPrev = document.querySelector(".gallery-prev");

const galleryNext = document.querySelector(".gallery-next");

const galleryOverlay = document.querySelector(".gallery-overlay");

const galleryThumbs = document.getElementById("galleryThumbnails");

const galleryCurrent = document.getElementById("galleryCurrent");

const galleryTotal = document.getElementById("galleryTotal");


let galleryImages = [];

let currentGalleryIndex = 0;


/*=========================================
            OPEN MODAL
=========================================*/

function openGallery(index = 0){

    currentGalleryIndex = index;

    galleryModal.classList.add("show");

    document.body.style.overflow = "hidden";

    renderGallery();

}


/*=========================================
            CLOSE MODAL
=========================================*/

function closeGallery(){

    galleryModal.classList.remove("show");

    document.body.style.overflow = "";

}


/*=========================================
            CHANGE IMAGE
=========================================*/

function renderGallery(){

    if(!galleryImages.length) return;

    galleryMainImage.classList.add("fade-out");

    setTimeout(()=>{

        galleryMainImage.src = galleryImages[currentGalleryIndex].url;

        galleryMainImage.alt = galleryImages[currentGalleryIndex].name || "";

        galleryCurrent.textContent = currentGalleryIndex + 1;

        galleryTotal.textContent = galleryImages.length;

        galleryMainImage.classList.remove("fade-out");

        galleryMainImage.classList.add("fade-in");

        setTimeout(()=>{

            galleryMainImage.classList.remove("fade-in");

        },250);

        updateThumbs();

    },170);

}


/*=========================================
            THUMBNAILS
=========================================*/

function updateThumbs(){

    galleryThumbs.innerHTML = "";

    galleryImages.forEach((item,index)=>{

        const img = document.createElement("img");

        img.src = item.url;

        img.alt = item.name || "";

        if(index===currentGalleryIndex){

            img.classList.add("active");

        }

        img.onclick = ()=>{

            currentGalleryIndex = index;

            renderGallery();

        };

        galleryThumbs.appendChild(img);

    });

}


/*=========================================
            NEXT
=========================================*/

function nextGallery(){

    currentGalleryIndex++;

    if(currentGalleryIndex>=galleryImages.length){

        currentGalleryIndex=0;

    }

    renderGallery();

}


/*=========================================
            PREV
=========================================*/

function prevGallery(){

    currentGalleryIndex--;

    if(currentGalleryIndex<0){

        currentGalleryIndex=galleryImages.length-1;

    }

    renderGallery();

}

/*==================================================
            BUILD GALLERY
==================================================*/

const thumbs = document.querySelectorAll(".thumbs img");

galleryImages = [];

thumbs.forEach((thumb)=>{

    galleryImages.push({

        url:thumb.dataset.full || thumb.src,

        name:thumb.alt || ""

    });

});


/*==================================================
            OPEN FROM THUMB
==================================================*/

thumbs.forEach((thumb,index)=>{

    thumb.addEventListener("click",()=>{

        const kind = thumb.dataset.galleryKind || "normal";

        // فقط تصاویر معمولی مودال را باز کنند
        if(kind !== "color"){

            openGallery(index);

        }

    });

});


/*==================================================
            MAIN IMAGE CLICK
==================================================*/

const mainImage = document.querySelector(".main-image");

if(mainImage){

    mainImage.addEventListener("click",()=>{

        let index=0;

        const currentSrc=mainImage.src;

        galleryImages.forEach((img,i)=>{

            if(currentSrc.includes(img.url)){

                index=i;

            }

        });

        openGallery(index);

    });

}


/*==================================================
            BUTTONS
==================================================*/

galleryNext.addEventListener("click",nextGallery);

galleryPrev.addEventListener("click",prevGallery);

galleryClose.addEventListener("click",closeGallery);

galleryOverlay.addEventListener("click",closeGallery);


/*==================================================
            KEYBOARD
==================================================*/

document.addEventListener("keydown",(e)=>{

    if(!galleryModal.classList.contains("show")) return;

    switch(e.key){

        case "Escape":

            closeGallery();

            break;

        case "ArrowRight":

            nextGallery();

            break;

        case "ArrowLeft":

            prevGallery();

            break;

    }

});


/*==================================================
            MOUSE WHEEL
==================================================*/

galleryModal.addEventListener("wheel",(e)=>{

    if(!galleryModal.classList.contains("show")) return;

    e.preventDefault();

    if(e.deltaY>0){

        nextGallery();

    }else{

        prevGallery();

    }

},{passive:false});


/*==================================================
            PREVENT IMAGE DRAG
==================================================*/

galleryMainImage.addEventListener("dragstart",(e)=>{

    e.preventDefault();

});

function shareProduct() {

    const shareData = {
        title: document.title,
        text: "این محصول رو ببین 👇",
        url: window.location.href
    };

    if (navigator.share) {

        navigator.share(shareData);

    } else {

        navigator.clipboard.writeText(window.location.href);

        alert("لینک محصول کپی شد.");

    }

}

const wishlistBtn =
    document.querySelector(".wishlist-btn");


if(wishlistBtn){

    wishlistBtn.addEventListener(
        "click",
        function(){

            const productId =
                this.dataset.id;


            const icon =
                this.querySelector("i");


            fetch(
                `/wishlist/add/${productId}/`,
                {
                    method:"POST",

                    headers:{
                        "X-CSRFToken":
                            getCookie("csrftoken"),
                    }
                }
            )

            .then(response => response.json())

            .then(data => {


                if(data.success){


                    const count =
                        document.getElementById(
                            "wishlistCount"
                        );


                    if(count){

                        count.innerText =
                            data.total;

                    }



                    if(data.action === "added"){


                        icon.classList.remove(
                            "fa-regular"
                        );


                        icon.classList.add(
                            "fa-solid"
                        );


                        showWishlistToast();


                    }else{


                        icon.classList.remove(
                            "fa-solid"
                        );


                        icon.classList.add(
                            "fa-regular"
                        );


                    }


                }


            });


        }
    );

}

function showWishlistToast(){

    console.log("TOAST CALLED");

    const toast =
        document.getElementById(
            "wishlistToast"
        );

    console.log(toast);

    if(!toast) return;

    toast.classList.add("show");

    setTimeout(()=>{

        toast.classList.remove("show");

    },3000);

}