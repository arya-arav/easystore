# Deploy on Vercel

## 1. Get a database

Create a free PostgreSQL database at [neon.tech](https://neon.tech) (or Supabase, Railway, any PostgreSQL). Copy the connection string, e.g.

```
postgresql://user:password@ep-xxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
```

## 2. Click deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Farya-arav%2Feasystore&project-name=easystore&repository-name=easystore&env=DATABASE_URL,NEXTAUTH_SECRET&envDescription=A%20PostgreSQL%20connection%20string%20(free%20at%20neon.tech)%20and%20any%20long%20random%20text%20for%20NEXTAUTH_SECRET&envLink=https%3A%2F%2Fgithub.com%2Farya-arav%2Feasystore%2Fblob%2Fmain%2Fdocs%2Fdeploy-vercel.md)

Vercel copies the repository to your GitHub account and asks for:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | The connection string from step 1 |
| `NEXTAUTH_SECRET` | Any long random text (run `openssl rand -hex 32`) |

The build (`pnpm vercel-build`) creates the database tables automatically.

## 3. Run the setup wizard

Open the address Vercel gives you. You land on **/setup**: pick your shop type, name, admin login and demo data. Done.

## 4. Picture uploads

Uploading pictures on Vercel needs S3-compatible storage (Cloudflare R2 has a free tier). Add the `S3_*` variables from [storage.md](storage.md) in Vercel → Project → Settings → Environment Variables, then **Redeploy**.

## 5. Your domain

Vercel → Project → Settings → Domains. Then set `SITE_URL` (and `NEXTAUTH_URL`) to `https://your-domain` and redeploy.

## Updating

Your copy is a normal GitHub repository. Pull changes from `arya-arav/easystore` into it (GitHub → *Sync fork*, or `git pull upstream main`) and Vercel redeploys. Database changes are applied on each build.
