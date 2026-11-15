// Shop types: what kind of store this is. Each type brings its own wording, categories,
// product filters, homepage "shop by" tiles and demo data. Picked in the setup wizard and
// changeable in Admin → Settings → Store type. Stored in SiteSettings.shopType.

import type { ThemeId, FontId } from '@/lib/layout-settings';

export type ShopTypeId =
  | 'baby' | 'fashion' | 'electronics' | 'beauty' | 'home' | 'grocery'
  | 'jewellery' | 'books' | 'sports' | 'general';

export interface ShopCategory { name: string; slug: string; emoji: string; description: string }
/** [name, price in INR, compare-at price or 0] */
export type DemoProduct = [string, number, number];

export interface ShopType {
  id: ShopTypeId;
  name: string;
  emoji: string;
  /** Shown where a product has no picture. */
  placeholder: string;
  description: string; // one line for the setup wizard
  theme: ThemeId;
  font: FontId;
  copy: {
    heroTitle: string;
    heroSubtitle: string;
    heroBadge: string;
    heroCta: string;
    heroCtaCategory: string; // category slug the hero button opens
    footerAbout: string;
    metaDescription: string;
    keywords: string[];
    categoriesSubtitle: string;
    reviewsTitle: string;
    whyTitle: string;
    newsletterSubtitle: string;
  };
  /** Trust bar badges after the shipping one. */
  trust: [string, string];
  /** The four homepage benefits: [emoji, title, description]. */
  benefits: [string, string, string][];
  /** "Why you'll love it" bullets on product pages. */
  highlights: string[];
  /** Age filter (baby shops only). Values are the Product.ageGroup enum. */
  ages: { value: string; label: string; short: string; emoji: string }[] | null;
  /** "Who it's for" filter. Values are the Product.gender enum, relabelled per type. */
  audience: { label: string; options: { value: 'UNISEX' | 'BOYS' | 'GIRLS'; label: string }[] } | null;
  /** Homepage tiles under the categories. */
  shopBy: { title: string; subtitle: string; kind: 'age' | 'audience' | 'price' };
  categories: ShopCategory[];
  /** Demo products keyed by category slug. */
  demo: Record<string, DemoProduct[]>;
  /** Demo reviews: [name, city, rating, text]. Product names are filled in from the demo. */
  reviews: [string, string, number, string][];
}

const BABY_AGES = [
  { value: 'NEWBORN', label: 'Newborn (0–3m)', short: '0–3 months', emoji: '👶' },
  { value: 'INFANT', label: 'Infant (3–12m)', short: '3–12 months', emoji: '🍼' },
  { value: 'TODDLER', label: 'Toddler (1–3y)', short: '1–3 years', emoji: '🧸' },
  { value: 'PRESCHOOL', label: 'Preschool (3–5y)', short: '3–5 years', emoji: '🎨' },
  { value: 'KIDS', label: 'Kids (5–10y)', short: '5–10 years', emoji: '⚽' },
  { value: 'PRETEEN', label: 'Preteen (10–12y)', short: '10–12 years', emoji: '🎮' },
];

const MEN_WOMEN = {
  label: 'For',
  options: [
    { value: 'UNISEX' as const, label: 'Unisex' },
    { value: 'BOYS' as const, label: 'Men' },
    { value: 'GIRLS' as const, label: 'Women' },
  ],
};

const COMMON_BENEFITS = (second: [string, string, string]): [string, string, string][] => [
  ['🚚', 'Free Shipping', 'On orders above ₹499'],
  second,
  ['↩️', 'Easy Returns', '7-day return policy'],
  ['💳', 'COD Available', 'Pay on delivery'],
];

