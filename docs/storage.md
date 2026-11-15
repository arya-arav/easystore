# Picture storage

Product, banner, category and review pictures are uploaded from the admin. EasyStore stores them in the first of these that is available:

| | When | Set up |
| --- | --- | --- |
| **Cloudflare R2 binding** | Running on Cloudflare Workers | `IMAGES_BUCKET` binding in `wrangler.jsonc` + `R2_PUBLIC_URL` |
| **S3-compatible bucket** | Any host, when the `S3_*` variables are set | See below |
| **Local disk** | Docker / VPS without S3 | Nothing: saved in the `store-data` volume, served at `/uploads/…` |

Vercel’s disk is not kept between requests, so **Vercel needs S3-compatible storage** for uploads. (Demo pictures need no storage at all.)

## S3-compatible storage

Set these environment variables:

```env
S3_BUCKET=my-shop-images
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_ENDPOINT=...          # see below
S3_REGION=auto           # or your AWS region
S3_PUBLIC_URL=https://images.example.com   # where the bucket is publicly readable
```

### Cloudflare R2 (free tier: 10 GB)

1. Cloudflare dashboard → R2 → **Create bucket**.
2. Bucket → Settings → **Public access**: connect a custom domain (e.g. `images.example.com`) or enable the `r2.dev` address. That is your `S3_PUBLIC_URL`.
3. R2 → **Manage API tokens** → create a token with *Object Read & Write* for the bucket. Copy the Access Key ID and Secret.
4. `S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com`, `S3_REGION=auto`.

### AWS S3

1. Create a bucket and allow public read for objects (bucket policy `s3:GetObject` on `arn:aws:s3:::my-bucket/*`), or put CloudFront in front.
2. Create an IAM user with `s3:PutObject` on the bucket.
3. `S3_ENDPOINT=https://s3.<region>.amazonaws.com`, `S3_REGION=<region>`, `S3_PUBLIC_URL=https://my-bucket.s3.<region>.amazonaws.com` (or your CloudFront address).

### MinIO (self-hosted)

`S3_ENDPOINT=https://minio.example.com`, `S3_REGION=us-east-1`, and a public-read bucket policy. `S3_PUBLIC_URL=https://minio.example.com/<bucket>`.

## Picture resizing

Pictures are shown through Next.js image optimisation, which resizes them for each screen. Your storage host is allowed automatically from `S3_PUBLIC_URL` / `R2_PUBLIC_URL` at build time. Add more hosts with `IMAGE_HOSTS=cdn.example.com,other.example.com`.

## Backups

- Local disk: back up the `store-data` Docker volume (`/app/data`).
- S3 / R2: use your provider’s versioning or replication.
