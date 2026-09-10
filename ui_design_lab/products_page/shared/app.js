// ============================================================
// SHARED INTERACTIONS — Design Lab
// Lightweight front-end behaviour shared by all proposals:
//   - mobile filter drawer open/close
//   - wishlist heart toggle
//   - sort active state
//   - quick-view modal (visual only)
//   - loading skeleton demo
//   - active filter chips (visual)
// All interactions are LOCAL + isolated from production JS.
// ============================================================

(function () {
    'use strict';

    function q(sel) { return document.querySelector(sel); }
    function qa(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }

    // ---------------------------------------------------------
    // Mobile filter drawer (generic: works with any markup that
    // has [data-drawer-open] / [data-drawer-close] / [data-overlay]
    // and a sidebar with [data-filter-sidebar]).
    // ---------------------------------------------------------
    function initDrawer() {
        const openers = qa('[data-drawer-open]');
        const closers = qa('[data-drawer-close]');
        const overlay = q('[data-overlay]');
        const sidebar = q('[data-filter-sidebar]');

        if (!sidebar) return;

        function open() {
            sidebar.classList.add('open');
            if (overlay) overlay.classList.add('show');
            document.body.style.overflow = 'hidden';
        }
        function close() {
            sidebar.classList.remove('open');
            if (overlay) overlay.classList.remove('show');
            document.body.style.overflow = '';
        }

        openers.forEach(function (btn) {
            btn.addEventListener('click', open);
        });
        closers.forEach(function (btn) {
            btn.addEventListener('click', close);
        });
        if (overlay) {
            overlay.addEventListener('click', function (e) {
                if (e.target === overlay) close();
            });
        }
    }

    // ---------------------------------------------------------
    // Wishlist heart toggle (visual) + header counter
    // ---------------------------------------------------------
    function initWishlist() {
        const hearts = qa('[data-wishlist]');
        const counter = q('[data-wishlist-count]');

        function updateCounter() {
            if (!counter) return;
            const active = qa('[data-wishlist].active').length;
            counter.textContent = active;
        }

        hearts.forEach(function (heart) {
            heart.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                heart.classList.toggle('active');
                const icon = heart.querySelector('i');
                if (icon) {
                    if (heart.classList.contains('active')) {
                        icon.classList.remove('fa-regular');
                        icon.classList.add('fa-solid');
                    } else {
                        icon.classList.remove('fa-solid');
                        icon.classList.add('fa-regular');
                    }
                }
                updateCounter();
            });
        });

        updateCounter();
    }

    // ---------------------------------------------------------
    // Sort buttons active state
    // ---------------------------------------------------------
    function initSort() {
        qa('[data-sort]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                qa('[data-sort]').forEach(function (b) { b.classList.remove('active'); });
                btn.classList.add('active');
            });
        });
    }

    // ---------------------------------------------------------
    // Quick View modal (visual only)
    // ---------------------------------------------------------
    function initQuickView() {
        const modal = q('[data-quickview-modal]');
        if (!modal) return;
        const titleEl = q('[data-quickview-title]');
        const imgEl = q('[data-quickview-img]');

        qa('[data-quickview]').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                const name = btn.getAttribute('data-quickview');
                const id = btn.getAttribute('data-product-id');
                if (titleEl) titleEl.textContent = name;
                if (imgEl && window.PRODUCTS_DATA) {
                    const p = window.PRODUCTS_DATA.filter(function (x) { return String(x.id) === String(id); })[0];
                    if (p) imgEl.src = window.productImageURI(p);
                }
                modal.classList.add('show');
                document.body.style.overflow = 'hidden';
            });
        });

        qa('[data-quickview-close]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                modal.classList.remove('show');
                document.body.style.overflow = '';
            });
        });
        modal.addEventListener('click', function (e) {
            if (e.target === modal) {
                modal.classList.remove('show');
                document.body.style.overflow = '';
            }
        });
    }

    // ---------------------------------------------------------
    // Active filter chips (visual demo: clicking a checkbox
    // toggles a chip in the active-filters bar)
    // ---------------------------------------------------------
    function initFilterChips() {
        const chipsBar = q('[data-active-chips]');
        if (!chipsBar) return;
        qa('[data-chip-filter]').forEach(function (input) {
            input.addEventListener('change', function () {
                const value = input.value;
                const existing = q('[data-chip="' + value + '"]');
                if (input.checked) {
                    if (!existing) {
                        const chip = document.createElement('span');
                        chip.className = 'chip';
                        chip.setAttribute('data-chip', value);
                        chip.innerHTML = value +
                            ' <button type="button" class="chip-x" aria-label="Remove">\u00d7</button>';
                        chip.querySelector('.chip-x').addEventListener('click', function () {
                            input.checked = false;
                            chip.remove();
                            syncChipsEmpty();
                        });
                        chipsBar.appendChild(chip);
                    }
                } else if (existing) {
                    existing.remove();
                }
                syncChipsEmpty();
            });
        });
        function syncChipsEmpty() {
            const emptyMsg = chipsBar.querySelector('[data-chips-empty]');
            const has = chipsBar.querySelectorAll('.chip').length > 0;
            if (emptyMsg) {
                emptyMsg.style.display = has ? 'none' : '';
            }
        }
    }

    // ---------------------------------------------------------
    // "Show loading skeleton" demo button
    // ---------------------------------------------------------
    function initSkeletonDemo() {
        const btn = q('[data-demo-loading]');
        if (!btn) return;
        btn.addEventListener('click', function () {
            const grid = q('[data-products-grid]');
            if (!grid) return;
            btn.disabled = true;
            const original = grid.innerHTML;
            grid.innerHTML =
                '<div data-loading-placeholder style="grid-column:1/-1;display:grid;gap:16px;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));">' +
                Array(6).fill('<div class="sk-card"><div class="sk-img"></div><div class="sk-line"></div><div class="sk-line short"></div></div>').join('') +
                '</div>';
            setTimeout(function () {
                grid.innerHTML = original;
                btn.disabled = false;
                // Re-wire events inside the restored grid
                initWishlist();
                initQuickView();
            }, 1600);
        });
    }

    // Boot
    document.addEventListener('DOMContentLoaded', function () {
        initDrawer();
        initWishlist();
        initSort();
        initQuickView();
        initFilterChips();
        initSkeletonDemo();
    });
})();