/**
 * Product Detail Design Lab - Shared App JS
 * Common interactions shared across all proposals
 */

(function () {
  "use strict";

  // ===========================================================
  // Utility helpers
  // ===========================================================
  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

  // ===========================================================
  // Color selection
  // ===========================================================
  function initColorPickers() {
    qsa("[data-pdl-colorpicker]").forEach(function (wrap) {
      var items = qsa(".pdl-color", wrap);
      items.forEach(function (it) {
        it.addEventListener("click", function () {
          items.forEach(function (x) { x.classList.remove("is-selected"); x.setAttribute("aria-checked", "false"); });
          it.classList.add("is-selected");
          it.setAttribute("aria-checked", "true");

          // Update main image if dataset has new image
          var newImg = it.getAttribute("data-image");
          if (newImg) {
            var main = qs("[data-pdl-mainimage]", wrap.closest("main") || document);
            if (main) main.setAttribute("src", newImg);
          }

          // Update label
          var name = it.getAttribute("data-name") || "";
          var label = qs("[data-pdl-colorname]", wrap.closest("main") || document);
          if (label) label.textContent = name;
        });
      });
    });
  }

  // ===========================================================
  // Quantity stepper
  // ===========================================================
  function initQuantitySteppers() {
    qsa("[data-pdl-qty]").forEach(function (wrap) {
      var valueEl = qs(".pdl-qty-value", wrap);
      var minus = qs(".pdl-qty-minus", wrap);
      var plus  = qs(".pdl-qty-plus", wrap);
      if (!valueEl || !minus || !plus) return;

      function render() {
        var cur = parseInt(valueEl.textContent, 10) || 1;
        if (cur <= 1) minus.classList.add("is-min");
        else minus.classList.remove("is-min");
      }

      plus.addEventListener("click", function () {
        var cur = parseInt(valueEl.textContent, 10) || 1;
        if (cur < 99) valueEl.textContent = cur + 1;
        render();
      });

      minus.addEventListener("click", function () {
        var cur = parseInt(valueEl.textContent, 10) || 1;
        if (cur > 1) valueEl.textContent = cur - 1;
        render();
      });

      render();
    });
  }

  // ===========================================================
  // Add to Cart (visual feedback only)
  // ===========================================================
  function initAddToCart() {
    qsa("[data-pdl-addtocart]").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        var original = btn.innerHTML;
        btn.classList.add("is-added");
        btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:6px"><polyline points="20 6 9 17 4 12"></polyline></svg> Added to Cart';
        setTimeout(function () {
          btn.classList.remove("is-added");
          btn.innerHTML = original;
        }, 1800);
      });
    });
  }

  // ===========================================================
  // Wishlist toggle
  // ===========================================================
  function initWishlist() {
    qsa("[data-pdl-wishlist]").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        btn.classList.toggle("is-active");
        var heart = qs("svg, i", btn);
        if (heart) {
          if (btn.classList.contains("is-active")) {
            heart.style.fill = "currentColor";
          } else {
            heart.style.fill = "none";
          }
        }
      });
    });
  }

  // ===========================================================
  // Thumbnail click -> change main image
  // ===========================================================
  function initThumbnails() {
    qsa("[data-pdl-thumb]").forEach(function (thumb) {
      thumb.addEventListener("click", function () {
        var main = qs("[data-pdl-mainimage]", thumb.closest("section, main") || document);
        if (main) {
          main.setAttribute("src", thumb.getAttribute("data-image") || thumb.getAttribute("src"));
          main.style.opacity = "0";
          setTimeout(function () { main.style.opacity = "1"; }, 80);
        }
        qsa("[data-pdl-thumb]", thumb.parentElement).forEach(function (t) { t.classList.remove("is-active"); });
        thumb.classList.add("is-active");
      });
    });
  }

  // ===========================================================
  // Show More / Show Less
  // ===========================================================
  function initShowMore() {
    qsa("[data-pdl-showmore]").forEach(function (trigger) {
      var targetId = trigger.getAttribute("data-target");
      var target = targetId ? document.getElementById(targetId) : null;
      if (!target) return;
      var label = qs("[data-pdl-showmore-label]", trigger);
      var icon  = qs("[data-pdl-showmore-icon]", trigger);

      trigger.addEventListener("click", function () {
        var isOpen = target.classList.toggle("is-open");
        if (label) label.textContent = isOpen ? "Show Less" : "Show More";
        if (icon)  icon.style.transform = isOpen ? "rotate(180deg)" : "rotate(0deg)";
        trigger.classList.toggle("is-open", isOpen);
      });
    });
  }

  // ===========================================================
  // Tabs
  // ===========================================================
  function initTabs() {
    qsa("[data-pdl-tabs]").forEach(function (wrap) {
      var tabs = qsa(".pdl-tab", wrap);
      var panels = qsa("[data-pdl-tabpanel]", wrap.closest("section, main") || document);
      tabs.forEach(function (tab) {
        tab.addEventListener("click", function () {
          var id = tab.getAttribute("data-target");
          tabs.forEach(function (t) { t.classList.remove("is-active"); });
          tab.classList.add("is-active");
          panels.forEach(function (p) { p.classList.toggle("is-active", p.id === id); });
        });
      });
    });
  }

  // ===========================================================
  // Init
  // ===========================================================
  document.addEventListener("DOMContentLoaded", function () {
    initColorPickers();
    initQuantitySteppers();
    initAddToCart();
    initWishlist();
    initThumbnails();
    initShowMore();
    initTabs();
  });
})();
