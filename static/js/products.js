function toggleFilter(el) {
    el.parentElement.classList.toggle("open");
}

document.addEventListener("DOMContentLoaded", function () {

    const priceRange = document.getElementById("priceRange");
    const priceValue = document.getElementById("priceValue");

    if (priceRange) {
        priceValue.innerText = "$" + priceRange.value;

        priceRange.addEventListener("input", function () {
            priceValue.innerText = "$" + this.value;
        });
    }

});
