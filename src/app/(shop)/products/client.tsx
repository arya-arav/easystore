'use client';

import { useShopType } from '@/lib/settings-context';
import { ShopEmoji } from '@/components/ui/shop-emoji';
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { ChevronDown, ChevronUp, X, SlidersHorizontal, ShoppingCart, Heart, Grid3X3, List, Star, Loader2, Check } from 'lucide-react';
import { useQuickAdd, useShopActions } from '@/lib/shop-actions';
import { useSettings } from '@/lib/settings-context';
import { ProductCard } from '@/components/product-card';
import { productGridClass } from '@/lib/layout-settings';
import { NewsletterSection } from '@/components/home/newsletter';
import { useMoney } from '@/lib/currency-context';
import { priceRangeLabel } from '@/lib/price-ranges';

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  compareAtPrice: number | null;
  primaryImage?: string | null;
  images: { url: string; alt: string | null }[];
  category: { name: string; slug: string };
  ageGroup?: string | null;
  gender?: string | null;
  rating?: number;
  reviewCount?: number;
}

const priceRanges = [
  { value: '0-500', label: 'Under ₹500' },
  { value: '500-1000', label: '₹500 - ₹1,000' },
  { value: '1000-2000', label: '₹1,000 - ₹2,000' },
  { value: '2000-5000', label: '₹2,000 - ₹5,000' },
  { value: '5000-', label: 'Above ₹5,000' },
];

const sortOptions = [
  { value: 'newest', label: 'Newest Arrivals' },
  { value: 'bestselling', label: 'Best Selling' },
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' },
  { value: 'rating', label: 'Highest Rated' },
];

function FilterSection({ title, open, onToggle, children }: { title: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className="border-b border-[#E5E5E5] last:border-b-0">
      <button onClick={onToggle} className="w-full flex items-center justify-between py-3 text-left">
        <span className="text-sm font-medium text-[#333333]">{title}</span>
        {open ? <ChevronUp className="w-4 h-4 text-[#777777]" /> : <ChevronDown className="w-4 h-4 text-[#777777]" />}
      </button>
      {open && <div className="pb-3 space-y-2">{children}</div>}
    </div>
  );
}

function FilterCheckbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer group">
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
      <div
        className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all cursor-pointer ${checked ? 'bg-[#7FAF8E] border-[#7FAF8E]' : 'border-[#E5E5E5] group-hover:border-[#AFC8B8]'}`}
        onClick={onChange}
      >
        {checked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
      </div>
      <span className={`text-sm cursor-pointer ${checked ? 'text-[#7FAF8E] font-medium' : 'text-[#777777] group-hover:text-[#333333]'}`}>{label}</span>
    </label>
  );
}

export function ProductsClient() {
  const { settings } = useSettings();
  const router = useRouter();
  const pathname = usePathname();
  const { toggleWishlist: toggleWishlistItem, isInWishlist } = useShopActions();
  const { quickAdd, addingId: addingToCart, addedId: addedToCart } = useQuickAdd();
  const searchParams = useSearchParams();
  const shopType = useShopType();
  const ageGroups = shopType.ages || [];
  const genders = shopType.audience?.options || [];
  const genderTitle = shopType.audience?.label || 'For';

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const selectedAgeGroup = searchParams.get('ageGroup') || '';
  const selectedGender = searchParams.get('gender') || '';
  const selectedPrice = searchParams.get('price') || '';
  const selectedTag = searchParams.get('tag') || '';
  const sort = searchParams.get('sort') || 'newest';
  const page = parseInt(searchParams.get('page') || '1');

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    age: true,
    gender: false,
    price: true,
  });

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  useEffect(() => {
    fetchProducts();
  }, [selectedAgeGroup, selectedGender, selectedPrice, selectedTag, sort, page]);

  const fetchProducts = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (selectedAgeGroup) params.set('ageGroup', selectedAgeGroup);
    if (selectedGender) params.set('gender', selectedGender);
    if (selectedPrice) params.set('price', selectedPrice);
    if (selectedTag) params.set('tag', selectedTag);
    params.set('sort', sort);
    params.set('page', page.toString());

    const res = await fetch(`/api/products?${params}`);
    const data = await res.json();
    setProducts(data.products || []);
    setTotal(data.pagination?.total || 0);
    setLoading(false);
  };

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.set('page', '1');
      router.push(`${pathname}?${params}`);
    },
    [router, pathname, searchParams]
  );

  // Page buttons keep the filters and only change the page (updateFilter resets it to 1).
  const goToPage = (n: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (n <= 1) params.delete('page'); else params.set('page', String(n));
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const totalPages = Math.max(1, Math.ceil(total / 20));
  // 1 … 4 5 6 … 12: first, last and the pages around the current one
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1).filter((n) => n === 1 || n === totalPages || Math.abs(n - page) <= 1);

  const clearFilters = () => {
    router.push(pathname);
  };

  const handleQuickAdd = (e: React.MouseEvent, productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (product) quickAdd(e, { ...product, image: product.primaryImage || product.images[0]?.url });
  };

  const toggleWishlist = (e: React.MouseEvent, productId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    toggleWishlistItem({ productId, name: product.name, slug: product.slug, price: product.price, compareAtPrice: product.compareAtPrice, image: product.primaryImage || product.images[0]?.url || '' });
  };

  const { format: formatPrice } = useMoney();

  const getDiscount = (price: number, compareAt: number) => {
    return Math.round(((compareAt - price) / compareAt) * 100);
  };

  const activeFiltersCount = [selectedAgeGroup, selectedGender, selectedPrice].filter(Boolean).length;


  return (
    <div className="min-h-screen bg-[#F7F7F5]">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-[#E5E5E5]">
        <div className="content-container py-4">
          <nav className="flex items-center gap-2 text-sm flex-wrap">
            <Link href="/" className="text-[#777777] hover:text-[#7FAF8E] transition-colors">Home</Link>
            <span className="text-[#E5E5E5]">/</span>
            <span className="text-[#333333] font-medium">All Products</span>
          </nav>
        </div>
      </div>

      {/* Header */}
      <div className="bg-white border-b border-[#E5E5E5]">
        <div className="content-container py-8">
          <h1 className="text-2xl md:text-3xl font-bold text-[#333333]">All Products</h1>
          <p className="text-sm text-[#777777] mt-2">{total} products found</p>
        </div>
      </div>

      <div className="content-container py-6">
        <div className="flex gap-6">
          {/* Sidebar Filters - Desktop */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="bg-white rounded-2xl shadow-sm border border-[#E5E5E5] p-4 sticky top-24">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-[#333333]">Filters</h3>
                {activeFiltersCount > 0 && (
                  <button onClick={clearFilters} className="text-sm text-[#7FAF8E] hover:text-[#5D8A6E] transition-colors">Clear all</button>
                )}
              </div>

              {ageGroups.length > 0 && <FilterSection title="Age" open={!!openSections['age']} onToggle={() => toggleSection('age')}>
                <div className="space-y-2">
                  {ageGroups.map((ag) => (
                    <FilterCheckbox key={ag.value} label={ag.label} checked={selectedAgeGroup === ag.value} onChange={() => updateFilter('ageGroup', selectedAgeGroup === ag.value ? '' : ag.value)} />
                  ))}
                </div>
              </FilterSection>}

              {genders.length > 0 && <FilterSection title={genderTitle} open={!!openSections['gender']} onToggle={() => toggleSection('gender')}>
                <div className="space-y-2">
                  {genders.map((g) => (
                    <FilterCheckbox key={g.value} label={g.label} checked={selectedGender === g.value} onChange={() => updateFilter('gender', selectedGender === g.value ? '' : g.value)} />
                  ))}
                </div>
              </FilterSection>}

              <FilterSection title="Price Range" open={!!openSections['price']} onToggle={() => toggleSection('price')}>
                <div className="space-y-2">
                  {priceRanges.map((pr) => (
                    <FilterCheckbox key={pr.value} label={priceRangeLabel(pr.value, formatPrice)} checked={selectedPrice === pr.value} onChange={() => updateFilter('price', selectedPrice === pr.value ? '' : pr.value)} />
                  ))}
                </div>
              </FilterSection>

              {activeFiltersCount > 0 && (
                <div className="mt-4 pt-4 border-t border-[#E5E5E5]">
                  <p className="text-xs text-[#777777] mb-2">Active filters:</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedAgeGroup && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#F1F1EF] rounded-full text-xs text-[#333333]">
                        {ageGroups.find((a) => a.value === selectedAgeGroup)?.label}
                        <button onClick={() => updateFilter('ageGroup', '')} className="hover:text-red-500"><X className="w-3 h-3" /></button>
                      </span>
                    )}
                    {selectedGender && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#F1F1EF] rounded-full text-xs text-[#333333]">
                        {genders.find((g) => g.value === selectedGender)?.label}
                        <button onClick={() => updateFilter('gender', '')} className="hover:text-red-500"><X className="w-3 h-3" /></button>
                      </span>
                    )}
                    {selectedPrice && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#F1F1EF] rounded-full text-xs text-[#333333]">
                        {selectedPrice && priceRangeLabel(selectedPrice, formatPrice)}
                        <button onClick={() => updateFilter('price', '')} className="hover:text-red-500"><X className="w-3 h-3" /></button>
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </aside>

          {/* Mobile Filter Button */}
          <button onClick={() => setShowFilters(true)} className="lg:hidden fixed bottom-6 left-4 z-40 flex items-center gap-2 px-4 py-3 bg-[#7FAF8E] text-white rounded-full shadow-lg">
            <SlidersHorizontal className="w-4 h-4" />
            Filters
            {activeFiltersCount > 0 && (
              <span className="w-5 h-5 bg-white text-[#7FAF8E] text-xs font-bold rounded-full flex items-center justify-center">{activeFiltersCount}</span>
            )}
          </button>

          {/* Mobile Filters Drawer */}
          {showFilters && (
            <div className="lg:hidden fixed inset-0 z-50 bg-black/30" onClick={() => setShowFilters(false)}>
              <div className="absolute left-0 top-0 bottom-0 w-80 max-w-full bg-[#F7F7F5] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="sticky top-0 bg-white border-b border-[#E5E5E5] p-4 flex items-center justify-between">
                  <h3 className="font-semibold text-[#333333]">Filters</h3>
                  <button onClick={() => setShowFilters(false)} className="p-1 hover:bg-[#F1F1EF] rounded-full"><X className="w-5 h-5 text-[#777777]" /></button>
                </div>
                <div className="p-4 bg-white">
                  {ageGroups.length > 0 && <div className="mb-4">
                    <h4 className="text-sm font-medium text-[#333333] mb-2">Age</h4>
                    <div className="space-y-2">
                      {ageGroups.map((ag) => (
                        <FilterCheckbox key={ag.value} label={ag.label} checked={selectedAgeGroup === ag.value} onChange={() => updateFilter('ageGroup', selectedAgeGroup === ag.value ? '' : ag.value)} />
                      ))}
                    </div>
                  </div>}
                  {genders.length > 0 && <div className="mb-4">
                    <h4 className="text-sm font-medium text-[#333333] mb-2">{genderTitle}</h4>
                    <div className="space-y-2">
                      {genders.map((g) => (
                        <FilterCheckbox key={g.value} label={g.label} checked={selectedGender === g.value} onChange={() => updateFilter('gender', selectedGender === g.value ? '' : g.value)} />
                      ))}
                    </div>
                  </div>}
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-[#333333] mb-2">Price Range</h4>
                    <div className="space-y-2">
                      {priceRanges.map((pr) => (
                        <FilterCheckbox key={pr.value} label={priceRangeLabel(pr.value, formatPrice)} checked={selectedPrice === pr.value} onChange={() => updateFilter('price', selectedPrice === pr.value ? '' : pr.value)} />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="sticky bottom-0 bg-white border-t border-[#E5E5E5] p-4 flex gap-3">
                  <button onClick={() => { clearFilters(); setShowFilters(false); }} className="flex-1 py-3 bg-[#F1F1EF] text-[#333333] rounded-full font-medium">Clear All</button>
                  <button onClick={() => setShowFilters(false)} className="flex-1 py-3 bg-[#7FAF8E] text-white rounded-full font-medium">Show Results</button>
                </div>
              </div>
            </div>
          )}

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            {/* Toolbar */}
            <div className="bg-white rounded-xl shadow-sm border border-[#E5E5E5] p-3 mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-[#7FAF8E] text-white' : 'text-[#777777] hover:bg-[#F1F1EF]'}`}>
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-[#7FAF8E] text-white' : 'text-[#777777] hover:bg-[#F1F1EF]'}`}>
                  <List className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm text-[#777777]">Sort by:</label>
                <select value={sort} onChange={(e) => updateFilter('sort', e.target.value)} className="px-3 py-2 bg-[#F7F7F5] border border-[#E5E5E5] rounded-lg text-sm text-[#333333] focus:outline-none focus:border-[#7FAF8E]">
                  {sortOptions.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                </select>
              </div>
            </div>

            {/* Products */}
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl overflow-hidden animate-pulse">
                    <div className="aspect-square bg-[#F1F1EF]" />
                    <div className="p-4 space-y-3">
                      <div className="h-3 bg-[#E5E5E5] rounded w-3/4" />
                      <div className="h-4 bg-[#E5E5E5] rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-[#E5E5E5]">
                <div className="text-6xl mb-4">📦</div>
                <h3 className="text-lg font-medium text-[#333333] mb-2">No products found</h3>
                <p className="text-[#777777] mb-6">Try adjusting your filters</p>
                <button onClick={clearFilters} className="px-6 py-3 bg-[#7FAF8E] text-white rounded-full font-medium hover:bg-[#6A9B7D] transition-colors">Clear Filters</button>
              </div>
            ) : viewMode === 'grid' ? (
              <div className={productGridClass(settings.layout.gridColumns, true)}>
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={{
                      id: product.id,
                      name: product.name,
                      slug: product.slug,
                      price: Number(product.price),
                      compareAtPrice: product.compareAtPrice ? Number(product.compareAtPrice) : null,
                      image: product.primaryImage || product.images[0]?.url,
                      categoryName: product.category?.name,
                      rating: product.rating,
                      reviewCount: product.reviewCount,
                    }}
                    inWishlist={isInWishlist(product.id)}
                    onToggleWishlist={(e) => toggleWishlist(e, product.id)}
                    onAddToCart={(e) => handleQuickAdd(e, product.id)}
                    adding={addingToCart === product.id}
                    added={addedToCart === product.id}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {products.map((product) => (
                  <Link key={product.id} href={`/products/${product.slug}`} className="group flex bg-white rounded-2xl overflow-hidden shadow-sm border border-[#E5E5E5] hover:shadow-lg transition-all duration-300">
                    <div className="relative w-40 md:w-48 flex-shrink-0 bg-[#F8F6F2] overflow-hidden">
                      {product.primaryImage || product.images[0]?.url ? (
                        <img src={product.primaryImage || product.images[0]?.url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl">{<ShopEmoji />}</div>
                      )}
                      {product.compareAtPrice && product.compareAtPrice > product.price && (
                        <span className="absolute top-3 left-3 bg-red-400 text-white text-xs font-bold px-2.5 py-1 rounded-full">{getDiscount(product.price, product.compareAtPrice)}% OFF</span>
                      )}
                    </div>
                    <div className="flex-1 p-4 flex flex-col justify-center">
                      <span className="text-xs text-[#AFC8B8] uppercase tracking-wide">{product.category?.name}</span>
                      <h3 className="mt-1 text-base font-medium text-[#333333] group-hover:text-[#7FAF8E] transition-colors">{product.name}</h3>
                      {product.rating && (
                        <div className="flex items-center gap-1 mt-2">
                          {[...Array(5)].map((_, i) => (<Star key={i} className={`w-3.5 h-3.5 ${i < Math.floor(product.rating!) ? 'text-[#F6C453] fill-[#F6C453]' : 'text-[#E5E5E5]'}`} />))}
                          <span className="text-xs text-[#777777] ml-1">({product.reviewCount || 0})</span>
                        </div>
                      )}
                      <div className="mt-3 flex items-baseline gap-2">
                        <span className="text-lg font-semibold text-[#333333]">{formatPrice(product.price)}</span>
                        {product.compareAtPrice && product.compareAtPrice > product.price && (<span className="text-sm text-[#777777] line-through">{formatPrice(product.compareAtPrice)}</span>)}
                      </div>
                      <div className="mt-3 flex items-center gap-3">
                        <button onClick={(e) => handleQuickAdd(e, product.id)} disabled={addingToCart === product.id} className="px-5 py-2 bg-[#7FAF8E] text-white rounded-full text-sm font-medium hover:bg-[#6A9B7D] transition-colors disabled:opacity-70 flex items-center gap-2">
                          {addingToCart === product.id ? <Loader2 className="w-4 h-4 animate-spin" /> : addedToCart === product.id ? <><Check className="w-4 h-4" /> Added!</> : <><ShoppingCart className="w-4 h-4" /> Add to Cart</>}
                        </button>
                        <button onClick={(e) => toggleWishlist(e, product.id)} className={`p-2 rounded-full transition-all ${isInWishlist(product.id) ? 'bg-red-400 text-white' : 'bg-[#F1F1EF] text-[#777777] hover:text-red-500'}`}>
                          <Heart className={`w-4 h-4 ${isInWishlist(product.id) ? 'fill-current' : ''}`} />
                        </button>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* Pagination */}
            {total > 20 && (
              <div className="mt-8 flex justify-center items-center gap-2">
                <button onClick={() => goToPage(page - 1)} disabled={page <= 1} className="px-4 py-2 bg-white border border-[#E5E5E5] rounded-full text-sm text-[#333333] disabled:opacity-50 disabled:cursor-not-allowed hover:border-[#7FAF8E] transition-colors">Previous</button>
                <div className="flex items-center gap-1">
                  {pageNumbers.map((pageNum, i) => (
                    <span key={pageNum} className="flex items-center gap-1">
                      {i > 0 && pageNum - pageNumbers[i - 1] > 1 && <span className="px-1 text-[#777777]">…</span>}
                      <button onClick={() => goToPage(pageNum)} aria-current={page === pageNum ? 'page' : undefined} className={`w-10 h-10 rounded-full text-sm font-medium transition-colors ${page === pageNum ? 'bg-[#7FAF8E] text-white' : 'bg-white border border-[#E5E5E5] text-[#333333] hover:border-[#7FAF8E]'}`}>{pageNum}</button>
                    </span>
                  ))}
                </div>
                <button onClick={() => goToPage(page + 1)} disabled={page >= totalPages} className="px-4 py-2 bg-white border border-[#E5E5E5] rounded-full text-sm text-[#333333] disabled:opacity-50 disabled:cursor-not-allowed hover:border-[#7FAF8E] transition-colors">Next</button>
              </div>
            )}
          </main>
        </div>
      </div>
      <NewsletterSection />
    </div>
  );
}