export const SHOP_TYPES: Record<ShopTypeId, ShopType> = {
  baby: {
    id: 'baby', name: 'Baby & kids', emoji: '👶', placeholder: '🧸', description: 'Toys, baby gear, clothing, feeding and nursery', theme: 'lavender', font: 'quicksand',
    copy: {
      heroTitle: 'Everything Your Little One Needs to Smile!',
      heroSubtitle: 'Premium quality baby products, adorable soft toys & kids essentials.',
      heroBadge: 'New Arrivals: Soft Toys Collection', heroCta: 'Shop Toys', heroCtaCategory: 'toys',
      footerAbout: 'Premium baby products & toys for your little ones.',
      metaDescription: 'Premium baby products, soft toys, kids clothing & accessories.',
      keywords: ['baby products', 'kids toys', 'baby clothing', 'baby gear', 'nursery'],
      categoriesSubtitle: 'Everything your little one needs, in one place',
      reviewsTitle: 'What Parents Are Saying', whyTitle: 'Why parents love us 💛',
      newsletterSubtitle: 'Get 15% off on your first order + exclusive deals',
    },
    trust: ['100% Safe Products', 'BIS Certified'],
    benefits: COMMON_BENEFITS(['🛡️', '100% Safe', 'Non-toxic materials']),
    highlights: ['Premium quality materials', 'Safe for babies & kids', 'Easy to clean & maintain', 'Durable & long-lasting'],
    ages: BABY_AGES,
    audience: { label: 'For', options: [{ value: 'UNISEX', label: 'Everyone' }, { value: 'BOYS', label: 'Boys' }, { value: 'GIRLS', label: 'Girls' }] },
    shopBy: { title: 'Shop by Baby Age', subtitle: 'Find the perfect products for every stage', kind: 'age' },
    categories: [
      { name: 'Toys', slug: 'toys', emoji: '🧸', description: 'Soft toys, learning toys and games' },
      { name: 'Clothing', slug: 'clothing', emoji: '👕', description: 'Comfy everyday wear for babies and kids' },
      { name: 'Feeding & Nursing', slug: 'feeding-nursing', emoji: '🍼', description: 'Bottles, bibs and feeding sets' },
      { name: 'Bath & Skincare', slug: 'bath-skincare', emoji: '🛁', description: 'Gentle care for delicate skin' },
      { name: 'Diapers & Wipes', slug: 'diapers-wipes', emoji: '🧷', description: 'Everyday changing essentials' },
      { name: 'Baby Gear', slug: 'baby-gear', emoji: '🚼', description: 'Strollers, carriers and travel' },
      { name: 'Nursery & Furniture', slug: 'nursery-furniture', emoji: '🛏️', description: 'Cots, bedding and decor' },
    ],
    demo: {
      toys: [['Soft Bunny Plush', 499, 699], ['Wooden Stacking Rings', 399, 0], ['Musical Activity Cube', 1299, 1599], ['Shape Sorter Bus', 649, 799]],
      clothing: [['Organic Cotton Romper', 549, 699], ['Hooded Bath Towel Set', 799, 0], ['Knitted Booties', 299, 399], ['Printed Night Suit', 649, 0]],
      'feeding-nursing': [['Anti-colic Feeding Bottle', 449, 549], ['Silicone Bib Set', 349, 0], ['Suction Bowl & Spoon', 499, 599], ['Sippy Cup', 299, 0]],
      'bath-skincare': [['Gentle Baby Wash', 299, 349], ['Baby Massage Oil', 349, 0], ['Soft Hooded Towel', 599, 749], ['Rash Cream', 249, 0]],
      'diapers-wipes': [['Cloth Diaper Pack', 999, 1299], ['Water Wipes 72s', 199, 0], ['Diaper Changing Mat', 549, 699], ['Diaper Bag Deluxe', 1499, 1899]],
      'baby-gear': [['Lightweight Stroller', 7999, 9999], ['Ergonomic Baby Carrier', 2499, 2999], ['Car Seat Mirror', 699, 0], ['Portable High Chair', 2199, 2599]],
      'nursery-furniture': [['Muslin Swaddle Set', 899, 1099], ['Crib Mobile', 1199, 0], ['Night Lamp Cloud', 799, 999], ['Storage Basket Trio', 999, 0]],
    },
    reviews: [
      ['Priya M.', 'Mumbai', 5, 'Ordered for my 8-month-old and it arrived in 2 days. Super soft and safe, my baby loves it!'],
      ['Rahul S.', 'Bangalore', 5, 'Exactly as described. Packaging was secure and delivery was fast. Will order again.'],
      ['Anita K.', 'Delhi', 4, 'Great quality and genuine products. Customer support answered all my questions.'],
    ],
  },

  fashion: {
    id: 'fashion', name: 'Fashion & clothing', emoji: '👗', placeholder: '👗', description: 'Clothing, footwear, bags and accessories', theme: 'bubblegum', font: 'poppins',
    copy: {
      heroTitle: 'Style That Feels Like You',
      heroSubtitle: 'New-season clothing, footwear and accessories for every day and every occasion.',
      heroBadge: 'New season just landed', heroCta: 'Shop Women', heroCtaCategory: 'women',
      footerAbout: 'Everyday fashion and new-season styles, delivered to your door.',
      metaDescription: 'Shop clothing, footwear, bags and accessories for men and women.',
      keywords: ['fashion', 'clothing', 'footwear', 'ethnic wear', 'accessories'],
      categoriesSubtitle: 'Find your next favourite outfit',
      reviewsTitle: 'Loved by Our Customers', whyTitle: 'Why shoppers love us 💛',
      newsletterSubtitle: 'Get 10% off your first order and first look at new drops',
    },
    trust: ['Easy Exchanges', 'Quality Checked'],
    benefits: COMMON_BENEFITS(['🔁', 'Easy Exchanges', 'Free size exchange']),
    highlights: ['Breathable, comfortable fabric', 'True-to-size fit', 'Colour-fast after washing', 'Quality checked before dispatch'],
    ages: null,
    audience: MEN_WOMEN,
    shopBy: { title: 'Shop by Style', subtitle: 'Curated for him, her and everyone', kind: 'audience' },
    categories: [
      { name: 'Women', slug: 'women', emoji: '👗', description: 'Dresses, tops and everyday wear' },
      { name: 'Men', slug: 'men', emoji: '👔', description: 'Shirts, tees and trousers' },
      { name: 'Ethnic Wear', slug: 'ethnic-wear', emoji: '🥻', description: 'Kurtas, sarees and festive looks' },
      { name: 'Footwear', slug: 'footwear', emoji: '👟', description: 'Sneakers, sandals and formal shoes' },
      { name: 'Bags', slug: 'bags', emoji: '👜', description: 'Totes, backpacks and wallets' },
      { name: 'Accessories', slug: 'accessories', emoji: '🕶️', description: 'Sunglasses, belts and caps' },
    ],
    demo: {
      women: [['Floral Midi Dress', 1499, 1999], ['Linen Button Shirt', 999, 0], ['High-rise Straight Jeans', 1799, 2199], ['Ribbed Knit Top', 699, 899]],
      men: [['Oxford Cotton Shirt', 1299, 1599], ['Slim Chino Trousers', 1499, 0], ['Classic Crew Tee', 499, 699], ['Denim Jacket', 2499, 2999]],
      'ethnic-wear': [['Cotton Kurta Set', 1799, 2299], ['Silk Blend Saree', 2999, 3999], ['Embroidered Nehru Jacket', 1999, 0], ['Printed Palazzo', 799, 999]],
      footwear: [['White Leather Sneakers', 2299, 2799], ['Everyday Flip Flops', 399, 0], ['Block Heel Sandals', 1499, 1799], ['Formal Derby Shoes', 2799, 0]],
      bags: [['Canvas Tote Bag', 899, 1099], ['Laptop Backpack', 1999, 2499], ['Leather Bifold Wallet', 799, 0], ['Sling Crossbody Bag', 1299, 1599]],
      accessories: [['Polarised Sunglasses', 1199, 1499], ['Reversible Leather Belt', 699, 0], ['Baseball Cap', 499, 599], ['Silk Scarf', 899, 0]],
    },
    reviews: [
      ['Sneha R.', 'Pune', 5, 'The fit is perfect and the fabric feels premium. Already ordered a second colour.'],
      ['Karan M.', 'Delhi', 5, 'Fast delivery and the exchange for a different size was really easy.'],
      ['Aisha F.', 'Hyderabad', 4, 'Looks exactly like the photos. Great value for the price.'],
    ],
  },

  electronics: {
    id: 'electronics', name: 'Electronics & gadgets', emoji: '📱', placeholder: '📦', description: 'Phones, audio, laptops, smart home and accessories', theme: 'ocean', font: 'poppins',
    copy: {
      heroTitle: 'The Latest Tech, Delivered Fast',
      heroSubtitle: 'Genuine phones, audio, laptops and smart gadgets with full brand warranty.',
      heroBadge: 'New launches this week', heroCta: 'Shop Audio', heroCtaCategory: 'audio',
      footerAbout: 'Genuine electronics and gadgets with brand warranty and fast delivery.',
      metaDescription: 'Shop genuine phones, laptops, audio, smart home devices and accessories.',
      keywords: ['electronics', 'gadgets', 'headphones', 'smart home', 'mobile accessories'],
      categoriesSubtitle: 'Gadgets for work, play and everything between',
      reviewsTitle: 'What Our Customers Say', whyTitle: 'Why tech lovers shop here ⚡',
      newsletterSubtitle: 'Get launch alerts and members-only deals',
    },
    trust: ['100% Genuine', 'Brand Warranty'],
    benefits: COMMON_BENEFITS(['✅', '100% Genuine', 'Full brand warranty']),
    highlights: ['100% genuine, sealed box', 'Full manufacturer warranty', 'GST invoice included', 'Tested before dispatch'],
    ages: null, audience: null,
    shopBy: { title: 'Shop by Budget', subtitle: 'Great gadgets at every price', kind: 'price' },
    categories: [
      { name: 'Audio', slug: 'audio', emoji: '🎧', description: 'Headphones, earbuds and speakers' },
      { name: 'Mobiles & Tablets', slug: 'mobiles-tablets', emoji: '📱', description: 'Phones, tablets and e-readers' },
      { name: 'Laptops', slug: 'laptops', emoji: '💻', description: 'Laptops and computer accessories' },
      { name: 'Smart Home', slug: 'smart-home', emoji: '🏠', description: 'Smart plugs, lights and cameras' },
      { name: 'Wearables', slug: 'wearables', emoji: '⌚', description: 'Smartwatches and fitness bands' },
      { name: 'Accessories', slug: 'accessories', emoji: '🔌', description: 'Chargers, cables and power banks' },
    ],
    demo: {
      audio: [['Wireless Noise-Cancelling Headphones', 7999, 9999], ['True Wireless Earbuds', 2499, 3299], ['Portable Bluetooth Speaker', 1999, 2499], ['Soundbar 2.1', 8999, 0]],
      'mobiles-tablets': [['10-inch Android Tablet', 14999, 17999], ['Budget 5G Smartphone', 12999, 0], ['E-reader 6-inch', 9999, 10999], ['Phone Gimbal Stabiliser', 4999, 0]],
      laptops: [['14-inch Thin Laptop', 49999, 56999], ['Wireless Keyboard & Mouse', 1499, 1999], ['Laptop Stand Aluminium', 1299, 0], ['USB-C Docking Hub', 2499, 2999]],
      'smart-home': [['Smart Wi-Fi Plug', 899, 1199], ['Smart LED Bulb', 599, 0], ['Wi-Fi Security Camera', 2499, 2999], ['Smart Speaker with Assistant', 3999, 4999]],
      wearables: [['Fitness Band', 1999, 2499], ['AMOLED Smartwatch', 4999, 6499], ['Kids GPS Watch', 3499, 0], ['Smart Ring', 9999, 0]],
      accessories: [['20000mAh Power Bank', 1499, 1999], ['65W GaN Fast Charger', 1999, 2499], ['Braided USB-C Cable', 399, 0], ['Wireless Charging Pad', 999, 1299]],
    },
    reviews: [
      ['Vikram T.', 'Bangalore', 5, 'Sealed box, genuine product and the GST invoice came with it. Delivered next day.'],
      ['Neha P.', 'Mumbai', 5, 'Sound quality is excellent for the price. Battery easily lasts a week.'],
      ['Arjun K.', 'Chennai', 4, 'Good packaging and quick support when I had a setup question.'],
    ],
  },

  beauty: {
    id: 'beauty', name: 'Beauty & personal care', emoji: '💄', placeholder: '🧴', description: 'Skincare, makeup, haircare and fragrance', theme: 'peach', font: 'nunito',
    copy: {
      heroTitle: 'Glow From the Inside Out',
      heroSubtitle: 'Skincare, makeup and haircare you can trust, from brands you love.',
      heroBadge: 'New: Vitamin C collection', heroCta: 'Shop Skincare', heroCtaCategory: 'skincare',
      footerAbout: '100% authentic beauty and personal care, delivered with love.',
      metaDescription: 'Shop authentic skincare, makeup, haircare, fragrance and bath & body products.',
      keywords: ['skincare', 'makeup', 'haircare', 'beauty', 'fragrance'],
      categoriesSubtitle: 'Your routine, all in one place',
      reviewsTitle: 'Real Results, Real Reviews', whyTitle: 'Why our customers glow 💛',
      newsletterSubtitle: 'Get 15% off your first order plus skincare tips',
    },
    trust: ['100% Authentic', 'Dermatologist Tested'],
    benefits: COMMON_BENEFITS(['🌿', '100% Authentic', 'Sourced from brands']),
    highlights: ['100% authentic product', 'Dermatologist tested', 'Cruelty free', 'Suitable for Indian skin'],
    ages: null, audience: null,
    shopBy: { title: 'Shop by Budget', subtitle: 'Self-care at every price', kind: 'price' },
    categories: [
      { name: 'Skincare', slug: 'skincare', emoji: '🧴', description: 'Cleansers, serums and moisturisers' },
      { name: 'Makeup', slug: 'makeup', emoji: '💄', description: 'Face, eyes and lips' },
      { name: 'Haircare', slug: 'haircare', emoji: '💇', description: 'Shampoos, oils and styling' },
      { name: 'Fragrance', slug: 'fragrance', emoji: '🌸', description: 'Perfumes and body mists' },
      { name: 'Bath & Body', slug: 'bath-body', emoji: '🛁', description: 'Body washes, scrubs and lotions' },
      { name: "Men's Grooming", slug: 'mens-grooming', emoji: '🧔', description: 'Beard care and shaving' },
    ],
    demo: {
      skincare: [['Vitamin C Face Serum', 699, 899], ['Gentle Foaming Cleanser', 349, 0], ['SPF 50 Sunscreen Gel', 499, 599], ['Hydrating Night Cream', 799, 999]],
      makeup: [['Matte Liquid Lipstick', 449, 549], ['Long-wear Kajal', 249, 0], ['Lightweight Foundation', 899, 1099], ['Volumising Mascara', 549, 0]],
      haircare: [['Argan Oil Shampoo', 449, 549], ['Onion Hair Oil', 399, 499], ['Deep Repair Hair Mask', 599, 0], ['Heat Protect Spray', 499, 0]],
      fragrance: [['Eau de Parfum Rose Oud', 1999, 2499], ['Citrus Body Mist', 499, 0], ['Musk Roll-on Attar', 599, 699], ['Gift Mini Perfume Set', 1499, 1799]],
      'bath-body': [['Coffee Body Scrub', 449, 549], ['Shea Body Butter', 599, 0], ['Aloe Body Wash', 349, 399], ['Lavender Bath Salts', 499, 0]],
      'mens-grooming': [['Beard Growth Oil', 449, 549], ['Charcoal Face Wash', 299, 0], ['Shaving Foam', 249, 299], ['Grooming Kit', 1499, 1899]],
    },
    reviews: [
      ['Ritika S.', 'Delhi', 5, 'My skin has never looked better. Authentic products and the packaging was lovely.'],
      ['Meera J.', 'Chennai', 5, 'Fast delivery and the free samples were a nice surprise.'],
      ['Pooja N.', 'Kolkata', 4, 'Great prices on brands I already use. Will keep ordering here.'],
    ],
  },

  home: {
    id: 'home', name: 'Home & living', emoji: '🛋️', placeholder: '🪴', description: 'Furniture, decor, kitchen and bedding', theme: 'sage', font: 'nunito',
    copy: {
      heroTitle: 'Make Every Room Feel Like Home',
      heroSubtitle: 'Furniture, decor, kitchen and bedding picked for comfort and style.',
      heroBadge: 'New: Festive decor collection', heroCta: 'Shop Decor', heroCtaCategory: 'decor',
      footerAbout: 'Thoughtful furniture and decor for beautiful, comfortable homes.',
      metaDescription: 'Shop furniture, home decor, kitchen & dining, bedding and lighting.',
      keywords: ['home decor', 'furniture', 'kitchen', 'bedding', 'lighting'],
      categoriesSubtitle: 'Everything for a home you love',
      reviewsTitle: 'Homes Our Customers Love', whyTitle: 'Why homeowners love us 💛',
      newsletterSubtitle: 'Get 10% off your first order plus styling ideas',
    },
    trust: ['Quality Assured', 'Safe Packaging'],
    benefits: COMMON_BENEFITS(['📦', 'Safe Packaging', 'Delivered damage-free']),
    highlights: ['Sturdy, quality materials', 'Easy to assemble', 'Packed to arrive damage-free', 'Easy to clean'],
    ages: null, audience: null,
    shopBy: { title: 'Shop by Budget', subtitle: 'Refresh your space at any price', kind: 'price' },
    categories: [
      { name: 'Decor', slug: 'decor', emoji: '🪴', description: 'Vases, wall art and plants' },
      { name: 'Furniture', slug: 'furniture', emoji: '🛋️', description: 'Sofas, tables and storage' },
      { name: 'Kitchen & Dining', slug: 'kitchen-dining', emoji: '🍽️', description: 'Cookware, serveware and tools' },
      { name: 'Bedding', slug: 'bedding', emoji: '🛏️', description: 'Sheets, quilts and pillows' },
      { name: 'Lighting', slug: 'lighting', emoji: '💡', description: 'Lamps, string lights and bulbs' },
      { name: 'Storage', slug: 'storage', emoji: '🧺', description: 'Baskets, boxes and organisers' },
    ],
    demo: {
      decor: [['Ceramic Bud Vase Set', 899, 1099], ['Macrame Wall Hanging', 699, 0], ['Scented Soy Candle', 499, 599], ['Framed Botanical Print', 1299, 0]],
      furniture: [['Solid Wood Side Table', 3499, 4299], ['Folding Study Desk', 4999, 0], ['Upholstered Ottoman', 2999, 3499], ['Bookshelf 5-tier', 5499, 6499]],
      'kitchen-dining': [['Non-stick Cookware Set', 2999, 3999], ['Stainless Steel Lunch Box', 799, 0], ['Glass Storage Jars Set', 999, 1199], ['Ceramic Dinner Set 18pc', 3499, 0]],
      bedding: [['Cotton Bedsheet Set', 1299, 1699], ['Microfibre Quilt', 2499, 0], ['Memory Foam Pillow', 1499, 1799], ['Waterproof Mattress Protector', 899, 0]],
      lighting: [['Rattan Table Lamp', 1999, 2499], ['Warm LED String Lights', 499, 0], ['Floor Lamp Arc', 4499, 5299], ['Motion Sensor Night Light', 599, 0]],
      storage: [['Woven Storage Basket', 799, 999], ['Under-bed Storage Box', 999, 0], ['Shoe Rack 4-tier', 1499, 1799], ['Drawer Organiser Set', 599, 0]],
    },
    reviews: [
      ['Anjali D.', 'Jaipur', 5, 'Beautiful finish and it arrived without a scratch. Looks even better than the photos.'],
      ['Rohit V.', 'Pune', 5, 'Easy to assemble and very sturdy. Great value.'],
      ['Sana K.', 'Lucknow', 4, 'Lovely quality bedding, soft even after many washes.'],
    ],
  },

  grocery: {
    id: 'grocery', name: 'Grocery & food', emoji: '🛒', placeholder: '🛒', description: 'Fresh produce, staples, snacks and household', theme: 'sage', font: 'nunito',
    copy: {
      heroTitle: 'Fresh Groceries at Your Doorstep',
      heroSubtitle: 'Fruits, vegetables, staples and everyday essentials, delivered fresh.',
      heroBadge: 'Fresh stock every morning', heroCta: 'Shop Fresh', heroCtaCategory: 'fruits-vegetables',
      footerAbout: 'Fresh groceries and daily essentials, delivered to your door.',
      metaDescription: 'Order fresh fruits, vegetables, dairy, staples, snacks and household essentials.',
      keywords: ['grocery', 'fresh vegetables', 'fruits', 'staples', 'snacks'],
      categoriesSubtitle: 'Your weekly shop, sorted',
      reviewsTitle: 'What Our Customers Say', whyTitle: 'Why families shop with us 💚',
      newsletterSubtitle: 'Get weekly offers on fresh produce',
    },
    trust: ['Farm Fresh', 'Quality Checked'],
    benefits: COMMON_BENEFITS(['🥬', 'Farm Fresh', 'Picked daily']),
    highlights: ['Fresh, quality checked', 'Hygienically packed', 'Best-before date on pack', 'Sourced from trusted farms'],
    ages: null, audience: null,
    shopBy: { title: 'Shop by Budget', subtitle: 'Smart picks for every basket', kind: 'price' },
    categories: [
      { name: 'Fruits & Vegetables', slug: 'fruits-vegetables', emoji: '🥦', description: 'Fresh produce, picked daily' },
      { name: 'Dairy & Bakery', slug: 'dairy-bakery', emoji: '🥛', description: 'Milk, paneer, bread and eggs' },
      { name: 'Staples', slug: 'staples', emoji: '🌾', description: 'Atta, rice, dal and oil' },
      { name: 'Snacks & Drinks', slug: 'snacks-drinks', emoji: '🍪', description: 'Biscuits, chips, tea and juices' },
      { name: 'Household', slug: 'household', emoji: '🧽', description: 'Cleaning and laundry' },
      { name: 'Organic', slug: 'organic', emoji: '🌱', description: 'Certified organic foods' },
    ],
    demo: {
      'fruits-vegetables': [['Shimla Apples 1kg', 199, 229], ['Robusta Bananas 12pc', 69, 0], ['Fresh Tomatoes 1kg', 49, 59], ['Baby Spinach 250g', 45, 0]],
      'dairy-bakery': [['Toned Milk 1L', 66, 0], ['Fresh Paneer 200g', 95, 110], ['Brown Bread 400g', 50, 0], ['Farm Eggs 12pc', 99, 115]],
      staples: [['Whole Wheat Atta 5kg', 289, 329], ['Basmati Rice 5kg', 599, 699], ['Toor Dal 1kg', 159, 179], ['Cold-pressed Mustard Oil 1L', 219, 0]],
      'snacks-drinks': [['Assam Tea 500g', 249, 289], ['Roasted Almonds 250g', 299, 349], ['Masala Peanuts 200g', 69, 0], ['Cold Coffee 6-pack', 199, 0]],
      household: [['Dishwash Gel 1L', 199, 229], ['Liquid Detergent 2L', 349, 399], ['Floor Cleaner Lime 1L', 179, 0], ['Garbage Bags 60pc', 149, 0]],
      organic: [['Organic Jaggery 1kg', 149, 179], ['Organic Moong Dal 1kg', 189, 0], ['Raw Forest Honey 500g', 349, 399], ['Organic Chia Seeds 250g', 199, 0]],
    },
    reviews: [
      ['Lakshmi R.', 'Chennai', 5, 'Vegetables are always fresh and delivery comes right on time.'],
      ['Imran S.', 'Hyderabad', 5, 'Prices are better than my local store and the app is easy to use.'],
      ['Divya P.', 'Bangalore', 4, 'Good quality staples. One item was swapped but support sorted it quickly.'],
    ],
  },

  jewellery: {
    id: 'jewellery', name: 'Jewellery & gifts', emoji: '💍', placeholder: '💍', description: 'Jewellery, watches and gift sets', theme: 'sunshine', font: 'poppins',
    copy: {
      heroTitle: 'Little Luxuries for Every Moment',
      heroSubtitle: 'Handpicked jewellery, watches and gifts, beautifully packed for someone special.',
      heroBadge: 'Gift-ready packaging on every order', heroCta: 'Shop Necklaces', heroCtaCategory: 'necklaces',
      footerAbout: 'Elegant jewellery and thoughtful gifts, packed with care.',
      metaDescription: 'Shop necklaces, earrings, rings, bracelets, watches and gift sets.',
      keywords: ['jewellery', 'earrings', 'necklaces', 'watches', 'gifts'],
      categoriesSubtitle: 'Something sparkly for every occasion',
      reviewsTitle: 'Gifts That Made Them Smile', whyTitle: 'Why customers choose us ✨',
      newsletterSubtitle: 'Get 10% off and early access to new collections',
    },
    trust: ['Hallmarked & Certified', 'Gift Packaging'],
    benefits: COMMON_BENEFITS(['🎁', 'Gift Packaging', 'Free on every order']),
    highlights: ['Skin-friendly, nickel free', 'Anti-tarnish finish', 'Comes in a gift box', 'Certificate of authenticity'],
    ages: null,
    audience: { label: 'For', options: [{ value: 'UNISEX', label: 'Everyone' }, { value: 'BOYS', label: 'Him' }, { value: 'GIRLS', label: 'Her' }] },
    shopBy: { title: 'Find the Perfect Gift', subtitle: 'For him, for her, for everyone', kind: 'audience' },
    categories: [
      { name: 'Necklaces', slug: 'necklaces', emoji: '📿', description: 'Pendants, chains and chokers' },
      { name: 'Earrings', slug: 'earrings', emoji: '💎', description: 'Studs, hoops and jhumkas' },
      { name: 'Rings', slug: 'rings', emoji: '💍', description: 'Everyday and statement rings' },
      { name: 'Bracelets', slug: 'bracelets', emoji: '🔗', description: 'Bangles, cuffs and charms' },
      { name: 'Watches', slug: 'watches', emoji: '⌚', description: 'Classic and smart watches' },
      { name: 'Gift Sets', slug: 'gift-sets', emoji: '🎁', description: 'Ready-to-gift combos' },
    ],
    demo: {
      necklaces: [['Gold-plated Heart Pendant', 1299, 1699], ['Pearl Layered Necklace', 1799, 0], ['Kundan Choker Set', 2499, 2999], ['Sterling Silver Chain', 1999, 0]],
      earrings: [['Diamond-cut Stud Earrings', 899, 1099], ['Oxidised Jhumkas', 599, 0], ['Gold Hoop Earrings', 1199, 1499], ['Pearl Drop Earrings', 999, 0]],
      rings: [['Adjustable Solitaire Ring', 799, 999], ['Silver Band Ring', 999, 0], ['Couple Ring Set', 1999, 2499], ['Statement Cocktail Ring', 1299, 0]],
      bracelets: [['Charm Bracelet', 1199, 1499], ['Rose Gold Cuff', 1499, 0], ['Beaded Evil Eye Bracelet', 499, 599], ['Men’s Leather Bracelet', 799, 0]],
      watches: [['Minimal Analog Watch', 2499, 2999], ['Rose Gold Mesh Watch', 2999, 0], ['Chronograph Steel Watch', 4999, 5999], ['Couple Watch Set', 4499, 0]],
      'gift-sets': [['Jewellery Gift Box Set', 2499, 2999], ['Watch & Wallet Combo', 2999, 0], ['Personalised Name Necklace', 1499, 1799], ['Anniversary Hamper', 3499, 0]],
    },
    reviews: [
      ['Nisha G.', 'Ahmedabad', 5, 'Bought it as a birthday gift and the packaging was stunning. She loved it!'],
      ['Aditya R.', 'Mumbai', 5, 'Great finish, has not tarnished after months of daily wear.'],
      ['Kavya N.', 'Kochi', 4, 'Beautiful design and arrived well before the occasion.'],
    ],
  },

  books: {
    id: 'books', name: 'Books & stationery', emoji: '📚', placeholder: '📚', description: 'Books, notebooks, art and office supplies', theme: 'ocean', font: 'nunito',
    copy: {
      heroTitle: 'Stories, Ideas and Everything to Write Them',
      heroSubtitle: 'Bestselling books, beautiful notebooks and stationery for school, work and play.',
      heroBadge: 'New releases every week', heroCta: 'Shop Fiction', heroCtaCategory: 'fiction',
      footerAbout: 'Books and stationery for curious minds of every age.',
      metaDescription: 'Shop fiction, non-fiction, children’s books, notebooks, art supplies and office stationery.',
      keywords: ['books', 'stationery', 'notebooks', 'art supplies', 'fiction'],
      categoriesSubtitle: 'Find your next great read',
      reviewsTitle: 'What Readers Say', whyTitle: 'Why readers shop with us 📚',
      newsletterSubtitle: 'Get reading picks and 10% off your first order',
    },
    trust: ['Original Editions', 'Carefully Packed'],
    benefits: COMMON_BENEFITS(['📦', 'Carefully Packed', 'No bent corners']),
    highlights: ['Original, new edition', 'Packed to protect corners', 'Quality paper', 'Great for gifting'],
    ages: null, audience: null,
    shopBy: { title: 'Shop by Budget', subtitle: 'Great reads at every price', kind: 'price' },
    categories: [
      { name: 'Fiction', slug: 'fiction', emoji: '📕', description: 'Novels, thrillers and classics' },
      { name: 'Non-fiction', slug: 'non-fiction', emoji: '📘', description: 'Self-help, business and biography' },
      { name: "Children's Books", slug: 'childrens-books', emoji: '🧒', description: 'Picture books and young readers' },
      { name: 'Notebooks & Diaries', slug: 'notebooks-diaries', emoji: '📓', description: 'Journals, planners and diaries' },
      { name: 'Art Supplies', slug: 'art-supplies', emoji: '🎨', description: 'Paints, brushes and sketchbooks' },
      { name: 'Office Supplies', slug: 'office-supplies', emoji: '🖇️', description: 'Pens, files and desk essentials' },
    ],
    demo: {
      fiction: [['The Midnight Library (Paperback)', 399, 499], ['Classic Mystery Box Set', 1299, 1599], ['Contemporary Indian Novel', 349, 0], ['Fantasy Trilogy Book 1', 449, 0]],
      'non-fiction': [['Atomic Habits Style Guide', 499, 599], ['Personal Finance Basics', 399, 0], ['Startup Playbook', 599, 699], ['World History Illustrated', 899, 0]],
      'childrens-books': [['Bedtime Stories Collection', 449, 549], ['Lift-the-flap Animals', 299, 0], ['Activity Book Ages 5+', 249, 299], ['Panchatantra Tales', 349, 0]],
      'notebooks-diaries': [['A5 Dotted Journal', 399, 499], ['2027 Daily Planner', 549, 0], ['Spiral Notebook 5-pack', 299, 349], ['Leather Travel Diary', 899, 0]],
      'art-supplies': [['Watercolour Paint Set 24', 599, 699], ['Sketch Pencil Set', 299, 0], ['Acrylic Paint Kit', 899, 1099], ['Brush Pen Set 12', 449, 0]],
      'office-supplies': [['Gel Pen Pack 10', 199, 249], ['Desk Organiser Bamboo', 799, 0], ['Sticky Notes Mega Pack', 249, 299], ['Document Folder Set', 349, 0]],
    },
    reviews: [
      ['Farhan A.', 'Delhi', 5, 'Books arrived in perfect condition, not a single bent corner.'],
      ['Shruti B.', 'Pune', 5, 'Love the journals. Paper quality is great for fountain pens.'],
      ['Manoj K.', 'Bhopal', 4, 'Good collection and quick delivery. My kids love the activity books.'],
    ],
  },

  sports: {
    id: 'sports', name: 'Sports & fitness', emoji: '🏏', placeholder: '🏅', description: 'Fitness gear, sportswear, outdoor and nutrition', theme: 'sunshine', font: 'poppins',
    copy: {
      heroTitle: 'Gear Up. Show Up. Level Up.',
      heroSubtitle: 'Fitness equipment, sportswear and outdoor gear for every kind of athlete.',
      heroBadge: 'New season sportswear', heroCta: 'Shop Fitness', heroCtaCategory: 'fitness-equipment',
      footerAbout: 'Sports, fitness and outdoor gear for every athlete.',
      metaDescription: 'Shop fitness equipment, sportswear, cricket, cycling, yoga and nutrition.',
      keywords: ['sports', 'fitness', 'gym equipment', 'sportswear', 'yoga'],
      categoriesSubtitle: 'Everything for your game',
      reviewsTitle: 'From Our Athletes', whyTitle: 'Why athletes shop here 💪',
      newsletterSubtitle: 'Get training tips and 10% off your first order',
    },
    trust: ['Genuine Brands', 'Tested Gear'],
    benefits: COMMON_BENEFITS(['💪', 'Pro Quality', 'Built to perform']),
    highlights: ['Durable, performance materials', 'Comfortable fit', 'Tested for quality', 'Easy returns if it doesn’t fit'],
    ages: null,
    audience: MEN_WOMEN,
    shopBy: { title: 'Shop by Athlete', subtitle: 'Gear made for you', kind: 'audience' },
    categories: [
      { name: 'Fitness Equipment', slug: 'fitness-equipment', emoji: '🏋️', description: 'Dumbbells, bands and benches' },
      { name: 'Sportswear', slug: 'sportswear', emoji: '🎽', description: 'Tees, shorts and track pants' },
      { name: 'Cricket', slug: 'cricket', emoji: '🏏', description: 'Bats, balls and protective gear' },
      { name: 'Yoga', slug: 'yoga', emoji: '🧘', description: 'Mats, blocks and straps' },
      { name: 'Cycling', slug: 'cycling', emoji: '🚴', description: 'Helmets, lights and accessories' },
      { name: 'Nutrition', slug: 'nutrition', emoji: '🥤', description: 'Protein, bars and shakers' },
    ],
    demo: {
      'fitness-equipment': [['Adjustable Dumbbells 10kg', 2999, 3499], ['Resistance Bands Set', 799, 0], ['Skipping Rope Speed', 349, 449], ['Ab Roller Wheel', 599, 0]],
      sportswear: [['Dri-fit Running Tee', 699, 899], ['Training Shorts', 799, 0], ['Sports Bra High Support', 999, 1199], ['Track Pants Slim', 1299, 0]],
      cricket: [['English Willow Bat', 7999, 9499], ['Leather Cricket Ball', 499, 0], ['Batting Gloves', 1499, 1799], ['Cricket Kit Bag', 1999, 0]],
      yoga: [['Anti-slip Yoga Mat 6mm', 999, 1299], ['Cork Yoga Block', 499, 0], ['Yoga Strap', 299, 349], ['Meditation Cushion', 1199, 0]],
      cycling: [['Cycling Helmet', 1999, 2499], ['Rechargeable Bike Lights', 899, 0], ['Padded Cycling Shorts', 1499, 1799], ['Bike Bottle Cage', 299, 0]],
      nutrition: [['Whey Protein 1kg', 2499, 2999], ['Protein Bars 6-pack', 599, 0], ['Electrolyte Drink Mix', 499, 599], ['Shaker Bottle 700ml', 299, 0]],
    },
    reviews: [
      ['Siddharth P.', 'Bangalore', 5, 'Solid build quality and quick delivery. My home gym is finally complete.'],
      ['Tanya M.', 'Gurgaon', 5, 'The yoga mat has amazing grip, no slipping even in hot yoga.'],
      ['Rajesh N.', 'Kolkata', 4, 'Good value for money. Size exchange was smooth.'],
    ],
  },

  general: {
    id: 'general', name: 'General store', emoji: '🏬', placeholder: '🛍️', description: 'A bit of everything: electronics, fashion, home and more', theme: 'ocean', font: 'system',
    copy: {
      heroTitle: 'Everything You Need, All in One Place',
      heroSubtitle: 'Shop electronics, fashion, home essentials and more at great prices.',
      heroBadge: 'New arrivals every week', heroCta: 'Shop Now', heroCtaCategory: 'home-kitchen',
      footerAbout: 'Quality products across every category, delivered fast.',
      metaDescription: 'Shop electronics, fashion, home & kitchen, beauty, toys and more.',
      keywords: ['online shopping', 'electronics', 'fashion', 'home', 'deals'],
      categoriesSubtitle: 'Browse our most popular departments',
      reviewsTitle: 'What Our Customers Say', whyTitle: 'Why customers love us 💛',
      newsletterSubtitle: 'Get 10% off your first order and weekly deals',
    },
    trust: ['Genuine Products', 'Secure Payments'],
    benefits: COMMON_BENEFITS(['✅', 'Genuine Products', 'Quality guaranteed']),
    highlights: ['Quality checked', 'Genuine product', 'Secure packaging', 'Easy returns'],
    ages: null, audience: null,
    shopBy: { title: 'Shop by Budget', subtitle: 'Something for every wallet', kind: 'price' },
    categories: [
      { name: 'Electronics', slug: 'electronics', emoji: '🎧', description: 'Gadgets and accessories' },
      { name: 'Fashion', slug: 'fashion', emoji: '👕', description: 'Clothing and footwear' },
      { name: 'Home & Kitchen', slug: 'home-kitchen', emoji: '🍳', description: 'Cookware, decor and storage' },
      { name: 'Beauty', slug: 'beauty', emoji: '💄', description: 'Skincare and personal care' },
      { name: 'Toys & Games', slug: 'toys-games', emoji: '🎲', description: 'Fun for all ages' },
      { name: 'Sports', slug: 'sports', emoji: '⚽', description: 'Fitness and outdoor' },
    ],
    demo: {
      electronics: [['Bluetooth Earbuds', 1999, 2499], ['Power Bank 10000mAh', 999, 0], ['Smartwatch Lite', 2999, 3499], ['USB-C Fast Charger', 799, 0]],
      fashion: [['Everyday Cotton Tee', 499, 699], ['Slim Fit Jeans', 1499, 0], ['Canvas Sneakers', 1299, 1599], ['Travel Backpack', 1799, 0]],
      'home-kitchen': [['Non-stick Fry Pan', 899, 1099], ['Insulated Water Bottle', 699, 0], ['Cotton Cushion Covers', 599, 799], ['LED Desk Lamp', 1199, 0]],
      beauty: [['Daily Face Wash', 299, 349], ['Aloe Vera Gel', 249, 0], ['Matte Lipstick', 449, 549], ['Hair Serum', 399, 0]],
      'toys-games': [['Building Blocks 500pc', 1499, 1799], ['Family Board Game', 999, 0], ['RC Racing Car', 1999, 2499], ['Jigsaw Puzzle 1000pc', 699, 0]],
      sports: [['Yoga Mat', 899, 1099], ['Football Size 5', 699, 0], ['Badminton Racket Pair', 1299, 1599], ['Gym Duffel Bag', 999, 0]],
    },
    reviews: [
      ['Amit S.', 'Delhi', 5, 'Great prices and everything arrived together in one box. Very convenient.'],
      ['Priyanka R.', 'Mumbai', 5, 'Fast delivery and genuine products. My go-to store now.'],
      ['Joseph T.', 'Kochi', 4, 'Good selection across categories and helpful support.'],
    ],
  },
};

