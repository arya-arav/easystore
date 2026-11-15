# Product API

REST API for importing and updating products from other apps, scripts or automation tools.

**Base URL:** `https://your-domain.com/api/v1`

---

## Authentication

All endpoints require an API key passed as a Bearer token in the `Authorization` header.

```
Authorization: Bearer bb_live_<your-key>
```

Generate and manage API keys from the admin panel: **Admin → API keys** (see the “How to use a key” section there for ready-made examples)

Keys are scoped — a key must have the relevant scope to access an endpoint:

| Scope | Access |
|---|---|
| `products:write` | Create and update products |
| `categories:read` | List categories |
| `upload` | Upload and optimize images from URL |

Default scope when creating a key: `products:write,categories:read,upload`

---

## Image Optimization

When you pass image URLs to `POST /products`, the server automatically:
1. Fetches the image from the source URL
2. Resizes to max 1200px width (preserves aspect ratio, never upscales)
3. Converts to WebP at 82% quality
4. Uploads to Cloudflare R2 CDN (`your image storage`)
5. Stores the optimized CDN URL in the database

You get fast-loading, optimized images with zero extra work.

---

## Endpoints

---

### GET /api/v1/categories

Returns all active categories. Call this first to get valid `categoryId` values.

**Required scope:** `categories:read`

**Request**
```
GET /api/v1/categories
Authorization: Bearer bb_live_...
```

**Response `200`**
```json
{
  "categories": [
    {
      "id": "clx1abc123",
      "name": "Toys",
      "slug": "toys",
      "description": "Baby and kids toys"
    },
    {
      "id": "clx1def456",
      "name": "Baby Accessories",
      "slug": "accessories",
      "description": null
    }
  ]
}
```

---

### POST /api/v1/products

Creates a new product. Images are fetched from the provided URLs, optimized, and uploaded to R2 automatically.

**Required scope:** `products:write`

**Request**
```
POST /api/v1/products
Content-Type: application/json
Authorization: Bearer bb_live_...
```

**Request Body**

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | ✅ | Product name |
| `description` | string | ✅ | Full description (HTML or plain text) |
| `price` | number | ✅ | Selling price in INR |
| `categoryId` | string | ✅ | Category ID from `GET /categories` |
| `images` | string[] | ❌ | Source image URLs — fetched, optimized, uploaded automatically. Max 10. |
| `sku` | string | ❌ | Auto-generated as `BB-NAME-XXXXXX` if not provided |
| `compareAtPrice` | number | ❌ | Original / MRP price (shown as strikethrough) |
| `stock` | number | ❌ | Default: `0` |
| `shortDescription` | string | ❌ | One-liner shown on product cards |
| `status` | string | ❌ | `DRAFT` \| `ACTIVE` — default: `DRAFT` |
| `ageGroup` | string | ❌ | `NEWBORN` \| `INFANT` \| `TODDLER` \| `PRESCHOOL` \| `KIDS` \| `PRETEEN` |
| `gender` | string | ❌ | `UNISEX` \| `BOYS` \| `GIRLS` — default: `UNISEX` |
| `gstRate` | number | ❌ | GST % — default: `18` |
| `weight` | number | ❌ | Weight in kg |
| `isFeatured` | boolean | ❌ | Show in featured section |
| `isBestseller` | boolean | ❌ | Show in bestsellers tab |
| `isNewArrival` | boolean | ❌ | Show in new arrivals tab |
| `metaTitle` | string | ❌ | SEO title |
| `metaDescription` | string | ❌ | SEO description |
| `colors` | object[] | ❌ | `[{ "name": "Red", "hex": "#FF0000" }]` |
| `sizes` | string[] | ❌ | `["S", "M", "L"]` or `["0-3M", "3-6M"]` |

