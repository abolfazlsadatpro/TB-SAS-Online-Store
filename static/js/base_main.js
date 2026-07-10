let lastScroll = 0;
const categoryBar = document.querySelector(".category-bar");

window.addEventListener("scroll", () => {

    const currentScroll = window.pageYOffset;

    if (currentScroll > lastScroll) {
        // اسکرول به پایین
        categoryBar.classList.add("hide");
    } else {
        // اسکرول به بالا
        categoryBar.classList.remove("hide");
    }

    lastScroll = currentScroll <= 0 ? 0 : currentScroll;

});
