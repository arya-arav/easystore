import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { getCloudflareContext } from '@opennextjs/cloudflare';

const log: ('query' | 'error' | 'warn')[] =
  process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'];

// Cloudflare Workers can't run Prisma's native engine, and a socket opened in one
// request can't be reused by another. So on Workers we build one client per request
// (keyed on the request's ExecutionContext) using Neon's serverless driver.
// Everywhere else (next dev, next build, scripts) a single native client is shared.
const isWorkerd =
  typeof navigator !== 'undefined' && navigator.userAgent === 'Cloudflare-Workers';

const requestClients = new WeakMap<object, PrismaClient>();

function getWorkerClient(): PrismaClient {
  const { ctx } = getCloudflareContext();
  let client = requestClients.get(ctx);
  if (!client) {
    const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
    client = new PrismaClient({ adapter, log });
    requestClients.set(ctx, client);
  }
  return client;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function getNodeClient(): PrismaClient {
  if (!globalForPrisma.prisma) globalForPrisma.prisma = new PrismaClient({ log });
  return globalForPrisma.prisma;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = isWorkerd ? getWorkerClient() : getNodeClient();
    const value = Reflect.get(client, prop);
    return typeof value === 'function' ? value.bind(client) : value;
  },
});

export default prisma;
