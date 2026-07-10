document.addEventListener("DOMContentLoaded", () => {

    const addButton = document.getElementById("addColor");
    const container = document.getElementById("colorContainer");
    const template = document.getElementById("emptyFormTemplate");
    const totalForms = document.getElementById("id_colors-TOTAL_FORMS");

    // ===========================
    // Add Color Card
    // ===========================

    addButton.addEventListener("click", () => {

        let index = parseInt(totalForms.value);

        let html = template.innerHTML.replace(/__prefix__/g, index);

        container.insertAdjacentHTML("beforeend", html);

        totalForms.value = index + 1;

        const card = container.lastElementChild;

        card.style.opacity = 0;
        card.style.transform = "translateY(25px)";

        setTimeout(() => {

            card.style.transition = ".35s";
            card.style.opacity = 1;
            card.style.transform = "translateY(0px)";

        }, 50);

    });

    // ===========================
    // Remove Color Card
    // ===========================

    container.addEventListener("click", e => {

        if (!e.target.closest(".remove-color"))
            return;

        const card = e.target.closest(".color-card");

        const deleteInput = card.querySelector("input[name$='-DELETE']");

        if (deleteInput) {

            deleteInput.checked = true;

            card.style.transition = ".3s";
            card.style.opacity = 0;
            card.style.transform = "scale(.95)";

            setTimeout(() => {

                card.style.display = "none";

            }, 300);

        } else {

            card.style.transition = ".3s";
            card.style.opacity = 0;
            card.style.transform = "scale(.95)";

            setTimeout(() => {

                card.remove();

            }, 300);

        }

    });

    // ===========================
    // Image Preview
    // ===========================

    container.addEventListener("change", function (e) {

        if (!e.target.type.includes("file"))
            return;

        const file = e.target.files[0];

        if (!file)
            return;

        let preview = e.target.parentNode.querySelector(".preview-image");

        if (!preview) {

            preview = document.createElement("img");

            preview.className = "preview-image mt-3 rounded border shadow-sm";

            preview.style.width = "130px";

            preview.style.objectFit = "cover";

            e.target.parentNode.appendChild(preview);

        }

        preview.src = URL.createObjectURL(file);

    });

    // ===========================
    // Live Color Preview
    // ===========================

    container.addEventListener("input", function (e) {

        if (!e.target.name.includes("color_code"))
            return;

        let badge = e.target.parentNode.querySelector(".live-color");

        if (!badge) {

            badge = document.createElement("div");

            badge.className = "live-color mt-2 rounded";

            badge.style.width = "40px";
            badge.style.height = "40px";
            badge.style.border = "2px solid #ddd";

            e.target.parentNode.appendChild(badge);

        }

        badge.style.background = e.target.value;

    });

});

