// ============================================================
// SHARED PRODUCT DATA — Used by all 5 design proposals
// Mirrors the actual product database structure (TB-SAS / ShopLearning)
// ============================================================

window.PRODUCTS_DATA = [
    {
        id: 30, name: "HP Pavilion 15", category: "Laptop", brand: "HP",
        price: 799, old_price: 899, discount: 11,
        rating: 4.0, rating_count: 47,
        colors: [{ name: "Silver", code: "#c8c8c8" }, { name: "Black", code: "#1a1a1a" }],
        in_stock: true, is_new: false, is_bestseller: true
    },
    {
        id: 28, name: "Lenovo Legion 5", category: "Laptop", brand: "Lenovo",
        price: 1249, old_price: 1399, discount: 10,
        rating: 4.5, rating_count: 89,
        colors: [{ name: "Phantom Grey", code: "#4a4a4a" }, { name: "Black", code: "#000000" }],
        in_stock: true, is_new: false, is_bestseller: true
    },
    {
        id: 27, name: "Acer Nitro 16", category: "Laptop", brand: "Acer",
        price: 1199, old_price: null, discount: 0,
        rating: 4.2, rating_count: 34,
        colors: [{ name: "Black", code: "#222222" }],
        in_stock: true, is_new: true, is_bestseller: false
    },
    {
        id: 26, name: "MSI Katana 15", category: "Laptop", brand: "MSI",
        price: 1349, old_price: 1499, discount: 10,
        rating: 4.3, rating_count: 56,
        colors: [{ name: "Black", code: "#1a1a1a" }],
        in_stock: true, is_new: false, is_bestseller: false
    },
    {
        id: 24, name: "Poco F7 Pro", category: "Phone", brand: "Xiaomi",
        price: 429, old_price: 499, discount: 14,
        rating: 4.4, rating_count: 128,
        colors: [{ name: "Blue", code: "#3a5ba0" }, { name: "Black", code: "#000000" }, { name: "White", code: "#ffffff" }],
        in_stock: true, is_new: true, is_bestseller: true
    },
    {
        id: 23, name: "Xiaomi 15 Pro", category: "Phone", brand: "Xiaomi",
        price: 699, old_price: 799, discount: 12,
        rating: 4.6, rating_count: 203,
        colors: [{ name: "Black", code: "#111111" }, { name: "White", code: "#f5f5f5" }],
        in_stock: true, is_new: false, is_bestseller: true
    },
    {
        id: 22, name: "Apple iPhone 16 Pro Max", category: "Phone", brand: "Apple",
        price: 1199, old_price: 1299, discount: 7,
        rating: 4.8, rating_count: 412,
        colors: [{ name: "Natural Titanium", code: "#8a8a8e" }, { name: "Black", code: "#1a1a1a" }, { name: "White", code: "#f0f0f0" }],
        in_stock: true, is_new: false, is_bestseller: true
    },
    {
        id: 21, name: "Samsung Galaxy S25 Ultra", category: "Phone", brand: "Samsung",
        price: 1149, old_price: 1299, discount: 11,
        rating: 4.7, rating_count: 287,
        colors: [{ name: "Titanium Black", code: "#1f2328" }, { name: "Titanium Silver", code: "#b8b8b8" }],
        in_stock: true, is_new: true, is_bestseller: true
    },
    {
        id: 9, name: "Xiaomi Poco X7 Pro", category: "Phone", brand: "Xiaomi",
        price: 389, old_price: 429, discount: 9,
        rating: 4.1, rating_count: 95,
        colors: [{ name: "Yellow", code: "#ffd700" }, { name: "Black", code: "#1e1e17" }, { name: "Green", code: "#7f9887" }],
        in_stock: true, is_new: false, is_bestseller: false
    },
    {
        id: 8, name: "Apple iPhone 17 Pro Max", category: "Phone", brand: "Apple",
        price: 1399, old_price: 1499, discount: 6,
        rating: 3.6, rating_count: 11,
        colors: [{ name: "Dark Blue", code: "#3f4656" }, { name: "Orange", code: "#f88f4d" }, { name: "Silver", code: "#c0c0c0" }],
        in_stock: false, is_new: true, is_bestseller: false
    },
    {
        id: 7, name: "Sony WH-1000XM5", category: "Audio", brand: "Sony",
        price: 349, old_price: 399, discount: 12,
        rating: 4.7, rating_count: 156,
        colors: [{ name: "Black", code: "#1a1a1a" }, { name: "Silver", code: "#d4d4d4" }],
        in_stock: true, is_new: false, is_bestseller: true
    },
    {
        id: 6, name: "JBL Charge 5", category: "Audio", brand: "JBL",
        price: 149, old_price: null, discount: 0,
        rating: 4.4, rating_count: 78,
        colors: [{ name: "Red", code: "#dc2626" }, { name: "Black", code: "#1a1a1a" }, { name: "Blue", code: "#2563eb" }],
        in_stock: true, is_new: false, is_bestseller: false
    }
];

window.BRANDS_DATA = [
    { name: "Apple", count: 2 }, { name: "Samsung", count: 1 }, { name: "Xiaomi", count: 3 },
    { name: "HP", count: 1 }, { name: "Lenovo", count: 1 }, { name: "Acer", count: 1 },
    { name: "MSI", count: 1 }, { name: "Sony", count: 1 }, { name: "JBL", count: 1 }
];

window.CATEGORIES_DATA = [
    { name: "Phone", count: 6 }, { name: "Laptop", count: 4 }, { name: "Audio", count: 2 }
];

window.PRICE_DATA = { min: 149, max: 1399 };

// ------------------------------------------------------------
// Helper: return full/half/empty star breakdown for a rating
// ------------------------------------------------------------
window.starBreakdown = function (rating) {
    const full = Math.floor(rating);
    const half = (rating - full) >= 0.5;
    const empty = 5 - full - (half ? 1 : 0);
    return { full: full, half: half, empty: empty };
};

// ------------------------------------------------------------
// Helper: SVG placeholder image, colour-coded by category.
// Returns a data URI string so each proposal is fully standalone
// (no external images, no dependency on the Django media server).
// ------------------------------------------------------------
window.productImageURI = function (product) {
    const palettes = {
        Phone:   { bg: "#eef2ff", accent: "#4f46e5", text: "#312e81" },
        Laptop:  { bg: "#ecfdf5", accent: "#16a34a", text: "#14532d" },
        Audio:   { bg: "#fef3c7", accent: "#d97706", text: "#713f12" }
    };
    const p = palettes[product.category] || palettes.Phone;

    const svg =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">' +
        '<rect width="240" height="240" fill="' + p.bg + '"/>' +
        '<circle cx="120" cy="112" r="58" fill="#ffffff" stroke="' + p.accent + '" stroke-width="2"/>' +
        '<circle cx="120" cy="112" r="30" fill="' + p.accent + '" opacity="0.18"/>' +
        '<circle cx="120" cy="112" r="14" fill="' + p.accent + '" opacity="0.5"/>' +
        '<text x="120" y="208" text-anchor="middle" font-family="Verdana,sans-serif" font-size="17" font-weight="600" fill="' + p.text + '">' +
        product.brand + '</text>' +
        '</svg>';

    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
};