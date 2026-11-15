'use client';

// "Popular right now" row for empty pages (an empty category, a search with no results).

import { useEffect, useState } from 'react';
import { ProductGrid } from '@/components/product-grid';
import type { ListedProduct } from '@/lib/product-query';

export function PopularProducts({ title = 'Popular right now', exclude }: { title?: string; exclude?: string }) {
  const [products, setProducts] = useState<ListedProduct[]>([]);
  useEffect(() => {
    fetch('/api/products?sort=bestselling&limit=8')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setProducts(((d?.products || []) as ListedProduct[]).filter((p) => p.category?.slug !== exclude).slice(0, 4)))
      .catch(() => {});
  }, [exclude]);
  if (!products.length) return null;
  return (
    <section className="mt-12 text-left">
      <h2 className="mb-4 text-lg font-bold text-text-primary">{title}</h2>
      <ProductGrid products={products} />
    </section>
  );
}
