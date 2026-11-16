'use client';

import Link from 'next/link';
import { useEffect } from 'react';

// Shared body for error.tsx / not-found.tsx: friendly message, a way back, and (for errors)
// a retry plus the reference code that matches the server log entry.
export function ErrorState({
  title,
  message,
  error,
  retry,
}: {
  title: string;
  message: string;
  error?: unknown;
  retry?: () => void;
}) {
  useEffect(() => {
    if (error) console.error(error);
  }, [error]);

  const digest = error instanceof Error ? (error as Error & { digest?: string }).digest : undefined;

  return (
    <div className="bg-[#F7F7F5] flex flex-col items-center justify-center gap-4 px-4 py-24 text-center min-h-[60vh]">
      <h1 className="text-2xl font-bold text-[#333333]">{title}</h1>
      <p className="max-w-md text-[#777777]">{message}</p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
        {retry && (
          <button
            type="button"
            onClick={() => retry()}
            className="bg-brand-primary inline-flex items-center rounded-full px-6 py-3 font-semibold text-white transition-opacity hover:opacity-90"
          >
            Try again
          </button>
        )}
        <Link
          href="/"
          className={
            retry
              ? 'inline-flex items-center rounded-full border border-[#D5D5D5] bg-white px-6 py-3 font-semibold text-[#333333] transition-colors hover:bg-[#EFEFEC]'
              : 'bg-brand-primary inline-flex items-center rounded-full px-6 py-3 font-semibold text-white transition-opacity hover:opacity-90'
          }
        >
          Go to homepage
        </Link>
        {!retry && (
          <Link
            href="/products"
            className="inline-flex items-center rounded-full border border-[#D5D5D5] bg-white px-6 py-3 font-semibold text-[#333333] transition-colors hover:bg-[#EFEFEC]"
          >
            Shop all products
          </Link>
        )}
      </div>
      {digest && <p className="mt-4 text-xs text-[#999999]">Reference: {digest}</p>}
    </div>
  );
}
