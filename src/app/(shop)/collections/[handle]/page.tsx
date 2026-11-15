import { cache } from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { queryProducts } from '@/lib/product-query';
import { ProductGrid } from '@/components/product-grid';

import { getSiteUrl } from '@/lib/site-url';
const PAGE_SIZE = 24;

const getCollection = cache(async (handle: string) =>
  prisma.collection.findFirst({ where: { handle, isActive: true } })
);

export async function generateMetadata(props: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const { handle } = await props.params;
  const collection = await getCollection(handle);
  if (!collection) return { title: 'Collection Not Found' };
  const SITE_URL = await getSiteUrl();
  const description = collection.description || `Shop the ${collection.title} collection.`;
  const url = `${SITE_URL}/collections/${collection.handle}`;
  return {
    title: collection.title,
    description,
    alternates: { canonical: url },
    openGraph: { title: collection.title, description, url, images: collection.image ? [collection.image] : undefined },
  };
}

const SORTS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price-low', label: 'Price: low to high' },
  { value: 'price-high', label: 'Price: high to low' },
  { value: 'bestselling', label: 'Bestselling' },
];

export default async function CollectionPage(props: { params: Promise<{ handle: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { handle } = await props.params;
  const sp = await props.searchParams;
  const collection = await getCollection(handle);
  if (!collection) notFound();

  const page = Math.max(1, Number(sp.page) || 1);
  const sort = SORTS.some((s) => s.value === sp.sort) ? sp.sort! : 'newest';
  const { products, pagination } = await queryProducts({ collection: handle, sort, page, limit: PAGE_SIZE });
  const link = (patch: Record<string, string | number>) => {
    const qs = new URLSearchParams({ ...(sort !== 'newest' ? { sort } : {}), ...(page > 1 ? { page: String(page) } : {}), ...Object.fromEntries(Object.entries(patch).map(([k, v]) => [k, String(v)])) });
    if (qs.get('page') === '1') qs.delete('page');
    if (qs.get('sort') === 'newest') qs.delete('sort');
    const s = qs.toString();
    return `/collections/${handle}${s ? `?${s}` : ''}`;
  };

  return (
    <div className="bg-bg-primary min-h-screen">
      <div className="bg-bg-secondary">
        <div className="content-container py-10 md:py-14">
          <nav className="text-sm text-text-secondary mb-3" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-primary-500">Home</Link> <span className="mx-1.5">/</span> <span className="text-text-primary">{collection.title}</span>
          </nav>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-text-primary">{collection.title}</h1>
          {collection.description && <p className="mt-3 max-w-2xl text-text-secondary">{collection.description}</p>}
        </div>
      </div>

      <div className="content-container py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-text-secondary">{pagination.total} product{pagination.total === 1 ? '' : 's'}</p>
          <div className="flex flex-wrap gap-2 text-sm">
            {SORTS.map((s) => (
              <Link key={s.value} href={link({ sort: s.value, page: 1 })} scroll={false}
                className={`rounded-full border px-3 py-1.5 ${s.value === sort ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-cream-400 text-text-secondary hover:border-primary-300'}`}>
                {s.label}
              </Link>
            ))}
          </div>
        </div>

        {products.length === 0 ? (
          <p className="py-16 text-center text-text-secondary">Nothing in this collection yet. <Link href="/products" className="text-primary-500 hover:underline">Browse all products</Link></p>
        ) : (
          <ProductGrid products={products} />
        )}

        {pagination.totalPages > 1 && (
          <nav className="mt-10 flex items-center justify-center gap-3 text-sm" aria-label="Pages">
            {page > 1 && <Link href={link({ page: page - 1 })} className="rounded-full border border-cream-400 px-4 py-2 hover:border-primary-300">Previous</Link>}
            <span className="text-text-secondary">Page {page} of {pagination.totalPages}</span>
            {page < pagination.totalPages && <Link href={link({ page: page + 1 })} className="rounded-full border border-cream-400 px-4 py-2 hover:border-primary-300">Next</Link>}
          </nav>
        )}
      </div>
    </div>
  );
}
