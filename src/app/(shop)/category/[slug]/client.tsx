'use client';

import { FallbackImage } from '@/components/ui/fallback-image';
import { ShopEmoji } from '@/components/ui/shop-emoji';
import { categoryPictures } from '@/lib/category-picture';
import { useEffect, useState, useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, ChevronDown, ChevronLeft, ChevronRight, Loader2, SlidersHorizontal, X } from 'lucide-react';
import { useSettings } from '@/lib/settings-context';
import { ProductCard } from '@/components/product-card';
import { useQuickAdd, useShopActions } from '@/lib/shop-actions';
import { CATEGORY_PAGE_SIZE, productGridClass } from '@/lib/layout-settings';
import { useMoney } from '@/lib/currency-context';
import { PRICE_RANGES, priceRangeLabel } from '@/lib/price-ranges';
import { PopularProducts } from '@/components/popular-products';
import { BannerSlider } from '@/components/home/banner-slider';
import { useShopType } from '@/lib/settings-context';

interface CategoryLink {
  id: string;
  name: string;
  slug: string;
  image?: string | null;
  cover?: string | null;
  count: number;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  image?: string | null;
  cover?: string | null;
  parent?: { id: string; name: string; slug: string } | null;
  children: CategoryLink[];
}

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  compareAtPrice: number | null;
  images: { url: string; alt: string | null }[];
  category: { name: string; slug: string };
  isNewArrival?: boolean;
  isBestseller?: boolean;
  rating?: number;
  reviewCount?: number;
  colors?: string | null;
  sizes?: string | null;
}

interface Filters {
  ageGroup: string;
  gender: string;
  price: string;
  sort: string;
  page: number;
}

interface Props {
  category: Category;
  related: CategoryLink[];
  products: Product[];
  total: number;
  totalPages: number;
  filters: Filters;
}

type FilterKey = 'ageGroup' | 'price' | 'gender';
interface FilterGroup { key: FilterKey; title: string; options: { value: string; label: string }[] }

/** Filters for this shop type: age (baby shops), price, and who it's for (when the type has it). */
function useFilterGroups(): FilterGroup[] {
  const type = useShopType();
  const groups: FilterGroup[] = [];
  if (type.ages) groups.push({ key: 'ageGroup', title: 'Age', options: type.ages.map((a) => ({ value: a.value, label: a.label })) });
  groups.push({ key: 'price', title: 'Price', options: PRICE_RANGES.map((value) => ({ value, label: value })) }); // labelled at render (currency)
  if (type.audience) groups.push({ key: 'gender', title: type.audience.label, options: type.audience.options });
  return groups;
}

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'bestselling', label: 'Best selling' },
  { value: 'price-low', label: 'Price: low to high' },
  { value: 'price-high', label: 'Price: high to low' },
];


function CategoryThumb({ image, cover, name, className }: { image?: string | null; cover?: string | null; name: string; className: string }) {
  return (
    <FallbackImage sources={categoryPictures(image, cover)} className={`${className} object-cover`}
      fallback={<span className={`${className} flex items-center justify-center bg-primary-100 text-primary-600 font-bold`}>{name.charAt(0)}</span>} />
  );
}

