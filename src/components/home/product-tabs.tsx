'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { ProductCard } from '@/components/product-card';
import { useQuickAdd, useShopActions } from '@/lib/shop-actions';
import { useSettings } from '@/lib/settings-context';
import { productGridClass } from '@/lib/layout-settings';

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number | string;
  compareAtPrice: number | string | null;
  images: { url: string; alt: string | null }[];
  primaryImage?: string | null;
  category: { name: string; slug: string };
  isNewArrival: boolean;
  isBestseller: boolean;
  rating?: number;
  reviewCount?: number;
  colors?: string | null;
  sizes?: string | null;
}

const tabs = [
  { key: 'featured', label: '⭐ Featured' },
  { key: 'new', label: '🆕 New Arrivals' },
  { key: 'bestseller', label: '🔥 Bestsellers' },
];

export function ProductTabsSection({ initialProducts }: { initialProducts?: Record<string, Product[]> } = {}) {
  const { toggleWishlist, isInWishlist } = useShopActions();
  const { quickAdd, addingId, addedId } = useQuickAdd();
  const { settings } = useSettings();
  const gridClass = productGridClass(settings.layout.gridColumns);
  const [products, setProducts] = useState<Record<string, Product[]>>(initialProducts ?? { featured: [], new: [], bestseller: [] });
  const [activeTab, setActiveTab] = useState(() => tabs.find((t) => (initialProducts?.[t.key] || []).length)?.key || 'featured');
  const [loading, setLoading] = useState(!initialProducts);

  useEffect(() => {
    if (initialProducts) return;
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [featuredRes, newRes, bestRes, latestRes] = await Promise.all([
          fetch('/api/products?limit=8&featured=true'),
          fetch('/api/products?limit=8&newArrival=true'),
          fetch('/api/products?limit=8&bestseller=true'),
          fetch('/api/products?limit=8'),
        ]);
        const [featured, newArrivals, bestsellers, latest] = await Promise.all([
          featuredRes.json(), newRes.json(), bestRes.json(), latestRes.json(),
        ]);
        // With nothing marked Featured, the first tab shows the newest products instead of an empty state.
        const lists = {
          featured: featured.products?.length ? featured.products : latest.products || [],
          new: newArrivals.products || [],
          bestseller: bestsellers.products || [],
        };
        setProducts(lists);
        setActiveTab((current) => (lists[current as keyof typeof lists]?.length ? current : tabs.find((t) => lists[t.key as keyof typeof lists].length)?.key || 'featured'));
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const current = products[activeTab] || [];

  return (
    <section className="py-14 bg-white">
      <div className="content-container">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <p className="text-[#7FAF8E] text-sm font-semibold uppercase tracking-wider mb-1">Products</p>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Our Collection</h2>
          </div>
          {/* Tabs */}
          <div className="flex bg-[#F7F7F5] rounded-xl p-1 gap-1">
            {tabs.filter((tab) => loading || (products[tab.key] || []).length > 0).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.key
                    ? 'bg-white text-[#7FAF8E] shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className={gridClass}>
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-[#F7F7F5] rounded-2xl overflow-hidden animate-pulse">
                <div className={`${settings.layout.imageShape === 'portrait' ? 'aspect-[3/4]' : 'aspect-square'} bg-gray-200`} />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : current.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p>No products in this category yet.</p>
          </div>
        ) : (
          <div className={gridClass}>
            {current.map((product) => {
              const price = Number(product.price);
              const compareAtPrice = product.compareAtPrice ? Number(product.compareAtPrice) : null;
              const imageUrl = product.primaryImage || product.images?.[0]?.url || '';
              const inWishlist = isInWishlist(product.id);
              return (
                <ProductCard
                  key={product.id}
                  product={{
                    id: product.id,
                    name: product.name,
                    slug: product.slug,
                    price,
                    compareAtPrice,
                    image: imageUrl,
                    categoryName: product.category?.name,
                    rating: product.rating,
                    reviewCount: product.reviewCount,
                    isNewArrival: product.isNewArrival,
                    isBestseller: product.isBestseller,
                  }}
                  inWishlist={inWishlist}
                  onToggleWishlist={(e) => {
                    e.preventDefault();
                    toggleWishlist({ productId: product.id, name: product.name, slug: product.slug, price, compareAtPrice, image: imageUrl });
                  }}
                  onAddToCart={(e) => quickAdd(e, { ...product, image: imageUrl })}
                  adding={addingId === product.id}
                  added={addedId === product.id}
                />
              );
            })}
          </div>
        )}

        <div className="mt-10 text-center">
          <Link href="/products" className="inline-flex items-center gap-2 bg-[#7FAF8E] text-white px-8 py-3.5 rounded-full font-semibold hover:bg-[#6a9a79] transition-colors shadow-md shadow-[#7FAF8E]/20">
            View All Products <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
