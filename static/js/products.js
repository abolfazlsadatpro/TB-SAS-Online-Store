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
    const container = document.querySelector('[data-products-grid]') || document.getElementById('productsContainer');

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
        // Re-bind Quick View buttons
        // ----------------------------------------

        initQuickViewButtons();


        // ----------------------------------------
        // Re-bind card wishlist buttons
        // ----------------------------------------

        initCardWishlistButtons();

        // Re-bind pagination buttons
        initPagination();


        // Update pagination active state
        const pageInput = document.getElementById('pageInput');
        if (pageInput) {
            const currentPage = parseInt(pageInput.value, 10) || 1;
            document.querySelectorAll('.p1-pagination-btn[data-page]').forEach(btn => {
                const pageNum = parseInt(btn.getAttribute('data-page'), 10);
                if (pageNum === currentPage) {
                    btn.classList.add('active');
                    btn.setAttribute('aria-current', 'page');
                } else {
                    btn.classList.remove('active');
                    btn.removeAttribute('aria-current');
                }
            });
        }

        // ----------------------------------------
        // Update product count
        // ----------------------------------------

        const totalCountElement =
            document.querySelector('[data-total-count]') || document.getElementById('productsTotalCount');

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
        buildActiveFilterChips();
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

    const priceMinInput = document.getElementById('priceMinInput');
    const priceMaxInput = document.getElementById('priceMaxInput');
    const priceRangeMin = document.getElementById('priceRangeMin');
    const priceRangeMax = document.getElementById('priceRangeMax');
    const priceMinLabel = document.getElementById('priceMinLabel');
    const priceValue = document.getElementById('priceValue');

    if (!priceMinInput || !priceMaxInput || !priceRangeMin || !priceRangeMax) {
        return;
    }

    let minVal = parseInt(priceMinInput.value, 10);
    let maxVal = parseInt(priceMaxInput.value, 10);

    if (Number.isNaN(minVal)) {
        minVal = parseInt(priceMinInput.min, 10) || 0;
    }
    if (Number.isNaN(maxVal)) {
        maxVal = parseInt(priceMaxInput.max, 10) || 9999;
    }

    // Ensure min <= max
    if (minVal > maxVal) {
        minVal = maxVal;
        priceMinInput.value = minVal;
    }

    // Keep slider boundaries based on the real global price range
    const globalMin = parseInt(priceMinInput.min, 10) || 0;
    const globalMax = parseInt(priceMaxInput.max, 10) || 9999;

    priceRangeMin.min = globalMin;
    priceRangeMin.max = globalMax;
    priceRangeMax.min = globalMin;
    priceRangeMax.max = globalMax;

    // Slider values (clamped)
    let minSlider = Math.max(globalMin, Math.min(minVal, globalMax));
    let maxSlider = Math.max(globalMin, Math.min(maxVal, globalMax));

    priceRangeMin.value = minSlider;
    priceRangeMax.value = maxSlider;

    // Labels
    if (priceMinLabel) {
        priceMinLabel.textContent = '$' + minSlider.toLocaleString();
    }
    if (priceValue) {
        priceValue.textContent = '$' + maxSlider.toLocaleString();
    }
}



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
        document.querySelector('[data-products-grid]') || document.getElementById('productsContainer');

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


    // Update active state visually
    document.querySelectorAll('.p1-sort-btn.sort-btn').forEach(btn => {
        const btnSort = btn.getAttribute('data-sort');
        btn.classList.toggle('active', btnSort === sortValue);
        btn.setAttribute('aria-pressed', btnSort === sortValue ? 'true' : 'false');
    });


    loadProducts({
        updateHistory: true,
        scrollToProducts: true
    });
}


// ------------------------------------------------------------
// Initialize sort buttons
// ------------------------------------------------------------

function initSortButtons() {
    document.querySelectorAll('.p1-sort-btn.sort-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const sortValue = this.getAttribute('data-sort');
            if (sortValue) {
                setSortAndSubmit(sortValue);
            }
        });
    });
}


// ------------------------------------------------------------
// Initialize pagination buttons
// ------------------------------------------------------------

