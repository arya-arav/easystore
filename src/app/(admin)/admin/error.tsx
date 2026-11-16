'use client';

import { useEffect } from 'react';

// Admin pages: keeps the sidebar; shows the real message (admins need it to act on the problem).
export default function AdminError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  const e = error instanceof Error ? (error as Error & { digest?: string }) : undefined;
  return (
    <div className="flex flex-col items-start gap-3 p-8">
      <h1 className="text-lg font-semibold text-ui-fg">This page failed to load</h1>
      <p className="max-w-xl text-sm text-ui-subtle">
        {e?.digest
          ? `Server error. Look up reference ${e.digest} in your host's server logs.`
          : e?.message || 'Unexpected error.'}
      </p>
      <button type="button" onClick={() => retry()} className="rounded-md border border-ui-border px-3 py-1.5 text-sm font-medium text-ui-fg hover:bg-ui-hover">
        Try again
      </button>
    </div>
  );
}
