/**
 * V2 — Audit Driven
 * Frontend-only mock cart interactions.
 * Addresses every Cart audit gap: stock state, quantity input,
 * remove confirmation, coupon chip, accessible labels, mobile hierarchy.
 *
 * Compatible hooks: data-cart-key, data-product-id, data-color-id, data-action
 *   .cart-items, .cart-card, .cart-quantity, .cart-price, .remove-btn
 *   .cart-summary, .coupon-box, .empty-cart, #cartBadge
 */

(function () {
  "use strict";

  const DATA = window.CART_LAB_DATA;
  const state = {
    items: JSON.parse(JSON.stringify(DATA.items)),
    coupon: { ...DATA.coupon },
  };

  // ---------- helpers ----------
  function money(n) {
    const v = parseFloat(n || 0);
    return "$" + v.toFixed(2);
  }
  function recalcTotals() {
    const subtotal = state.items.reduce((s, it) => s + parseFloat(it.line_subtotal || 0), 0);
    const discount = state.coupon.is_applied ? subtotal * 0.10 : 0;
    const shipping = 0;
    const tax = (subtotal - discount) * 0.10;
    return { subtotal, discount, shipping, tax, total: subtotal - discount + shipping + tax };
  }
  function showToast(message, kind) {
    const t = document.getElementById("v2-toast");
    if (!t) return;
    t.className = "pcl-toast is-show " + (kind ? "is-" + kind : "is-info");
    t.textContent = message;
    clearTimeout(window._v2_toast_t);
    window._v2_toast_t = setTimeout(() => { t.classList.remove("is-show"); }, 2200);
  }
  function showCouponError(msg) {
    const el = document.getElementById("v2-coupon-error");
    const m = document.getElementById("v2-coupon-error-msg");
    if (!el || !m) return;
    m.textContent = msg;
    el.classList.add("is-show");
  }
  function hideCouponError() {
    const el = document.getElementById("v2-coupon-error");
    if (el) el.classList.remove("is-show");
  }
  function setCardLoading(card, on) {
    if (!card) return;
    card.classList.toggle("is-loading", !!on);
    card.querySelectorAll("button, input").forEach((el) => { el.disabled = !!on; });
  }

  // ---------- render ----------
  function renderItems() {
    const wrap = document.getElementById("v2-items");
    if (!wrap) return;
    if (!state.items.length) { renderEmpty(); updateSummary(); updateSubtitle(); return; }
    wrap.innerHTML = state.items.map((it) => `
      <article class="pcl-v2-card ${it.is_in_stock ? '' : 'is-out'}" data-cart-key="${it.key}" data-product-id="${it.product_id}" data-color-id="${(it.color_name || '0').toLowerCase().replace(/[^a-z0-9]/g,'')}">
        <a class="pcl-v2-image" href="#" aria-hidden="true" tabindex="-1">
          ${it.image_url
            ? `<img src="${it.image_url}" alt="">`
            : `<div class="ph"><i class="fa-regular fa-image"></i></div>`}
        </a>
        <div class="pcl-v2-info">
          <h4 class="pcl-v2-name"><a href="#">${it.display_name}</a></h4>
          <div class="pcl-v2-attr">
            <span class="pcl-v2-color-dot" style="background:${it.color_code}"></span>
            <span>Color: <strong>${it.color_name}</strong></span>
          </div>
          <div class="pcl-v2-meta">
            <span class="pcl-v2-stock ${it.is_in_stock ? 'in' : 'out'}">
              <i class="fa-solid fa-${it.is_in_stock ? 'check' : 'xmark'}"></i>
              ${it.is_in_stock ? 'In stock' : 'Out of stock'}
            </span>
            <span class="pcl-v2-price-now">
              ${it.has_discount && it.old_price ? `<span class="pcl-v2-price-was">${money(it.old_price)}</span>` : ""}
              ${money(it.unit_price)}
            </span>
          </div>
        </div>
        <div class="pcl-v2-actions">
          <div class="pcl-v2-line-total" data-line-total>${money(it.line_subtotal)}</div>
          <div class="pcl-v2-qty" role="group" aria-label="Quantity">
            <button type="button" data-action="decrease" aria-label="Decrease quantity">−</button>
            <input type="number" min="1" max="99" value="${it.quantity}" data-qty-input aria-label="Quantity for ${it.display_name}">
            <button type="button" data-action="increase" aria-label="Increase quantity">+</button>
          </div>
          <div class="pcl-v2-controls">
            <button type="button" class="pcl-v2-remove" data-action="remove" aria-label="Remove ${it.display_name} from cart">
              <i class="fa-regular fa-trash-can"></i> Remove
            </button>
          </div>
        </div>
        ${it.is_in_stock ? '' : '<div class="pcl-v2-disabled-overlay" aria-hidden="true"></div>'}
      </article>
    `).join("");
    updateSummary();
    updateSubtitle();
  }
  function renderEmpty() {
    const wrap = document.getElementById("v2-items");
    if (!wrap) return;
    wrap.innerHTML = `
      <div class="pcl-v2-empty">
        <div class="icon"><i class="fa-solid fa-cart-shopping"></i></div>
        <h3>Your cart is empty</h3>
        <p>Add items to your cart to see them here. Start shopping to discover great products.</p>
        <a href="#" class="action"><i class="fa-solid fa-arrow-left"></i> Continue Shopping</a>
      </div>
    `;
  }
  function updateSubtitle() {
    const el = document.getElementById("v2-subtitle");
    if (!el) return;
    const n = state.items.length;
    const total = state.items.reduce((s, x) => s + x.quantity, 0);
    el.textContent = `${n} product${n === 1 ? "" : "s"} · ${total} item${total === 1 ? "" : "s"}`;
  }
  function updateSummary() {
    const totals = recalcTotals();
    const set = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
    set("v2-subtotal", money(totals.subtotal));
    set("v2-shipping", totals.shipping === 0 ? "Free" : money(totals.shipping));
    set("v2-tax", money(totals.tax));
    set("v2-total", money(totals.total));
    set("v2-count", state.items.reduce((s, x) => s + x.quantity, 0));
    const dr = document.getElementById("v2-discount-row");
    if (dr) dr.style.display = state.coupon.is_applied ? "flex" : "none";
    set("v2-discount", state.coupon.is_applied ? "-" + money(totals.discount) : money(0));
    // Coupon applied chip
    const chip = document.getElementById("v2-coupon-applied");
    if (chip) {
      chip.classList.toggle("is-show", state.coupon.is_applied);
      set("v2-applied-code", state.coupon.is_applied ? state.coupon.code : "");
      set("v2-applied-savings", state.coupon.is_applied ? money(totals.discount) : "");
    }
    // Update badge
    const b = document.getElementById("cartBadge");
    if (b) b.textContent = state.items.reduce((s, x) => s + x.quantity, 0);
  }
  function applyItemDelta(key, delta) {
    const item = state.items.find((x) => x.key === key);
    if (!item) return;
    item.quantity = Math.max(1, Math.min(99, item.quantity + delta));
    item.line_subtotal = (parseFloat(item.unit_price) * item.quantity).toFixed(2);
  }
  function setItemQty(key, value) {
    const item = state.items.find((x) => x.key === key);
    if (!item) return;
    const v = Math.max(1, Math.min(99, parseInt(value, 10) || 1));
    item.quantity = v;
    item.line_subtotal = (parseFloat(item.unit_price) * item.quantity).toFixed(2);
  }
  function removeItem(key) {
    state.items = state.items.filter((x) => x.key !== key);
  }

  // ---------- delegated events ----------
  document.addEventListener("click", (e) => {
    const target = e.target.closest("[data-action]");
    if (!target) return;
    const action = target.getAttribute("data-action");
    const card = target.closest(".pcl-v2-card");
    if (!card) return;
    const key = card.getAttribute("data-cart-key");
    const item = state.items.find((x) => x.key === key);
    if (!item) return;

    setCardLoading(card, true);
    setTimeout(() => {
      if (action === "increase") {
        applyItemDelta(key, 1);
        showToast("Quantity updated", "success");
      } else if (action === "decrease") {
        if (item.quantity <= 1) { setCardLoading(card, false); showToast("Minimum quantity is 1", "info"); return; }
        applyItemDelta(key, -1);
        showToast("Quantity updated", "success");
      } else if (action === "remove") {
        if (!confirm(`Remove ${item.display_name} from cart?`)) { setCardLoading(card, false); return; }
        removeItem(key);
        showToast("Item removed", "info");
      }
      renderItems();
    }, 250);
  });

  // quantity input: commit on blur or Enter
  document.addEventListener("change", (e) => {
    const target = e.target.closest("[data-qty-input]");
    if (!target) return;
    const card = target.closest(".pcl-v2-card");
    if (!card) return;
    const key = card.getAttribute("data-cart-key");
    setItemQty(key, target.value);
    renderItems();
    showToast("Quantity updated", "success");
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    const target = e.target.closest("[data-qty-input]");
    if (!target) return;
    target.blur();
  });

  // ---------- coupon ----------
  const couponForm = document.getElementById("v2-coupon-form");
  const couponInput = document.getElementById("v2-coupon-input");
  const couponApply = document.getElementById("v2-coupon-apply");
  const couponRemove = document.getElementById("v2-coupon-remove");
  if (couponForm) {
    couponForm.addEventListener("submit", (e) => {
      e.preventDefault();
      hideCouponError();
      const code = (couponInput.value || "").trim().toUpperCase();
      if (!code) { showCouponError("Please enter a coupon code."); return; }
      couponApply.disabled = true;
      const orig = couponApply.textContent;
      couponApply.textContent = "Checking...";
      setTimeout(() => {
        couponApply.disabled = false;
        couponApply.textContent = orig;
        if (code === "SAVE10") {
          state.coupon = { code, is_applied: true, discount: 0.10 };
          couponInput.value = "";
          showToast(`Coupon ${code} applied — 10% off`, "success");
        } else {
          showCouponError("Invalid coupon code. Please try again.");
        }
        renderItems();
      }, 350);
    });
  }
  if (couponRemove) {
    couponRemove.addEventListener("click", () => {
      state.coupon = { code: null, is_applied: false, discount: 0 };
      hideCouponError();
      showToast("Coupon removed", "info");
      renderItems();
    });
  }

  // ---------- init ----------
  renderItems();
})();