function FilterPanel({ filters, onChange }: { filters: Filters; onChange: (key: FilterKey, value: string) => void }) {
  const { format } = useMoney();
  const FILTER_GROUPS = useFilterGroups();
  const [open, setOpen] = useState<Record<string, boolean>>({ ageGroup: true, price: true, gender: true });

  return (
    <div className="divide-y divide-gray-100">
      {FILTER_GROUPS.map((group) => (
        <fieldset key={group.key} className="py-4 first:pt-0">
          <button
            type="button"
            onClick={() => setOpen((o) => ({ ...o, [group.key]: !o[group.key] }))}
            className="flex w-full items-center justify-between text-left"
            aria-expanded={open[group.key]}
          >
            <legend className="text-sm font-semibold text-gray-900">{group.title}</legend>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open[group.key] ? 'rotate-180' : ''}`} />
          </button>
          {open[group.key] && (
            <div className="mt-3 space-y-1">
              {group.options.map((option) => {
                const checked = filters[group.key] === option.value;
                return (
                  <label key={option.value} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-1 py-1.5 text-sm text-gray-600 hover:text-gray-900">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onChange(group.key, checked ? '' : option.value)}
                      className="h-4 w-4 rounded border-gray-300 accent-[#7FAF8E] focus-visible:ring-2 focus-visible:ring-primary-300"
                    />
                    <span className={checked ? 'font-medium text-gray-900' : ''}>{group.key === 'price' ? priceRangeLabel(option.value, format) : option.label}</span>
                  </label>
                );
              })}
            </div>
          )}
        </fieldset>
      ))}
    </div>
  );
}

export function CategoryClient({ category, related, products, total, totalPages, filters }: Props) {
  const filterGroups = useFilterGroups();
  // The header shows everything in the category; the toolbar shows the filtered count.
  const categoryTotal = related.find((c) => c.id === category.id)?.count ?? total;
  const { settings } = useSettings();
  const { format } = useMoney();
  const router = useRouter();
  const pathname = usePathname();
  const { toggleWishlist, isInWishlist } = useShopActions();
  const { quickAdd, addingId, addedId } = useQuickAdd();
  const [isPending, startTransition] = useTransition();
  const [showFilters, setShowFilters] = useState(false);

  // Lock page scroll while the mobile filter drawer is open
  useEffect(() => {
    document.body.style.overflow = showFilters ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [showFilters]);

  const navigate = (next: Partial<Filters>) => {
    const merged = { ...filters, page: 1, ...next };
    const params = new URLSearchParams();
    if (merged.ageGroup) params.set('ageGroup', merged.ageGroup);
    if (merged.gender) params.set('gender', merged.gender);
    if (merged.price) params.set('price', merged.price);
    if (merged.sort && merged.sort !== 'newest') params.set('sort', merged.sort);
    if (merged.page > 1) params.set('page', String(merged.page));
    const query = params.toString();
    startTransition(() => router.push(query ? `${pathname}?${query}` : pathname, { scroll: next.page !== undefined }));
  };

  const activeFilters = filterGroups.flatMap((g) => {
    const option = g.options.find((o) => o.value === filters[g.key]);
    if (!option) return [];
    return [{ key: g.key, label: g.key === 'price' ? priceRangeLabel(option.value, format) : option.label }];
  });
  const clearAll = () => navigate({ ageGroup: '', gender: '', price: '' });

  const firstItem = total === 0 ? 0 : (filters.page - 1) * CATEGORY_PAGE_SIZE + 1;
  const lastItem = (filters.page - 1) * CATEGORY_PAGE_SIZE + products.length;
  // Nothing to filter in an empty category
  const showSidebar = categoryTotal > 0 || activeFilters.length > 0;
  const chips = category.children.length > 0 ? category.children : related;
  const chipsTitle = category.children.length > 0 ? `Shop ${category.name} by type` : 'Explore more';

  const pageNumbers = (() => {
    const pages = new Set([1, totalPages, filters.page - 1, filters.page, filters.page + 1]);
    return [...pages].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b);
  })();

  return (
    <div className="min-h-screen bg-[#F7F7F5]">
      {/* Header */}
      <section className="bg-primary-50">
        <div className="content-container py-8 md:py-12">
          <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-1.5 text-sm text-gray-500">
            <Link href="/" className="hover:text-gray-900">Home</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link href="/products" className="hover:text-gray-900">Shop</Link>
            {category.parent && (
              <>
                <ChevronRight className="w-3.5 h-3.5" />
                <Link href={`/category/${category.parent.slug}`} className="hover:text-gray-900">{category.parent.name}</Link>
              </>
            )}
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="font-medium text-gray-900" aria-current="page">{category.name}</span>
          </nav>

          <div className="flex items-center gap-5 md:gap-8">
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl md:text-5xl font-display font-bold text-gray-900 leading-tight">{category.name}</h1>
              {category.description && <p className="mt-3 max-w-2xl text-gray-600 md:text-lg">{category.description}</p>}
              <p className="mt-4 inline-flex items-center rounded-full bg-white px-3.5 py-1 text-sm font-medium text-gray-700 shadow-sm">
                {categoryTotal} {categoryTotal === 1 ? 'product' : 'products'}
              </p>
            </div>
            {(category.image || category.cover) && (
              <div className="hidden sm:block shrink-0 h-32 w-32 md:h-44 md:w-44 overflow-hidden rounded-3xl bg-white shadow-sm ring-4 ring-white">
                <CategoryThumb image={category.image} cover={category.cover} name={category.name} className="h-full w-full text-5xl" />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Category banners (Admin → Banners → Category pages) */}
      <BannerSlider position="CATEGORY_TOP" categorySlugs={[category.slug, ...(category.parent ? [category.parent.slug] : [])]} />

      {/* Subcategories, or other categories to explore */}
      {chips.length > 1 && (
        <section className="border-b border-gray-100 bg-white">
          <div className="content-container py-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">{chipsTitle}</p>
            <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none]">
              {chips.map((c) => {
                const current = c.slug === category.slug;
                return (
                  <Link
                    key={c.id}
                    href={`/category/${c.slug}`}
                    aria-current={current ? 'page' : undefined}
                    className={`flex shrink-0 items-center gap-2.5 rounded-full border py-1.5 pl-1.5 pr-4 text-sm font-medium transition-colors ${
                      current ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    <CategoryThumb image={c.image} cover={c.cover} name={c.name} className="h-8 w-8 rounded-full" />
                    {c.name}
                    <span className="text-xs text-gray-400">{c.count}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <div className="content-container py-6 md:py-8">
        <div className="flex gap-8">
          {/* Desktop filters */}
          <aside className={`${showSidebar ? 'lg:block' : ''} hidden w-60 shrink-0`} aria-label="Filters">
            <div className="sticky top-24 rounded-2xl bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">Filter by</h2>
                {activeFilters.length > 0 && (
                  <button onClick={clearAll} className="text-sm font-medium text-primary-600 hover:text-primary-700">Clear all</button>
                )}
              </div>
              <FilterPanel filters={filters} onChange={(key, value) => navigate({ [key]: value })} />
            </div>
          </aside>

          <main className="flex-1 min-w-0">
            {/* Toolbar */}
            <div className="mb-5 flex flex-wrap items-center gap-3">
              {showSidebar && (
                <button
                  onClick={() => setShowFilters(true)}
                  className="lg:hidden inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700"
                >
                  <SlidersHorizontal className="w-4 h-4" /> Filters
                  {activeFilters.length > 0 && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-500 text-[11px] text-white">{activeFilters.length}</span>
                  )}
                </button>
              )}
              <p className="hidden sm:block text-sm text-gray-500">
                {total > 0 ? `Showing ${firstItem}–${lastItem} of ${total}` : 'No products'}
              </p>
              <label className="ml-auto flex items-center gap-2 text-sm text-gray-500">
                <span className="hidden sm:inline">Sort by</span>
                <select
                  value={filters.sort}
                  onChange={(e) => navigate({ sort: e.target.value })}
                  className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-300"
                >
                  {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </label>
            </div>

            {activeFilters.length > 0 && (
              <div className="mb-5 flex flex-wrap items-center gap-2">
                {activeFilters.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => navigate({ [f.key]: '' })}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-sm text-gray-700 shadow-sm ring-1 ring-gray-200 hover:ring-gray-400"
                  >
                    {f.label} <X className="w-3.5 h-3.5" aria-label={`Remove ${f.label}`} />
                  </button>
                ))}
                <button onClick={clearAll} className="text-sm font-medium text-gray-500 underline underline-offset-2 hover:text-gray-900">Clear all</button>
              </div>
            )}

            {/* Results */}
            <div className={`relative transition-opacity ${isPending ? 'opacity-50 pointer-events-none' : ''}`} aria-busy={isPending}>
              {isPending && (
                <div className="absolute inset-x-0 top-24 z-10 flex justify-center">
                  <Loader2 className="w-7 h-7 animate-spin text-primary-500" />
                </div>
              )}

              {products.length > 0 ? (
                <div className={productGridClass(settings.layout.gridColumns, true)}>
                  {products.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={{
                        id: product.id,
                        name: product.name,
                        slug: product.slug,
                        price: product.price,
                        compareAtPrice: product.compareAtPrice,
                        image: product.images[0]?.url,
                        rating: product.rating,
                        reviewCount: product.reviewCount,
                        isNewArrival: product.isNewArrival,
                        isBestseller: product.isBestseller,
                      }}
                      inWishlist={isInWishlist(product.id)}
                      onToggleWishlist={(e) => {
                        e.preventDefault();
                        toggleWishlist({ productId: product.id, name: product.name, slug: product.slug, price: product.price, compareAtPrice: product.compareAtPrice, image: product.images[0]?.url || '' });
                      }}
                      onAddToCart={(e) => quickAdd(e, { ...product, image: product.images[0]?.url })}
                      adding={addingId === product.id}
                      added={addedId === product.id}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-3xl bg-white px-6 py-16 text-center shadow-sm">
                  <div className="text-5xl mb-4">{activeFilters.length > 0 ? '🔍' : <ShopEmoji />}</div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {activeFilters.length > 0 ? 'No products match these filters' : `New ${category.name.toLowerCase()} are on the way`}
                  </h2>
                  <p className="mx-auto mt-2 max-w-md text-gray-500">
                    {activeFilters.length > 0
                      ? 'Try removing a filter to see more products.'
                      : 'We’re adding products to this category soon. Meanwhile, have a look at the rest of the shop.'}
                  </p>
                  <div className="mt-6 flex flex-wrap justify-center gap-3">
                    {activeFilters.length > 0 && (
                      <button onClick={clearAll} className="rounded-full bg-primary-500 px-6 py-2.5 font-medium text-white hover:bg-primary-600">Clear filters</button>
                    )}
                    <Link href="/products" className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-6 py-2.5 font-medium text-gray-700 hover:border-gray-400">
                      Browse all products <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                  {activeFilters.length === 0 && <PopularProducts exclude={category.slug} />}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-1.5">
                  <button
                    onClick={() => navigate({ page: filters.page - 1 })}
                    disabled={filters.page <= 1}
                    aria-label="Previous page"
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-600 shadow-sm disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {pageNumbers.map((n, i) => (
                    <span key={n} className="flex items-center gap-1.5">
                      {i > 0 && n - pageNumbers[i - 1] > 1 && <span className="px-1 text-gray-400">…</span>}
                      <button
                        onClick={() => navigate({ page: n })}
                        aria-current={n === filters.page ? 'page' : undefined}
                        className={`h-10 min-w-10 rounded-full px-3 text-sm font-medium shadow-sm ${
                          n === filters.page ? 'bg-primary-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {n}
                      </button>
                    </span>
                  ))}
                  <button
                    onClick={() => navigate({ page: filters.page + 1 })}
                    disabled={filters.page >= totalPages}
                    aria-label="Next page"
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-600 shadow-sm disabled:opacity-40"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </nav>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Mobile filter drawer */}
      {showFilters && (
        <div className="lg:hidden fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label="Filters">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowFilters(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] flex flex-col rounded-t-3xl bg-white">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
              <button onClick={() => setShowFilters(false)} aria-label="Close filters" className="rounded-full p-2 hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <FilterPanel filters={filters} onChange={(key, value) => navigate({ [key]: value })} />
            </div>
            <div className="flex gap-3 border-t border-gray-100 p-4">
              <button onClick={clearAll} disabled={activeFilters.length === 0} className="flex-1 rounded-full border border-gray-200 py-3 font-medium text-gray-700 disabled:opacity-40">
                Clear all
              </button>
              <button onClick={() => setShowFilters(false)} className="flex-[2] rounded-full bg-primary-500 py-3 font-semibold text-white">
                {isPending ? 'Updating…' : `Show ${total} ${total === 1 ? 'product' : 'products'}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
