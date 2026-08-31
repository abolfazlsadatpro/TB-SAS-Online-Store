// ============================================================
// PRODUCTS PAGE - AJAX FILTER / SORT / PAGINATION
// ============================================================

// ------------------------------------------------------------
// Global AJAX state
// ------------------------------------------------------------

let filterSubmitTimeout = null;
let productsAbortController = null;


// ------------------------------------------------------------
// Utility
// ------------------------------------------------------------

function debounce(func, wait) {
    let timeout;

    return function executedFunction(...args) {
        clearTimeout(timeout);

        timeout = setTimeout(() => {
            func(...args);
        }, wait);
    };
}


// ------------------------------------------------------------
// Build products URL from filter form
// ------------------------------------------------------------

function buildProductsURL() {
    const form = document.getElementById('filterForm');

    if (!form) {
        return new URL(window.location.href);
    }

    const url = new URL(form.action || window.location.href, window.location.origin);
    const params = new URLSearchParams();

    const formData = new FormData(form);

    formData.forEach((value, key) => {
        // Never send CSRF or AJAX helper parameters in GET URL
        if (key === 'csrfmiddlewaretoken' || key === 'ajax') {
            return;
        }

        // Ignore empty values
        if (value === null || value === '') {
            return;
        }

        params.append(key, value);
    });

    url.search = params.toString();

    return url;
}


// ------------------------------------------------------------
// Sync filter form from current URL
// Used mainly for browser Back / Forward
// ------------------------------------------------------------

function syncFormFromURL() {
    const form = document.getElementById('filterForm');

    if (!form) {
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);

    // --------------------------------------------
    // Checkboxes
    // --------------------------------------------

    form.querySelectorAll('input[type="checkbox"][name]').forEach(input => {
        const values = urlParams.getAll(input.name);

        input.checked = values.includes(input.value);

        const parent = input.closest('.filter-check');

        if (parent) {
            parent.classList.toggle('active', input.checked);
        }
    });


    // --------------------------------------------
    // Radio buttons
    // --------------------------------------------

    form.querySelectorAll('input[type="radio"][name]').forEach(input => {
        const value = urlParams.get(input.name);

        input.checked = value === input.value;

        const parent = input.closest('.filter-check');

        if (parent) {
            parent.classList.toggle('active', input.checked);
        }
    });


    // --------------------------------------------
    // Price minimum
    // --------------------------------------------

    const priceMinInput = document.getElementById('priceMinInput');

    if (priceMinInput) {
        const priceMin = urlParams.get('price_min');

        if (priceMin !== null) {
            priceMinInput.value = priceMin;
        } else {
            priceMinInput.value = priceMinInput.min || '0';
        }
    }


    // --------------------------------------------
    // Price maximum
    // --------------------------------------------

    const priceMaxInput = document.getElementById('priceMaxInput');
    const priceRange = document.getElementById('priceRange');

    if (priceMaxInput) {
        const priceMax = urlParams.get('price_max');

        if (priceMax !== null) {
            priceMaxInput.value = priceMax;
        } else {
            priceMaxInput.value = priceMaxInput.max || '9999';
        }
    }

    if (priceRange && priceMaxInput) {
        priceRange.value = priceMaxInput.value;
    }


    // --------------------------------------------
    // Page
    // --------------------------------------------

    const pageInput = document.getElementById('pageInput');

    if (pageInput) {
        pageInput.value = urlParams.get('page') || '1';
    }


    // --------------------------------------------
    // Sort
    // --------------------------------------------

    const sortInput = document.getElementById('sortInput');

    if (sortInput) {
        sortInput.value = urlParams.get('sort') || sortInput.value || 'newest';
    }


    // --------------------------------------------
    // Price UI
    // --------------------------------------------

    syncPriceRange();

    updatePriceDisplay(
        priceMaxInput
            ? priceMaxInput.value
            : (priceRange ? priceRange.value : '0')
    );

    updateActiveFiltersCount();
}


// ------------------------------------------------------------
// AJAX Products Loader
// ------------------------------------------------------------

