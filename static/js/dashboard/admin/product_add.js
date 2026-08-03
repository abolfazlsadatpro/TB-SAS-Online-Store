document.addEventListener("DOMContentLoaded", () => {

    setupFormset({
        addButton: "addColor",
        container: "colorContainer",
        template: "emptyFormTemplate",
        totalForms: "id_colors-TOTAL_FORMS",
        cardClass: ".color-card",
        removeClass: ".remove-color",
        icon: "bi-droplet-half",
        title: "Color"
    });

    setupFormset({
        addButton: "addImage",
        container: "imageContainer",
        template: "emptyImageTemplate",
        totalForms: "id_images-TOTAL_FORMS",
        cardClass: ".image-card",
        removeClass: ".remove-image",
        icon: "bi-image-fill",
        title: "Image"
    });

    setupFormset({
        addButton: "addSpecification",
        container: "specificationContainer",
        template: "emptySpecificationTemplate",
        totalForms: "id_specifications-TOTAL_FORMS",
        cardClass: ".specification-card",
        removeClass: ".remove-specification",
        icon: "bi-card-text",
        title: "Specification"
    });

    setupImagePreview();
    setupImageModal();
    setupCancelButton();

});


// =============================================
// Generic Formset
// =============================================

function setupFormset(config) {

    const addButton = document.getElementById(config.addButton);
    const container = document.getElementById(config.container);
    const template = document.getElementById(config.template);
    const totalForms = document.getElementById(config.totalForms);

    if (!addButton || !container || !template || !totalForms)
        return;

    // Add

    addButton.addEventListener("click", () => {

        const index = Number(totalForms.value);

        const html =
            template.innerHTML.replace(/__prefix__/g, index);

        container.insertAdjacentHTML(
            "beforeend",
            html
        );

        totalForms.value = index + 1;

        const newCard =
            container.lastElementChild;

        newCard.style.opacity = "0";
        newCard.style.transform =
            "translateY(25px)";

        requestAnimationFrame(() => {

            newCard.style.transition =
                ".35s ease";

            newCard.style.opacity = "1";

            newCard.style.transform =
                "translateY(0)";

        });

        refreshNumbers();
    });

    // Remove

    container.addEventListener("click", (e) => {

        const btn =
            e.target.closest(config.removeClass);

        if (!btn)
            return;

        const card = btn.closest(config.cardClass);

        if (!card)
            return;

        const deleteInput =
            card.querySelector(
                "input[name$='-DELETE']"
            );

        card.classList.add("removing");

        setTimeout(() => {

            if (deleteInput) {

                deleteInput.checked = true;

                card.style.display = "none";

            } else {

                card.remove();

            }

            refreshNumbers();

        }, 450);

    });

    // Refresh

    function refreshNumbers() {

        const cards =
            container.querySelectorAll(
                config.cardClass
            );

        let counter = 1;

        cards.forEach(card => {

            if (
                card.style.display === "none"
            ) {
                return;
            }

            const title =
                card.querySelector(
                    ".color-card-title"
                );

            if (title) {

                title.innerHTML = `
                    <i class="bi ${config.icon}"></i>
                    ${config.title} ${counter}
                `;

            }

            counter++;
        });
    }

    refreshNumbers();
}


// =============================================
// Live Preview
// =============================================

function setupImagePreview() {

    document.addEventListener(
        "change",
        function (e) {

            if (
                !e.target.matches(
                    'input[type="file"]'
                )
            ) {
                return;
            }

            const file =
                e.target.files[0];

            if (!file)
                return;

            const card =
                e.target.closest(
                    ".color-card, .image-card"
                );

            if (!card)
                return;

            let preview =
                card.querySelector(
                    ".color-preview-image"
                );

            if (!preview) {

                const wrapper =
                    document.createElement(
                        "div"
                    );

                wrapper.className =
                    "color-image-preview";

                preview =
                    document.createElement(
                        "img"
                    );

                preview.className =
                    "color-preview-image preview-clickable";

                wrapper.appendChild(
                    preview
                );

                card
                    .querySelector(
                        ".banner-card-body"
                    )
                    .appendChild(
                        wrapper
                    );
            }

            preview.src =
                URL.createObjectURL(file);

        }
    );
}


// =============================================
// Modal
// =============================================

function setupImageModal() {

    const modal =
        document.querySelector(
            ".image-preview-modal"
        );

    const modalImage =
        document.querySelector(
            ".preview-modal-image"
        );

    const close =
        document.querySelector(
            ".close-preview"
        );

    document.addEventListener(
        "click",
        (e) => {

            const image =
                e.target.closest(
                    ".preview-clickable"
                );

            if (!image)
                return;

            modal.classList.add(
                "show"
            );

            modalImage.src =
                image.src;
        }
    );

    close?.addEventListener(
        "click",
        () => {

            modal.classList.remove(
                "show"
            );

        }
    );

    modal?.addEventListener(
        "click",
        (e) => {

            if (e.target === modal) {

                modal.classList.remove(
                    "show"
                );

            }

        }
    );

    document.addEventListener(
        "keydown",
        (e) => {

            if (
                e.key === "Escape"
            ) {

                modal.classList.remove(
                    "show"
                );

            }

        }
    );
}


// =============================================
// Cancel
// =============================================

function setupCancelButton() {

    const button =
        document.getElementById(
            "cancelProduct"
        );

    if (!button)
        return;

    button.addEventListener(
        "click",
        (e) => {

            e.preventDefault();

            const isEdit =
                document.getElementById(
                    "isEditMode"
                ).value === "1";

            if (isEdit) {

                window.location.href =
                    "/dashboard-admin/add-product/";

                return;
            }

            document
                .querySelector("form")
                .reset();

            document
                .querySelectorAll(
                    ".color-preview-image"
                )
                .forEach(
                    img => img.remove()
                );

        }
    );
}

setTimeout(() => {

    document.querySelectorAll(".custom-alert")
        .forEach(alert => {

            alert.style.opacity = "0";

            setTimeout(() => {
                alert.remove();
            }, 300);

        });

}, 4000);

document.addEventListener("click", (e) => {

    if (!e.target.closest(".btn-close"))
        return;

    e.target.closest(".custom-alert").remove();

});