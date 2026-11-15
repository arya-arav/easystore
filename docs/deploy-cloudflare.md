# Deploy on Cloudflare Workers

EasyStore runs on Cloudflare Workers through [OpenNext](https://opennext.js.org/cloudflare). This is the fastest and cheapest option at scale, but takes a few more steps than Vercel or Docker. You need a **Workers Paid** plan ($5/month; the Worker is about 3 MB compressed, over the 3 MB free limit).

| Concern | On Workers |
| --- | --- |
| Database | Neon PostgreSQL through its serverless driver (`@prisma/adapter-neon`), one client per request (`src/lib/prisma.ts`). Use Neon’s **pooled** connection string. |
| Pictures | R2 binding `IMAGES_BUCKET`; public address in `R2_PUBLIC_URL` |
| Picture resizing | Cloudflare Images binding `IMAGES` |
| Email | SMTP on ports 465/587 (port 25 is blocked on Workers) |

## One-time setup

```sh
pnpm install
npx wrangler login
npx wrangler r2 bucket create easystore-images
```

Edit `wrangler.jsonc`:

- `name`: your Worker name
- `r2_buckets[0].bucket_name`: the bucket above
- `vars.NEXTAUTH_URL`, `vars.NEXT_PUBLIC_APP_URL`: `https://your-domain`
- `vars.R2_PUBLIC_URL`: the bucket’s public address (custom domain or `r2.dev`)
- `routes`: your custom domain (optional)

Secrets (one prompt each; skip the ones you don’t use):

```sh
for s in DATABASE_URL NEXTAUTH_SECRET RAZORPAY_KEY_ID RAZORPAY_KEY_SECRET RAZORPAY_WEBHOOK_SECRET \
         STRIPE_SECRET_KEY STRIPE_WEBHOOK_SECRET GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET; do
  npx wrangler secret put $s
done
```

Create the database tables once (from your machine):

```sh
DATABASE_URL="<neon direct connection string>" pnpm prisma db push
```

## Deploy

```sh
pnpm run deploy        # build and deploy
```

Or connect the repository in Cloudflare → Workers → **Import a repository** (Workers Builds) to deploy on every push. Build command: `pnpm exec opennextjs-cloudflare build`, deploy command: `pnpm exec wrangler deploy`.

Open your domain and finish the setup wizard.

## Other commands

```sh
pnpm preview     # build and run the real Worker locally (reads .dev.vars)
pnpm cf-typegen  # regenerate cloudflare-env.d.ts after editing wrangler.jsonc
```

## Database changes on updates

Workers can’t run Prisma’s migration engine. After pulling an update that changes `prisma/schema.prisma`, run `pnpm prisma db push` from your machine against the same database (it only adds; it never drops data without asking).
