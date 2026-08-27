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

    // Quantity steppers + add-to-cart feedback + comments slider
    initQuantitySteppers();
    initQtyRowToggle();
    initCommentsSlider();
    document.addEventListener("click", function (e) {
        const btn = e.target.closest(".mini-cart-btn");
        if (!btn) return;
        // If qty row is closed, let initQtyRowToggle handle it
        const buyBox = btn.closest(".buy-box, .mini-product-card");
        const qtyRow = buyBox ? buyBox.querySelector(".qty-row") : null;
        const isOpen = qtyRow && qtyRow.style.display === 'flex';
        if (qtyRow && !isOpen) {
            return; // initQtyRowToggle handles this case
        }
        // Only add to cart if qty row is already open (second click)
        if (isOpen) {
            e.preventDefault();
            addToCartFeedback(btn);
        }
    });

});

/*==================================================
        QTY STEPPER
==================================================*/
function initQuantitySteppers() {
    // This function is kept for backwards compatibility
    // The actual qty stepper logic is now in initQtyRowToggle
    // This function only renders the initial state
    document.querySelectorAll(".qty-stepper").forEach(function (stepper) {
        const minus = stepper.querySelector(".qty-minus");
        const plus = stepper.querySelector(".qty-plus");
        const valueEl = stepper.querySelector(".qty-value");
        if (!minus || !plus || !valueEl) return;

        const min = Number(valueEl.dataset.min || 1);

        function render() {
            var cur = Number(valueEl.textContent) || min;
            if (cur <= min) { cur = min; minus.disabled = true; }
            else { minus.disabled = false; }
            if (cur >= 99) { cur = 99; plus.disabled = true; }
            else { plus.disabled = false; }
            valueEl.textContent = cur;
        }

        render();
    });
}

/*==================================================
        QTY ROW TOGGLE LOGIC
==================================================*/
function initQtyRowToggle() {
    document.querySelectorAll(".mini-cart-btn[data-cart]").forEach(function (btn) {
        var buyBox = btn.closest(".buy-box, .mini-product-card");
        if (!buyBox) return;

        var qtyRow = buyBox.querySelector(".qty-row");
        var stepper = qtyRow ? qtyRow.querySelector(".qty-stepper") : null;
        var minusBtn = stepper ? stepper.querySelector(".qty-minus") : null;
        var plusBtn = stepper ? stepper.querySelector(".qty-plus") : null;
        var valueEl = stepper ? stepper.querySelector(".qty-value") : null;
        var min = valueEl ? Number(valueEl.dataset.min || 1) : 1;

        if (!qtyRow || !stepper || !minusBtn || !plusBtn || !valueEl) return;

        // Function to update minus button state (trash vs minus)
        function updateMinusButton() {
            var cur = Number(valueEl.textContent) || min;
            if (cur <= min) {
                minusBtn.classList.add("trash");
                minusBtn.disabled = false; // trash button should be clickable to close
                minusBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>';
                minusBtn.setAttribute("aria-label", "Remove from cart");
            } else {
                minusBtn.classList.remove("trash");
                minusBtn.innerHTML = '&#8722;';
                minusBtn.setAttribute("aria-label", "Decrease quantity");
            }
        }

        // Function to open qty row
        function openQtyRow() {
            qtyRow.style.display = 'flex';
            qtyRow.style.opacity = '1';
            qtyRow.style.maxHeight = '60px';
            qtyRow.style.overflow = 'hidden';
            qtyRow.style.pointerEvents = 'auto';
            btn.style.display = 'none'; // Hide Add to Cart button
            valueEl.textContent = min;
            updateMinusButton();
        }

        // Function to close qty row
        function closeQtyRow() {
            qtyRow.style.display = 'none';
            btn.style.display = 'inline-flex'; // Show Add to Cart button again
            valueEl.textContent = min;
            updateMinusButton();
        }

        // Click on Add to Cart button - handles opening row
        btn.addEventListener("click", function (e) {
            var isOpen = qtyRow.style.display === 'flex';
            if (!isOpen) {
                e.preventDefault();
                openQtyRow();
            }
        });

        // Minus button click - handle both trash and decrement
        minusBtn.addEventListener("click", function (e) {
            e.stopPropagation();
            var cur = Number(valueEl.textContent) || min;

            if (cur <= min) {
                // Currently at 1, trash icon clicked -> close the row
                closeQtyRow();
            } else {
                // Decrement normally
                valueEl.textContent = cur - 1;
                updateMinusButton();
            }
        });

        // Plus button click
        plusBtn.addEventListener("click", function (e) {
            e.stopPropagation();
            var cur = Number(valueEl.textContent) || min;
            valueEl.textContent = Math.min(99, cur + 1);
            updateMinusButton();
        });

        // Initialize
        updateMinusButton();
    });
}

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

