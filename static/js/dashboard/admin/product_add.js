document.addEventListener("DOMContentLoaded", () => {

    const addButton = document.getElementById("addColor");
    const container = document.getElementById("colorContainer");
    const template = document.getElementById("emptyFormTemplate");
    const totalForms = document.getElementById("id_colors-TOTAL_FORMS");

    // ===========================================
    // Add New Color Card
    // ===========================================

    addButton.addEventListener("click", () => {

        const index = parseInt(totalForms.value);

        let html = template.innerHTML.replace(/__prefix__/g, index);

        container.insertAdjacentHTML("beforeend", html);

        totalForms.value = index + 1;

        const newCard = container.lastElementChild;

        newCard.style.opacity = "0";
        newCard.style.transform = "translateY(25px)";

        requestAnimationFrame(() => {

            newCard.style.transition = ".35s ease";

            newCard.style.opacity = "1";
            newCard.style.transform = "translateY(0)";

        });

        refreshColorNumbers();

    });

    // ===========================================
    // Remove Color Card
    // ===========================================

    container.addEventListener("click", function (e) {

        const btn = e.target.closest(".remove-color");

        if (!btn) return;

        const card = btn.closest(".color-card");

        const deleteInput = card.querySelector("input[name$='-DELETE']");

        card.classList.add("removing");

        setTimeout(() => {

            if (deleteInput) {

                deleteInput.checked = true;

                card.style.display = "none";

            } else {

                card.remove();

            }

            refreshColorNumbers();

        }, 450);

    });

    // ===========================================
    // Refresh Color Numbers
    // ===========================================

    function refreshColorNumbers() {

        const cards = container.querySelectorAll(".color-card");

        let counter = 1;

        cards.forEach(card => {

            if (card.style.display === "none")
                return;

            const title = card.querySelector(".color-card-title");

            if (title) {

                title.innerHTML =
                    `<i class="bi bi-droplet-half"></i> Color ${counter}`;

            }

            counter++;

        });

    }

    refreshColorNumbers();

});

document.addEventListener("DOMContentLoaded", () => {

    // ===========================================
    // Live Image Preview
    // ===========================================

    document.addEventListener("change", function (e) {

        if (!e.target.matches('input[type="file"]'))
            return;

        const file = e.target.files[0];

        if (!file)
            return;

        const card = e.target.closest(".color-card");

        let preview = card.querySelector(".color-preview-image");

        if (!preview) {

            const wrapper = document.createElement("div");

            wrapper.className = "color-image-preview";

            preview = document.createElement("img");

            preview.className =
                "table-banner-image preview-clickable color-preview-image";

            wrapper.appendChild(preview);

            card.querySelector(".banner-card-body").appendChild(wrapper);

        }

        preview.src = URL.createObjectURL(file);

    });

    // ===========================================
    // Live Color Preview
    // ===========================================

    document.addEventListener("input", function (e) {

        if (!e.target.name.includes("color_code"))
            return;

        const parent = e.target.parentElement;

        let badge = parent.querySelector(".live-color");

        if (!badge) {

            badge = document.createElement("div");

            badge.className = "live-color";

            badge.style.width = "42px";
            badge.style.height = "42px";
            badge.style.borderRadius = "10px";
            badge.style.marginTop = "12px";
            badge.style.border = "2px solid #e9ecef";
            badge.style.transition = ".25s";

            parent.appendChild(badge);

        }

        badge.style.backgroundColor = e.target.value;

    });

    // ===========================================
    // Image Preview Modal
    // ===========================================

    const modal = document.querySelector(".image-preview-modal");

    const modalImage = document.querySelector(".preview-modal-image");

    const closeButton = document.querySelector(".close-preview");

    document.addEventListener("click", function (e) {

        const image = e.target.closest(".preview-clickable");

        if (!image)
            return;

        modal.classList.add("show");

        modalImage.src = image.src;

    });

    // ===========================================
    // Close Modal
    // ===========================================

    closeButton?.addEventListener("click", () => {

        modal.classList.remove("show");

    });

    modal?.addEventListener("click", function (e) {

        if (e.target === modal) {

            modal.classList.remove("show");

        }

    });

    // ===========================================
    // ESC Close
    // ===========================================

    document.addEventListener("keydown", function (e) {

        if (e.key === "Escape") {

            modal.classList.remove("show");

        }

    });

});

// ===========================================
// Cancel Button
// ===========================================

const cancelButton = document.getElementById("cancelProduct");

if (cancelButton) {

    cancelButton.addEventListener("click", function (e) {

        e.preventDefault();

        const isEdit =
            document.getElementById("isEditMode").value === "1";

        if (isEdit) {

            window.location.href = "/dashboard-admin/add-product/";

        } else {

            document.querySelector("form").reset();

            document
                .querySelectorAll(".color-preview-image")
                .forEach(img => img.remove());

            document
                .querySelectorAll(".live-color")
                .forEach(item => item.remove());

        }

    });

}