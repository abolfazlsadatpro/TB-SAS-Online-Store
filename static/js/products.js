// ============================================================
// PRODUCTS PAGE - AJAX FILTER / SORT / PAGINATION
// ============================================================

// All utility functions and filter code remains the same...

// ============================================================
// QUICK VIEW IMAGE RENDERING FIX
// ============================================================

let quickViewState = {
    productId: null,
    selectedColorId: null,
    quantity: 1,
};

function createQuickViewToast(type, title, message) {
    let toastContainer = document.getElementById('quickViewToastContainer');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'quickViewToastContainer';
        toastContainer.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 100000;
            width: auto;
            max-width: 90%;
        `;
        document.body.appendChild(toastContainer);
    }

    const toastEl = document.createElement('div');
    toastEl.className = 'qv-toast';
    toastEl.setAttribute('data-toast-type', type);

    const icons = {
        success: '<i class="fa-solid fa-check-circle"></i>',
        error: '<i class="fa-solid fa-exclamation-circle"></i>',
        warning: '<i class="fa-solid fa-info-circle"></i>',
        wishlist: '<i class="fa-solid fa-heart"></i>',
    };

    toastEl.innerHTML = `
        <div class="qv-toast-content">
            <span class="qv-toast-icon">
                ${icons[type] || icons.success}
            </span>
            <div class="qv-toast-text">
                <div class="qv-toast-title">${title}</div>
                ${message ? `<div class="qv-toast-message">${message}</div>` : ''}
            </div>
            <button class="qv-toast-close" aria-label="Close toast">
                <i class="fa-solid fa-xmark"></i>
            </button>
        </div>
    `;

    toastEl.querySelector('.qv-toast-close').addEventListener('click', () => {
        toastEl.classList.add('qv-toast-exit');
        setTimeout(() => toastEl.remove(), 300);
    });

    toastContainer.innerHTML = '';
    toastContainer.appendChild(toastEl);
    setTimeout(() => toastEl.classList.add('qv-toast-show'), 10);

    const autoDismissTimer = setTimeout(() => {
        if (toastEl.parentElement) {
            toastEl.classList.add('qv-toast-exit');
            setTimeout(() => toastEl.remove(), 300);
        }
    }, 3500);

    toastEl.querySelector('.qv-toast-close').addEventListener('click', () => {
        clearTimeout(autoDismissTimer);
    });
}

function resetQuickViewState() {
    quickViewState = {
        productId: null,
        selectedColorId: null,
        quantity: 1,
    };
}

function renderQuickViewQuantity(quantity) {
    const min = 1;
    const max = 99;

    let next = Number(quantity);
    if (!isFinite(next) || next < min) next = min;
    if (next > max) next = max;

    quickViewState.quantity = next;

    const valueEl = document.querySelector('#quickViewContent .qv-qty-value');
    const minusBtn = document.querySelector('#quickViewContent .qv-qty-minus');
    const plusBtn = document.querySelector('#quickViewContent .qv-qty-plus');

    if (valueEl) valueEl.textContent = quickViewState.quantity;
    if (minusBtn) minusBtn.disabled = quickViewState.quantity <= min;
    if (plusBtn) plusBtn.disabled = quickViewState.quantity >= max;
}

function syncQuickViewWithCart(productId, colorId) {
    fetch('/cart/state/')
        .then(response => response.json())
        .then(data => {
            if (!data.success) return;

            const expectedKey = String(productId) + ':' + String(colorId || '0');
            const items = data.items || [];
            const matchingItem = items.find(function(item) {
                return String(item.key) === expectedKey;
            });

            const authQty = matchingItem ? matchingItem.quantity : 1;
            renderQuickViewQuantity(authQty);
        })
        .catch(console.error);
}

function addQuickViewToCart(btn, productId, colorId, quantity) {
    const colorSelector = document.querySelector('#quickViewContent .qv-color-selector');
    if (colorSelector && colorSelector.children.length > 0 && (colorId === null || colorId === '')) {
        createQuickViewToast('error', 'Please select a color', 'Choose a color before adding to cart');
        return;
    }

    btn.disabled = true;
    const originalContent = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Adding...';

    const formData = new FormData();
    formData.append('product_id', productId);
    formData.append('quantity', quantity);
    formData.append('set_quantity', 'true');
    if (colorId) {
        formData.append('color_id', colorId);
    }

    fetch('/cart/add/', {
        method: 'POST',
        headers: {
            'X-CSRFToken': getCsrfToken(),
        },
        body: formData,
    })
        .then(response => response.json())
        .then(data => {
            btn.disabled = false;
            btn.innerHTML = originalContent;

            if (data.success) {
                const authQty = data.quantity !== undefined ? data.quantity : quantity;
                const colorBtn = document.querySelector(
                    `#quickViewContent .qv-color-btn[data-color-id="${colorId}"]`
                );
                const colorName = colorBtn ? colorBtn.title : 'Product';

                createQuickViewToast(
                    'success',
                    'Added to cart',
                    `${authQty} × ${colorName}`
                );

                syncQuickViewWithCart(productId, colorId);
            } else {
                createQuickViewToast('error', 'Failed to add', data.message || 'Try again');
            }
        })
        .catch(error => {
            btn.disabled = false;
            btn.innerHTML = originalContent;
            console.error('Cart error:', error);
            createQuickViewToast('error', 'Error occurred', 'Please try again');
        });
}

