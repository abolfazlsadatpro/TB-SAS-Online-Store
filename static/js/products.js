// Enhanced products.js with improved UX features

// Utility functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function updateURLWithoutReload(params) {
    const url = new URL(window.location);
    Object.entries(params).forEach(([key, value]) => {
        if (value === '' || value === null) {
            url.searchParams.delete(key);
        } else {
            url.searchParams.set(key, value);
        }
    });
    window.history.pushState({ path: url.href }, '', url.href);
}

// Filter enhancements
function toggleFilter(el) {
    const parent = el.parentElement;
    parent.classList.toggle("open");

    // Update ARIA attributes
    const isOpen = parent.classList.contains('open');
    el.setAttribute('aria-expanded', isOpen);
    const content = parent.querySelector('.filter-content');
    if (content) {
        content.setAttribute('aria-hidden', !isOpen);
    }
}

function clearAllFilters() {
    // Reset filter form
    const filterForm = document.getElementById('filterForm');
    if (filterForm) {
        // Reset all inputs except page and sort
        filterForm.querySelectorAll('input, select, checkbox, radio').forEach(el => {
            if (!['pageInput', 'sortInput'].includes(el.id)) {
                if (el.type === 'checkbox' || el.type === 'radio') {
                    el.checked = false;
                } else if (el.type === 'range') {
                    el.value = el.min || '0';
                } else {
                    el.value = '';
                }
            }
        });

        // Reset hidden inputs
        document.getElementById('pageInput').value = '1';

        // Submit form
        submitFilterForm();
    }
}

function showMoreLessFilterGroup(groupId, showLimit = 8) {
    const group = document.getElementById(groupId);
    if (!group) return;

    const content = group.querySelector('.filter-content');
    if (!content) return;

    const items = content.querySelectorAll('.filter-check, .filter-link, .filter-pill');
    if (items.length <= showLimit) return;

    // Toggle show more/less
    const isExpanded = group.classList.contains('expanded');
    items.forEach((item, index) => {
        if (index >= showLimit) {
            item.style.display = isExpanded ? '' : 'none';
        }
    });

    // Update button text
    const toggleBtn = group.querySelector('.filter-show-toggle');
    if (toggleBtn) {
        toggleBtn.textContent = isExpanded ? 'Show more' : 'Show less';
    }

    group.classList.toggle('expanded');
}

function updateActiveFiltersCount() {
    const badge = document.getElementById('filterBadge');
    if (!badge) return;

    let count = 0;

    // Count active category filters
    const categoryButtons = document.querySelectorAll('[data-category].active');
    count += categoryButtons.length;

    // Count active brand filters
    const brandCheckboxes = document.querySelectorAll('.brand-filter:checked');
    count += brandCheckboxes.length;

    // Count active attribute filters
    const attrInputs = document.querySelectorAll('input[name^="attr_"]:checked');
    count += attrInputs.length;

    // Count active price filters (if changed from default)
    const priceMin = document.getElementById('priceMinInput');
    const priceMax = document.getElementById('priceRange');
    const defaultMin = priceMin ? priceMin.value : '0';
    const defaultMax = priceMax ? priceMax.getAttribute('max') : '9999';

    if (priceMin && priceMin.value !== defaultMin) count++;
    if (priceMax && priceMax.value !== defaultMax) count++;

    // Update badge
    if (count > 0) {
        badge.textContent = count;
        badge.style.display = 'inline-block';
    } else {
        badge.style.display = 'none';
    }
}

// Enhanced filter form handling
let filterSubmitTimeout;

function setFilterValue(name, value) {
    const input = document.querySelector(`input[name="${name}"]`);
    if (input) {
        input.value = value;
    }
    // Update active states
    document.querySelectorAll(`[data-${name}]`).forEach(el => {
        el.classList.toggle('active', el.dataset[name] === value);
    });
    submitFilterForm();
}

function submitFilterForm() {
    clearTimeout(filterSubmitTimeout);
    filterSubmitTimeout = setTimeout(() => {
        document.getElementById('pageInput').value = '1';

        // Show loading state
        showLoadingState();

        // Update URL without reload for better UX
        const form = document.getElementById('filterForm');
        const formData = new FormData(form);
        const params = {};
        formData.forEach((value, key) => {
            if (key !== 'ajax') { // Don't include ajax param in URL
                params[key] = value;
            }
        });
        updateURLWithoutReload(params);

        document.getElementById('filterForm').submit();
    }, 300); // Increased debounce for better performance
}