async function loadProducts({
    updateHistory = true,
    scrollToProducts = false
} = {}) {

    const form = document.getElementById('filterForm');
    const container = document.getElementById('productsContainer');

    if (!form || !container) {
        return;
    }


    // --------------------------------------------
    // Cancel previous request
    // --------------------------------------------

    if (productsAbortController) {
        productsAbortController.abort();
    }

    productsAbortController = new AbortController();


    // --------------------------------------------
    // Build URL
    // --------------------------------------------

    const url = buildProductsURL();


    // --------------------------------------------
    // Update browser URL
    // --------------------------------------------

    if (updateHistory) {
        window.history.pushState(
            {
                productsUrl: url.href
            },
            '',
            url.href
        );
    }


    // --------------------------------------------
    // Loading state
    // --------------------------------------------

    showLoadingState();


    try {

        const response = await fetch(url.toString(), {
            method: 'GET',

            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json'
            },

            signal: productsAbortController.signal
        });


        // ----------------------------------------
        // HTTP error
        // ----------------------------------------

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }


        // ----------------------------------------
        // Django returns JSON
        // ----------------------------------------

        const data = await response.json();


        if (!data || typeof data.html !== 'string') {
            throw new Error('Invalid products response');
        }


        // ----------------------------------------
        // Replace products area
        // ----------------------------------------

        container.innerHTML = data.html;


        // ----------------------------------------
        // Update product count
        // ----------------------------------------

        const totalCountElement =
            document.getElementById('productsTotalCount');

        if (
            totalCountElement &&
            typeof data.count !== 'undefined'
        ) {
            totalCountElement.textContent = data.count;
        }


        // ----------------------------------------
        // Keep form synchronized
        // ----------------------------------------

        syncFormFromURL();

        updateActiveFiltersCount();


        // ----------------------------------------
        // Optional scroll
        // ----------------------------------------

        if (scrollToProducts) {
            container.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }

    } catch (error) {

        // Abort is normal when a newer request starts
        if (error.name === 'AbortError') {
            return;
        }

        console.error('Products AJAX error:', error);


        container.innerHTML = `
            <div class="alert alert-danger m-3" role="alert">
                Failed to load products.
                Please try again.
            </div>
        `;

    } finally {

        hideLoadingState();
    }
}


// ------------------------------------------------------------
// Filter form submission
// ------------------------------------------------------------

function submitFilterForm(debounceTime = 250) {

    clearTimeout(filterSubmitTimeout);


    filterSubmitTimeout = setTimeout(() => {

        const pageInput = document.getElementById('pageInput');

        if (pageInput) {
            pageInput.value = '1';
        }


        loadProducts({
            updateHistory: true,
            scrollToProducts: false
        });

    }, debounceTime);
}


// ------------------------------------------------------------
// Debounced filter submission
// ------------------------------------------------------------

function submitFilterFormDebounced() {

    submitFilterForm(500);
}


// ------------------------------------------------------------
// Set filter value
// ------------------------------------------------------------

function setFilterValue(name, value) {

    const input = document.querySelector(
        `input[name="${name}"]`
    );

    if (input) {
        input.value = value;
    }


    document.querySelectorAll(
        `[data-${name}]`
    ).forEach(el => {

        el.classList.toggle(
            'active',
            el.dataset[name] === value
        );

    });


    submitFilterForm();
}


// ------------------------------------------------------------
// Clear all filters
// ------------------------------------------------------------

function clearAllFilters() {

    const form = document.getElementById('filterForm');

    if (!form) {
        return;
    }


    // --------------------------------------------
    // Checkboxes
    // --------------------------------------------

    form.querySelectorAll(
        'input[type="checkbox"]'
    ).forEach(input => {

        input.checked = false;

        const parent = input.closest('.filter-check');

        if (parent) {
            parent.classList.remove('active');
        }
    });


    // --------------------------------------------
    // Radio buttons
    // --------------------------------------------

    form.querySelectorAll(
        'input[type="radio"]'
    ).forEach(input => {

        input.checked = false;

        const parent = input.closest('.filter-check');

        if (parent) {
            parent.classList.remove('active');
        }
    });


    // --------------------------------------------
    // Category inputs / selects
    // --------------------------------------------

    form.querySelectorAll(
        'select'
    ).forEach(select => {
        select.value = '';
    });


    // --------------------------------------------
    // Price
    // --------------------------------------------

    const priceMinInput =
        document.getElementById('priceMinInput');

    const priceMaxInput =
        document.getElementById('priceMaxInput');

    const priceRange =
        document.getElementById('priceRange');


    if (priceMinInput) {
        priceMinInput.value =
            priceMinInput.min || '0';
    }


    if (priceMaxInput) {
        priceMaxInput.value =
            priceMaxInput.max || '9999';
    }


    if (priceRange) {
        priceRange.value =
            priceRange.max || '9999';
    }


    // --------------------------------------------
    // Page reset
    // --------------------------------------------

    const pageInput =
        document.getElementById('pageInput');

    if (pageInput) {
        pageInput.value = '1';
    }


    syncPriceRange();

    updateActiveFiltersCount();


    // --------------------------------------------
    // Load without full page reload
    // --------------------------------------------

    loadProducts({
        updateHistory: true,
        scrollToProducts: false
    });
}