export const SHOP_TYPE_IDS = Object.keys(SHOP_TYPES) as ShopTypeId[];
export const DEFAULT_SHOP_TYPE: ShopTypeId = 'baby';

export function getShopType(id: string | null | undefined): ShopType {
  return SHOP_TYPES[(id as ShopTypeId)] || SHOP_TYPES[DEFAULT_SHOP_TYPE];
}

export const isShopType = (v: unknown): v is ShopTypeId => typeof v === 'string' && v in SHOP_TYPES;

/** Emoji for a category slug, from any shop type (used when a category has no picture). */
const EMOJI_BY_SLUG: Record<string, string> = Object.fromEntries(
  Object.values(SHOP_TYPES).flatMap((t) => t.categories.map((c) => [c.slug, c.emoji]))
);
export function categoryEmoji(slug: string, fallback = '🛍️', typeId?: string | null): string {
  const own = typeId ? SHOP_TYPES[typeId as ShopTypeId]?.categories.find((c) => c.slug === slug) : undefined;
  if (own) return own.emoji;
  if (EMOJI_BY_SLUG[slug]) return EMOJI_BY_SLUG[slug];
  const hit = Object.keys(EMOJI_BY_SLUG).find((k) => slug.includes(k) || k.includes(slug));
  return hit ? EMOJI_BY_SLUG[hit] : fallback;
}
