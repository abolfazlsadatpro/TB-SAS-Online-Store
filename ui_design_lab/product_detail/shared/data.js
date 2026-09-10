/**
 * Product Detail Design Lab - Shared Data
 * Realistic product data based on TB-SAS production products
 */

window.PDL_DATA = {
  // Product 8 - Apple iPhone 17 Pro Max (5 images, 3 colors, 6 specs, has discount)
  product8: {
    id: 8,
    name: "Apple iPhone 17 Pro Max",
    brand: "Apple",
    category: "Smartphones",
    rating: 4.7,
    reviewCount: 128,
    commentCount: 47,
    inStock: true,
    price: 1499,
    oldPrice: 1799,
    discount: 17,
    finalPrice: 1499,
    stock: 25,
    sold: 342,
    views: 1240,
    colors: [
      { id: 8, name: "Dark Blue", code: "#3f4656", image: "https://images.unsplash.com/photo-1592286927504-1b2b2b2b2b2b?w=400&h=400&fit=crop", stock: 10 },
      { id: 9, name: "Orange",    code: "#e87a3e", image: "https://images.unsplash.com/photo-1592286927504-2b2b2b2b2b2b?w=400&h=400&fit=crop", stock: 15 },
      { id: 10, name: "Silver",   code: "#c0c0c0", image: "https://images.unsplash.com/photo-1592286927504-3b2b2b2b2b2b?w=400&h=400&fit=crop", stock: 0 }
    ],
    images: [
      "https://images.unsplash.com/photo-1592286927504-1b2b2b2b2b2b?w=800&h=800&fit=crop",
      "https://images.unsplash.com/photo-1592286927504-2b2b2b2b2b2b?w=800&h=800&fit=crop",
      "https://images.unsplash.com/photo-1592286927504-3b2b2b2b2b2b?w=800&h=800&fit=crop",
      "https://images.unsplash.com/photo-1592286927504-4b2b2b2b2b2b?w=800&h=800&fit=crop",
      "https://images.unsplash.com/photo-1592286927504-5b2b2b2b2b2b?w=800&h=800&fit=crop"
    ],
    specs: [
      { title: "Display",    value: "6.9-inch Super Retina XDR ProMotion" },
      { title: "Chip",       value: "Apple A19 Pro Bionic" },
      { title: "RAM",        value: "12 GB LPDDR5X" },
      { title: "Storage",    value: "256 GB NVMe" },
      { title: "Camera",     value: "48 MP Triple-Lens with 5x Telephoto" },
      { title: "Battery",    value: "4,800 mAh with 35W Fast Charge" }
    ],
    description: "The most advanced iPhone ever. Built with aerospace-grade titanium, the A19 Pro chip delivers unprecedented performance. The 48MP camera system captures stunning detail in any light, while the all-day battery keeps you going."
  },

  // Product 9 - Xiaomi Poco X7 Pro (1 image, 3 colors, 7 specs)
  product9: {
    id: 9,
    name: "Xiaomi Poco X7 Pro",
    brand: "Xiaomi",
    category: "Smartphones",
    rating: 4.5,
    reviewCount: 86,
    commentCount: 23,
    inStock: true,
    price: 389,
    oldPrice: null,
    discount: 0,
    finalPrice: 389,
    stock: 77,
    sold: 156,
    views: 890,
    colors: [
      { id: 11, name: "Yellow", code: "#ffd700", image: "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=400&h=400&fit=crop", stock: 77 },
      { id: 12, name: "Black",  code: "#1a1a1a", image: "https://images.unsplash.com/photo-1598327105666-6b89351aff97?w=400&h=400&fit=crop", stock: 57 },
      { id: 13, name: "Green",  code: "#2d5f3f", image: "https://images.unsplash.com/photo-1598327105666-7b89351aff97?w=400&h=400&fit=crop", stock: 107 }
    ],
    images: [
      "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800&h=800&fit=crop"
    ],
    specs: [
      { title: "Display",   value: "6.67-inch Flow AMOLED DotDisplay" },
      { title: "Chip",      value: "MediaTek Dimensity 8400-Ultra" },
      { title: "RAM",       value: "8 GB LPDDR5X" },
      { title: "Storage",   value: "256 GB UFS 4.0" },
      { title: "Camera",    value: "50 MP Sony IMX686 main" },
      { title: "Battery",   value: "5,000 mAh with 67W HyperCharge" },
      { title: "Weight",    value: "198 g" }
    ],
    description: "POCO X7 Pro pushes the boundaries of mid-range performance. With Dimensity 8400-Ultra, a 120Hz AMOLED display, and 67W HyperCharge, it delivers flagship-level experience at a fraction of the price."
  },

  // Product 21 - Samsung Galaxy S25 Ultra (0 product images, 1 color, 0 specs)
  product21: {
    id: 21,
    name: "Samsung Galaxy S25 Ultra",
    brand: "Samsung",
    category: "Smartphones",
    rating: 4.8,
    reviewCount: 212,
    commentCount: 89,
    inStock: true,
    price: 1299,
    oldPrice: 1399,
    discount: 7,
    finalPrice: 1299,
    stock: 25,
    sold: 518,
    views: 2150,
    colors: [
      { id: 29, name: "Titanium Black", code: "#1a1a1a", image: "https://images.unsplash.com/photo-1610945265064-77e34b5b9b5b?w=400&h=400&fit=crop", stock: 25 }
    ],
    images: [],
    specs: [],
    description: "Meet the new Galaxy S25 Ultra. Featuring a titanium frame, the most powerful Snapdragon processor, and a 200MP camera system with AI-powered photography. This is Samsung's most advanced Galaxy ever."
  },

  // Review data (shared)
  reviews: [
    {
      id: 1,
      user: "Ali R.",
      date: "2026-08-15",
      rating: 5,
      text: "Absolutely stunning phone. The camera quality is incredible, especially in low light. Battery easily lasts a full day with heavy use. Highly recommend!",
      likes: 24,
      dislikes: 2
    },
    {
      id: 2,
      user: "Sara M.",
      date: "2026-08-10",
      rating: 4,
      text: "Great phone overall. Performance is top-notch and the display is beautiful. Only minor issue is that it gets a bit warm during intensive gaming sessions.",
      likes: 18,
      dislikes: 1
    },
    {
      id: 3,
      user: "Hassan K.",
      date: "2026-07-28",
      rating: 5,
      text: "Best phone I've ever owned. The titanium build feels premium and the new camera system is a game changer. Worth every penny.",
      likes: 31,
      dislikes: 0
    }
  ],

  // Related products for the bottom section
  related: [
    { id: 9,  name: "Xiaomi Poco X7 Pro",   price: 389,  image: "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=300&h=300&fit=crop", rating: 4.5 },
    { id: 22, name: "Apple iPhone 16 Pro Max", price: 1199, image: "https://images.unsplash.com/photo-1592286927504-6b6b6b6b6b6b?w=300&h=300&fit=crop", rating: 4.7 },
    { id: 23, name: "Xiaomi 15 Pro",       price: 999,  image: "https://images.unsplash.com/photo-1592286927504-7c7c7c7c7c7c?w=300&h=300&fit=crop", rating: 4.6 },
    { id: 24, name: "Poco F7 Pro",         price: 549,  image: "https://images.unsplash.com/photo-1592286927504-8d8d8d8d8d8d?w=300&h=300&fit=crop", rating: 4.4 },
    { id: 25, name: "Honor Magic 7",       price: 699,  image: "https://images.unsplash.com/photo-1592286927504-9e9e9e9e9e9e?w=300&h=300&fit=crop", rating: 4.5 }
  ]
};
