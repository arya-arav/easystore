# EasyStore

**A complete online store you can install in one click.** Pick what you sell (baby & kids, fashion, electronics, beauty, home, grocery, jewellery, books, sports or a general store), add demo products to see it working, then make it yours from a friendly admin panel.

Built with Next.js, PostgreSQL and Prisma. Runs on Vercel, Cloudflare Workers, Dokploy, Coolify or any server with Docker.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Farya-arav%2Feasystore&project-name=easystore&repository-name=easystore&env=DATABASE_URL,NEXTAUTH_SECRET&envDescription=A%20PostgreSQL%20connection%20string%20(free%20at%20neon.tech)%20and%20any%20long%20random%20text%20for%20NEXTAUTH_SECRET&envLink=https%3A%2F%2Fgithub.com%2Farya-arav%2Feasystore%2Fblob%2Fmain%2Fdocs%2Fdeploy-vercel.md)

| Host | How | Guide |
| --- | --- | --- |
| **Vercel** | Click the button above | [docs/deploy-vercel.md](docs/deploy-vercel.md) |
| **Dokploy** | New project → Compose → this repo | [docs/deploy-docker.md#dokploy](docs/deploy-docker.md#dokploy) |
| **Coolify** | New resource → Docker Compose → this repo | [docs/deploy-docker.md#coolify](docs/deploy-docker.md#coolify) |
| **Any VPS** | `curl -fsSL https://raw.githubusercontent.com/arya-arav/easystore/main/scripts/install.sh \| bash` | [docs/deploy-docker.md#one-line-install](docs/deploy-docker.md#one-line-install) |
| **Cloudflare Workers** | `pnpm deploy` | [docs/deploy-cloudflare.md](docs/deploy-cloudflare.md) |

After deploying, open your site. The **setup wizard** asks four things: what you sell, your store name, your admin login, and whether to add demo products. That's it.

---

## Features

**Storefront**
- 10 shop types, each with its own categories, filters, homepage wording, colours and demo data
- 5 homepage layouts, themes, fonts, section ordering, product card and product page styles
- Banners (slider, fade, peek carousel, tiles) for the homepage, category and product pages, with scheduling
- Mega menu, fast search with typo tolerance, quick view, wishlist, recently viewed, recommendations
- Product variants (colour/size stock), size guides, reviews with photos, Q&A-style FAQ
- Cart drawer, guest checkout with email code, saved addresses, coupons, gift wrap, COD fee
- Razorpay, Stripe, UPI and cash on delivery; multiple currencies and regions
- Customer accounts: orders, tracking, invoices (PDF), returns, reorder, loyalty points, referrals
- SEO: per-page metadata, JSON-LD, sitemap, robots; fast server-rendered homepage

**Admin**
- Dashboard, orders (bulk actions, CSV export, refunds, returns), products (CSV import/export), categories, collections, customers and groups
- Promotions, banners, testimonials, reviews, newsletter, messages
- Store settings, design, regions, policies, staff roles, API keys, ⌘K search and keyboard shortcuts
- **Store type & demo**: switch shop type, install or remove demo data in one click

**Developers**
- REST API with scoped API keys for importing products ([docs/api.md](docs/api.md))
- Pictures on Cloudflare R2, any S3-compatible storage, or local disk ([docs/storage.md](docs/storage.md))

## Documentation

| | |
| --- | --- |
| [Getting started](docs/getting-started.md) | Setup wizard, first steps after installing |
| [Shop types](docs/shop-types.md) | What each type sets up, switching types, adding your own |
| [Demo data](docs/demo-data.md) | Installing and removing sample products |
| [Configuration](docs/configuration.md) | All environment variables |
| [Picture storage](docs/storage.md) | R2, S3, MinIO, local disk |
| [Deploy: Vercel](docs/deploy-vercel.md) · [Docker / Dokploy / Coolify](docs/deploy-docker.md) · [Cloudflare](docs/deploy-cloudflare.md) | Hosting guides |
| [Admin guide](docs/admin-guide.md) | Tour of the admin panel |
| [API](docs/api.md) | Product import API |
| [Development](docs/development.md) | Running locally, project structure, contributing |

## Quick start (local)

```sh
git clone https://github.com/arya-arav/easystore.git && cd easystore
docker compose up -d --build     # app + PostgreSQL on http://localhost:3000
```

Or without Docker: see [docs/development.md](docs/development.md).

## License

[Apache License 2.0](LICENSE). You can use, modify and sell stores built with EasyStore, including commercially. Keep the licence and [NOTICE](NOTICE) file, and mark files you change. The EasyStore name is not included in the licence.