function submitFilterFormDebounced() {
    clearTimeout(filterSubmitTimeout);
    filterSubmitTimeout = setTimeout(() => {
        document.getElementById('pageInput').value = '1';

        // Show loading state
        showLoadingState();

        document.getElementById('filterForm').submit();
    }, 500);
}

function updatePriceDisplay(value) {
    const priceValue = document.getElementById('priceValue');
    if (priceValue) {
        priceValue.textContent = '$' + parseInt(value).toLocaleString();
    }
}

function syncPriceRange() {
    const priceMinInput = document.getElementById('priceMinInput');
    const priceMaxInput = document.getElementById('priceMaxInput');
    const priceRange = document.getElementById('priceRange');
    const priceMinLabel = document.getElementById('priceMinLabel');
    const priceValue = document.getElementById('priceValue');

    if (!priceMinInput || !priceMaxInput || !priceRange) return;

    const minVal = parseInt(priceMinInput.value) || 0;
    const maxVal = parseInt(priceMaxInput.value) || parseInt(priceRange.max);

    // Ensure min <= max
    if (minVal > maxVal) {
        priceMaxInput.value = minVal;
    }

    priceRange.min = minVal;
    priceRange.max = maxVal;
    priceRange.value = priceMaxInput.value;

    if (priceMinLabel) priceMinLabel.textContent = '$' + minVal.toLocaleString();
    if (priceValue) priceValue.textContent = '$' + maxVal.toLocaleString();
}

function updatePriceInputFromRange(value) {
    const priceMaxInput = document.getElementById('priceMaxInput');
    const priceValue = document.getElementById('priceValue');

    if (priceMaxInput) {
        priceMaxInput.value = value;
    }
    if (priceValue) {
        priceValue.textContent = '$' + parseInt(value).toLocaleString();
    }
}

// Loading states
function showLoadingState() {
    const productsContainer = document.getElementById('productsContainer');
    if (!productsContainer) return;

    // Add skeleton loader
    productsContainer.insertAdjacentHTML('afterbegin', `
        <div id="skeleton-loader" class="skeleton-loader">
            <div class="skeleton-item"></div>
            <div class="skeleton-item"></div>
            <div class="skeleton-item"></div>
            <div class="skeleton-item"></div>
            <div class="skeleton-item"></div>
            <div class="skeleton-item"></div>
        </div>
    `);

    // Add overlay
    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.innerHTML = '<div class="loading-spinner"></div>';
    productsContainer.appendChild(overlay);
}

function hideLoadingState() {
    const skeleton = document.getElementById('skeleton-loader');
    if (skeleton) skeleton.remove();

    const overlay = document.querySelector('.loading-overlay');
    if (overlay) overlay.remove();
}

// Mobile filter sidebar toggle
function initMobileFilter() {
    document.addEventListener('DOMContentLoaded', function() {
        const sidebar = document.getElementById('filterSidebar');
        const toggleBtn = document.getElementById('mobileFilterToggle');
        const closeBtn = document.getElementById('closeFilters');
        const overlay = document.getElementById('filterOverlay');

        if (toggleBtn && sidebar) {
            toggleBtn.addEventListener('click', () => {
                sidebar.classList.add('open');
                if (overlay) overlay.classList.add('show');
                document.body.style.overflow = 'hidden';

                // Prevent background scroll
                document.body.addEventListener('touchmove', preventScroll, { passive: false });
            });
        }

        if (closeBtn && sidebar) {
            closeBtn.addEventListener('click', () => {
                sidebar.classList.remove('open');
                if (overlay) overlay.classList.remove('show');
                document.body.style.overflow = '';

                // Re-enable background scroll
                document.body.removeEventListener('touchmove', preventScroll);
            });
        }

        if (overlay) {
            overlay.addEventListener('click', () => {
                sidebar.classList.remove('open');
                if (overlay) overlay.classList.remove('show');
                document.body.style.overflow = '';

                // Re-enable background scroll
                document.body.removeEventListener('touchmove', preventScroll);
            });
        }

        // Toggle filter groups
        document.querySelectorAll('.filter-toggle[data-toggle]').forEach(toggle => {
            toggle.addEventListener('click', () => {
                const group = toggle.closest('.filter-group');
                group.classList.toggle('open');
            });
        });

        // Radio button exclusive selection handling
        document.querySelectorAll('input[type="radio"][data-radio-group]').forEach(radio => {
            radio.addEventListener('change', function() {
                const groupName = this.dataset.radioGroup;
                document.querySelectorAll(`input[data-radio-group="${groupName}"]`).forEach(r => {
                    r.parentElement.classList.toggle('active', r.checked);
                });
            });
        });

        // Checkbox active state
        document.querySelectorAll('.filter-check input[type="checkbox"]').forEach(cb => {
            cb.addEventListener('change', function() {
                this.parentElement.classList.toggle('active', this.checked);
                // Update active filters count when checkbox changes
                updateActiveFiltersCount();
            });
        });

        // Initialize active filters count on load
        updateActiveFiltersCount();
    });
}

