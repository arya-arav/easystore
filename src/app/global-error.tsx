'use client';

// Last resort when the root layout itself fails (e.g. settings can't load). Replaces the whole
// document, so it can't rely on global CSS, fonts or providers: plain inline styles only.
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  const digest = error instanceof Error ? (error as Error & { digest?: string }).digest : undefined;
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, -apple-system, sans-serif', background: '#F7F7F5', color: '#333' }}>
        <title>Something went wrong</title>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '0 16px', textAlign: 'center' }}>
          <h1 style={{ fontSize: 24, margin: 0 }}>Something went wrong</h1>
          <p style={{ color: '#777', margin: 0, maxWidth: 420 }}>We&apos;re having trouble loading the store. Please try again in a moment.</p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={() => retry()}
              style={{ background: '#7FAF8E', color: '#fff', border: 0, borderRadius: 999, padding: '12px 24px', fontWeight: 600, fontSize: 16, cursor: 'pointer' }}
            >
              Try again
            </button>
            {/* Plain link: a full page load, since the app shell itself failed */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" style={{ border: '1px solid #D5D5D5', background: '#fff', color: '#333', borderRadius: 999, padding: '12px 24px', fontWeight: 600, textDecoration: 'none' }}>
              Go to homepage
            </a>
          </div>
          {digest && <p style={{ fontSize: 12, color: '#999' }}>Reference: {digest}</p>}
        </div>
      </body>
    </html>
  );
}
