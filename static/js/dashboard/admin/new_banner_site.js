document.addEventListener("DOMContentLoaded", () => {

    /*=====================================
        IMAGE PREVIEW
    =====================================*/

    const imageInput = document.querySelector('input[type="file"]');
    const previewImage = document.getElementById("previewImage");

    if (imageInput && previewImage) {

        imageInput.addEventListener("change", function () {

            const file = this.files[0];

            if (!file) return;

            const reader = new FileReader();

            reader.onload = function (e) {

                previewImage.src = e.target.result;

                previewImage.classList.add("preview-clickable");

            };

            reader.readAsDataURL(file);

        });

    }


    /*=====================================
        IMAGE MODAL
    =====================================*/

    const modal = document.getElementById("imagePreviewModal");
    const modalImage = document.getElementById("previewModalImage");
    const closeBtn = document.querySelector(".close-preview");

    function openPreview(src) {

        if (!modal) return;

        modalImage.src = src;

        modal.classList.add("show");

        document.body.style.overflow = "hidden";

    }

    function closePreview() {

        if (!modal) return;

        modal.classList.remove("show");

        document.body.style.overflow = "";

    }

    if (previewImage) {

        previewImage.addEventListener("click", () => {

            openPreview(previewImage.src);

        });

    }

    document.querySelectorAll(".banner-table-image").forEach(img => {

        img.addEventListener("click", () => {

            openPreview(img.src);

        });

    });

    if (closeBtn) {

        closeBtn.addEventListener("click", closePreview);

    }

    if (modal) {

        modal.addEventListener("click", e => {

            if (e.target === modal) {

                closePreview();

            }

        });

    }

    document.addEventListener("keydown", e => {

        if (e.key === "Escape") {

            closePreview();

        }

    });


    /*=====================================
        DELETE ANIMATION
    =====================================*/

    document.querySelectorAll(".delete-banner").forEach(btn => {

        btn.addEventListener("click", function (e) {

            e.preventDefault();

            if (!confirm("Delete this banner ?")) {

                return;

            }

            const row = this.closest("tr");

            row.style.transition = ".35s";

            row.style.opacity = "0";

            row.style.transform = "translateX(40px)";

            setTimeout(() => {

                window.location = this.href;

            }, 350);

        });

    });

});

