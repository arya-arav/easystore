'use client';

import { ErrorState } from '@/components/error-state';

// Shop pages: the header and footer (from the shop layout) stay, only the page body is replaced.
export default function ShopError({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <ErrorState
      title="Something went wrong"
      message="We couldn't load this page. Please try again — your cart is safe."
      error={error}
      retry={retry}
    />
  );
}