// ------------------------------------------------------------
// Active filter count
// ------------------------------------------------------------

function updateActiveFiltersCount() {

    const badge =
        document.getElementById('filterBadge');

    if (!badge) {
        return;
    }


    let count = 0;


    // --------------------------------------------
    // Category
    // --------------------------------------------

    count += document.querySelectorAll(
        '[data-category].active'
    ).length;


    // --------------------------------------------
    // Brands
    // --------------------------------------------

    count += document.querySelectorAll(
        '.brand-filter:checked'
    ).length;


    // --------------------------------------------
    // Attributes
    // --------------------------------------------

    count += document.querySelectorAll(
        'input[name^="attr_"]:checked'
    ).length;


    // --------------------------------------------
    // Price
    // --------------------------------------------

    const priceMinInput =
        document.getElementById('priceMinInput');

    const priceMaxInput =
        document.getElementById('priceMaxInput');

    if (priceMinInput) {

        const defaultMin =
            priceMinInput.min || '0';

        if (
            priceMinInput.value !== '' &&
            priceMinInput.value !== defaultMin
        ) {
            count++;
        }
    }


    if (priceMaxInput) {

        const defaultMax =
            priceMaxInput.max || '9999';

        if (
            priceMaxInput.value !== '' &&
            priceMaxInput.value !== defaultMax
        ) {
            count++;
        }
    }


    // --------------------------------------------
    // Update badge
    // --------------------------------------------

    if (count > 0) {

        badge.textContent = count;
        badge.style.display = 'inline-block';

    } else {

        badge.textContent = '';
        badge.style.display = 'none';
    }
}


// ------------------------------------------------------------
// Price display
// ------------------------------------------------------------

function updatePriceDisplay(value) {

    const priceValue =
        document.getElementById('priceValue');

    if (!priceValue) {
        return;
    }


    const numericValue =
        parseInt(value, 10);


    if (Number.isNaN(numericValue)) {
        return;
    }


    priceValue.textContent =
        '$' + numericValue.toLocaleString();
}


// ------------------------------------------------------------
// Sync price range and number inputs
// ------------------------------------------------------------

function syncPriceRange() {

    const priceMinInput =
        document.getElementById('priceMinInput');

    const priceMaxInput =
        document.getElementById('priceMaxInput');

    const priceRange =
        document.getElementById('priceRange');

    const priceMinLabel =
        document.getElementById('priceMinLabel');

    const priceValue =
        document.getElementById('priceValue');


    if (
        !priceMinInput ||
        !priceMaxInput ||
        !priceRange
    ) {
        return;
    }


    let minVal =
        parseInt(priceMinInput.value, 10);

    let maxVal =
        parseInt(priceMaxInput.value, 10);


    if (Number.isNaN(minVal)) {
        minVal =
            parseInt(priceMinInput.min, 10) || 0;
    }


    if (Number.isNaN(maxVal)) {
        maxVal =
            parseInt(priceMaxInput.max, 10) || 9999;
    }


    // --------------------------------------------
    // Ensure min <= max
    // --------------------------------------------

    if (minVal > maxVal) {
        minVal = maxVal;
        priceMinInput.value = minVal;
    }


    // --------------------------------------------
    // Keep slider boundaries based on
    // the real global price range
    // --------------------------------------------

    const globalMin =
        parseInt(priceMinInput.min, 10) || 0;

    const globalMax =
        parseInt(priceMaxInput.max, 10) || 9999;


    priceRange.min = globalMin;
    priceRange.max = globalMax;


    // --------------------------------------------
    // Slider value
    // --------------------------------------------

    let sliderValue =
        parseInt(priceMaxInput.value, 10);

    if (Number.isNaN(sliderValue)) {
        sliderValue = globalMax;
    }


    sliderValue =
        Math.max(globalMin, Math.min(sliderValue, globalMax));


    priceRange.value = sliderValue;


    // --------------------------------------------
    // Labels
    // --------------------------------------------

    if (priceMinLabel) {
        priceMinLabel.textContent =
            '$' + minVal.toLocaleString();
    }


    if (priceValue) {
        priceValue.textContent =
            '$' + sliderValue.toLocaleString();
    }
}


