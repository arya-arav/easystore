import { headers } from 'next/headers';

// The store's public address, for links in emails, sitemaps and SEO tags.
// Set SITE_URL (or NEXTAUTH_URL) in production; otherwise it's worked out from the request.

const fromEnv = () => (process.env.SITE_URL || process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');

export async function getSiteUrl(): Promise<string> {
  const env = fromEnv();
  if (env) return env;
  try {
    const h = await headers();
    const host = h.get('x-forwarded-host') || h.get('host');
    if (host) {
      const proto = h.get('x-forwarded-proto') || (/^(localhost|127\.|\[::1\])/.test(host) ? 'http' : 'https');
      return `${proto}://${host}`;
    }
  } catch {
    // Outside a request (build time): fall through
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return 'http://localhost:3000';
}