function showQuickView(productId) {
    resetQuickViewState();

    const modalContent = document.getElementById('quickViewContent');
    if (modalContent) {
        modalContent.innerHTML = `
            <div class="qv-loading">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </div>
        `;
    }

    const modalElement = document.getElementById('quickViewModal');
    if (!modalElement) return;

    const quickViewModal = new bootstrap.Modal(modalElement);
    quickViewModal.show();

    fetch(`/get-product-details/${productId}/`, {
        method: 'GET',
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'Accept': 'application/json'
        }
    })
        .then(response => {
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response.json();
        })
        .then(data => {
            if (data.success) {
                renderQuickViewContent(data.product);
                initializeQuickViewButtons(productId);
            } else {
                showErrorInModal('Failed to load product details');
            }
        })
        .catch(error => {
            console.error('Error fetching product details:', error);
            showErrorInModal('Error loading product details');
        });
}

function initializeQuickViewButtons(productId) {
    const modalContent = document.getElementById('quickViewContent');
    if (!modalContent) return;

    quickViewState.productId = productId;
    quickViewState.quantity = 1;

    // Color selector buttons
    const colorBtns = modalContent.querySelectorAll('.qv-color-btn');
    colorBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();

            const colorId = this.getAttribute('data-color-id');
            if (!colorId) return;

            colorBtns.forEach(b => b.classList.remove('qv-color-selected'));
            this.classList.add('qv-color-selected');
            quickViewState.selectedColorId = colorId;

            const colorImageUrl = this.getAttribute('data-image-url');
            if (colorImageUrl) {
                const mainImage = modalContent.querySelector('.qv-main-image img');
                if (mainImage) {
                    mainImage.src = colorImageUrl;
                }
            }

            syncQuickViewWithCart(productId, colorId);
        });
    });

    if (colorBtns.length > 0) {
        const defaultBtn = Array.from(colorBtns).find(btn => btn.getAttribute('data-is-default') === 'true')
            || colorBtns[0];
        defaultBtn.click();
    }

    // Quantity stepper
    const minusBtn = modalContent.querySelector('.qv-qty-minus');
    const plusBtn = modalContent.querySelector('.qv-qty-plus');

    if (minusBtn) {
        minusBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            renderQuickViewQuantity(quickViewState.quantity - 1);
        });
    }

    if (plusBtn) {
        plusBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            renderQuickViewQuantity(quickViewState.quantity + 1);
        });
    }

    // Add to Cart button
    const addToCartBtn = modalContent.querySelector('.qv-add-to-cart-btn');
    if (addToCartBtn) {
        addToCartBtn.addEventListener('click', function(e) {
            e.preventDefault();
            addQuickViewToCart(
                this,
                productId,
                quickViewState.selectedColorId,
                quickViewState.quantity
            );
        });
    }

    // Wishlist button
    const wishlistBtn = modalContent.querySelector('.qv-wishlist-btn');
    if (wishlistBtn) {
        const newWishlistBtn = wishlistBtn.cloneNode(true);
        wishlistBtn.parentNode.replaceChild(newWishlistBtn, wishlistBtn);

        newWishlistBtn.addEventListener('click', function(event) {
            event.preventDefault();
            event.stopPropagation();

            const pid = this.getAttribute('data-product-id');
            if (!pid) return;

            toggleCardWishlist(pid, this, true);
        });
    }

    // Image thumbnails
    const thumbnails = modalContent.querySelectorAll('.qv-thumbnail');
    thumbnails.forEach((thumb, index) => {
        thumb.addEventListener('click', function() {
            const mainImage = modalContent.querySelector('.qv-main-image img');
            const imageSrc = this.getAttribute('data-image-url');
            if (mainImage && imageSrc) {
                mainImage.src = imageSrc;
            }

            thumbnails.forEach(t => t.classList.remove('qv-thumbnail-active'));
            this.classList.add('qv-thumbnail-active');
        });
    });

    renderQuickViewQuantity(1);
}