// ------------------------------------------------------------
// Update max price input from slider
// ------------------------------------------------------------

function updatePriceInputFromRange(value) {

    const priceMaxInput =
        document.getElementById('priceMaxInput');

    const priceValue =
        document.getElementById('priceValue');


    if (priceMaxInput) {
        priceMaxInput.value = value;
    }


    if (priceValue) {

        const numericValue =
            parseInt(value, 10);

        if (!Number.isNaN(numericValue)) {

            priceValue.textContent =
                '$' + numericValue.toLocaleString();
        }
    }
}


// ------------------------------------------------------------
// Loading state
// ------------------------------------------------------------

function showLoadingState() {

    const productsContainer =
        document.getElementById('productsContainer');

    if (!productsContainer) {
        return;
    }


    // Avoid duplicate overlays
    hideLoadingState();


    // --------------------------------------------
    // Skeleton
    // --------------------------------------------

    productsContainer.insertAdjacentHTML(
        'afterbegin',
        `
        <div id="skeleton-loader" class="skeleton-loader">
            <div class="skeleton-item"></div>
            <div class="skeleton-item"></div>
            <div class="skeleton-item"></div>
            <div class="skeleton-item"></div>
            <div class="skeleton-item"></div>
            <div class="skeleton-item"></div>
        </div>
        `
    );


    // --------------------------------------------
    // Overlay
    // --------------------------------------------

    const overlay =
        document.createElement('div');

    overlay.className =
        'loading-overlay';

    overlay.innerHTML =
        '<div class="loading-spinner"></div>';

    productsContainer.appendChild(overlay);
}


// ------------------------------------------------------------
// Hide loading state
// ------------------------------------------------------------

function hideLoadingState() {

    const skeleton =
        document.getElementById('skeleton-loader');

    if (skeleton) {
        skeleton.remove();
    }


    document
        .querySelectorAll('.loading-overlay')
        .forEach(overlay => {
            overlay.remove();
        });
}


// ------------------------------------------------------------
// Sort
// ------------------------------------------------------------

function setSortAndSubmit(sortValue) {

    const sortInput =
        document.getElementById('sortInput');

    const pageInput =
        document.getElementById('pageInput');


    if (sortInput) {
        sortInput.value = sortValue;
    }


    if (pageInput) {
        pageInput.value = '1';
    }


    loadProducts({
        updateHistory: true,
        scrollToProducts: true
    });
}


// ------------------------------------------------------------
// Pagination
// ------------------------------------------------------------

function goToPage(pageNum) {

    const pageInput =
        document.getElementById('pageInput');

    if (!pageInput) {
        return;
    }


    pageInput.value = pageNum;


    loadProducts({
        updateHistory: true,
        scrollToProducts: true
    });
}


// ------------------------------------------------------------
// Show More / Show Less filter group
// ------------------------------------------------------------

function showMoreLessFilterGroup(
    groupId,
    showLimit = 8
) {

    const group =
        document.getElementById(groupId);

    if (!group) {
        return;
    }


    const content =
        group.querySelector('.filter-content');

    if (!content) {
        return;
    }


    const items =
        content.querySelectorAll(
            '.filter-check, .filter-link, .filter-pill'
        );


    if (items.length <= showLimit) {
        return;
    }


    const isExpanded =
        group.classList.contains('expanded');


    items.forEach((item, index) => {

        if (index >= showLimit) {

            item.style.display =
                isExpanded ? '' : 'none';
        }
    });


    const toggleBtn =
        group.querySelector('.filter-show-toggle');


    if (toggleBtn) {

        toggleBtn.textContent =
            isExpanded
                ? 'Show more'
                : 'Show less';
    }


    group.classList.toggle('expanded');
}


// ------------------------------------------------------------
// Filter group toggle
// ------------------------------------------------------------

function toggleFilter(el) {

    if (!el) {
        return;
    }


    const parent =
        el.parentElement;

    if (!parent) {
        return;
    }


    parent.classList.toggle('open');


    const isOpen =
        parent.classList.contains('open');


    el.setAttribute(
        'aria-expanded',
        isOpen
    );


    const content =
        parent.querySelector('.filter-content');


    if (content) {

        content.setAttribute(
            'aria-hidden',
            !isOpen
        );
    }
}