function initPagination() {
    document.querySelectorAll('.p1-pagination-btn[data-page]').forEach(btn => {
        btn.addEventListener('click', function() {
            const page = this.getAttribute('data-page');
            if (page) {
                goToPage(page);
            }
        });
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
            (e) => {

                if (e.target !== overlay) {
                    return;
                }

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
    // Filter group toggles (accordion) - event delegation
    // --------------------------------------------

    const filterForm = document.getElementById('filterForm');
    if (!filterForm) return;

    // Remove existing listener to prevent duplicates
    if (filterForm._filterToggleHandler) {
        filterForm.removeEventListener('click', filterForm._filterToggleHandler);
    }

    filterForm._filterToggleHandler = (e) => {
        const toggle = e.target.closest('.filter-toggle[data-toggle]');
        if (!toggle) return;

        const group = toggle.closest('.p1-group');
        if (!group) return;

        // Only toggle the clicked group
        group.classList.toggle('open');
    };

    filterForm.addEventListener('click', filterForm._filterToggleHandler);

    const radioPointerState = new Map();

    const getRadioFromEvent = (event) => {
        const target = event.target;
        if (!(target instanceof Element)) {
            return null;
        }

        const radio = target.closest('input[type="radio"][data-radio-group]');
        if (radio) {
            return radio;
        }

        const filterCheck = target.closest('.filter-check');
        return filterCheck
            ? filterCheck.querySelector('input[type="radio"][data-radio-group]')
            : null;
    };

    const syncRadioGroup = (radio) => {
        const groupName = radio.dataset.radioGroup;

        filterForm
            .querySelectorAll(`input[data-radio-group="${groupName}"]`)
            .forEach(input => {
                const parent = input.closest('.filter-check');

                if (parent) {
                    parent.classList.toggle('active', input.checked);
                }
            });
    };

    const handleRadioPointer = (event) => {
        const radio = getRadioFromEvent(event);
        if (!radio) {
            return;
        }

        if (event.type === 'pointerdown') {
            radioPointerState.set(radio, radio.checked);
            return;
        }

        const wasChecked = radioPointerState.get(radio);
        radioPointerState.delete(radio);

        if (!wasChecked) {
            return;
        }

        event.preventDefault();
        radio.checked = false;
        radio.dispatchEvent(new Event('change', { bubbles: true }));
    };

    const handleFilterChange = (event) => {
        const input = event.target;

        if (!(input instanceof HTMLInputElement) || !input.name) {
            return;
        }

        if (input.type === 'checkbox') {
            const parent = input.closest('.filter-check');

            if (parent) {
                parent.classList.toggle('active', input.checked);
            }

            updateActiveFiltersCount();
            submitFilterForm();
            return;
        }

        if (
            input.type !== 'radio' ||
            !input.dataset.radioGroup
        ) {
            return;
        }

        syncRadioGroup(input);
        updateActiveFiltersCount();
        submitFilterForm();
    };

    if (filterForm._radioPointerHandler) {
        filterForm.removeEventListener('pointerdown', filterForm._radioPointerHandler);
        filterForm.removeEventListener('click', filterForm._radioPointerHandler);
    }

    filterForm._radioPointerHandler = handleRadioPointer;
    filterForm.addEventListener('pointerdown', handleRadioPointer);
    filterForm.addEventListener('click', handleRadioPointer);

    if (filterForm._filterChangeHandler) {
        filterForm.removeEventListener('change', filterForm._filterChangeHandler);
    }

    filterForm._filterChangeHandler = handleFilterChange;
    filterForm.addEventListener('change', handleFilterChange);
}


// ------------------------------------------------------------
// Price UI initialization
// ------------------------------------------------------------

// ------------------------------------------------------------
// Price filter - Dual handle range slider
// ------------------------------------------------------------

function initPriceFilter() {

    const priceRangeMin =
        document.getElementById('priceRangeMin');

    const priceRangeMax =
        document.getElementById('priceRangeMax');

    const priceMinInput =
        document.getElementById('priceMinInput');

    const priceMaxInput =
        document.getElementById('priceMaxInput');

    const trackFill =
        document.querySelector('.p1-range-track-fill');

    if (!priceRangeMin || !priceRangeMax) {
        return;
    }


    // --------------------------------------------
    // Update track fill between handles
    // --------------------------------------------

    function updateTrackFill() {
        if (!trackFill) return;

        const minVal = parseInt(priceRangeMin.value, 10);
        const maxVal = parseInt(priceRangeMax.value, 10);
        const globalMin = parseInt(priceRangeMin.min, 10) || 0;
        const globalMax = parseInt(priceRangeMax.max, 10) || 9999;

        if (Number.isNaN(minVal) || Number.isNaN(maxVal)) return;

        const minPercent = ((minVal - globalMin) / (globalMax - globalMin)) * 100;
        const maxPercent = ((maxVal - globalMin) / (globalMax - globalMin)) * 100;

        trackFill.style.left = minPercent + '%';
        trackFill.style.width = (maxPercent - minPercent) + '%';
    }

    function ensureMinMaxOrder() {
        let minVal = parseInt(priceRangeMin.value, 10);
        let maxVal = parseInt(priceRangeMax.value, 10);

        if (minVal > maxVal) {
            // Swap values
            priceRangeMin.value = maxVal;
            priceRangeMax.value = minVal;
            if (priceMinInput) priceMinInput.value = maxVal;
            if (priceMaxInput) priceMaxInput.value = minVal;
        }
    }


    // --------------------------------------------
    // Initial sync
    // --------------------------------------------

    syncPriceRange();
    updateTrackFill();

    updatePriceDisplay(
        priceMaxInput
            ? priceMaxInput.value
            : priceRangeMax.value
    );


    // --------------------------------------------
    // Min slider
    // --------------------------------------------

    priceRangeMin.addEventListener(
        'input',
        function () {

            // Only update the number input and track fill
            // Do NOT call syncPriceRange() here as it would reset the slider
            if (priceMinInput) priceMinInput.value = this.value;
            updatePriceDisplay(this.value);
            updateTrackFill();
            updateActiveFiltersCount();
        }
    );


    // --------------------------------------------
    // Min slider change = AJAX
    // --------------------------------------------

    priceRangeMin.addEventListener(
        'change',
        function () {

            ensureMinMaxOrder();
            syncPriceRange();
            updateTrackFill();

            submitFilterFormDebounced();
        }
    );


    // --------------------------------------------
    // Max slider
    // --------------------------------------------

    priceRangeMax.addEventListener(
        'input',
        function () {

            // Only update the number input and track fill
            // Do NOT call syncPriceRange() here as it would reset the slider
            if (priceMaxInput) priceMaxInput.value = this.value;
            updatePriceDisplay(this.value);
            updateTrackFill();
            updateActiveFiltersCount();
        }
    );


    // --------------------------------------------
    // Max slider change = AJAX
    // --------------------------------------------

    priceRangeMax.addEventListener(
        'change',
        function () {

            ensureMinMaxOrder();
            syncPriceRange();
            updateTrackFill();

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
                updateTrackFill();

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
                updateTrackFill();

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
                id="closeFiltersClearAll"
                aria-label="Close filters"
            >
                <i class="fa-solid fa-xmark"></i>
            </button>
        `;


        const closeButton =
            header.querySelector('#closeFiltersClearAll');


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

                // Initialize mini-cart-btn and wishlist for Quick View
                initializeQuickViewButtons();

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
// Initialize Quick View buttons (mini-cart-btn + wishlist)
// ------------------------------------------------------------

function initializeQuickViewButtons() {
    const modalContent = document.getElementById('quickViewContent');
    if (!modalContent) return;

    // Initialize mini-cart-btn (matches product_detail.js logic)
    const miniCartBtns = modalContent.querySelectorAll('.mini-cart-btn[data-cart]');
    miniCartBtns.forEach(function(btn) {
        var buyBox = btn.closest('.buy-box, .mini-product-card');
        if (!buyBox) return;

        var qtyRow = buyBox.querySelector('.qty-row');
        var stepper = qtyRow ? qtyRow.querySelector('.qty-stepper') : null;
        var minusBtn = stepper ? stepper.querySelector('.qty-minus') : null;
        var plusBtn = stepper ? stepper.querySelector('.qty-plus') : null;
        var valueEl = stepper ? stepper.querySelector('.qty-value') : null;
        var min = valueEl ? Number(valueEl.dataset.min || 1) : 1;

        if (!qtyRow || !stepper || !minusBtn || !plusBtn || !valueEl) return;

        function updateMinusButton() {
            var cur = Number(valueEl.textContent) || min;
            if (cur <= min) {
                minusBtn.classList.add('trash');
                minusBtn.disabled = false;
                minusBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>';
                minusBtn.setAttribute('aria-label', 'Remove from cart');
            } else {
                minusBtn.classList.remove('trash');
                minusBtn.innerHTML = '&#8722;';
                minusBtn.setAttribute('aria-label', 'Decrease quantity');
            }
        }

        function openQtyRow() {
            qtyRow.style.display = 'flex';
            qtyRow.style.opacity = '1';
            qtyRow.style.maxHeight = '60px';
            qtyRow.style.overflow = 'hidden';
            qtyRow.style.pointerEvents = 'auto';
            btn.style.display = 'none';
            valueEl.textContent = min;
            updateMinusButton();
        }

        function closeQtyRow() {
            qtyRow.style.display = 'none';
            btn.style.display = 'inline-flex';
            valueEl.textContent = min;
            updateMinusButton();
        }

        btn.addEventListener('click', function(e) {
            var isOpen = qtyRow.style.display === 'flex';
            if (!isOpen) {
                e.preventDefault();
                openQtyRow();
            }
        });

        minusBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            var cur = Number(valueEl.textContent) || min;
            if (cur <= min) {
                closeQtyRow();
            } else {
                valueEl.textContent = cur - 1;
                updateMinusButton();
            }
        });

        plusBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            var cur = Number(valueEl.textContent) || min;
            valueEl.textContent = Math.min(99, cur + 1);
            updateMinusButton();
        });

        updateMinusButton();
    });

    // Initialize wishlist button in Quick View
    const wishlistBtns = modalContent.querySelectorAll('.product-wishlist-btn');
    wishlistBtns.forEach(function(btn) {
        // Remove existing listeners by cloning
        var newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);

        newBtn.addEventListener('click', function(event) {
            event.preventDefault();
            event.stopPropagation();

            const productId = this.getAttribute('data-product-id');
            if (!productId) return;

            toggleCardWishlist(productId, this);
        });
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

                    <div class="rating-stars" style="color: #f5a623;">

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


                <div class="mini-product-card">
                    <div class="qty-row">
                        <div class="qty-stepper">
                            <button type="button" class="qty-btn qty-minus" aria-label="Decrease quantity">&#8722;</button>
                            <span class="qty-value" data-min="1">1</span>
                            <button type="button" class="qty-btn qty-plus" aria-label="Increase quantity">&#43;</button>
                        </div>
                    </div>
                    <button
                        type="button"
                        class="mini-cart-btn"
                        data-cart="quickview"
                        data-product-id="${product.id}"
                    >
                        <i class="fa-solid fa-cart-shopping"></i>
                        <span class="cart-label">Add to Cart</span>
                    </button>
                </div>


                <button
                    type="button"
                    class="p1-wish product-wishlist-btn ${product.in_wishlist ? 'is-active' : ''}"
                    data-product-id="${product.id}"
                    aria-label="Add ${product.name} to wishlist"
                >
                    <i class="${product.in_wishlist ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
                </button>

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
// Project login page (used when the wishlist endpoint redirects)
// ------------------------------------------------------------

const LOGIN_PAGE_URL = '/users/show_login';


// ------------------------------------------------------------
// CSRF helper (same cookie convention as existing project JS)
// ------------------------------------------------------------

function getCsrfToken() {

    const name = 'csrftoken=';

    const cookie = document
        .cookie
        .split(';')
        .map(c => c.trim())
        .find(c => c.startsWith(name));

    return cookie
        ? decodeURIComponent(cookie.substring(name.length))
        : '';
}


// ------------------------------------------------------------
// Product card wishlist buttons
// ------------------------------------------------------------

function initCardWishlistButtons() {

    document
        .querySelectorAll('.product-wishlist-btn')
        .forEach(button => {

            button.addEventListener(
                'click',
                function (event) {

                    event.preventDefault();

                    const productId =
                        this.getAttribute(
                            'data-product-id'
                        );

                    if (!productId) {
                        return;
                    }

                    toggleCardWishlist(
                        productId,
                        this
                    );
                }
            );
        });
}


// ------------------------------------------------------------
// Toggle wishlist state for a single product card
// ------------------------------------------------------------

function toggleCardWishlist(productId, button) {

    const icon =
        button.querySelector('i');

    const csrfToken =
        getCsrfToken();


    if (!csrfToken) {
        console.error(
            'Wishlist error: CSRF token not found'
        );

        return;
    }


    fetch(
        `/wishlist/add/${productId}/`,
        {
            method: 'POST',

            headers: {
                'X-CSRFToken': csrfToken,
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json'
            },

            credentials: 'same-origin'
        }
    )
        .then(response => {

            const contentType =
                response.headers.get(
                    'Content-Type'
                ) || '';


            // Unauthenticated users are redirected by the
            // backend to the login page. fetch() follows the
            // redirect automatically, so the real flag is
            // response.redirected or a non-JSON content type.

            if (
                response.redirected ||
                !contentType.includes(
                    'application/json'
                )
            ) {

                window.location.href =
                    LOGIN_PAGE_URL;

                return null;
            }


            if (!response.ok) {
                throw new Error(
                    `HTTP ${response.status}`
                );
            }


            return response.json();
        })

        .then(data => {

            // Handled above (redirect to login)
            if (data === null) {
                return;
            }


            if (!data.success) {
                throw new Error(
                    'Wishlist update failed'
                );
            }


            if (data.action === 'added') {

                button.classList.add('is-active');

                if (icon) {
                    icon.classList.remove(
                        'fa-regular'
                    );
                    icon.classList.add(
                        'fa-solid'
                    );
                }

            } else if (
                data.action === 'removed'
            ) {

                button.classList.remove(
                    'is-active'
                );

                if (icon) {
                    icon.classList.remove(
                        'fa-solid'
                    );
                    icon.classList.add(
                        'fa-regular'
                    );
                }
            }


            // Sync the existing wishlist counter in the
            // site header if it is present on this page.

            const wishlistCountElement =
                document.getElementById(
                    'wishlistCount'
                );

            if (
                wishlistCountElement &&
                typeof data.total !== 'undefined'
            ) {

                wishlistCountElement.textContent =
                    data.total;
            }
        })

        .catch(error => {

            console.error(
                'Wishlist update error:',
                error
            );

            alert(
                'Could not update the wishlist. ' +
                'Please try again.'
            );
        });
}


// ------------------------------------------------------------
// Product card click navigation
// ------------------------------------------------------------

function initProductCardNavigation() {
    const grid = document.querySelector('.p1-grid');
    if (!grid) return;

    grid.addEventListener('click', (e) => {
        const card = e.target.closest('.p1-card');
        if (!card) return;

        // Don't navigate if clicking on interactive elements
        if (e.target.closest('.p1-wish') ||
            e.target.closest('.p1-quickview') ||
            e.target.closest('.mini-cart-btn') ||
            e.target.closest('.p1-color') ||
            e.target.closest('.p1-wish')) {
            return;
        }

        const productId = card.dataset.productId;
        if (productId) {
            window.location.href = `/product_detail/${productId}/`;
        }
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
        // Sort buttons
        // ----------------------------------------

        initSortButtons();

        // ----------------------------------------
        // Pagination
        // ----------------------------------------

        initPagination();

        // ----------------------------------------
        // Quick View
        // ----------------------------------------

        initQuickViewButtons();


        // ----------------------------------------
        // Card wishlist
        // ----------------------------------------

        initCardWishlistButtons();

        // ----------------------------------------
        // Product card navigation
        // ----------------------------------------

        initProductCardNavigation();


        // ----------------------------------------
        // Initial UI sync
        // ----------------------------------------

        syncFormFromURL();
        buildActiveFilterChips();
        updateActiveFiltersCount();
    }
);


function clearFilterChip(name, value) {
    const input = Array.from(
        document.querySelectorAll(`input[name="${name}"]`)
    ).find(candidate => candidate.value === value);

    if (input) {
        input.checked = false;
        input.dispatchEvent(new Event('change', { bubbles: true }));
        return;
    }

    submitFilterForm();
}

function clearPriceFilter() {
    const priceMinInput = document.getElementById('priceMinInput');
    const priceMaxInput = document.getElementById('priceMaxInput');
    const priceRangeMin = document.getElementById('priceRangeMin');
    const priceRangeMax = document.getElementById('priceRangeMax');

    if (priceMinInput) {
        priceMinInput.value = priceMinInput.min || '0';
    }
    if (priceMaxInput) {
        priceMaxInput.value = priceMaxInput.max || '9999';
    }
    if (priceRangeMin) {
        priceRangeMin.value = priceRangeMin.min || '0';
    }
    if (priceRangeMax) {
        priceRangeMax.value = priceRangeMax.max || '9999';
    }

    submitFilterForm();
}

function buildActiveFilterChips() {
    const chipsContainer = document.querySelector('[data-active-chips]');
    if (!chipsContainer) return;

    chipsContainer.innerHTML = '';

    const form = document.getElementById('filterForm');
    if (!form) return;

    function makeChip(label, onRemove) {
        const chip = document.createElement('span');
        chip.className = 'chip';
        const text = document.createTextNode(label + ' ');
        chip.appendChild(text);
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'chip-x';
        btn.textContent = '\u00d7';
        btn.setAttribute('aria-label', 'Remove filter');
        btn.addEventListener('click', onRemove);
        chip.appendChild(btn);
        return chip;
    }

    // Brand chips
    const brandInputs = form.querySelectorAll('input[name="brand"]:checked');
    brandInputs.forEach(input => {
        chipsContainer.appendChild(
            makeChip(input.value, () => clearFilterChip('brand', input.value))
        );
    });

    // All attribute chips (color, condition, screen-size, ram, storage, etc.)
    const attrInputs = form.querySelectorAll('input[name^="attr_"]:checked');
    attrInputs.forEach(input => {
        const name = input.name;
        const value = input.value;
        let prefix = '';
        const filterGroup = input.closest('.p1-group');
        if (filterGroup) {
            const titleEl = filterGroup.querySelector('.p1-group-title');
            if (titleEl) {
                prefix = titleEl.textContent.replace(/\s+/g, ' ').trim() + ': ';
            }
        }
        const displayName = prefix + value;
        chipsContainer.appendChild(
            makeChip(displayName, () => clearFilterChip(name, value))
        );
    });

    // Price chip
    const priceMinInput = document.getElementById('priceMinInput');
    const priceMaxInput = document.getElementById('priceMaxInput');
    if (priceMinInput && priceMaxInput) {
        const minVal = priceMinInput.value;
        const maxVal = priceMaxInput.value;
        const minDefault = priceMinInput.min || '0';
        const maxDefault = priceMaxInput.max || '9999';

        if (minVal !== minDefault || maxVal !== maxDefault) {
            const label = 'Price: $' + minVal + ' - $' + maxVal;
            chipsContainer.appendChild(
                makeChip(label, () => clearPriceFilter())
            );
        }
    }

    // Category chip
    const categoryInput = document.getElementById('categoryInput');
    if (categoryInput && categoryInput.value) {
        const catVal = categoryInput.value;
        chipsContainer.appendChild(
            makeChip(catVal, () => {
                categoryInput.value = '';
                submitFilterForm();
            })
        );
    }

    // Search chip
    const searchQ = new URLSearchParams(window.location.search).get('q');
    if (searchQ) {
        const qVal = searchQ;
        chipsContainer.appendChild(
            makeChip('Search: ' + qVal, () => {
                const formEl = document.getElementById('filterForm');
                if (formEl) {
                    const qInput = formEl.querySelector('input[name="q"]');
                    if (qInput) qInput.value = '';
                }
                submitFilterForm();
            })
        );
    }
}

// ------------------------------------------------------------
// Global exports for inline onclick handlers in products_ajax.html
// ------------------------------------------------------------

window.toggleFilter = toggleFilter;