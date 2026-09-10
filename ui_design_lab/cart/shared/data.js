/**
 * Cart Design Lab - Shared Mock Data
 * Mirrors the real Cart contract from cart_service.py and views.py.
 * Includes realistic data for 3 products, a coupon, and an empty-cart scenario.
 *
 * Keys/fields intentionally mirror the production contract so the prototypes
 * can be productionized with minimal changes.
 */

window.CART_LAB_DATA = {
  // Realistic item set
  items: [
    {
      key: "8:8",
      product_id: 8,
      display_name: "Apple iPhone 17 Pro Max",
      color_name: "Dark Blue",
      color_code: "#3f4656",
      quantity: 1,
      unit_price: "1499.00",
      line_subtotal: "1499.00",
      image_url: "https://images.unsplash.com/photo-1592286927504-1b2b2b2b2b2b?w=200&h=200&fit=crop",
      is_in_stock: true,
      has_discount: true,
      old_price: "1799.00",
    },
    {
      key: "9:11",
      product_id: 9,
      display_name: "Xiaomi Poco X7 Pro",
      color_name: "Yellow",
      color_code: "#ffd700",
      quantity: 2,
      unit_price: "389.00",
      line_subtotal: "778.00",
      image_url: "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=200&h=200&fit=crop",
      is_in_stock: true,
      has_discount: false,
      old_price: null,
    },
    {
      key: "22:30",
      product_id: 22,
      display_name: "Apple iPhone 16 Pro Max with a longer product name that may wrap",
      color_name: "Natural Titanium",
      color_code: "#c0b89a",
      quantity: 1,
      unit_price: "1199.00",
      line_subtotal: "1199.00",
      image_url: "https://images.unsplash.com/photo-1592286927504-6b6b6b6b6b6b?w=200&h=200&fit=crop",
      is_in_stock: true,
      has_discount: false,
      old_price: null,
    },
  ],

  // Out-of-stock variant (used to test that visual state)
  outOfStockItem: {
    key: "23:31",
    product_id: 23,
    display_name: "Xiaomi 15 Pro (Sold Out)",
    color_name: "Black",
    color_code: "#1a1a1a",
    quantity: 1,
    unit_price: "999.00",
    line_subtotal: "999.00",
    image_url: "https://images.unsplash.com/photo-1592286927504-7c7c7c7c7c7c?w=200&h=200&fit=crop",
    is_in_stock: false,
    has_discount: false,
    old_price: null,
  },

  // Aggregated totals (no coupon)
  totals: {
    subtotal: "3476.00",     // 1499 + 778 + 1199
    discount: "0.00",
    shipping: "0.00",        // free
    tax: "347.60",           // 10% after discount
    total: "3823.60",
    badge: 4,                // 1 + 2 + 1
    lines_count: 3,
    items_count: 4,
  },

  // Coupon state (applies 10% off)
  coupon: {
    code: "SAVE10",
    discount: "347.60",       // 10% of 3476
    is_applied: true,
  },

  // Aggregated totals with coupon
  totalsWithCoupon: {
    subtotal: "3476.00",
    discount: "347.60",
    shipping: "0.00",
    tax: "312.84",             // 10% of (3476 - 347.60) = 312.84
    total: "3441.24",
    badge: 4,
    lines_count: 3,
    items_count: 4,
  },

  // Settings (mirrors SettingSite)
  settings: {
    free_shipping_threshold: "100.00",
    tax_percent: "10.00",
  },
};