// ------------------------------------------------------------
// Prevent background scroll
// ------------------------------------------------------------

function preventScroll(e) {
    e.preventDefault();
}


// ------------------------------------------------------------
// Mobile filter
// ------------------------------------------------------------

function initMobileFilter() {

    const sidebar =
        document.getElementById('filterSidebar');

    const toggleBtn =
        document.getElementById('mobileFilterToggle');

    const closeBtn =
        document.getElementById('closeFilters');

    const overlay =
        document.getElementById('filterOverlay');


    // --------------------------------------------
    // Open
    // --------------------------------------------

    if (toggleBtn && sidebar) {

        toggleBtn.addEventListener(
            'click',
            () => {

                sidebar.classList.add('open');

                if (overlay) {
                    overlay.classList.add('show');
                }

                document.body.style.overflow =
                    'hidden';


                document.body.addEventListener(
                    'touchmove',
                    preventScroll,
                    {
                        passive: false
                    }
                );
            }
        );
    }


    // --------------------------------------------
    // Close
    // --------------------------------------------

    if (closeBtn && sidebar) {

        closeBtn.addEventListener(
            'click',
            () => {

                sidebar.classList.remove('open');

                if (overlay) {
                    overlay.classList.remove('show');
                }

                document.body.style.overflow =
                    '';


                document.body.removeEventListener(
                    'touchmove',
                    preventScroll
                );
            }
        );
    }


    // --------------------------------------------
    // Overlay close
    // --------------------------------------------

    if (overlay) {

        overlay.addEventListener(
            'click',
            () => {

                sidebar.classList.remove('open');

                overlay.classList.remove('show');

                document.body.style.overflow =
                    '';


                document.body.removeEventListener(
                    'touchmove',
                    preventScroll
                );
            }
        );
    }
}


// ------------------------------------------------------------
// Initialize filter UI
// ------------------------------------------------------------

function initFilterUI() {

    // --------------------------------------------
    // Filter group toggles
    // --------------------------------------------

    document
        .querySelectorAll(
            '.filter-toggle[data-toggle]'
        )
        .forEach(toggle => {

            toggle.addEventListener(
                'click',
                () => {

                    const group =
                        toggle.closest('.filter-group');

                    if (!group) {
                        return;
                    }

                    group.classList.toggle('open');
                }
            );
        });


    // --------------------------------------------
    // Radio active states
    // --------------------------------------------

    document
        .querySelectorAll(
            'input[type="radio"][data-radio-group]'
        )
        .forEach(radio => {

            radio.addEventListener(
                'change',
                function () {

                    const groupName =
                        this.dataset.radioGroup;


                    document
                        .querySelectorAll(
                            `input[data-radio-group="${groupName}"]`
                        )
                        .forEach(input => {

                            const parent =
                                input.closest('.filter-check');

                            if (parent) {

                                parent.classList.toggle(
                                    'active',
                                    input.checked
                                );
                            }
                        });
                }
            );
        });


    // --------------------------------------------
    // Checkbox active states + AJAX
    // --------------------------------------------

    document
        .querySelectorAll(
            '.filter-check input[type="checkbox"]'
        )
        .forEach(checkbox => {

            checkbox.addEventListener(
                'change',
                function () {

                    const parent =
                        this.closest('.filter-check');

                    if (parent) {

                        parent.classList.toggle(
                            'active',
                            this.checked
                        );
                    }


                    updateActiveFiltersCount();

                    submitFilterForm();
                }
            );
        });


    // --------------------------------------------
    // Radio AJAX submission
    // --------------------------------------------

    document
        .querySelectorAll(
            '.filter-check input[type="radio"]'
        )
        .forEach(radio => {

            radio.addEventListener(
                'change',
                function () {

                    const groupName =
                        this.dataset.radioGroup;


                    document
                        .querySelectorAll(
                            `input[data-radio-group="${groupName}"]`
                        )
                        .forEach(input => {

                            const parent =
                                input.closest('.filter-check');

                            if (parent) {

                                parent.classList.toggle(
                                    'active',
                                    input.checked
                                );
                            }
                        });


                    updateActiveFiltersCount();

                    submitFilterForm();
                }
            );
        });
}


// ------------------------------------------------------------
// Price UI initialization
// ------------------------------------------------------------

