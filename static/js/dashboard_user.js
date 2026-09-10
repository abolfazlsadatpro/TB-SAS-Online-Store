/**
 * Dashboard User JavaScript
 * Handles sidebar toggle, wishlist interactions, add to cart from wishlist
 */

(function () {
    'use strict';

    // CSRF Token
    function getCookie(name) {
        if (!document.cookie) return null;
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const c = cookies[i].trim();
            if (c.substring(0, name.length + 1) === name + '=') {
                return decodeURIComponent(c.substring(name.length + 1));
            }
        }
        return null;
    }

    const CSRF = getCookie('csrftoken');

    // ------------------------------------------------------------
    // Sidebar Toggle (Mobile)
    // ------------------------------------------------------------
    function initSidebarToggle() {
        const sidebar = document.getElementById('dashboardSidebar');
        const toggle = document.getElementById('sidebarToggle');
        const overlay = document.getElementById('sidebarOverlay');

        if (!sidebar || !toggle || !overlay) return;

        toggle.addEventListener('click', function () {
            sidebar.classList.toggle('open');
            overlay.classList.toggle('show');
        });

        overlay.addEventListener('click', function () {
            sidebar.classList.remove('open');
            overlay.classList.remove('show');
        });

        // Close on escape key
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && sidebar.classList.contains('open')) {
                sidebar.classList.remove('open');
                overlay.classList.remove('show');
            }
        });
    }

    // ------------------------------------------------------------
    // Wishlist Remove
    // ------------------------------------------------------------
    function initWishlistRemove() {
        document.addEventListener('click', function (e) {
            const btn = e.target.closest('.remove-wishlist-btn');
            if (!btn) return;

            const productId = btn.dataset.id;
            if (!productId) return;

            if (!confirm('Remove this item from your wishlist?')) return;

            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

            fetch('/wishlist/remove/' + productId + '/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-CSRFToken': CSRF || '',
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json'
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Remove the item from DOM
                    const item = btn.closest('.wishlist-item');
                    if (item) {
                        item.style.opacity = '0';
                        item.style.transform = 'translateX(20px)';
                        setTimeout(() => item.remove(), 300);
                    }
                    // Update wishlist count badge if exists
                    updateWishlistCount(data.total || 0);
                    // Show toast
                    showToast('Item removed from wishlist');
                } else {
                    showToast(data.message || 'Failed to remove item', 'error');
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fa-solid fa-trash"></i>';
                }
            })
            .catch(() => {
                showToast('An error occurred', 'error');
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-trash"></i>';
            });
        });
    }

    // ------------------------------------------------------------
    // Add to Cart from Wishlist
    // ------------------------------------------------------------
    function initAddToCartFromWishlist() {
        document.addEventListener('click', function (e) {
            const btn = e.target.closest('.add-to-cart-from-wishlist');
            if (!btn) return;

            const productId = btn.dataset.productId;
            const colorId = btn.dataset.colorId;

            if (!productId) return;

            const originalHtml = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

            const formData = new URLSearchParams();
            formData.append('product_id', productId);
            formData.append('quantity', '1');
            if (colorId) formData.append('color_id', colorId);

            fetch('/cart/add/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-CSRFToken': CSRF || '',
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json'
                },
                body: formData.toString()
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showToast('Added to cart!');
                    updateCartBadge(data.badge || 0);
                    btn.innerHTML = '<i class="fa-solid fa-check"></i>';
                    btn.classList.remove('btn-outline-success');
                    btn.classList.add('btn-success');
                    setTimeout(() => {
                        btn.innerHTML = originalHtml;
                        btn.classList.add('btn-outline-success');
                        btn.classList.remove('btn-success');
                        btn.disabled = false;
                    }, 2000);
                } else {
                    showToast(data.message || 'Failed to add to cart', 'error');
                    btn.disabled = false;
                    btn.innerHTML = originalHtml;
                }
            })
            .catch(() => {
                showToast('An error occurred', 'error');
                btn.disabled = false;
                btn.innerHTML = originalHtml;
            });
        });
    }

    // ------------------------------------------------------------
    // Utility Functions
    // ------------------------------------------------------------
    function updateWishlistCount(count) {
        const badges = document.querySelectorAll('#wishlistCount, #wishlistPageCount, .wishlist-count');
        badges.forEach(badge => {
            badge.textContent = count;
        });
        // Update any visible count elements
        document.querySelectorAll('[id*="wishlist"][id*="count"], [class*="wishlist"][class*="count"]').forEach(el => {
            if (el.textContent !== undefined) {
                el.textContent = count;
            }
        });
    }

    function updateCartBadge(count) {
        const badge = document.getElementById('cartBadge');
        if (badge) {
            badge.textContent = count;
            badge.style.display = count > 0 ? 'inline-flex' : 'none';
        }
    }

    function showToast(message, type = 'success') {
        // Create or reuse toast container
        let container = document.getElementById('dashboardToastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'dashboardToastContainer';
            container.style.cssText = 'position:fixed;top:1.5rem;right:1.5rem;z-index:9999;display:flex;flex-direction:column;gap:0.5rem;';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `alert alert-${type === 'success' ? 'success' : 'danger'} alert-dismissible fade show`;
        toast.style.cssText = 'min-width:280px;max-width:350px;box-shadow:0 4px 12px rgba(0,0,0,0.15);';
        toast.role = 'alert';
        toast.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;

        container.appendChild(toast);

        // Auto dismiss after 4 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 300);
            }
        }, 4000);
    }

    // ------------------------------------------------------------
    // Initialize
    // ------------------------------------------------------------
    document.addEventListener('DOMContentLoaded', function () {
        initSidebarToggle();
        initWishlistRemove();
        initAddToCartFromWishlist();
    });

})();