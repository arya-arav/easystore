# Shop types

The shop type tells EasyStore what you sell. It is chosen in the setup wizard and can be changed any time in **Admin → Store type & demo**.

## What a shop type sets

| | Example: Baby & kids | Example: Electronics |
| --- | --- | --- |
| Categories | Toys, Clothing, Feeding & Nursing, Bath & Skincare… | Audio, Mobiles & Tablets, Laptops, Smart Home… |
| Product filters | Age (newborn → preteen), For (boys / girls) | Price only |
| Homepage tiles | “Shop by Baby Age” | “Shop by Budget” |
| Homepage wording | “Everything Your Little One Needs to Smile!” | “The Latest Tech, Delivered Fast” |
| Trust badges & benefits | 100% Safe, BIS Certified | 100% Genuine, Brand Warranty |
| Product page highlights | Safe for babies & kids… | Full manufacturer warranty… |
| Reviews heading | What Parents Are Saying | What Our Customers Say |
| Colours & font | Lavender, Quicksand | Ocean blue, Poppins |
| Demo data | 28 baby products | 24 gadgets |

All ten types:

| Type | Filters | Shop-by tiles |
| --- | --- | --- |
| 👶 Baby & kids | Age, For (boys/girls) | Age |
| 👗 Fashion & clothing | For (men/women) | Style (men/women/unisex) |
| 📱 Electronics & gadgets | Price | Budget |
| 💄 Beauty & personal care | Price | Budget |
| 🛋️ Home & living | Price | Budget |
| 🛒 Grocery & food | Price | Budget |
| 💍 Jewellery & gifts | For (him/her) | Gift (him/her/everyone) |
| 📚 Books & stationery | Price | Budget |
| 🏏 Sports & fitness | For (men/women) | Athlete (men/women/unisex) |
| 🏬 General store | Price | Budget |

## Switching type

Admin → **Store type & demo** → pick a type → **Switch**. You choose what else changes:

- **Use its homepage wording** – hero text, footer text and benefits switch to the new type’s (your own text is cleared). Leave off to keep your wording.
- **Add its categories** – adds any of the new type’s categories you don’t have. Existing categories stay.
- **Use its colours and font** – applies the type’s theme. Fine-tune in Store settings → Design.

Products, orders and customers are never changed.

Anything you type yourself in Store settings (hero title, benefits, footer text) always wins over the type’s defaults. Clear a field to go back to the type’s wording.

## Adding or editing a shop type

Shop types live in one file: [`src/lib/shop-types.ts`](../src/lib/shop-types.ts). Each entry has:

```ts
{
  id: 'pets', name: 'Pet supplies', emoji: '🐾', placeholder: '🦴',
  description: 'Food, toys and care for pets',
  theme: 'sage', font: 'nunito',
  copy: { heroTitle, heroSubtitle, heroBadge, heroCta, heroCtaCategory, footerAbout, metaDescription,
          keywords, categoriesSubtitle, reviewsTitle, whyTitle, newsletterSubtitle },
  trust: ['Vet Approved', 'Quality Checked'],
  benefits: [[emoji, title, description] × 4],
  highlights: ['…', '…', '…', '…'],
  ages: null,                 // or a list of age groups (uses the Product.ageGroup values)
  audience: null,             // or { label, options: [{ value: 'UNISEX' | 'BOYS' | 'GIRLS', label }] }
  shopBy: { title: 'Shop by Budget', subtitle: '…', kind: 'price' },   // 'age' | 'audience' | 'price'
  categories: [{ name, slug, emoji, description }],
  demo: { 'category-slug': [['Product name', price, compareAtPrice], …] },
  reviews: [['Name', 'City', 5, 'Review text'], …],
}
```

Add the id to the `ShopTypeId` union and the `SHOP_TYPES` object. The setup wizard and admin pick it up automatically.