function initPriceFilter() {

    const priceRange =
        document.getElementById('priceRange');

    const priceMinInput =
        document.getElementById('priceMinInput');

    const priceMaxInput =
        document.getElementById('priceMaxInput');


    if (!priceRange) {
        return;
    }


    // --------------------------------------------
    // Initial sync
    // --------------------------------------------

    syncPriceRange();

    updatePriceDisplay(
        priceMaxInput
            ? priceMaxInput.value
            : priceRange.value
    );


    // --------------------------------------------
    // Slider
    // --------------------------------------------

    priceRange.addEventListener(
        'input',
        function () {

            updatePriceInputFromRange(
                this.value
            );

            updatePriceDisplay(
                this.value
            );

            updateActiveFiltersCount();
        }
    );


    // --------------------------------------------
    // Slider change = AJAX
    // --------------------------------------------

    priceRange.addEventListener(
        'change',
        function () {

            updatePriceInputFromRange(
                this.value
            );

            submitFilterFormDebounced();
        }
    );


    // --------------------------------------------
    // Min input
    // --------------------------------------------

    if (priceMinInput) {

        priceMinInput.addEventListener(
            'change',
            function () {

                syncPriceRange();

                submitFilterFormDebounced();
            }
        );
    }


    // --------------------------------------------
    // Max input
    // --------------------------------------------

    if (priceMaxInput) {

        priceMaxInput.addEventListener(
            'change',
            function () {

                syncPriceRange();

                submitFilterFormDebounced();
            }
        );
    }
}


// ------------------------------------------------------------
// Clear All button
// ------------------------------------------------------------

function initClearAllButton() {

    const filterForm =
        document.getElementById('filterForm');

    if (
        !filterForm ||
        document.querySelector('.clear-all-filters')
    ) {
        return;
    }


    const clearBtn =
        document.createElement('button');

    clearBtn.type = 'button';

    clearBtn.className =
        'clear-all-filters btn btn-link';

    clearBtn.innerHTML =
        '<i class="fa-solid fa-xmark"></i> Clear All';

    clearBtn.setAttribute(
        'aria-label',
        'Clear all filters'
    );


    clearBtn.addEventListener(
        'click',
        clearAllFilters
    );


    const filterHeader =
        filterForm.querySelector('.filters-header');


    if (filterHeader) {

        filterHeader.appendChild(
            clearBtn
        );

    } else {

        const header =
            document.createElement('header');

        header.className =
            'filters-header';

        header.innerHTML = `
            <h3>Filters</h3>
            <button
                type="button"
                class="btn-close-filters"
                id="closeFilters"
                aria-label="Close filters"
            >
                <i class="fa-solid fa-xmark"></i>
            </button>
        `;


        const closeButton =
            header.querySelector('#closeFilters');


        if (closeButton) {

            closeButton.addEventListener(
                'click',
                () => {

                    const sidebar =
                        document.getElementById(
                            'filterSidebar'
                        );

                    const overlay =
                        document.getElementById(
                            'filterOverlay'
                        );


                    if (sidebar) {
                        sidebar.classList.remove('open');
                    }

                    if (overlay) {
                        overlay.classList.remove('show');
                    }

                    document.body.style.overflow =
                        '';
                }
            );
        }


        filterForm.insertBefore(
            header,
            filterForm.firstChild
        );


        header.appendChild(
            clearBtn
        );
    }
}


// ------------------------------------------------------------
// Browser Back / Forward
// ------------------------------------------------------------

function initHistoryHandling() {

    window.addEventListener(
        'popstate',
        () => {

            // URL has already changed.
            // Synchronize form with URL first.
            syncFormFromURL();


            // Load products without creating
            // another history entry.
            loadProducts({
                updateHistory: false,
                scrollToProducts: false
            });
        }
    );
}


// ------------------------------------------------------------
// Quick View
// ------------------------------------------------------------

function showQuickView(productId) {

    const modalContent =
        document.getElementById(
            'quickViewContent'
        );


    if (modalContent) {

        modalContent.innerHTML = `
            <div class="text-center py-5">
                <div
                    class="spinner-border text-primary"
                    role="status"
                >
                    <span class="visually-hidden">
                        Loading...
                    </span>
                </div>
            </div>
        `;
    }


    const modalElement =
        document.getElementById(
            'quickViewModal'
        );


    if (!modalElement) {
        return;
    }


    const quickViewModal =
        new bootstrap.Modal(
            modalElement
        );


    quickViewModal.show();


    fetch(
        `/get-product-details/${productId}/`,
        {
            method: 'GET',
            headers: {
                'X-Requested-With':
                    'XMLHttpRequest',
                'Accept':
                    'application/json'
            }
        }
    )
        .then(response => {

            if (!response.ok) {
                throw new Error(
                    `HTTP ${response.status}`
                );
            }

            return response.json();
        })

        .then(data => {

            if (data.success) {

                renderQuickViewContent(
                    data.product
                );

            } else {

                showErrorInModal(
                    'Failed to load product details'
                );
            }
        })

        .catch(error => {

            console.error(
                'Error fetching product details:',
                error
            );

            showErrorInModal(
                'Error loading product details'
            );
        });
}