// Prevent scroll when mobile filter is open
function preventScroll(e) {
    e.preventDefault();
}

// Sort handling
function setSortAndSubmit(sortValue) {
    document.getElementById('sortInput').value = sortValue;
    document.getElementById('pageInput').value = '1';
    submitFilterForm();
}

// Pagination handling
function goToPage(pageNum) {
    document.getElementById('pageInput').value = pageNum;
    submitFilterForm();
}

// Initialize everything when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
    // Price range slider
    const priceRange = document.getElementById("priceRange");
    const priceValue = document.getElementById("priceValue");

    if (priceRange) {
        priceValue.innerText = "$" + priceRange.value;

        priceRange.addEventListener("input", function () {
            priceValue.innerText = "$" + this.value;
            // Update hidden input for price_min
            const priceMinInput = document.getElementById('priceMinInput');
            if (priceMinInput) {
                priceMinInput.value = priceRange.min || '0';
            }
            submitFilterFormDebounced(); // Use debounced version for price slider
        });
    }

    // Initialize mobile filter
    initMobileFilter();

    // Add clear all filters button if it doesn't exist
    const filterForm = document.getElementById('filterForm');
    if (filterForm && !document.querySelector('.clear-all-filters')) {
        const clearBtn = document.createElement('button');
        clearBtn.type = 'button';
        clearBtn.className = 'clear-all-filters btn btn-link';
        clearBtn.innerHTML = '<i class="fa-solid fa-xmark"></i> Clear All';
        clearBtn.setAttribute('aria-label', 'Clear all filters');
        clearBtn.onclick = clearAllFilters;

        // Add to filter header or create one
        const filterHeader = filterForm.querySelector('.filters-header');
        if (filterHeader) {
            filterHeader.appendChild(clearBtn);
        } else {
            // Create filter header if it doesn't exist
            const header = document.createElement('header');
            header.className = 'filters-header';
            header.innerHTML = `
                <h3>Filters</h3>
                <button type="button" class="btn-close-filters" id="closeFilters" aria-label="Close filters">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            `;
            header.querySelector('#closeFilters').onclick = function() {
                const sidebar = document.getElementById('filterSidebar');
                sidebar.classList.remove('open');
                if (overlay) overlay.classList.remove('show');
                document.body.style.overflow = '';
            };
            filterForm.insertBefore(header, filterForm.firstChild);
            header.appendChild(clearBtn);
        }
    }

    // Handle popstate for back/forward navigation
    window.addEventListener('popstate', function(e) {
        // Reload the page to reflect URL changes
        // In a more advanced implementation, we would parse the state and update via AJAX
        location.reload();
    });
});

// Export functions for use in other scripts if needed
window.productsJS = {
    toggleFilter,
    clearAllFilters,
    showMoreLessFilterGroup,
    updateActiveFiltersCount,
    setFilterValue,
    submitFilterForm,
    submitFilterFormDebounced,
    updatePriceDisplay,
    setSortAndSubmit,
    goToPage,
    showQuickView,
    hideQuickView
};

