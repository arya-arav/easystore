'use client';

import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { ErrorState } from '@/components/error-state';

// Homepage and any page outside the shop layout (shop pages use (shop)/error.tsx).
export default function RootError({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main id="main" className="flex-1">
        <ErrorState
          title="Something went wrong"
          message="We couldn't load this page. Please try again — your cart is safe."
          error={error}
          retry={retry}
        />
      </main>
      <Footer />
    </div>
  );
}