// ------------------------------------------------------------
// Hide Quick View
// ------------------------------------------------------------

function hideQuickView() {

    const modalElement =
        document.getElementById(
            'quickViewModal'
        );


    if (!modalElement) {
        return;
    }


    const quickViewModal =
        bootstrap.Modal.getInstance(
            modalElement
        );


    if (quickViewModal) {
        quickViewModal.hide();
    }
}


// ------------------------------------------------------------
// Render Quick View
// ------------------------------------------------------------

function renderQuickViewContent(product) {

    const modalContent =
        document.getElementById(
            'quickViewContent'
        );


    if (!modalContent) {
        return;
    }


    modalContent.innerHTML = `
        <div class="row">

            <div class="col-md-5">

                <div
                    id="quickViewImageCarousel"
                    class="carousel slide"
                    data-bs-ride="carousel"
                >

                    <div class="carousel-inner">

                        ${
                            product.images &&
                            product.images.length > 0

                            ?

                            product.images
                                .map(
                                    (image, index) => `
                                        <div
                                            class="carousel-item ${
                                                index === 0
                                                    ? 'active'
                                                    : ''
                                            }"
                                        >
                                            <img
                                                src="${image.url}"
                                                class="d-block w-100"
                                                alt="${product.name}"
                                            >
                                        </div>
                                    `
                                )
                                .join('')

                            :

                            product.main_image

                            ?

                            `
                                <div class="carousel-item active">
                                    <img
                                        src="${product.main_image.url}"
                                        class="d-block w-100"
                                        alt="${product.name}"
                                    >
                                </div>
                            `

                            :

                            `
                                <div class="carousel-item active">
                                    <img
                                        src="https://via.placeholder.com/400x300?text=No+Image"
                                        class="d-block w-100"
                                        alt="No Image"
                                    >
                                </div>
                            `
                        }

                    </div>


                    ${
                        product.images &&
                        product.images.length > 1

                        ?

                        `
                            <button
                                class="carousel-control-prev"
                                type="button"
                                data-bs-target="#quickViewImageCarousel"
                                data-bs-slide="prev"
                            >
                                <span
                                    class="carousel-control-prev-icon"
                                    aria-hidden="true"
                                ></span>

                                <span class="visually-hidden">
                                    Previous
                                </span>
                            </button>


                            <button
                                class="carousel-control-next"
                                type="button"
                                data-bs-target="#quickViewImageCarousel"
                                data-bs-slide="next"
                            >
                                <span
                                    class="carousel-control-next-icon"
                                    aria-hidden="true"
                                ></span>

                                <span class="visually-hidden">
                                    Next
                                </span>
                            </button>
                        `

                        :

                        ''
                    }

                </div>

            </div>


            <div class="col-md-7">

                <h3>
                    ${product.name}
                </h3>


                <div class="mb-3">
                    <i class="fa-solid fa-tag"></i>
                    <span>
                        ${product.category.name}
                    </span>
                </div>


                <div class="mb-3">

                    <div class="rating-stars">

                        ${
                            Array.from(
                                { length: 5 },
                                (_, i) => {

                                    const isFull =
                                        i <
                                        product.star_full.length;

                                    const isHalf =
                                        product.star_half &&
                                        i ===
                                        Math.floor(
                                            product.star_full.length
                                        );

                                    if (isFull) {
                                        return `
                                            <i
                                                class="fa-solid fa-star"
                                            ></i>
                                        `;
                                    }

                                    if (isHalf) {
                                        return `
                                            <i
                                                class="fa-solid fa-star-half-stroke"
                                            ></i>
                                        `;
                                    }

                                    return `
                                        <i
                                            class="fa-regular fa-star"
                                        ></i>
                                    `;
                                }
                            ).join('')
                        }

                    </div>


                    ${
                        product.rating_count

                        ?

                        `
                            <span class="rating-count">
                                (${product.rating_count})
                            </span>
                        `

                        :

                        ''
                    }

                </div>


                <div class="mb-4">

                    ${
                        product.has_discount

                        ?

                        `
                            <span
                                class="old-price text-decoration-line-through me-2"
                            >
                                ${product.price}
                            </span>

                            <span
                                class="new-price fw-bold"
                            >
                                ${product.final_price}
                            </span>

                            <span
                                class="badge bg-success ms-2"
                            >
                                ${product.discount_percent}% OFF
                            </span>
                        `

                        :

                        `
                            <span
                                class="new-price fw-bold"
                            >
                                ${product.final_price}
                            </span>
                        `
                    }

                </div>


                <div class="mb-4">

                    <p class="product-description">
                        ${
                            product.description ||
                            'No description available.'
                        }
                    </p>

                </div>


                ${
                    product.attributes &&
                    product.attributes.length > 0

                    ?

                    `
                        <div class="mb-4">

                            <h6>
                                Product Specifications
                            </h6>

                            <ul class="list-unstyled">

                                ${
                                    product.attributes
                                        .map(
                                            attr => `
                                                <li>
                                                    <strong>
                                                        ${attr.name}:
                                                    </strong>
                                                    ${attr.value}
                                                </li>
                                            `
                                        )
                                        .join('')
                                }

                            </ul>

                        </div>
                    `

                    :

                    ''
                }


                <div class="d-grid gap-2">

                    <button
                        type="button"
                        class="btn btn-primary"
                        onclick="addToCart(${product.id})"
                    >
                        <i
                            class="fa-solid fa-cart-plus me-2"
                        ></i>

                        Add to Cart
                    </button>


                    <button
                        type="button"
                        class="btn btn-outline-secondary"
                        onclick="addToWishlist(${product.id})"
                    >
                        <i
                            class="fa-regular fa-heart me-2"
                        ></i>

                        Add to Wishlist
                    </button>

                </div>

            </div>

        </div>
    `;
}


