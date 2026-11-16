import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Two kinds of tests:
//   tests/unit — pure logic, no database (pnpm test:unit)
//   tests/db   — order + payment flows against a real Postgres in DATABASE_URL (pnpm test:db).
//                The database is wiped between tests: never point this at a real store.
// The store is the default EasyStore market: India, prices in INR including GST.
const env = {
  STRIPE_SECRET_KEY: 'sk_test_dummy',
  STRIPE_WEBHOOK_SECRET: 'whsec_test',
};

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    env,
    // DB test files share one database, so files run one after another (unit tests take ms anyway)
    fileParallelism: false,
    projects: [
      { extends: true, test: { name: 'unit', include: ['tests/unit/**/*.test.ts'] } },
      {
        extends: true,
        test: {
          name: 'db',
          include: ['tests/db/**/*.test.ts'],
          setupFiles: ['tests/db/setup.ts'],
          testTimeout: 30_000,
          hookTimeout: 30_000,
        },
      },
    ],
  },
});
