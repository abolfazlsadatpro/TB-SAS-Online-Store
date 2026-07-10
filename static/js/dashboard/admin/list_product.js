document.addEventListener("DOMContentLoaded", () => {

    const addBtn = document.getElementById("addColor");
    const container = document.getElementById("colorContainer");
    const template = document.getElementById("emptyFormTemplate");

    const totalForms = document.getElementById("id_colors-TOTAL_FORMS");

    addBtn.addEventListener("click", () => {

        let index = Number(totalForms.value);

        let clone = template.content.cloneNode(true);

        clone.querySelectorAll("*").forEach(el => {

            if (el.name)
                el.name = el.name.replace(/__prefix__/g, index);

            if (el.id)
                el.id = el.id.replace(/__prefix__/g, index);

            if (el.htmlFor)
                el.htmlFor = el.htmlFor.replace(/__prefix__/g, index);

        });

        container.appendChild(clone);

        totalForms.value = index + 1;

    });


    container.addEventListener("click", function (e) {

        if (!e.target.classList.contains("remove-color"))
            return;

        const card = e.target.closest(".card");

        const deleteInput = card.querySelector(
            "input[type=checkbox][name$='-DELETE']"
        );

        if (deleteInput) {

            deleteInput.checked = true;

            card.style.display = "none";

        } else {

            card.remove();

        }

    });

});