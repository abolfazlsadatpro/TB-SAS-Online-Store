setTimeout(function () {
    const box = document.getElementById('message-box');

    if (box) {
        box.style.transition = "0.5s";
        box.style.opacity = "0";

        setTimeout(() => {
            box.remove();
        }, 500);
    }
}, 4000);

