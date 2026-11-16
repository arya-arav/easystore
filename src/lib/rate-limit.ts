import { prisma } from '@/lib/prisma';

// Rate limiter backed by Postgres (RateLimit table), so every Worker instance shares the same
// counts. In-memory counters don't work on Workers: each instance has its own memory and is
// recycled often. Cloudflare's own rate-limit binding only allows 10 s / 60 s windows; these
// limits need 10 minutes to an hour. Expired rows are cleared now and then by the limiter.
//
// Fails open: if the database call fails (e.g. the table hasn't been created yet with
// `prisma db push`), the request is allowed and the error logged, so a limiter problem can
// never lock shoppers out of signing in.
export async function rateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
  try {
    const resetAt = new Date(Date.now() + windowMs);
    // One atomic statement: start a new window if none or expired, otherwise count up
    const rows = await prisma.$queryRaw<{ count: number; resetAt: Date }[]>`
      INSERT INTO "RateLimit" ("key", "count", "resetAt") VALUES (${key}, 1, ${resetAt})
      ON CONFLICT ("key") DO UPDATE SET
        "count"   = CASE WHEN "RateLimit"."resetAt" <= NOW() THEN 1 ELSE "RateLimit"."count" + 1 END,
        "resetAt" = CASE WHEN "RateLimit"."resetAt" <= NOW() THEN EXCLUDED."resetAt" ELSE "RateLimit"."resetAt" END
      RETURNING "count", "resetAt"`;
    // About 1 call in 50 also clears expired windows, so the table stays small
    if (Math.random() < 0.02) clearExpiredRateLimits().catch(() => {});
    const row = rows[0];
    const count = Number(row.count);
    const resetIn = Math.max(0, new Date(row.resetAt).getTime() - Date.now());
    return { allowed: count <= maxRequests, remaining: Math.max(0, maxRequests - count), resetIn };
  } catch (e) {
    console.error('rateLimit: allowing request, limiter unavailable:', e instanceof Error ? e.message : e);
    return { allowed: true, remaining: maxRequests, resetIn: 0 };
  }
}

/** True when `key` already used up its window, without counting this check (fails open). */
export async function isRateLimited(key: string, maxRequests: number): Promise<boolean> {
  try {
    const row = await prisma.rateLimit.findUnique({ where: { key } });
    return !!row && row.resetAt > new Date() && row.count >= maxRequests;
  } catch (e) {
    console.error('isRateLimited: limiter unavailable:', e instanceof Error ? e.message : e);
    return false;
  }
}

/** Clears a window, e.g. failed logins after a successful one. */
export async function resetRateLimit(key: string): Promise<void> {
  await prisma.rateLimit.deleteMany({ where: { key } }).catch(() => {});
}

/** Deletes expired windows. */
export async function clearExpiredRateLimits(): Promise<number> {
  const { count } = await prisma.rateLimit.deleteMany({ where: { resetAt: { lt: new Date() } } });
  return count;
}

// The visitor's real IP. On Cloudflare, CF-Connecting-IP is set by Cloudflare and can't be
// faked; X-Forwarded-For is only a fallback for other hosts (Vercel/Docker behind a proxy),
// since a visitor can send their own value in it.
export function getClientIp(request: Request): string {
  return clientIpFromHeaders(request.headers);
}

/** Same, for a Headers object or the plain header object NextAuth passes to authorize(). */
export function clientIpFromHeaders(headers: Headers | Record<string, unknown> | undefined): string {
  const get = (name: string): string | undefined => {
    if (!headers) return undefined;
    if (headers instanceof Headers) return headers.get(name) || undefined;
    const v = headers[name];
    return typeof v === 'string' ? v : Array.isArray(v) ? String(v[0]) : undefined;
  };
  const ip = get('cf-connecting-ip') || get('x-real-ip') || get('x-forwarded-for')?.split(',')[0];
  return ip?.trim() || 'unknown';
}
