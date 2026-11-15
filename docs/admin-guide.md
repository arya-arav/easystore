# Admin guide

Sign in at **/admin** with the account from the setup wizard. Press **⌘K** (Ctrl+K) anywhere to search orders, products, customers and pages; press **?** for keyboard shortcuts (e.g. `G` then `O` for Orders).

## Sell

| Page | What you do there |
| --- | --- |
| **Dashboard** | Sales, orders and store activity at a glance |
| **Orders** | Filter, search, bulk-update status, export CSV. Open an order to confirm, add tracking, refund (full or partial), download the invoice |
| **Returns** | Approve or reject return requests and refund |
| **Products** | Add/edit products with photos, variants (colour × size stock), SEO, tags. **Import** / export CSV |
| **Categories** / **Collections** | Organise the catalogue; collections are hand-picked product sets with their own page |
| **Customers** | Order history, addresses, groups (e.g. wholesale) |
| **Promotions** | Coupons: percentage, fixed or free shipping, minimum order, usage limits, dates |
| **Reports** | Sales by day, top products, CSV export |

## Content

| Page | What you do there |
| --- | --- |
| **Banners** | Promotions for the homepage hero, homepage strip, category pages and product pages. Per position: slider, fade, peek carousel or tiles; height; autoplay. Per banner: phone picture, button, text position and colour, schedule, category targeting |
| **Reviews** | Approve or hide product reviews |
| **Testimonials** | Homepage reviews section: 5 styles (card grid, sliding cards, big quote, wall of love, simple quotes), background, what to show |
| **Newsletter** | Subscribers, CSV export |
| **Messages** | Contact form messages |

## Settings

| Page | What you do there |
| --- | --- |
| **Store settings** | General (name, logo, contact), Design (theme, fonts, homepage layout and section order, product cards, product page layout), Homepage text, Payment, Email (SMTP), International (currencies), Loyalty |
| **Store type & demo** | Switch shop type; install or remove demo data ([shop-types.md](shop-types.md), [demo-data.md](demo-data.md)) |
| **Regions** | Countries, currencies, shipping options and prices, COD fee, gift wrap |
| **Policies** | Return window and the text of shipping, returns, privacy and terms pages |
| **Staff** | Invite staff as **Admin** (everything) or **Seller** (orders and products only) |
| **API keys** | Keys for the [product API](api.md), with permissions and expiry |

## Going live checklist

- [ ] Logo, store name and contact details (Store settings → General)
- [ ] Payment method switched on and tested with a small real order
- [ ] SMTP email set and tested (Store settings → Email → *Send test email*)
- [ ] Shipping options and prices (Regions)
- [ ] Return window and policy pages (Policies)
- [ ] Demo data removed (Store type & demo)
- [ ] Your domain connected and `SITE_URL` set
