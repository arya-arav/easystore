#!/bin/sh
set -e

# Login secret: use NEXTAUTH_SECRET if given, otherwise make one once and keep it in the data volume.
if [ -z "$NEXTAUTH_SECRET" ]; then
  if [ ! -f /app/data/.nextauth-secret ]; then
    node -e "process.stdout.write(require('crypto').randomBytes(32).toString('hex'))" > /app/data/.nextauth-secret
  fi
  NEXTAUTH_SECRET="$(cat /app/data/.nextauth-secret)"
  export NEXTAUTH_SECRET
fi

if [ -z "$DATABASE_URL" ]; then
  echo "DATABASE_URL is not set. Point it at a PostgreSQL database (see docs/deploy-docker.md)." >&2
  exit 1
fi

# Create or update the database tables (safe: never drops data).
echo "Preparing database…"
i=0
until prisma db push --skip-generate --schema=./prisma/schema.prisma; do
  i=$((i + 1))
  if [ "$i" -ge 10 ]; then echo "Database not reachable, giving up." >&2; exit 1; fi
  echo "Database not ready yet, retrying in 3s…"
  sleep 3
done

echo "Starting EasyStore on port ${PORT:-3000}"
exec "$@"
