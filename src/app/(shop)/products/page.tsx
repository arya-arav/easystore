import { Suspense } from 'react';
import { Metadata } from 'next';
import { ProductsClient } from './client';

export const metadata: Metadata = {
  title: 'All Products',
  description: 'Browse all products.',
};

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <ProductsClient />
    </Suspense>
  );
}
