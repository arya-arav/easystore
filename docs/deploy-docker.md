# Deploy with Docker (Dokploy, Coolify, any VPS)

The repository includes a `Dockerfile` and a `docker-compose.yml` that runs EasyStore **with its own PostgreSQL**. Nothing else is required: the database tables are created on start, a login secret is generated and kept, and uploaded pictures are saved in a volume.

Requirements: a server with 1 GB RAM or more (2 GB recommended for building), Docker 24+.

## One-line install

On a fresh Ubuntu/Debian server:

```sh
curl -fsSL https://raw.githubusercontent.com/arya-arav/easystore/main/scripts/install.sh | bash
```

It installs Docker if missing, downloads EasyStore to `~/easystore`, creates a random database password, and starts it on port 3000. Open `http://<server-ip>:3000` and follow the setup wizard. Put it behind a reverse proxy (Caddy, Nginx, Traefik) for HTTPS on your domain.

## Dokploy

1. **Create project** → **Create service** → **Compose**.
2. Provider: **GitHub** (or Git) → repository `arya-arav/easystore` (or your fork), branch `main`, compose path `./docker-compose.yml`.
3. **Environment** tab (all optional):
   ```env
   POSTGRES_PASSWORD=<a strong password>
   SITE_URL=https://shop.example.com
   ```
4. **Domains** tab → add your domain → service `app`, port `3000`, HTTPS on.
5. **Deploy**. When it’s running, open your domain and finish the setup wizard.

## Coolify

1. **+ New** → **Resource** → **Public Repository** (or your GitHub App) → `https://github.com/arya-arav/easystore`.
2. Build pack: **Docker Compose**, file `/docker-compose.yml`.
3. In the `app` service, set **Domains** to `https://shop.example.com` (Coolify routes it to port 3000).
4. **Environment Variables** (optional): `POSTGRES_PASSWORD`, `SITE_URL=https://shop.example.com`.
5. **Deploy**, then open your domain for the setup wizard.

> Coolify and Dokploy keep the `store-data` and `db-data` volumes between deploys, so redeploying never loses data.

## Plain Docker Compose

```sh
git clone https://github.com/arya-arav/easystore.git && cd easystore
cp .env.example .env        # optional: set POSTGRES_PASSWORD, SITE_URL, S3_*
docker compose up -d --build
```

## Using an external database

Remove the `db` service from `docker-compose.yml` and set `DATABASE_URL` for the `app` service, or run the image alone:

```sh
docker build -t easystore .
docker run -d -p 3000:3000 -v easystore-data:/app/data \
  -e DATABASE_URL="postgresql://user:pass@host:5432/db" \
  -e SITE_URL="https://shop.example.com" \
  easystore
```

## Updating

```sh
cd ~/easystore && git pull && docker compose up -d --build
```

In Dokploy / Coolify, click **Redeploy** (or turn on auto-deploy). Database changes are applied when the container starts; data is never dropped.

## Backups

```sh
docker compose exec db pg_dump -U easystore easystore > backup-$(date +%F).sql   # database
docker run --rm -v easystore_store-data:/data -v "$PWD":/out alpine tar czf /out/uploads.tgz -C /data .   # pictures
```

## Troubleshooting

| Problem | Fix |
| --- | --- |
| Logged out immediately / login loops | Set `SITE_URL` and `NEXTAUTH_URL` to your `https://` address. |
| “Database not reachable” in logs | Check `DATABASE_URL`; with the bundled database, wait for the `db` health check. |
| Build runs out of memory | Build on a machine with 2 GB+ RAM, or add swap. |
| Reset the admin password | `docker compose exec app node scripts/create-admin.mjs you@example.com "new-password"` |