// ------------------------------------------------------------
// Quick View error
// ------------------------------------------------------------

function showErrorInModal(message) {

    const modalContent =
        document.getElementById(
            'quickViewContent'
        );


    if (!modalContent) {
        return;
    }


    modalContent.innerHTML = `
        <div class="alert alert-danger">
            ${message}
        </div>

        <div class="text-center mt-3">

            <button
                type="button"
                class="btn btn-secondary"
                onclick="hideQuickView()"
            >
                Close
            </button>

        </div>
    `;
}


// ------------------------------------------------------------
// Existing cart helper
// ------------------------------------------------------------

function addToCart(productId) {

    console.log(
        'Add to cart:',
        productId
    );

    // Existing cart functionality
    // can be connected here.
}


// ------------------------------------------------------------
// Existing wishlist helper
// ------------------------------------------------------------

function addToWishlist(productId) {

    console.log(
        'Add to wishlist:',
        productId
    );

    // Existing wishlist functionality
    // can be connected here.
}


// ------------------------------------------------------------
// Initialize Quick View buttons
// ------------------------------------------------------------

function initQuickViewButtons() {

    document
        .querySelectorAll('.quick-view-btn')
        .forEach(button => {

            button.addEventListener(
                'click',
                function () {

                    const productId =
                        this.getAttribute(
                            'data-product-id'
                        );

                    if (productId) {
                        showQuickView(productId);
                    }
                }
            );
        });
}


// ------------------------------------------------------------
// Main initialization
// ------------------------------------------------------------

document.addEventListener(
    'DOMContentLoaded',
    function () {

        // ----------------------------------------
        // Filter UI
        // ----------------------------------------

        initFilterUI();


        // ----------------------------------------
        // Price
        // ----------------------------------------

        initPriceFilter();


        // ----------------------------------------
        // Mobile filter
        // ----------------------------------------

        initMobileFilter();


        // ----------------------------------------
        // Clear All
        // ----------------------------------------

        initClearAllButton();


        // ----------------------------------------
        // History
        // ----------------------------------------

        initHistoryHandling();


        // ----------------------------------------
        // Quick View
        // ----------------------------------------

        initQuickViewButtons();


        // ----------------------------------------
        // Initial UI sync
        // ----------------------------------------

        syncFormFromURL();

        updateActiveFiltersCount();
    }
);


// ------------------------------------------------------------
// Global exports for inline onclick handlers in products_ajax.html
// ------------------------------------------------------------

window.toggleFilter = toggleFilter;