// Quick View functionality
function showQuickView(productId) {
    // Show loading state in modal
    const modalContent = document.getElementById('quickViewContent');
    if (modalContent) {
        modalContent.innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </div>
        `;
    }

    // Show modal
    const quickViewModal = new bootstrap.Modal(document.getElementById('quickViewModal'));
    quickViewModal.show();

    // Fetch product details via AJAX
    fetch(`/get-product-details/${productId}/`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                renderQuickViewContent(data.product);
            } else {
                showErrorInModal('Failed to load product details');
            }
        })
        .catch(error => {
            console.error('Error fetching product details:', error);
            showErrorInModal('Error loading product details');
        });
}

function hideQuickView() {
    const quickViewModal = bootstrap.Modal.getInstance(document.getElementById('quickViewModal'));
    if (quickViewModal) {
        quickViewModal.hide();
    }
}

function renderQuickViewContent(product) {
    const modalContent = document.getElementById('quickViewContent');
    if (!modalContent) return;

    modalContent.innerHTML = `
        <div class="row">
            <div class="col-md-5">
                <div id="quickViewImageCarousel" class="carousel slide" data-bs-ride="carousel">
                    <div class="carousel-inner">
                        ${product.images && product.images.length > 0 ?
                            product.images.map((image, index) => `
                                <div class="carousel-item ${index === 0 ? 'active' : ''}">
                                    <img src="${image.url}" class="d-block w-100" alt="${product.name}">
                                </div>
                            `).join('') :
                            product.main_image ? `
                                <div class="carousel-item active">
                                    <img src="${product.main_image.url}" class="d-block w-100" alt="${product.name}">
                                </div>
                            ` : `
                                <div class="carousel-item active">
                                    <img src="https://via.placeholder.com/400x300?text=No+Image" class="d-block w-100" alt="No Image">
                                </div>
                            `
                        }
                    </div>
                    ${product.images && product.images.length > 1 ? `
                        <button class="carousel-control-prev" type="button" data-bs-target="#quickViewImageCarousel" data-bs-slide="prev">
                            <span class="carousel-control-prev-icon" aria-hidden="true"></span>
                            <span class="visually-hidden">Previous</span>
                        </button>
                        <button class="carousel-control-next" type="button" data-bs-target="#quickViewImageCarousel" data-bs-slide="next">
                            <span class="carousel-control-next-icon" aria-hidden="true"></span>
                            <span class="visually-hidden">Next</span>
                        </button>
                    ` : ''}
                </div>
            </div>
            <div class="col-md-7">
                <h3>${product.name}</h3>

                <div class="mb-3">
                    <i class="fa-solid fa-tag"></i>
                    <span>${product.category.name}</span>
                </div>

                <div class="mb-3">
                    <div class="rating-stars">
                        ${Array.from({length: 5}, (_, i) => {
                            const isFull = i < product.star_full.length;
                            const isHalf = product.star_half && i === Math.floor(product.star_full.length);
                            const isEmpty = !isFull && !isHalf;
                            if (isFull) return '<i class="fa-solid fa-star"></i>';
                            if (isHalf) return '<i class="fa-solid fa-star-half-stroke"></i>';
                            return '<i class="fa-regular fa-star"></i>';
                        }).join('')}
                    </div>
                    ${product.rating_count ? `<span class="rating-count">(${product.rating_count})</span>` : ''}
                </div>

                <div class="mb-4">
                    ${product.has_discount ? `
                        <span class="old-price text-decoration-line-through me-2">${product.price}</span>
                        <span class="new-price fw-bold">${product.final_price}</span>
                        <span class="badge bg-success ms-2">${product.discount_percent}% OFF</span>
                    ` : `
                        <span class="new-price fw-bold">${product.final_price}</span>
                    `}
                </div>

                <div class="mb-4">
                    <p class="product-description">${product.description || 'No description available.'}</p>
                </div>

                ${product.attributes && product.attributes.length > 0 ? `
                    <div class="mb-4">
                        <h6>Product Specifications</h6>
                        <ul class="list-unstyled">
                            ${product.attributes.map(attr => `
                                <li><strong>${attr.name}:</strong> ${attr.value}</li>
                            `).join('')}
                        </ul>
                    </div>
                ` : ''}

                <div class="d-grid gap-2">
                    <button type="button" class="btn btn-primary" onclick="addToCart(${product.id})">
                        <i class="fa-solid fa-cart-plus me-2"></i> Add to Cart
                    </button>
                    <button type="button" class="btn btn-outline-secondary" onclick="addToWishlist(${product.id})">
                        <i class="fa-${product.id in wishlist_ids ? 'solid' : 'regular'} fa-heart me-2"></i>
                        ${product.id in wishlist_ids ? 'Added to Wishlist' : 'Add to Wishlist'}
                    </button>
                </div>
            </div>
        </div>
    `;
}

function showErrorInModal(message) {
    const modalContent = document.getElementById('quickViewContent');
    if (modalContent) {
        modalContent.innerHTML = `
            <div class="alert alert-danger">
                ${message}
            </div>
            <div class="text-center mt-3">
                <button type="button" class="btn btn-secondary" onclick="hideQuickView()">
                    Close
                </button>
            </div>
        `;
    }
}

// Helper functions for cart and wishlist (these would need to be implemented based on your existing endpoints)
function addToCart(productId) {
    // Implement based on your existing cart functionality
    console.log('Add to cart:', productId);
    // Show success message
}

function addToWishlist(productId) {
    // Implement based on your existing wishlist functionality
    console.log('Add to wishlist:', productId);
    // Toggle wishlist state
}

// Initialize quick view buttons when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
    // Initialize quick view buttons
    document.querySelectorAll('.quick-view-btn').forEach(button => {
        button.addEventListener('click', function() {
            const productId = this.getAttribute('data-product-id');
            showQuickView(productId);
        });
    });
});
