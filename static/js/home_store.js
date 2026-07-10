// ==================
// HOME STORE JS
// ==================
document.addEventListener("DOMContentLoaded", function () {

    // ==================
    // SPECIAL OFFERS SLIDER
    // ==================
    const specialSlider = document.getElementById("specialSlider");
    const btnLeftSpecial = document.getElementById("slideLeftSpecial");
    const btnRightSpecial = document.getElementById("slideRightSpecial");

    if (specialSlider && btnLeftSpecial && btnRightSpecial) {

        function updateSpecialButtons() {
            btnLeftSpecial.style.display = specialSlider.scrollLeft <= 0 ? "none" : "block";
            btnRightSpecial.style.display =
                specialSlider.scrollLeft + specialSlider.clientWidth >= specialSlider.scrollWidth - 5
                    ? "none"
                    : "block";
        }

        btnRightSpecial.onclick = () => specialSlider.scrollBy({left: 300, behavior: "smooth"});
        btnLeftSpecial.onclick = () => specialSlider.scrollBy({left: -300, behavior: "smooth"});

        specialSlider.addEventListener("scroll", updateSpecialButtons);
        updateSpecialButtons();
    }


    // ==================
    // TOOLS SLIDER
    // ==================
    const slider = document.getElementById("productSlider");
    const btnLeft = document.getElementById("slideLeft");
    const btnRight = document.getElementById("slideRight");

    if (slider && btnLeft && btnRight) {

        function updateToolsButtons() {
            btnLeft.style.display = slider.scrollLeft <= 0 ? "none" : "block";
            btnRight.style.display =
                slider.scrollLeft + slider.clientWidth >= slider.scrollWidth - 5
                    ? "none"
                    : "block";
        }

        btnRight.onclick = () => slider.scrollBy({left: 300, behavior: "smooth"});
        btnLeft.onclick = () => slider.scrollBy({left: -300, behavior: "smooth"});

        slider.addEventListener("scroll", updateToolsButtons);
        updateToolsButtons();
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

    function updateBrandButtons() {
        btnL.style.display = brandSlider.scrollLeft <= 0 ? "none" : "block";
        btnR.style.display =
            brandSlider.scrollLeft + brandSlider.clientWidth >= brandSlider.scrollWidth - 10
                ? "none"
                : "block";
    }

    btnL.addEventListener("click", () => {
        brandSlider.scrollBy({left: -300, behavior: "smooth"});
    });

    btnR.addEventListener("click", () => {
        brandSlider.scrollBy({left: 300, behavior: "smooth"});
    });

    brandSlider.addEventListener("scroll", updateBrandButtons);
    window.addEventListener("resize", updateBrandButtons);

    updateBrandButtons();
});

document.addEventListener("DOMContentLoaded", function () {

    const accessorySlider = document.getElementById("accessorySlider");
    const accessoryLeft = document.getElementById("accessoryLeft");
    const accessoryRight = document.getElementById("accessoryRight");

    if (!accessorySlider || !accessoryLeft || !accessoryRight) return;

    function updateAccessoryButtons() {
        accessoryLeft.style.display = accessorySlider.scrollLeft <= 0 ? "none" : "block";
        accessoryRight.style.display =
            accessorySlider.scrollLeft + accessorySlider.clientWidth >= accessorySlider.scrollWidth - 5
                ? "none"
                : "block";
    }

    accessoryRight.onclick = () => accessorySlider.scrollBy({left: 300, behavior: "smooth"});
    accessoryLeft.onclick = () => accessorySlider.scrollBy({left: -300, behavior: "smooth"});

    accessorySlider.addEventListener("scroll", updateAccessoryButtons);
    updateAccessoryButtons();
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
