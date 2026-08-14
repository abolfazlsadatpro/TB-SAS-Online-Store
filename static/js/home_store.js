// ==================
// HOME STORE JS
// ==================
document.addEventListener("DOMContentLoaded", function () {

    // ==================
    // SPECIAL OFFERS SLIDER — smart buttons
    // ==================
    const specialTrack = document.getElementById("specialTrack");
    const specialPrev = document.getElementById("specialPrev");
    const specialNext = document.getElementById("specialNext");

    if (specialTrack && specialPrev && specialNext) {

        function updateSpecialButtons() {
            const maxScroll = specialTrack.scrollWidth - specialTrack.clientWidth;
            specialPrev.classList.toggle("hidden", specialTrack.scrollLeft <= 5);
            specialNext.classList.toggle("hidden", specialTrack.scrollLeft >= maxScroll - 5);
        }

        specialPrev.addEventListener("click", () => {
            specialTrack.scrollBy({left: -220, behavior: "smooth"});
        });

        specialNext.addEventListener("click", () => {
            specialTrack.scrollBy({left: 220, behavior: "smooth"});
        });

        specialTrack.addEventListener("scroll", updateSpecialButtons);
        window.addEventListener("resize", updateSpecialButtons);
        updateSpecialButtons();
    }


    // ==================
    // LATEST PRODUCTS SLIDER — smart scroll (touch-friendly)
    // ==================
    const latestSlider = document.getElementById("productSlider");
    const latestPrev = document.getElementById("latestPrev");
    const latestNext = document.getElementById("latestNext");

    if (latestSlider && latestPrev && latestNext) {

        function latestStep() {
            const card = latestSlider.querySelector(".product-card");
            if (!card) return 220;
            const style = getComputedStyle(latestSlider);
            const gap = parseFloat(style.gap) || parseFloat(getComputedStyle(card).marginRight) || 0;
            return card.getBoundingClientRect().width + gap;
        }

        function updateLatestButtons() {
            const maxScroll = latestSlider.scrollWidth - latestSlider.clientWidth;
            const atStart = latestSlider.scrollLeft <= 2;
            const atEnd = latestSlider.scrollLeft >= maxScroll - 2;
            latestPrev.classList.toggle("disabled", atStart || maxScroll <= 0);
            latestNext.classList.toggle("disabled", atEnd || maxScroll <= 0);
        }

        function smoothScrollTo(el, target) {
            el.scrollTo({left: target, behavior: "smooth"});
        }

        function latestMove(dir) {
            const maxScroll = latestSlider.scrollWidth - latestSlider.clientWidth;
            const target = Math.max(0, Math.min(latestSlider.scrollLeft + dir * latestStep(), maxScroll));
            smoothScrollTo(latestSlider, target);
            setTimeout(updateLatestButtons, 400);
        }

        latestPrev.addEventListener("click", () => latestMove(-1));
        latestNext.addEventListener("click", () => latestMove(1));

        latestSlider.addEventListener("scrollend", updateLatestButtons, {passive: true});

        latestSlider.addEventListener("scroll", updateLatestButtons);
        window.addEventListener("resize", updateLatestButtons);
        window.addEventListener("load", updateLatestButtons);
        document.fonts?.ready?.then(updateLatestButtons);
        setTimeout(updateLatestButtons, 300);
        updateLatestButtons();
        setInterval(updateLatestButtons, 600);
    }


    // ==================
    // TIMER
    // ==================
    document.querySelectorAll(".timer").forEach(timer => {
        let seconds = parseInt(timer.dataset.time);

        function update() {
            let h = Math.floor(seconds / 3600);
            let m = Math.floor((seconds % 3600) / 60);
            let s = seconds % 60;
            let format = `⏰ ${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
            timer.innerHTML = format;
            if (seconds > 0) seconds--;
        }

        setInterval(update, 1000);
        update();
    });


    // ==================
    // CATEGORY ACTIVE
    // ==================
    document.querySelectorAll(".category-item").forEach(item => {
        item.addEventListener("click", function () {
            document.querySelectorAll(".category-item").forEach(i => i.classList.remove("active"));
            this.classList.add("active");
        });
    });


    // ==================
    // MOBILE CATEGORY SCROLL (SAFE)
    // ==================
    const container = document.querySelector(".mobile-smart");
    const leftCat = document.querySelector(".cat-nav.left");
    const rightCat = document.querySelector(".cat-nav.right");

    if (container && leftCat && rightCat) {
        leftCat.onclick = () => container.scrollBy({left: -200, behavior: "smooth"});
        rightCat.onclick = () => container.scrollBy({left: 200, behavior: "smooth"});
    }

    console.log("Home Store JS Loaded");
});
document.addEventListener("DOMContentLoaded", function () {

    const brandSlider = document.getElementById("brandSlider");
    const btnL = document.getElementById("brandLeft");
    const btnR = document.getElementById("brandRight");

    if (!brandSlider || !btnL || !btnR) return;

    function brandStep() {
        const card = brandSlider.querySelector("a");
        if (!card) return 220;
        const style = getComputedStyle(brandSlider);
        const gap = parseFloat(style.gap) || parseFloat(getComputedStyle(card).marginRight) || 0;
        return card.getBoundingClientRect().width + gap;
    }

    function updateBrandButtons() {
        const maxScroll = brandSlider.scrollWidth - brandSlider.clientWidth;
        const atStart = brandSlider.scrollLeft <= 2;
        const atEnd = brandSlider.scrollLeft >= maxScroll - 2;
        btnL.classList.toggle("disabled", atStart || maxScroll <= 0);
        btnR.classList.toggle("disabled", atEnd || maxScroll <= 0);
    }

    function smoothScrollToBrand(el, target) {
        el.scrollTo({left: target, behavior: "smooth"});
    }

    function brandMove(dir) {
        const maxScroll = brandSlider.scrollWidth - brandSlider.clientWidth;
        const target = Math.max(0, Math.min(brandSlider.scrollLeft + dir * brandStep(), maxScroll));
        smoothScrollToBrand(brandSlider, target);
        setTimeout(updateBrandButtons, 400);
    }

    btnL.addEventListener("click", () => brandMove(-1));
    btnR.addEventListener("click", () => brandMove(1));

    brandSlider.addEventListener("scroll", updateBrandButtons);
    brandSlider.addEventListener("scrollend", updateBrandButtons, {passive: true});
    window.addEventListener("resize", updateBrandButtons);
    window.addEventListener("load", updateBrandButtons);
    document.fonts?.ready?.then(updateBrandButtons);
    setTimeout(updateBrandButtons, 300);
    updateBrandButtons();
    setInterval(updateBrandButtons, 600);
});

document.addEventListener("DOMContentLoaded", function () {

    const accessorySlider = document.getElementById("accessorySlider");
    const accessoryLeft = document.getElementById("accessoryLeft");
    const accessoryRight = document.getElementById("accessoryRight");

    if (!accessorySlider || !accessoryLeft || !accessoryRight) return;

    function accessoryStep() {
        const card = accessorySlider.querySelector(".accessory-card");
        if (!card) return 220;
        const style = getComputedStyle(accessorySlider);
        const gap = parseFloat(style.gap) || parseFloat(getComputedStyle(card).marginRight) || 0;
        return card.getBoundingClientRect().width + gap;
    }

    function updateAccessoryButtons() {
        const maxScroll = accessorySlider.scrollWidth - accessorySlider.clientWidth;
        const atStart = accessorySlider.scrollLeft <= 2;
        const atEnd = accessorySlider.scrollLeft >= maxScroll - 2;
        accessoryLeft.classList.toggle("disabled", atStart || maxScroll <= 0);
        accessoryRight.classList.toggle("disabled", atEnd || maxScroll <= 0);
    }

    function smoothScrollToAcc(el, target) {
        el.scrollTo({left: target, behavior: "smooth"});
    }

    function accessoryMove(dir) {
        const maxScroll = accessorySlider.scrollWidth - accessorySlider.clientWidth;
        const target = Math.max(0, Math.min(accessorySlider.scrollLeft + dir * accessoryStep(), maxScroll));
        smoothScrollToAcc(accessorySlider, target);
        setTimeout(updateAccessoryButtons, 400);
    }

    accessoryLeft.onclick = () => accessoryMove(-1);
    accessoryRight.onclick = () => accessoryMove(1);

    accessorySlider.addEventListener("scroll", updateAccessoryButtons);
    accessorySlider.addEventListener("scrollend", updateAccessoryButtons, {passive: true});
    window.addEventListener("resize", updateAccessoryButtons);
    window.addEventListener("load", updateAccessoryButtons);
    document.fonts?.ready?.then(updateAccessoryButtons);
    setTimeout(updateAccessoryButtons, 300);
    updateAccessoryButtons();
    setInterval(updateAccessoryButtons, 600);
});


const categorySlider = document.getElementById("categorySlider");
const slideLeftMobile = document.getElementById("slideLeftMobile");
const slideRightMobile = document.getElementById("slideRightMobile");

if (categorySlider) {

    slideRightMobile.onclick = () => {
        categorySlider.scrollLeft += 200;
    };

    slideLeftMobile.onclick = () => {
        categorySlider.scrollLeft -= 200;
    };

}
