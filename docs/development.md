# Development

## Run locally

Requirements: Node.js 20+, pnpm 10, PostgreSQL 14+ (or Docker).

```sh
git clone https://github.com/arya-arav/easystore.git && cd easystore
pnpm install

# A database (or use any PostgreSQL you have)
docker run -d --name easystore-db -p 5432:5432 -e POSTGRES_PASSWORD=dev -e POSTGRES_DB=easystore postgres:16-alpine

cp .env.example .env.local
# set DATABASE_URL="postgresql://postgres:dev@localhost:5432/easystore" and NEXTAUTH_SECRET

pnpm prisma db push     # create the tables
pnpm dev                # http://localhost:3000 → setup wizard
```

Pictures are saved to `./uploads` in development unless S3 variables are set.

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Development server |
| `pnpm build` / `pnpm start` | Production build and server |
| `pnpm lint` | ESLint |
| `pnpm prisma db push` | Apply `prisma/schema.prisma` to the database |
| `pnpm prisma studio` | Browse the database |
| `pnpm create-admin you@example.com "password"` | Create an admin or reset a password |
| `pnpm run deploy` | Build and deploy to Cloudflare Workers |
| `docker compose up -d --build` | Run the production image with PostgreSQL |

## Project structure

```
src/
  app/
    (shop)/          storefront pages: products, category, cart, checkout, account…
    (admin)/admin/   admin panel
    api/             route handlers (shop, admin, v1 product API, webhooks, setup)
    setup/           first-run setup wizard
    demo-images/     generated demo pictures
    uploads/         serves pictures saved on disk
  components/
    admin/           admin UI kit (Container, Button, Drawer, DataTable…)
    home/            homepage sections (hero, banners, categories, testimonials…)
    layout/          header, footer
  lib/
    shop-types.ts    the 10 shop types: wording, categories, filters, demo data
    demo-data.ts     install / remove demo data
    setup.ts         “does this install need the setup wizard?”
    layout-settings.ts  design options (themes, layouts, product page, testimonials)
    banners.ts       banner layout and design options
    r2-upload.ts     picture storage (R2 binding, S3, disk)
    prisma.ts        database client (Neon driver on Workers, native elsewhere)
prisma/schema.prisma database schema
docs/                documentation
```

## Conventions

- Store wording comes from settings or the shop type; don’t hard-code a shop name, domain or phone number.
- Admin pages use the kit in `src/components/admin` (Medusa-style sizes, light/dark tokens).
- Admin API routes check `requireStaff()` from `src/lib/admin-auth.ts`.
- Use `getSiteUrl()` for absolute links, `isOwnImage()` to recognise uploaded pictures.

## Contributing

Issues and pull requests are welcome. Please run `pnpm lint` and `pnpm exec tsc --noEmit` before opening a PR, and describe how you tested the change.
