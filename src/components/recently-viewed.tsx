'use client';

import { useEffect, useState } from 'react';
import { ShopEmoji } from '@/components/ui/shop-emoji';
import Link from 'next/link';
import { Star } from 'lucide-react';
import { useMoney } from '@/lib/currency-context';


interface RecentItem {
  id: string;
  slug: string;
  name: string;
  price: number;
  image: string;
  category: string;
}

const STORAGE_KEY = 'bb_recently_viewed';
const MAX_ITEMS = 10;

export function trackRecentlyViewed(product: RecentItem) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const items: RecentItem[] = raw ? JSON.parse(raw) : [];
    const filtered = items.filter(i => i.id !== product.id);
    const updated = [product, ...filtered].slice(0, MAX_ITEMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {}
}

export function RecentlyViewedSection({ excludeId }: { excludeId?: string }) {
  const { format: fmt } = useMoney();
  const [items, setItems] = useState<RecentItem[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const all: RecentItem[] = raw ? JSON.parse(raw) : [];
      setItems(all.filter(i => i.id !== excludeId).slice(0, 6));
    } catch {}
  }, [excludeId]);

  if (items.length === 0) return null;

  return (
    <section className="mt-12">
      <h2 className="text-xl font-bold text-[#333333] mb-5">Recently Viewed</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {items.map(item => (
          <Link key={item.id} href={`/products/${item.slug}`}
            className="bg-white rounded-2xl overflow-hidden border border-[#EEEEEE] hover:shadow-md transition-shadow group">
            <div className="aspect-square bg-[#F8F6F2] overflow-hidden">
              {item.image
                ? <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                : <div className="w-full h-full flex items-center justify-center text-3xl">{<ShopEmoji />}</div>}
            </div>
            <div className="p-2.5">
              <p className="text-[10px] text-[#7FAF8E] font-semibold uppercase tracking-wide mb-0.5">{item.category}</p>
              <p className="text-xs font-medium text-[#333333] line-clamp-2 leading-snug mb-1">{item.name}</p>
              <p className="text-sm font-bold text-[#333333]">{fmt(item.price)}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