**Example Request**
```json
{
  "name": "Soft Plush Teddy Bear",
  "description": "Super soft teddy bear made from non-toxic materials. Perfect for newborns and infants.",
  "shortDescription": "Non-toxic plush teddy for babies",
  "price": 599,
  "compareAtPrice": 899,
  "stock": 50,
  "categoryId": "clx1abc123",
  "status": "ACTIVE",
  "ageGroup": "INFANT",
  "gender": "UNISEX",
  "gstRate": 12,
  "isFeatured": true,
  "isNewArrival": true,
  "images": [
    "https://supplier.com/images/teddy-front.jpg",
    "https://supplier.com/images/teddy-side.jpg"
  ],
  "colors": [{ "name": "Brown", "hex": "#8B6914" }],
  "metaTitle": "Soft Plush Teddy Bear for Babies | My Store",
  "metaDescription": "Non-toxic soft plush teddy bear, perfect gift for newborns and infants."
}
```

**Response `201`**
```json
{
  "success": true,
  "product": {
    "id": "clx2xyz789",
    "name": "Soft Plush Teddy Bear",
    "slug": "soft-plush-teddy-bear",
    "sku": "BB-SOFTPLU-A3F9K2",
    "price": "599",
    "compareAtPrice": "899",
    "status": "ACTIVE",
    "stock": 50,
    "images": [
      {
        "id": "img1",
        "url": "https://your image storage/products/1234567890-abc.webp",
        "isPrimary": true,
        "sortOrder": 0
      },
      {
        "id": "img2",
        "url": "https://your image storage/products/1234567891-def.webp",
        "isPrimary": false,
        "sortOrder": 1
      }
    ]
  }
}
```

**Notes:**
- If some image URLs fail to download, the product is still created with the successfully downloaded images
- If ALL image URLs fail, the request returns `400`
- Slug is auto-generated from name and made unique (e.g. `soft-plush-teddy-bear-2` if slug already exists)

---

### PUT /api/v1/products/:id

Update an existing product. Only fields you provide are updated — all others remain unchanged.

**Required scope:** `products:write`

**Request**
```
PUT /api/v1/products/clx2xyz789
Content-Type: application/json
Authorization: Bearer bb_live_...
```

**Request Body** — same fields as POST, all optional.

**Image handling on update:**
- If `images` array is provided, existing images are replaced
- URLs already on `your image storage` are kept as-is (not re-uploaded)
- External URLs are fetched, optimized, and re-uploaded

**Example — update stock and status only**
```json
{
  "stock": 25,
  "status": "ACTIVE"
}
```

**Example — replace images**
```json
{
  "images": [
    "https://your image storage/products/existing.webp",
    "https://supplier.com/new-angle.jpg"
  ]
}
```

**Response `200`**
```json
{
  "success": true,
  "product": {
    "id": "clx2xyz789",
    "name": "Soft Plush Teddy Bear",
    "status": "ACTIVE",
    "stock": 25,
    "images": [...]
  }
}
```

---

### POST /api/v1/upload-from-url

Fetches an image from any URL, optimizes it (WebP, max 1200px, 82% quality), uploads to R2, and returns the CDN URL. Useful for pre-uploading images before creating a product.

**Required scope:** `upload`

**Request**
```
POST /api/v1/upload-from-url
Content-Type: application/json
Authorization: Bearer bb_live_...
```

**Request Body**

| Field | Type | Required | Description |
|---|---|---|---|
| `url` | string | ✅ | Source image URL |
| `maxWidth` | number | ❌ | Max width in px — default: `1200` |

**Example**
```json
{
  "url": "https://supplier.com/product-image.jpg",
  "maxWidth": 800
}
```

**Response `200`**
```json
{
  "url": "https://your image storage/products/1234567890-abc.webp",
  "width": 800,
  "height": 800,
  "size": 48320
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Description of what went wrong"
}
```

| Status | Meaning |
|---|---|
| `400` | Missing required fields, invalid data, or all image downloads failed |
| `401` | Missing or invalid API key |
| `403` | API key doesn't have the required scope |
| `404` | Product not found |
| `500` | Server error |

---

## Rate Limits

- 100 requests / minute per API key
- Image upload: max 10MB source file per image, max 10 images per product
- Timeout: 15 seconds per image fetch

---

## Changelog

| Date | Change |
|---|---|
| 2026-03-25 | Step 2: Built all v1 endpoints — categories, products (POST/PUT), upload-from-url |
| 2026-03-25 | Step 1: API key system — generation, scopes, admin UI |
