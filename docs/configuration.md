# Configuration

Everything about the shop itself (name, logo, colours, payments, shipping, emails) is set in the **admin panel**. Environment variables are only for things the server needs before it starts.

## Required

| Variable | What it is |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string, e.g. `postgresql://user:pass@host:5432/db?sslmode=require`. Docker Compose sets this for you. |
| `NEXTAUTH_SECRET` | Any long random text; signs login sessions. Docker generates one automatically if empty. Make one with `openssl rand -hex 32`. |

## Recommended

| Variable | What it is |
| --- | --- |
| `SITE_URL` | Your public address, e.g. `https://shop.example.com`. Used in emails, sitemaps and SEO tags. Worked out from each request if not set. |
| `NEXTAUTH_URL` | Same as `SITE_URL`. Needed by the login system on hosts other than Vercel unless `AUTH_TRUST_HOST=true` (set in the Docker image). |

## Picture storage

See [storage.md](storage.md). One of:

| Variable | What it is |
| --- | --- |
| `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_URL` | Any S3-compatible bucket (Cloudflare R2, AWS S3, Backblaze B2, MinIO) |
| `S3_ENDPOINT` | The S3 API address, e.g. `https://<account>.r2.cloudflarestorage.com`. Defaults to AWS for `S3_REGION`. |
| `S3_REGION` | Default `auto` (R2). AWS: e.g. `ap-south-1`. |
| `UPLOAD_DIR` | Docker / VPS without S3: where uploads are saved. Default `/app/data/uploads` in Docker. |
| `R2_PUBLIC_URL` | Cloudflare Workers only: public address of the R2 bucket bound as `IMAGES_BUCKET`. |
| `IMAGE_HOSTS` | Extra picture hosts to allow for resizing, comma separated (e.g. `cdn.example.com`). |

## Payments (optional)

Switch each method on in **Admin → Store settings → Payment**. The keys can live here or be entered in the admin.

| Variable | For |
| --- | --- |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | Razorpay (cards, UPI, net banking in India). Webhook: `https://<your-domain>/api/webhooks/razorpay` |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Stripe (international cards). Webhook: `https://<your-domain>/api/webhooks/stripe` |

## Sign-in (optional)

| Variable | For |
| --- | --- |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | “Continue with Google”. Redirect URI: `https://<your-domain>/api/auth/callback/google` |
| `WHATSAPP_API_KEY` | WhatsApp sign-in codes |

Email (order confirmations, sign-in codes, staff invites) uses SMTP set in **Admin → Store settings → Email**.

## Build-time

| Variable | What it is |
| --- | --- |
| `DEPLOY_TARGET=node` | Build the standalone Node server (set in the Dockerfile). |