/*==================================================
        COMMENTS SLIDER
==================================================*/
function initCommentsSlider() {
    var track = document.getElementById("reviewsTrack");
    var prevBtn = document.getElementById("reviewsPrev");
    var nextBtn = document.getElementById("reviewsNext");
    if (!track || !prevBtn || !nextBtn) return;

    function step() {
        var card = track.querySelector(".comment-card");
        if (!card) return 340;
        var gap = parseFloat(getComputedStyle(track).gap) || 18;
        return card.getBoundingClientRect().width + gap;
    }

    function updateButtons() {
        var maxScroll = track.scrollWidth - track.clientWidth;
        var atStart = track.scrollLeft <= 2;
        var atEnd = track.scrollLeft >= maxScroll - 2;
        prevBtn.disabled = atStart || maxScroll <= 0;
        nextBtn.disabled = atEnd || maxScroll <= 0;
    }

    function move(dir) {
        var maxScroll = track.scrollWidth - track.clientWidth;
        var target = Math.max(0, Math.min(track.scrollLeft + dir * step(), maxScroll));
        track.scrollTo({ left: target, behavior: "smooth" });
        setTimeout(updateButtons, 400);
    }

    prevBtn.addEventListener("click", function () { move(-1); });
    nextBtn.addEventListener("click", function () { move(1); });

    track.addEventListener("scrollend", updateButtons, { passive: true });
    track.addEventListener("scroll", updateButtons);
    window.addEventListener("resize", updateButtons);
    window.addEventListener("load", updateButtons);
    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(updateButtons);
    }
    setTimeout(updateButtons, 300);
    updateButtons();
}

/*==================================================
        ADD TO CART FEEDBACK
==================================================*/
function getQtyForButton(btn) {
    var row = btn.closest(".qty-row");
    var valueEl = row ? row.querySelector(".qty-value") : null;
    if (valueEl) {
        return Math.max(1, Number(valueEl.textContent) || 1);
    }
    return 1;
}

function showCartToast(message) {
    var toast = document.querySelector(".cart-toast");
    if (!toast) {
        toast = document.createElement("div");
        toast.className = "cart-toast";
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.remove("show");
    void toast.offsetWidth;
    toast.classList.add("show");
    clearTimeout(showCartToast._t);
    showCartToast._t = setTimeout(function () {
        toast.classList.remove("show");
    }, 2200);
}

function addToCartFeedback(btn) {
    var qty = getQtyForButton(btn);
    var color = getActiveColor();
    var name = color.name || "No Color";

    btn.classList.remove("has-feedback", "is-success");
    void btn.offsetWidth;
    btn.classList.add("has-feedback");

    var icon = btn.querySelector("i");
    if (icon) {
        icon.classList.remove("bounce");
        void icon.offsetWidth;
        icon.classList.add("bounce");
    }

    showCartToast("Added to cart · " + qty + " × " + name);

    clearTimeout(addToCartFeedback._t);
    addToCartFeedback._t = setTimeout(function () {
        btn.classList.remove("has-feedback");
        btn.classList.add("is-success");
        setTimeout(function () {
            btn.classList.remove("is-success");
        }, 800);
    }, 250);
}

/*==================================================
        ACTIVE COLOR READER
==================================================*/
function getActiveColor() {
    var item = document.querySelector(".color-item.active");
    if (item) {
        return {
            name: item.dataset.name || "",
            image: item.dataset.image || ""
        };
    }
    var nameEl = document.getElementById("colorName");
    return {
        name: nameEl ? (nameEl.textContent || "").trim() : "No Color",
        image: ""
    };
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