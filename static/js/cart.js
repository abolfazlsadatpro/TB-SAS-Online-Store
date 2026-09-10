/**
 * Cart Interaction Layer — Production
 * Design: V2 (Audit Driven) + V3 step indicator + V3 line breakdown
 *
 * State flow:
 *   User interaction
 *      ↓
 *   Disable relevant controls (per-card or per-control)
 *      ↓
 *   POST mutation (add / update / remove / coupon)
 *      ↓
 *   Receive response (which already includes authoritative state)
 *      ↓
 *   Render authoritative state (only fetch /cart/state/ when needed)
 *      ↓
 *   Re-enable controls
 *
 * Constraints:
 * - Server-authoritative for prices, stock, coupon validity
 * - Remove supports server-safe undo via /cart/add/ (uses saved product_id + color_id + quantity)
 * - No race conditions: per-card control disabling
 * - No double duplicate `updateCardDisplay` (single authoritative implementation)
 * - Compatible hooks: data-cart-key, data-product-id, data-color-id, data-action, #cartBadge
 */
(function () {
  "use strict";

  // ------------------------------------------------------------------
  // CSRF
  // ------------------------------------------------------------------
  function getCookie(name) {
    if (!document.cookie) return null;
    const cookies = document.cookie.split(";");
    for (let i = 0; i < cookies.length; i++) {
      const c = cookies[i].trim();
      if (c.substring(0, name.length + 1) === name + "=") {
        return decodeURIComponent(c.substring(name.length + 1));
      }
    }
    return null;
  }
  const CSRF = getCookie("csrftoken");
  const FETCH_HEADERS = {
    "Content-Type": "application/x-www-form-urlencoded",
    "X-Requested-With": "XMLHttpRequest",
    "Accept": "application/json",
    "X-CSRFToken": CSRF || "",
  };

  // ------------------------------------------------------------------
  // DOM helpers
  // ------------------------------------------------------------------
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

  function fmtMoney(s) {
    const v = parseFloat(s);
    if (isNaN(v)) return s;
    return "$" + v.toFixed(2);
  }

  // ------------------------------------------------------------------
  // Single authoritative updateCardDisplay (no duplicates)
  // ------------------------------------------------------------------
  function updateCardDisplay(card, itemData) {
    if (!card || !itemData) return;
    const qtyInput = card.querySelector(".cart-qty-input");
    if (qtyInput && itemData.quantity !== undefined) {
      qtyInput.value = itemData.quantity;
    }
    const total = card.querySelector(".cart-card-line-total");
    if (total && itemData.line_subtotal !== undefined) {
      total.textContent = fmtMoney(itemData.line_subtotal);
    }
  }

  // ------------------------------------------------------------------
  // Per-card control locking
  // ------------------------------------------------------------------
  function setCardLocked(card, locked) {
    if (!card) return;
    card.classList.toggle("is-loading", !!locked);
    $$("button, input", card).forEach(function (el) {
      if (el.tagName === "INPUT" || el.tagName === "BUTTON") {
        el.disabled = !!locked;
      }
    });
  }

  // ------------------------------------------------------------------
  // Summary rendering (server-authoritative values)
  // ------------------------------------------------------------------
  function renderSummary(data) {
    if (!data) return;
    // Subtotal
    const sub = $("#cartSummarySubtotal");
    if (sub && data.subtotal !== undefined) sub.textContent = fmtMoney(data.subtotal);
    // Count
    const count = $("#cartSummaryCount");
    if (count && data.badge !== undefined) count.textContent = data.badge;
    // Shipping
    const ship = $("#cartSummaryShipping");
    if (ship && data.shipping !== undefined) {
      const v = parseFloat(data.shipping);
      ship.textContent = v === 0 ? "Free" : fmtMoney(data.shipping);
    }
    // Tax
    const taxRow = $("#cartSummaryTaxRow");
    const tax = $("#cartSummaryTax");
    if (taxRow && tax) {
      const tv = parseFloat(data.tax || "0");
      if (tv > 0) {
        taxRow.style.display = "flex";
        tax.textContent = fmtMoney(data.tax);
      } else {
        taxRow.style.display = "none";
      }
    }
    // Discount
    const dRow = $("#cartSummaryDiscountRow");
    const dVal = $("#cartSummaryDiscount");
    if (dRow && dVal) {
      const dv = parseFloat(data.discount || "0");
      if (dv > 0) {
        dRow.style.display = "flex";
        dVal.textContent = "-" + fmtMoney(data.discount);
      } else {
        dRow.style.display = "none";
      }
    }
    // Total
    const total = $("#cartSummaryTotal");
    if (total && data.total !== undefined) total.textContent = fmtMoney(data.total);
  }

  function renderSubtitle(data) {
    const sub = $("#cartSubtitle");
    if (!sub || !data) return;
    const lines = data.lines_count || 0;
    const badge = data.badge || 0;
    sub.textContent = lines + " product" + (lines === 1 ? "" : "s") + " · " +
      badge + " item" + (badge === 1 ? "" : "s");
  }

  function renderBadge(data) {
    const b = $("#cartBadge");
    if (b && data && data.badge !== undefined) b.textContent = data.badge;
  }

  function renderCoupon(data) {
    const applied = $("#cartCouponApplied");
    const codeSpan = $("#cartCouponAppliedCode");
    if (!applied) return;
    if (data && data.coupon_applied && data.coupon_code) {
      if (codeSpan) codeSpan.textContent = data.coupon_code;
      applied.classList.add("is-show");
    } else {
      applied.classList.remove("is-show");
    }
  }

  function renderItems(data) {
    if (!data) return;
    // If items_count is 0, show empty state.
    if (data.items_count === 0) {
      showEmptyState();
    } else {
      showItemsState();
      // Sync card quantities/totals from authoritative items list.
      if (Array.isArray(data.items)) {
        data.items.forEach(function (it) {
          const card = document.querySelector('.cart-card[data-cart-key="' + cssEscape(it.key) + '"]');
          if (card) updateCardDisplay(card, it);
        });
      }
    }
  }

  function cssEscape(s) {
    if (window.CSS && CSS.escape) return CSS.escape(s);
    return String(s).replace(/["\\]/g, "\\$&");
  }

  // ------------------------------------------------------------------
  // Empty state handling
  // ------------------------------------------------------------------
  function showEmptyState() {
    const itemsContainer = $("#cartItems");
    if (!itemsContainer) return;
    if ($("#cartEmpty")) return; // already shown
    itemsContainer.innerHTML = "" +
      '<div class="cart-empty" id="cartEmpty" aria-label="Empty cart">' +
      '  <div class="cart-empty-icon" aria-hidden="true"><i class="fa-solid fa-cart-shopping"></i></div>' +
      '  <h2>Your cart is empty</h2>' +
      '  <p>You haven\'t added anything yet. Discover products and add your favorites to the cart.</p>' +
      '  <a href="/products/" class="cart-empty-action">' +
      '    <i class="fa-solid fa-arrow-left" aria-hidden="true"></i> Continue Shopping' +
      '  </a>' +
      '</div>';
    // Hide coupon section when empty
    const coupon = $(".cart-coupon");
    if (coupon) coupon.style.display = "none";
    // Hide summary
    const summary = $(".cart-summary");
    if (summary) summary.style.display = "none";
  }

  function showItemsState() {
    const empty = $("#cartEmpty");
    if (empty) empty.remove();
    const coupon = $(".cart-coupon");
    if (coupon) coupon.style.display = "";
    const summary = $(".cart-summary");
    if (summary) summary.style.display = "";
  }

  // ------------------------------------------------------------------
  // Toast / Undo
  // ------------------------------------------------------------------
  function ensureToastRegion() {
    let region = $("#cartToastRegion");
    if (!region) {
      region = document.createElement("div");
      region.id = "cartToastRegion";
      region.className = "cart-toast-region";
      region.setAttribute("role", "status");
      region.setAttribute("aria-live", "polite");
      document.body.appendChild(region);
    }
    return region;
  }

  function showToast(message, opts) {
    opts = opts || {};
    const region = ensureToastRegion();
    const t = document.createElement("div");
    t.className = "cart-toast" + (opts.kind ? " is-" + opts.kind : "");
    const msgSpan = document.createElement("span");
    msgSpan.textContent = message || "";
    t.appendChild(msgSpan);

    if (opts.undo) {
      const undoBtn = document.createElement("button");
      undoBtn.type = "button";
      undoBtn.className = "cart-toast-undo";
      undoBtn.textContent = "Undo";
      undoBtn.addEventListener("click", function () {
        if (typeof opts.undo === "function") opts.undo();
        clearTimeout(opts._t);
        t.classList.remove("is-show");
        setTimeout(function () { t.remove(); }, 200);
      });
      t.appendChild(undoBtn);
    }

    region.appendChild(t);
    requestAnimationFrame(function () { t.classList.add("is-show"); });

    const ttl = opts.duration || 4500;
    opts._t = setTimeout(function () {
      t.classList.remove("is-show");
      setTimeout(function () { t.remove(); }, 250);
    }, ttl);
  }

  // ------------------------------------------------------------------
  // Fetch state from server (used when needed for full refresh)
  // ------------------------------------------------------------------
  function fetchCartState() {
    return fetch("/cart/state/", {
      method: "GET",
      headers: { "X-Requested-With": "XMLHttpRequest", "Accept": "application/json" },
      credentials: "same-origin",
    }).then(function (r) {
      if (!r.ok) throw new Error("Cart state fetch failed: " + r.status);
      return r.json();
    });
  }

  // ------------------------------------------------------------------
  // Generic POST (returns parsed JSON)
  // ------------------------------------------------------------------
  function postJSON(url, body) {
    return fetch(url, {
      method: "POST",
      headers: FETCH_HEADERS,
      body: new URLSearchParams(body || {}),
      credentials: "same-origin",
    }).then(function (r) {
      return r.json().catch(function () {
        return { success: false, message: "Invalid server response." };
      }).then(function (data) {
        return { status: r.status, data: data };
      });
    });
  }

  // ------------------------------------------------------------------
  // Apply server response to DOM
  // ------------------------------------------------------------------
  function applyStateData(data) {
    if (!data) return;
    renderSubtitle(data);
    renderBadge(data);
    renderSummary(data);
    renderItems(data);
    renderCoupon(data);
  }

  // ------------------------------------------------------------------
  // Server-safe Undo:
  // On remove, we POST /cart/add/ with the same product_id + color_id + quantity.
  // This restores the line item through the existing add endpoint.
  // ------------------------------------------------------------------
  function undoRemove(productId, colorId, quantity) {
    if (!productId || !quantity) return Promise.resolve();
    const body = { product_id: String(productId), quantity: String(quantity) };
    if (colorId) body.color_id = String(colorId);
    return postJSON("/cart/add/", body).then(function () {
      return fetchCartState();
    }).then(applyStateData).then(function () {
      showToast("Item restored.", { kind: "success" });
    }).catch(function () {
      showToast("Could not restore item. Please try again.", { kind: "error" });
    });
  }

  // ------------------------------------------------------------------
  // Event delegation: quantity +/-, direct input, remove
  // ------------------------------------------------------------------
  function initMutations() {
    const items = $("#cartItems");
    if (!items) return;

    // Delegate click events for + / - / remove
    items.addEventListener("click", function (e) {
      const target = e.target.closest("[data-action]");
      if (!target) return;
      const action = target.getAttribute("data-action");
      const card = target.closest(".cart-card");
      if (!card) return;
      const key = card.getAttribute("data-cart-key");
      if (!key) return;

      if (action === "increase") {
        const input = card.querySelector(".cart-qty-input");
        const cur = input ? Math.max(1, parseInt(input.value, 10) || 1) : 1;
        setCardLocked(card, true);
        postJSON("/cart/update/", { key: key, quantity: String(cur + 1) }).then(function (res) {
          if (res.data && res.data.success) {
            // The response already contains the full authoritative state.
            applyStateData(res.data);
          } else {
            showToast((res.data && res.data.message) || "Could not increase quantity.", { kind: "error" });
          }
        }).catch(function () {
          showToast("Network error. Please try again.", { kind: "error" });
        }).finally(function () { setCardLocked(card, false); });
      } else if (action === "decrease") {
        const input = card.querySelector(".cart-qty-input");
        const cur = input ? Math.max(1, parseInt(input.value, 10) || 1) : 1;
        if (cur <= 1) {
          showToast("Minimum quantity is 1.", { kind: "info", duration: 2000 });
          return;
        }
        setCardLocked(card, true);
        postJSON("/cart/update/", { key: key, quantity: String(cur - 1) }).then(function (res) {
          if (res.data && res.data.success) {
            applyStateData(res.data);
          } else {
            showToast((res.data && res.data.message) || "Could not decrease quantity.", { kind: "error" });
          }
        }).catch(function () {
          showToast("Network error. Please try again.", { kind: "error" });
        }).finally(function () { setCardLocked(card, false); });
      } else if (action === "remove") {
        const productId = card.getAttribute("data-product-id");
        const colorId = card.getAttribute("data-color-id");
        const qtyInput = card.querySelector(".cart-qty-input");
        const qty = qtyInput ? parseInt(qtyInput.value, 10) || 1 : 1;
        const itemName = (card.querySelector(".cart-card-name") || {}).textContent || "Item";

        setCardLocked(card, true);
        card.classList.add("is-removing");
        postJSON("/cart/remove/", { key: key }).then(function (res) {
          if (res.data && res.data.success) {
            card.remove();
            // After remove the response contains full state.
            applyStateData(res.data);
            showToast(itemName.trim() + " removed.", {
              kind: "info",
              duration: 5000,
              undo: function () {
                undoRemove(productId, colorId && colorId !== "0" && colorId !== "" ? colorId : null, qty);
              },
            });
          } else {
            card.classList.remove("is-removing");
            setCardLocked(card, false);
            showToast((res.data && res.data.message) || "Could not remove item.", { kind: "error" });
          }
        }).catch(function () {
          card.classList.remove("is-removing");
          setCardLocked(card, false);
          showToast("Network error. Please try again.", { kind: "error" });
        });
      }
    });

    // Direct quantity input
    items.addEventListener("change", function (e) {
      const target = e.target.closest(".cart-qty-input");
      if (!target) return;
      const card = target.closest(".cart-card");
      if (!card) return;
      const key = card.getAttribute("data-cart-key");
      let v = parseInt(target.value, 10);
      if (isNaN(v) || v < 1) v = 1;
      if (v > 99) v = 99;
      if (parseInt(target.value, 10) !== v) target.value = String(v);

      setCardLocked(card, true);
      postJSON("/cart/update/", { key: key, quantity: String(v) }).then(function (res) {
        if (res.data && res.data.success) {
          applyStateData(res.data);
        } else {
          showToast((res.data && res.data.message) || "Invalid quantity.", { kind: "error" });
        }
      }).catch(function () {
        showToast("Network error. Please try again.", { kind: "error" });
      }).finally(function () { setCardLocked(card, false); });
    });
  }

  // ------------------------------------------------------------------
  // Coupon
  // ------------------------------------------------------------------
  function setCouponError(message) {
    const wrap = $("#cartCouponError");
    const span = $("#cartCouponErrorMsg");
    if (wrap && span) {
      span.textContent = message;
      wrap.classList.add("is-show");
    }
  }
  function clearCouponError() {
    const wrap = $("#cartCouponError");
    if (wrap) wrap.classList.remove("is-show");
  }

  function initCoupon() {
    const form = $("#cartCouponForm");
    const input = $("#cartCouponInput");
    const btn = $("#cartCouponApply");
    const removeBtn = $("#cartCouponRemove");
    if (!form || !input || !btn) return;

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      clearCouponError();
      const code = (input.value || "").trim();
      if (!code) { setCouponError("Please enter a coupon code."); return; }
      const original = btn.textContent;
      btn.disabled = true;
      btn.textContent = "Checking...";
      postJSON("/cart/coupon/", { code: code }).then(function (res) {
        if (res.data && res.data.success) {
          input.value = "";
          showToast(res.data.message || "Coupon applied.", { kind: "success" });
          applyStateData(res.data);
        } else {
          setCouponError((res.data && res.data.message) || "Invalid coupon code.");
        }
      }).catch(function () {
        setCouponError("Network error. Please try again.");
      }).finally(function () {
        btn.disabled = false;
        btn.textContent = original;
      });
    });

    if (removeBtn) {
      removeBtn.addEventListener("click", function () {
        clearCouponError();
        removeBtn.disabled = true;
        postJSON("/cart/coupon/remove/", {}).then(function (res) {
          if (res.data && res.data.success) {
            showToast(res.data.message || "Coupon removed.", { kind: "info" });
            applyStateData(res.data);
          }
        }).catch(function () {
          showToast("Network error. Please try again.", { kind: "error" });
        }).finally(function () {
          removeBtn.disabled = false;
        });
      });
    }
  }

  // ------------------------------------------------------------------
  // Init: render the initial state from the DOM
  // ------------------------------------------------------------------
  function init() {
    initMutations();
    initCoupon();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
