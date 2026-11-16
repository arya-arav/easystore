# Tests

```bash
pnpm test:unit   # pure logic, no database (milliseconds)
pnpm test:db     # orders and payments against a real Postgres
pnpm test        # both
```

## What's covered

- **Unit** (`tests/unit`): Stripe and Razorpay signature checks (including "no secret set"),
  amounts in the smallest currency unit, delivery charges and free-delivery thresholds, regions.
- **Orders** (`tests/db/orders.test.ts`): totals worked out on the server (browser amounts
  ignored), delivery options, GST inside prices, stock taken and cart emptied, out-of-stock
  refusals, two shoppers buying the last item at once, coupon usage limits, unsupported
  countries and payment methods.
- **Payments** (`tests/db/payments.test.ts`): Stripe and Razorpay webhooks mark orders paid
  exactly once (duplicates and simultaneous deliveries), failed/expired never undo a payment,
  bad signatures and missing secrets are refused, card orders can't be "paid" via Razorpay.

Sign-in is faked (`signIn()` in `tests/db/fixtures.ts`). The test store is an Indian store
(INR, prices include 18% GST, cash on delivery), EasyStore's default market.

## Database for `test:db`

The DB tests **wipe every table** before each test, so use a throwaway Postgres, never the
store's database (the setup refuses URLs that look like Neon):

```bash
docker run -d --rm --name bb-test-db -e POSTGRES_PASSWORD=t -p 54330:5432 postgres:16-alpine
export DATABASE_URL=postgresql://postgres:t@localhost:54330/postgres
pnpm prisma db push --skip-generate
pnpm test:db
docker stop bb-test-db
```

CI (`.github/workflows/ci.yml`) does the same with a Postgres service on every pull request.
