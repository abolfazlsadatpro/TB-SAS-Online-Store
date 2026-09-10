/**
 * V3 — Hybrid / Experimental
 * Frontend-only mock cart interactions.
 * Combines V1 polish with V2 completeness. Distinct details:
 *   - Step indicator header
 *   - Inline "1 × $1,499" line breakdown
 *   - Subtle green accent bar on summary heading
 *   - "Secure Checkout · $X.XX" CTA
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
    const t = document.getElementById("v3-toast");
    if (!t) return;
    t.className = "pcl-toast is-show " + (kind ? "is-" + kind : "is-info");
    t.textContent = message;
    clearTimeout(window._v3_toast_t);
    window._v3_toast_t = setTimeout(() => { t.classList.remove("is-show"); }, 2200);
  }
  function showCouponError(msg) {
    const el = document.getElementById("v3-coupon-error");
    const m = document.getElementById("v3-coupon-error-msg");
    if (!el || !m) return;
    m.textContent = msg;
    el.classList.add("is-show");
  }
  function hideCouponError() {
    const el = document.getElementById("v3-coupon-error");
    if (el) el.classList.remove("is-show");
  }
  function setCardLoading(card, on) {
    if (!card) return;
    card.classList.toggle("is-loading", !!on);
    card.querySelectorAll("button, input").forEach((el) => { el.disabled = !!on; });
  }

  // ---------- render ----------
  function renderItems() {
    const wrap = document.getElementById("v3-items");
    if (!wrap) return;
    if (!state.items.length) { renderEmpty(); updateSummary(); updateSubtitle(); return; }
    wrap.innerHTML = state.items.map((it) => `
      <article class="pcl-v3-card ${it.is_in_stock ? '' : 'is-out'}" data-cart-key="${it.key}" data-product-id="${it.product_id}" data-color-id="${(it.color_name || '0').toLowerCase().replace(/[^a-z0-9]/g,'')}">
        <a class="pcl-v3-image" href="#" aria-hidden="true" tabindex="-1">
          ${it.image_url
            ? `<img src="${it.image_url}" alt="">`
            : `<div class="ph"><i class="fa-regular fa-image"></i></div>`}
        </a>
        <div class="pcl-v3-info">
          <h4 class="pcl-v3-name"><a href="#">${it.display_name}</a></h4>
          <div class="pcl-v3-attr">
            <span class="pcl-v3-color-dot" style="background:${it.color_code}"></span>
            <span>${it.color_name}</span>
          </div>
          <div class="pcl-v3-breakdown">
            <span>${it.quantity} × ${money(it.unit_price)}</span>
            ${it.has_discount && it.old_price ? `<span class="was">${money(it.old_price)}</span>` : ""}
          </div>
          <div class="pcl-v3-stock ${it.is_in_stock ? '' : 'is-out'}">
            <i class="fa-solid fa-${it.is_in_stock ? 'check' : 'xmark'}-circle"></i>
            ${it.is_in_stock ? "In stock" : "Out of stock"}
          </div>
        </div>
        <div class="pcl-v3-qty" role="group" aria-label="Quantity">
          <button type="button" data-action="decrease" aria-label="Decrease quantity">−</button>
          <span class="value" aria-live="polite">${it.quantity}</span>
          <button type="button" data-action="increase" aria-label="Increase quantity">+</button>
        </div>
        <div class="pcl-v3-total" data-line-total>
          ${money(it.line_subtotal)}
          <span class="small">line total</span>
        </div>
        <button type="button" class="pcl-v3-remove" data-action="remove" aria-label="Remove ${it.display_name}">
          <i class="fa-regular fa-trash-can"></i>
        </button>
      </article>
    `).join("");
    updateSummary();
    updateSubtitle();
  }
  function renderEmpty() {
    const wrap = document.getElementById("v3-items");
    if (!wrap) return;
    wrap.innerHTML = `
      <div class="pcl-v3-empty">
        <div class="icon"><i class="fa-solid fa-bag-shopping"></i></div>
        <h3>Your cart is empty</h3>
        <p>You haven't added anything yet. Discover products and add your favorites to the cart.</p>
        <a href="#" class="action"><i class="fa-solid fa-arrow-left"></i> Start Shopping</a>
      </div>
    `;
  }
  function updateSubtitle() {
    const el = document.getElementById("v3-subtitle");
    if (!el) return;
    const n = state.items.length;
    const total = state.items.reduce((s, x) => s + x.quantity, 0);
    el.textContent = `${n} product${n === 1 ? "" : "s"} · ${total} item${total === 1 ? "" : "s"}`;
  }
  function updateSummary() {
    const totals = recalcTotals();
    const set = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
    set("v3-subtotal", money(totals.subtotal));
    set("v3-shipping", totals.shipping === 0 ? "Free" : money(totals.shipping));
    set("v3-tax", money(totals.tax));
    set("v3-total", money(totals.total));
    set("v3-total-inline", money(totals.total));
    set("v3-count", state.items.reduce((s, x) => s + x.quantity, 0));
    const dr = document.getElementById("v3-discount-row");
    if (dr) dr.style.display = state.coupon.is_applied ? "flex" : "none";
    set("v3-discount", state.coupon.is_applied ? "-" + money(totals.discount) : money(0));
    const dt = document.getElementById("v3-discount-tag");
    if (dt) dt.textContent = state.coupon.is_applied ? state.coupon.code : "";
    // Applied chip
    const chip = document.getElementById("v3-coupon-applied");
    if (chip) {
      chip.classList.toggle("is-show", state.coupon.is_applied);
      set("v3-applied-code", state.coupon.is_applied ? state.coupon.code : "");
      set("v3-applied-savings", state.coupon.is_applied ? money(totals.discount) : "");
    }
    // Badge
    const b = document.getElementById("cartBadge");
    if (b) b.textContent = state.items.reduce((s, x) => s + x.quantity, 0);
  }

  // ---------- actions ----------
  document.addEventListener("click", (e) => {
    const target = e.target.closest("[data-action]");
    if (!target) return;
    const action = target.getAttribute("data-action");
    const card = target.closest(".pcl-v3-card");
    if (!card) return;
    const key = card.getAttribute("data-cart-key");
    const item = state.items.find((x) => x.key === key);
    if (!item) return;

    setCardLoading(card, true);
    setTimeout(() => {
      if (action === "increase") {
        item.quantity = Math.min(99, item.quantity + 1);
        item.line_subtotal = (parseFloat(item.unit_price) * item.quantity).toFixed(2);
        showToast("Quantity updated", "success");
      } else if (action === "decrease") {
        if (item.quantity <= 1) { setCardLoading(card, false); showToast("Minimum quantity is 1", "info"); return; }
        item.quantity -= 1;
        item.line_subtotal = (parseFloat(item.unit_price) * item.quantity).toFixed(2);
        showToast("Quantity updated", "success");
      } else if (action === "remove") {
        if (!confirm(`Remove ${item.display_name} from cart?`)) { setCardLoading(card, false); return; }
        state.items = state.items.filter((x) => x.key !== key);
        showToast("Item removed", "info");
      }
      renderItems();
    }, 250);
  });

  // ---------- coupon ----------
  const couponInput = document.getElementById("v3-coupon-input");
  const couponApply = document.getElementById("v3-coupon-apply");
  const couponRemove = document.getElementById("v3-coupon-remove");
  if (couponApply) {
    couponApply.addEventListener("click", () => {
      hideCouponError();
      const code = (couponInput.value || "").trim().toUpperCase();
      if (!code) { showCouponError("Please enter a coupon code."); return; }
      couponApply.disabled = true;
      const orig = couponApply.textContent;
      couponApply.textContent = "Applying...";
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
