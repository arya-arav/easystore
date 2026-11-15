# EasyStore: production image for Docker, Dokploy, Coolify or any VPS.
# Build:  docker build -t easystore .
# Run:    docker compose up -d   (see docker-compose.yml and docs/deploy-docker.md)

FROM node:22-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@10.34.6 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV DEPLOY_TARGET=node NEXT_TELEMETRY_DISABLED=1
# A placeholder so build-time imports of the database client don't fail; no DB is used during the build.
RUN DATABASE_URL="postgresql://build:build@localhost:5432/build" pnpm exec prisma generate && \
    DATABASE_URL="postgresql://build:build@localhost:5432/build" pnpm exec next build

FROM base AS runner
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 DEPLOY_TARGET=node \
    PORT=3000 HOSTNAME=0.0.0.0 \
    AUTH_TRUST_HOST=true \
    UPLOAD_DIR=/app/data/uploads
RUN npm install -g prisma@6.19.3 && useradd -m -u 1001 store
COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/scripts ./scripts
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh && mkdir -p /app/data/uploads && chown -R store:store /app
USER store
VOLUME ["/app/data"]
EXPOSE 3000
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "server.js"]
