/**
 * V1 — Clean Modern
 * Frontend-only mock cart interactions.
 * NO real network calls. NO backend usage.
 *
 * Compatible hooks (data attributes / class names mirror production):
 *   data-cart-key, data-product-id, data-color-id, data-action
 *   .cart-items, .cart-card, .cart-quantity, .cart-price, .remove-btn
 *   .cart-summary, .coupon-box, .empty-cart, #cartBadge
 */

(function () {
  "use strict";

  const DATA = window.CART_LAB_DATA;
  const state = {
    items: JSON.parse(JSON.stringify(DATA.items)),
    coupon: { ...DATA.coupon },
    badge: DATA.totals.badge,
  };

  // ---------- helpers ----------
  function money(n) {
    const v = parseFloat(n || 0);
    return "$" + v.toFixed(2);
  }
  function recalcTotals() {
    const subtotal = state.items.reduce((s, it) => s + parseFloat(it.line_subtotal || 0), 0);
    const discount = state.coupon.is_applied ? subtotal * (parseFloat(state.coupon.discount) / subtotal || 0) : 0;
    const shipping = 0;
    const tax = (subtotal - discount) * 0.10;
    return { subtotal, discount, shipping, tax, total: subtotal - discount + shipping + tax };
  }
  function showToast(message, kind) {
    const t = document.getElementById("v1-toast");
    if (!t) return;
    t.className = "pcl-toast is-show " + (kind ? "is-" + kind : "is-info");
    t.textContent = message;
    clearTimeout(window._v1_toast_t);
    window._v1_toast_t = setTimeout(() => { t.classList.remove("is-show"); }, 2200);
  }

  // ---------- render ----------
  function renderItems() {
    const wrap = document.getElementById("v1-items");
    if (!wrap) return;
    if (!state.items.length) { renderEmpty(); return; }
    wrap.innerHTML = state.items.map((it, i) => `
      <article class="pcl-v1-card ${it.is_in_stock ? '' : 'is-out'}" data-cart-key="${it.key}" data-product-id="${it.product_id}" data-color-id="${(it.color_name || '0').toLowerCase().replace(/[^a-z0-9]/g,'')}">
        <a class="pcl-v1-image" href="#">
          ${it.image_url
            ? `<img src="${it.image_url}" alt="${it.display_name}">`
            : `<div class="placeholder"><i class="fa-regular fa-image"></i></div>`}
        </a>
        <div class="pcl-v1-info">
          <h4 class="pcl-v1-name"><a href="#">${it.display_name}</a></h4>
          <div class="pcl-v1-meta">
            <span class="pcl-v1-color-dot" style="background:${it.color_code}"></span>
            <span>${it.color_name}</span>
          </div>
          <div class="pcl-v1-price-line">
            ${it.has_discount && it.old_price ? `<span class="was">${money(it.old_price)}</span>` : ""}
            <span>${money(it.unit_price)} each</span>
          </div>
          <div class="pcl-v1-stock ${it.is_in_stock ? '' : 'is-out'}">
            <i class="fa-solid fa-circle-check"></i>
            ${it.is_in_stock ? "In stock" : "Out of stock"}
          </div>
        </div>
        <div class="pcl-v1-qty" role="group" aria-label="Quantity">
          <button type="button" data-action="decrease" aria-label="Decrease quantity">−</button>
          <div class="value" aria-live="polite">${it.quantity}</div>
          <button type="button" data-action="increase" aria-label="Increase quantity">+</button>
        </div>
        <div class="pcl-v1-total" data-line-total>${money(it.line_subtotal)}</div>
        <button type="button" class="pcl-v1-remove" data-action="remove" aria-label="Remove ${it.display_name}">
          <i class="fa-regular fa-trash-can"></i>
        </button>
      </article>
    `).join("");
    updateSummary();
    updateSubtitle();
  }
  function renderEmpty() {
    const wrap = document.getElementById("v1-items");
    if (!wrap) return;
    wrap.innerHTML = `
      <div class="pcl-v1-empty">
        <div class="icon"><i class="fa-solid fa-bag-shopping"></i></div>
        <h3>Your cart is empty</h3>
        <p>Looks like you haven't added anything yet. Start shopping to discover great products.</p>
        <a href="#" class="action">Continue Shopping</a>
      </div>
    `;
    updateSummary();
    updateSubtitle();
  }
  function updateSubtitle() {
    const el = document.getElementById("v1-subtitle");
    if (!el) return;
    const n = state.items.length;
    el.textContent = `${n} product${n === 1 ? "" : "s"} in your cart`;
  }
  function updateSummary() {
    const totals = recalcTotals();
    const set = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
    set("v1-subtotal", money(totals.subtotal));
    set("v1-shipping", totals.shipping === 0 ? "Free" : money(totals.shipping));
    set("v1-tax", money(totals.tax));
    set("v1-total", money(totals.total));
    const dr = document.getElementById("v1-discount-row");
    if (dr) dr.style.display = state.coupon.is_applied ? "flex" : "none";
    set("v1-discount", state.coupon.is_applied ? "-" + money(totals.discount) : money(0));
    const codeEl = document.getElementById("v1-discount-code");
    if (codeEl) codeEl.textContent = state.coupon.is_applied ? state.coupon.code : "";
    // Update coupon-applied chip
    const chip = document.querySelector(".pcl-v1-coupon-applied");
    if (chip) chip.classList.toggle("is-show", state.coupon.is_applied);
    const appliedCode = document.getElementById("v1-applied-code");
    if (appliedCode) appliedCode.textContent = state.coupon.is_applied ? state.coupon.code : "";
  }
  function updateBadge() {
    const b = document.getElementById("cartBadge");
    if (b) b.textContent = state.badge;
  }

  // ---------- actions ----------
  function getCardByKey(key) {
    return document.querySelector(`.pcl-v1-card[data-cart-key="${key}"]`);
  }
  function setCardLoading(card, on) {
    if (!card) return;
    card.classList.toggle("is-loading", on);
    card.querySelectorAll("button").forEach((b) => { b.disabled = !!on; });
  }

  document.addEventListener("click", (e) => {
    const target = e.target.closest("[data-action]");
    if (!target) return;
    const action = target.getAttribute("data-action");
    const card = target.closest(".pcl-v1-card");
    if (!card) return;
    const key = card.getAttribute("data-cart-key");
    const item = state.items.find((x) => x.key === key);
    if (!item) return;

    if (action === "increase") {
      item.quantity += 1;
      item.line_subtotal = (parseFloat(item.unit_price) * item.quantity).toFixed(2);
      state.badge += 1;
      setCardLoading(card, true);
      setTimeout(() => {
        setCardLoading(card, false);
        renderItems();
        updateBadge();
        showToast("Quantity updated", "success");
      }, 280);
    } else if (action === "decrease") {
      if (item.quantity <= 1) { showToast("Minimum quantity is 1", "info"); return; }
      item.quantity -= 1;
      item.line_subtotal = (parseFloat(item.unit_price) * item.quantity).toFixed(2);
      state.badge -= 1;
      setCardLoading(card, true);
      setTimeout(() => {
        setCardLoading(card, false);
        renderItems();
        updateBadge();
        showToast("Quantity updated", "success");
      }, 280);
    } else if (action === "remove") {
      if (!confirm(`Remove ${item.display_name} from cart?`)) return;
      setCardLoading(card, true);
      setTimeout(() => {
        state.items = state.items.filter((x) => x.key !== key);
        state.badge = state.items.reduce((s, x) => s + x.quantity, 0);
        renderItems();
        updateBadge();
        showToast("Item removed", "info");
      }, 250);
    }
  });

  // ---------- coupon ----------
  const couponInput = document.querySelector(".pcl-v1-coupon input");
  const couponBtn = document.querySelector(".pcl-v1-coupon .apply");
  const couponRemove = document.querySelector(".pcl-v1-coupon-applied .remove");
  if (couponBtn) {
    couponBtn.addEventListener("click", () => {
      const code = (couponInput.value || "").trim().toUpperCase();
      if (!code) { showToast("Please enter a coupon code", "info"); return; }
      couponBtn.disabled = true;
      setTimeout(() => {
        if (code === "SAVE10") {
          state.coupon = { code, is_applied: true, discount: 0.10 };
          showToast(`Coupon ${code} applied — 10% off`, "success");
        } else {
          showToast("Invalid coupon code", "error");
        }
        couponBtn.disabled = false;
        renderItems();
      }, 350);
    });
  }
  if (couponRemove) {
    couponRemove.addEventListener("click", () => {
      state.coupon = { code: null, is_applied: false, discount: 0 };
      showToast("Coupon removed", "info");
      renderItems();
    });
  }

  // ---------- init ----------
  renderItems();
  updateBadge();
})();
