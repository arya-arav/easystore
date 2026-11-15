'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, SlidersHorizontal, X, ChevronDown } from 'lucide-react';
import { useCart } from '@/lib/cart-context';
import { useSettings, useShopType } from '@/lib/settings-context';
import { ProductCard } from '@/components/product-card';
import { productGridClass } from '@/lib/layout-settings';
import { useMoney } from '@/lib/currency-context';
import { PopularProducts } from '@/components/popular-products';


const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' },
  { value: 'bestselling', label: 'Bestselling' },
];

export function SearchClient() {
  const { format: fmt, currency, toInr } = useMoney();
  const { settings } = useSettings();
  const searchParams = useSearchParams();
  const shopType = useShopType();
  const router = useRouter();
  const { addItem } = useCart();

  const q = searchParams.get('q') || '';
  const [query, setQuery] = useState(q);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  // Filters
  const [sort, setSort] = useState(searchParams.get('sort') || 'newest');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [ageGroup, setAgeGroup] = useState(searchParams.get('ageGroup') || '');
  const [priceMin, setPriceMin] = useState(searchParams.get('priceMin') || '');
  const [priceMax, setPriceMax] = useState(searchParams.get('priceMax') || '');

  useEffect(() => {
    fetch('/api/categories').then(r => r.json()).then(d => setCategories(Array.isArray(d) ? d : d.categories || []));
  }, []);

  const fetchResults = useCallback(async () => {
    if (!q) return;
    setLoading(true);
    const params = new URLSearchParams({ q, sort });
    if (category) params.set('category', category);
    if (ageGroup) params.set('ageGroup', ageGroup);
    // Typed in the shopper's currency; the catalogue is priced in INR
    if (priceMin || priceMax) params.set('price', `${Math.floor(toInr(Number(priceMin) || 0))}-${priceMax ? Math.ceil(toInr(Number(priceMax))) : 9999999}`);
    params.set('limit', '24');

    const res = await fetch(`/api/products?${params}`);
    const data = await res.json();
    setProducts(data.products || []);
    setTotal(data.pagination?.total || 0);
    setLoading(false);
  }, [q, sort, category, ageGroup, priceMin, priceMax, toInr]);

  useEffect(() => { fetchResults(); }, [fetchResults]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  const clearFilter = (key: string) => {
    if (key === 'category') setCategory('');
    if (key === 'ageGroup') setAgeGroup('');
    if (key === 'price') { setPriceMin(''); setPriceMax(''); }
  };

  const activeFilters = [
    category && { key: 'category', label: categories.find(c => c.slug === category)?.name || category },
    ageGroup && { key: 'ageGroup', label: shopType.ages?.find((a) => a.value === ageGroup)?.label || ageGroup },
    (priceMin || priceMax) && { key: 'price', label: `${fmt(Number(priceMin) || 0)} – ${priceMax ? fmt(Number(priceMax)) : '∞'}` },
  ].filter(Boolean) as { key: string; label: string }[];

  return (
    <div className="min-h-screen bg-[#F7F7F5]">
      {/* Search header */}
      <div className="bg-white border-b border-[#EEEEEE] py-5">
        <div className="content-container max-w-5xl">
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#767676]" />
              <input
                type="search"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search products..."
                className="w-full pl-12 pr-4 py-3 rounded-2xl border border-[#EEEEEE] focus:border-[#7FAF8E] focus:ring-2 focus:ring-[#DDEBE7] outline-none text-sm"
                autoFocus
              />
            </div>
            <button type="submit"
              className="px-6 py-3 bg-[#7FAF8E] text-white rounded-2xl font-medium hover:bg-[#6A9B7D] transition-colors text-sm">
              Search
            </button>
          </form>
          {q && (
            <p className="text-sm text-[#777777] mt-2">
              {loading ? 'Searching...' : `${total} result${total !== 1 ? 's' : ''} for "${q}"`}
            </p>
          )}
        </div>
      </div>

      <div className="content-container max-w-5xl py-6">
        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <button onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-[#EEEEEE] rounded-xl text-sm font-medium text-[#555555] hover:bg-[#F7F7F5]">
            <SlidersHorizontal className="w-4 h-4" />
            Filters {activeFilters.length > 0 && `(${activeFilters.length})`}
          </button>

          <select value={sort} onChange={e => setSort(e.target.value)}
            className="px-4 py-2 bg-white border border-[#EEEEEE] rounded-xl text-sm text-[#555555] outline-none cursor-pointer">
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          {activeFilters.map(f => (
            <span key={f.key} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#DDEBE7] text-[#7FAF8E] rounded-full text-xs font-medium">
              {f.label}
              <button onClick={() => clearFilter(f.key)}><X className="w-3 h-3" /></button>
            </span>
          ))}
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="bg-white rounded-2xl border border-[#EEEEEE] p-5 mb-5 grid sm:grid-cols-3 gap-5">
            <div>
              <label className="block text-xs font-semibold text-[#555555] uppercase tracking-wide mb-2">Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-[#EEEEEE] rounded-xl text-sm outline-none">
                <option value="">All Categories</option>
                {categories.map(c => <option key={c.id} value={c.slug}>{c.name}</option>)}
              </select>
            </div>
            {shopType.ages && <div>
              <label className="block text-xs font-semibold text-[#555555] uppercase tracking-wide mb-2">Age Group</label>
              <select value={ageGroup} onChange={e => setAgeGroup(e.target.value)}
                className="w-full px-3 py-2 border border-[#EEEEEE] rounded-xl text-sm outline-none">
                <option value="">All Ages</option>
                {shopType.ages.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </div>}
            <div>
              <label className="block text-xs font-semibold text-[#555555] uppercase tracking-wide mb-2">Price range ({currency})</label>
              <div className="flex items-center gap-2">
                <input type="number" value={priceMin} onChange={e => setPriceMin(e.target.value)}
                  placeholder="Min" className="w-full px-3 py-2 border border-[#EEEEEE] rounded-xl text-sm outline-none" />
                <span className="text-[#767676]">–</span>
                <input type="number" value={priceMax} onChange={e => setPriceMax(e.target.value)}
                  placeholder="Max" className="w-full px-3 py-2 border border-[#EEEEEE] rounded-xl text-sm outline-none" />
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {!q ? (
          <div className="text-center py-20 text-[#767676]">
            <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Type something to search</p>
          </div>
        ) : loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden animate-pulse">
                <div className="aspect-square bg-[#F0F0F0]" />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-[#F0F0F0] rounded w-3/4" />
                  <div className="h-4 bg-[#F0F0F0] rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <Search className="w-12 h-12 mx-auto mb-3 text-[#DDDDDD]" />
            <p className="font-semibold text-[#333333] mb-1">No results for &quot;{q}&quot;</p>
            <p className="text-sm text-[#767676]">Try different keywords or browse categories</p>
            <div className="flex flex-wrap justify-center gap-2 mt-5">
              {categories.slice(0, 5).map(c => (
                <Link key={c.id} href={`/category/${c.slug}`}
                  className="px-4 py-2 bg-white border border-[#EEEEEE] rounded-full text-sm text-[#555555] hover:border-[#7FAF8E] hover:text-[#7FAF8E]">
                  {c.name}
                </Link>
              ))}
            </div>
            <PopularProducts title="You might like" />
          </div>
        ) : (
          <div className={productGridClass(settings.layout.gridColumns)}>
            {products.map(product => (
              <ProductCard
                key={product.id}
                product={{
                  id: product.id,
                  name: product.name,
                  slug: product.slug,
                  price: Number(product.price),
                  compareAtPrice: product.compareAtPrice ? Number(product.compareAtPrice) : null,
                  image: product.images?.[0]?.url,
                  categoryName: product.category?.name,
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
