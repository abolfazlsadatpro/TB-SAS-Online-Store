/*==================================================
              WISHLIST — 3D PRO
==================================================*/

const csrf =
    window.WISHLIST_CSRF ||
    getCookie("csrftoken");

const productsBox = document.getElementById("wishlistProducts");
const emptyState = document.getElementById("wishlistEmpty");

/*--------------------------------------------------
              CSRF COOKIE
--------------------------------------------------*/

function getCookie(name) {

    let value = null;

    if (document.cookie && document.cookie !== "") {

        document.cookie.split(";").forEach(c => {

            c = c.trim();

            if (c.startsWith(name + "=")) {

                value = decodeURIComponent(
                    c.substring(name.length + 1)
                );

            }

        });

    }

    return value;

}

/*--------------------------------------------------
              3D TILT — follow cursor
--------------------------------------------------*/

const tiltCards = document.querySelectorAll(".wishlist-card");

tiltCards.forEach(card => {

    const img = card.querySelector(".wishlist-image");

    card.addEventListener("pointermove", e => {

        const rect = card.getBoundingClientRect();

        const px = (e.clientX - rect.left) / rect.width;
        const py = (e.clientY - rect.top) / rect.height;

        card.style.setProperty("--ry", (px * 5 - 2.5).toFixed(2) + "deg");
        card.style.setProperty("--rx", (-py * 5 + 2.5).toFixed(2) + "deg");
        card.style.setProperty("--mx", (px * 100).toFixed(1) + "%");
        card.style.setProperty("--my", (py * 100).toFixed(1) + "%");

        if (img) {
            img.style.transform =
                "translateZ(34px) rotateX(" + (-py * 5 + 2.5).toFixed(2) + "deg)" +
                " rotateY(" + (px * 5 - 2.5).toFixed(2) + "deg)";
        }

    });

    card.addEventListener("pointerleave", () => {
        card.style.removeProperty("--rx");
        card.style.removeProperty("--ry");
        card.style.removeProperty("--mx");
        card.style.removeProperty("--my");
        if (img) {
            img.style.removeProperty("transform");
        }
    });

});

/*--------------------------------------------------
              TOAST
--------------------------------------------------*/

function flashToast(message) {

    const toast = document.getElementById("wishlistToast");

    if (!toast) return;

    const text = toast.querySelector("h5");

    if (text && message) {
        text.textContent = message;
    }

    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.remove("show");
    }, 3200);

}

/*--------------------------------------------------
              STATS SYNC
--------------------------------------------------*/

function syncStats(total) {

    const count = document.getElementById("wishlistPageCount");
    const box = document.getElementById("wishlistPageCountBox");
    const totalEl = document.getElementById("statTotal");

    if (count) {
        count.textContent = total;
    }

    if (box) {
        box.innerHTML =
            '<span>' + total + "</span>" +
            (total === 1 ? " Product" : " Products");
    }

    if (totalEl) {
        totalEl.textContent = total;
    }

    const navCount = document.getElementById("wishlistCount");

    if (navCount) {
        navCount.textContent = total;
    }

}

/*--------------------------------------------------
              REMOVE PRODUCT (POST)
--------------------------------------------------*/

function bindRemove(card) {

    const btn = card.querySelector(".wishlist-remove");

    if (!btn) return;

    btn.addEventListener("click", () => {

        const id = btn.dataset.id;

        fetch(`/wishlist/remove/${id}/`, {
            method: "POST",
            headers: {
                "X-CSRFToken": csrf
            }
        })
            .then(r => r.json())
            .then(data => {

                if (!data.success) return;

                card.classList.add("removing");

                setTimeout(() => {
                    card.remove();
                    afterRemove(data.total);
                }, 430);

            })
            .catch(() => {
                flashToast("Something went wrong, try again.");
            });

    });

}

function afterRemove(total) {

    syncStats(total);

    if (productsBox && emptyState) {

        if (total === 0) {
            productsBox.classList.add("hidden");
            emptyState.classList.remove("hidden");
        } else {
            emptyState.classList.add("hidden");
        }

    }

    flashToast("Product removed from wishlist.");

}

/*--------------------------------------------------
              INIT
--------------------------------------------------*/

document.querySelectorAll(".wishlist-card").forEach(bindRemove);

/* keep empty state hidden while cards exist */
if (productsBox && emptyState) {

    const hasCards = productsBox.querySelectorAll(".wishlist-card").length > 0;

    if (hasCards) {
        emptyState.classList.add("hidden");
    }

}