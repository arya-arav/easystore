# Getting started

## 1. Deploy

Pick a host from the [README](../README.md#easystore). The quickest are:

- **Vercel** – one button, needs a free PostgreSQL database (e.g. [Neon](https://neon.tech)).
- **Dokploy / Coolify / a VPS** – `docker-compose.yml` brings its own PostgreSQL, nothing else to set up.

## 2. Run the setup wizard

Open your site. A fresh install has no admin yet, so every visit goes to **/setup**:

| Step | What you choose |
| --- | --- |
| 1. Shop type | Baby & kids, Fashion, Electronics, Beauty, Home & living, Grocery, Jewellery & gifts, Books & stationery, Sports & fitness, or General store |
| 2. Store | Store name, support email and phone/WhatsApp (optional) |
| 3. Admin | Your name, email and password for the admin panel |
| 4. Finish | Tick **Add demo products** to fill the store with sample products and reviews |

Click **Create my store**. EasyStore creates your admin account, the categories for your shop type, sets colours and wording to match, adds demo data if you asked, and signs you in to **/admin**.

The wizard only works once: as soon as an admin exists, `/setup` redirects to the admin.

## 3. Make it yours

A good order to work through:

1. **Store settings → General**: logo, contact details, GST number.
2. **Store settings → Design**: theme colour, font, homepage layout and sections.
3. **Store settings → Payment**: switch on Razorpay, Stripe, UPI or cash on delivery and add their keys.
4. **Store settings → Email**: SMTP details so customers get order emails and sign-in codes.
5. **Regions** and **Policies**: shipping options, delivery times, return window.
6. **Products**: add your own, or import a CSV (Products → Import).
7. **Banners** and **Testimonials**: promotions and reviews for the homepage.
8. **Store type & demo → Remove all demo data** once your real products are in.

## Forgot the admin password?

On a server you control, run:

```sh
node scripts/create-admin.mjs you@example.com "new-password"
```

With Docker Compose: `docker compose exec app node scripts/create-admin.mjs you@example.com "new-password"`.