function renderQuickViewContent(product) {
    const modalContent = document.getElementById('quickViewContent');
    if (!modalContent) return;

    const colors = product.colors || [];
    const hasColors = colors.length > 0;
    const images = product.images || [];

    // FIX: Backend returns main_image as STRING (already the URL)
    // Do NOT access .url property - it's already a string
    let mainImageUrl = product.main_image;
    if (!mainImageUrl && images.length > 0) {
        mainImageUrl = images[0].url;
    }
    if (!mainImageUrl) {
        mainImageUrl = 'https://via.placeholder.com/400x500?text=No+Image';
    }

    // Build thumbnail HTML - use proper <img> tags with correct src attribute
    let thumbnailsHtml = '';
    if (images.length > 0) {
        thumbnailsHtml = images.slice(0, 5).map((img, idx) => `
            <button
                type="button"
                class="qv-thumbnail ${idx === 0 ? 'qv-thumbnail-active' : ''}"
                data-image-url="${img.url}"
                aria-label="View image ${idx + 1}"
            >
                <img src="${img.url}" alt="Product thumbnail ${idx + 1}" style="width: 100%; height: 100%; object-fit: cover;" />
            </button>
        `).join('');
    }

    // Build color selector HTML
    let colorSelectorHtml = '';
    if (hasColors) {
        colorSelectorHtml = `
            <div class="qv-color-section">
                <div class="qv-color-label">Color:</div>
                <div class="qv-color-selector">
                    ${colors.map(color => {
                        const colorImageUrl = color.image ? color.image.url : '';
                        return `
                            <button
                                type="button"
                                class="qv-color-btn"
                                data-color-id="${color.id}"
                                data-is-default="${color.is_default ? 'true' : 'false'}"
                                data-image-url="${colorImageUrl}"
                                title="${color.name}"
                                style="background-color: ${color.color_code};"
                                aria-label="Select ${color.name}"
                            >
                                <span class="visually-hidden">${color.name}</span>
                            </button>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    const stockStatus = product.is_in_stock
        ? '<span class="qv-stock-badge qv-stock-in">In Stock</span>'
        : '<span class="qv-stock-badge qv-stock-out">Out of Stock</span>';

    // Render modal - main image is now a proper <img> tag, not text
    modalContent.innerHTML = `
        <div class="qv-wrapper">
            <div class="qv-grid">
                <!-- LEFT: Image Column -->
                <div class="qv-image-col">
                    <div class="qv-main-image">
                        <img src="${mainImageUrl}" alt="${product.name}" style="width: 100%; height: auto; display: block;" />
                    </div>
                    ${images.length > 1 ? `
                        <div class="qv-thumbnails">
                            ${thumbnailsHtml}
                        </div>
                    ` : ''}
                </div>

                <!-- RIGHT: Product Info Column -->
                <div class="qv-info-col">
                    <div class="qv-header">
                        ${stockStatus}
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>

                    <h2 class="qv-title">${product.name || 'Product'}</h2>

                    <div class="qv-rating-section">
                        <div class="qv-stars">
                            ${Array.from({length: 5}, (_, i) => {
                                const isFull = i < product.star_full.length;
                                const isHalf = product.star_half && i === Math.floor(product.star_full.length);
                                if (isFull) return '<i class="fa-solid fa-star"></i>';
                                if (isHalf) return '<i class="fa-solid fa-star-half-stroke"></i>';
                                return '<i class="fa-regular fa-star"></i>';
                            }).join('')}
                        </div>
                        ${product.rating_count ? `<span class="qv-rating-count">${product.rating_count} reviews</span>` : ''}
                    </div>

                    <div class="qv-price-section">
                        <div class="qv-price">
                            <span class="qv-final-price">$${product.final_price}</span>
                            ${product.has_discount ? `
                                <span class="qv-old-price">$${product.price}</span>
                                <span class="qv-discount-badge">${product.discount_percent}% OFF</span>
                            ` : ''}
                        </div>
                    </div>

                    ${product.description ? `<div class="qv-description"><p>${product.description}</p></div>` : ''}

                    ${product.attributes && product.attributes.length > 0 ? `
                        <div class="qv-specs">
                            <h6>Specifications</h6>
                            <ul>
                                ${product.attributes.map(attr => `<li><strong>${attr.name}:</strong> ${attr.value}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}

                    ${colorSelectorHtml}

                    <div class="qv-controls">
                        <div class="qv-quantity-section">
                            <label class="qv-qty-label">Quantity</label>
                            <div class="qv-qty-stepper">
                                <button type="button" class="qv-qty-minus" aria-label="Decrease quantity">−</button>
                                <span class="qv-qty-value">1</span>
                                <button type="button" class="qv-qty-plus" aria-label="Increase quantity">+</button>
                            </div>
                        </div>

                        <div class="qv-action-buttons">
                            <button type="button" class="qv-add-to-cart-btn">
                                <i class="fa-solid fa-cart-shopping"></i>
                                <span>Add to Cart</span>
                            </button>
                            <button type="button" class="qv-wishlist-btn product-wishlist-btn ${product.in_wishlist ? 'is-active' : ''}" data-product-id="${product.id}">
                                <i class="${product.in_wishlist ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
                            </button>
                        </div>
                    </div>

                    <div class="qv-service-row">
                        <div class="qv-service-item"><i class="fa-solid fa-truck"></i><span>Free Shipping</span></div>
                        <div class="qv-service-item"><i class="fa-solid fa-headset"></i><span>24/7 Support</span></div>
                        <div class="qv-service-item"><i class="fa-solid fa-lock"></i><span>Secure Payment</span></div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function showErrorInModal(message) {
    const modalContent = document.getElementById('quickViewContent');
    if (!modalContent) return;

    modalContent.innerHTML = `
        <div class="alert alert-danger">${message}</div>
        <div class="text-center mt-3">
            <button type="button" class="btn btn-secondary" onclick="hideQuickView()">Close</button>
        </div>
    `;
}

function hideQuickView() {
    const modalElement = document.getElementById('quickViewModal');
    if (!modalElement) return;
    const quickViewModal = bootstrap.Modal.getInstance(modalElement);
    if (quickViewModal) quickViewModal.hide();
}

function initQuickViewButtons() {
    document.querySelectorAll('.quick-view-btn').forEach(button => {
        button.addEventListener('click', function() {
            const productId = this.getAttribute('data-product-id');
            if (productId) showQuickView(productId);
        });
    });
}

function toggleCardWishlist(productId, button, showToast = false) {
    const icon = button.querySelector('i');
    const csrfToken = getCsrfToken();

    if (!csrfToken) {
        console.error('Wishlist error: CSRF token not found');
        return;
    }

    fetch(`/wishlist/add/${productId}/`, {
        method: 'POST',
        headers: {
            'X-CSRFToken': csrfToken,
            'X-Requested-With': 'XMLHttpRequest',
            'Accept': 'application/json'
        },
        credentials: 'same-origin'
    })
        .then(response => {
            const contentType = response.headers.get('Content-Type') || '';
            if (response.redirected || !contentType.includes('application/json')) {
                window.location.href = LOGIN_PAGE_URL;
                return null;
            }
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response.json();
        })
        .then(data => {
            if (data === null) return;
            if (!data.success) throw new Error('Wishlist update failed');

            if (data.action === 'added') {
                button.classList.add('is-active');
                if (icon) {
                    icon.classList.remove('fa-regular');
                    icon.classList.add('fa-solid');
                }
                if (showToast) createQuickViewToast('wishlist', 'Added to Wishlist', 'Product saved successfully');
            } else if (data.action === 'removed') {
                button.classList.remove('is-active');
                if (icon) {
                    icon.classList.remove('fa-solid');
                    icon.classList.add('fa-regular');
                }
                if (showToast) createQuickViewToast('error', 'Removed from Wishlist', '');
            }

            const wishlistCountElement = document.getElementById('wishlistCount');
            if (wishlistCountElement && typeof data.total !== 'undefined') {
                wishlistCountElement.textContent = data.total;
            }
        })
        .catch(error => {
            console.error('Wishlist update error:', error);
            if (showToast) createQuickViewToast('error', 'Error', 'Could not update wishlist');
        });
}

const LOGIN_PAGE_URL = '/users/show_login';

function getCsrfToken() {
    const name = 'csrftoken=';
    const cookie = document.cookie.split(';').map(c => c.trim()).find(c => c.startsWith(name));
    return cookie ? decodeURIComponent(cookie.substring(name.length)) : '';
}

function initCardWishlistButtons() {
    document.querySelectorAll('.product-wishlist-btn').forEach(button => {
        button.addEventListener('click', function (event) {
            event.preventDefault();
            const productId = this.getAttribute('data-product-id');
            if (!productId) return;
            toggleCardWishlist(productId, this);
        });
    });
}

function initProductCardNavigation() {
    const grid = document.querySelector('.p1-grid');
    if (!grid) return;

    grid.addEventListener('click', (e) => {
        const card = e.target.closest('.p1-card');
        if (!card) return;

        if (e.target.closest('.p1-wish') || e.target.closest('.p1-quickview') || 
            e.target.closest('.mini-cart-btn') || e.target.closest('.p1-color')) return;

        const productId = card.dataset.productId;
        if (productId) window.location.href = `/product_detail/${productId}/`;
    });
}

// Global exports
window.toggleFilter = toggleFilter;
