document.addEventListener("click", function (e) {

    const btn = e.target.closest(".delete-category");

    if (!btn) return;

    const row = btn.closest("tr");

    row.style.transition = ".3s";
    row.style.opacity = "0";
    row.style.transform = "scale(.95)";

    const url = btn.dataset.url;

    setTimeout(() => {

        fetch(url, {
            method: "GET",
            headers: {
                "X-Requested-With": "XMLHttpRequest"
            }
        })
            .then(response => {

                if (response.ok) {

                    row.remove();

                } else {

                    row.style.opacity = "1";
                    row.style.transform = "scale(1)";

                }

            })
            .catch(() => {

                row.style.opacity = "1";
                row.style.transform = "scale(1)";

            });

    }, 300);

});


document.addEventListener("DOMContentLoaded", function () {


    document.querySelectorAll(".tree-toggle").forEach(toggle => {


        toggle.onclick = function (e) {


            e.preventDefault();
            e.stopPropagation();


            let li = this.closest("li");


            let children = null;


            for (let child of li.children) {

                if (child.classList.contains("tree-children")) {

                    children = child;
                    break;

                }

            }


            console.log("children:", children);


            if (!children) {
                return;
            }


            children.classList.toggle("open");


            console.log(children.classList);


            let icon = this.querySelector("i");


            if (children.classList.contains("open")) {

                icon.classList.remove("bi-chevron-right");
                icon.classList.add("bi-chevron-down");

            } else {

                icon.classList.remove("bi-chevron-down");
                icon.classList.add("bi-chevron-right");

            }


        };


    });


});

console.log("CATEGORY TREE JS LOADED");


document.querySelectorAll(".tree-toggle").forEach(item => {

    item.addEventListener("click", function () {

        console.log("TREE CLICKED");

    });

});