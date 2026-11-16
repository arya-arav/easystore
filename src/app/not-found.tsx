import type { Metadata } from 'next';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { ErrorState } from '@/components/error-state';

export const metadata: Metadata = { title: 'Page not found' };

// Unknown URLs and notFound() (removed products, categories, orders)
export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main id="main" className="flex-1">
        <ErrorState
          title="We couldn't find that page"
          message="It may have moved or is no longer available. Try the homepage or browse all products."
        />
      </main>
      <Footer />
    </div>
  );
}
