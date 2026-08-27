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
