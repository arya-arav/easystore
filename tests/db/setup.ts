import { afterAll, beforeEach, vi } from 'vitest';

import { auth } from './state';

// Sign-in comes from tests (signIn()).
vi.mock('next-auth', async () => {
  const { auth } = await import('./state');
  return { getServerSession: vi.fn(async () => auth.session) };
});

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set. DB tests need a throwaway Postgres (see tests/README.md).');
}
if (/neon\.tech/i.test(process.env.DATABASE_URL) && !process.env.ALLOW_TEST_DB_WIPE) {
  throw new Error('DATABASE_URL looks like a real database. DB tests wipe every table, refusing to run.');
}

const { prisma } = await import('@/lib/prisma');

beforeEach(async () => {
  auth.session = null;
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (tables.length) {
    await prisma.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(', ')} RESTART IDENTITY CASCADE`);
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});
