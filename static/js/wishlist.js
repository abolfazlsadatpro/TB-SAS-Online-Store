document
.querySelectorAll(".wishlist-remove")
.forEach(btn => {

    btn.onclick = () => {

        const card =
            btn.closest(
                ".wishlist-card"
            );

        fetch(
            `/wishlist/remove/${btn.dataset.id}/`
        )
        .then(r => r.json())
        .then(data => {

            if(data.success){

                document.getElementById(
                    "wishlistCount"
                ).innerText = data.total;

                card.classList.add(
                    "remove"
                );

                setTimeout(() => {

                    card.remove();

                },350);

            }

        });

    };

});