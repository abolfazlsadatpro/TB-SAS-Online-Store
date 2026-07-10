const preview = document.getElementById("previewImage");

const modal = document.getElementById("imagePreviewModal");

const modalImage = document.getElementById("previewModalImage");

const closePreview = document.querySelector(".close-preview");

if (preview) {

    preview.addEventListener("click", function () {

        modal.classList.add("show");

        modalImage.src = this.src;

    });

}

closePreview.addEventListener("click", function () {

    modal.classList.remove("show");

});

modal.addEventListener("click", function (e) {

    if (e.target === modal) {

        modal.classList.remove("show");

    }

});