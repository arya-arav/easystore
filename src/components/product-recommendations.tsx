'use client';

import { useEffect, useState } from 'react';
import { ShopEmoji } from '@/components/ui/shop-emoji';
import Link from 'next/link';
import { ShoppingCart, Check, Loader2 } from 'lucide-react';
import { useQuickAdd } from '@/lib/shop-actions';
import { useMoney } from '@/lib/currency-context';


function ProductCard({ product }: { product: any }) {
  const { format: fmt } = useMoney();
  const { quickAdd, addingId, addedId } = useQuickAdd();
  const adding = addingId === product.id;
  const added = addedId === product.id;

  const img = product.images?.[0]?.url;
  const price = Number(product.price);
  const compareAtPrice = product.compareAtPrice ? Number(product.compareAtPrice) : null;
  const discount = compareAtPrice ? Math.round((1 - price / compareAtPrice) * 100) : 0;

  const handleAdd = (e: React.MouseEvent) => quickAdd(e, { ...product, image: img });

  return (
    <Link href={`/products/${product.slug}`}
      className="bg-white rounded-2xl overflow-hidden border border-[#EEEEEE] hover:shadow-md transition-shadow group flex-shrink-0 w-44 sm:w-auto">
      <div className="aspect-square bg-[#F8F6F2] relative overflow-hidden">
        {img
          ? <img src={img} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          : <div className="w-full h-full flex items-center justify-center text-4xl">{<ShopEmoji />}</div>}
        {discount > 0 && (
          <span className="absolute top-2 left-2 bg-red-400 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{discount}% OFF</span>
        )}
      </div>
      <div className="p-3">
        <p className="text-[10px] text-[#7FAF8E] font-semibold uppercase tracking-wide mb-0.5">{product.category?.name}</p>
        <p className="text-xs font-medium text-[#333333] line-clamp-2 leading-snug mb-2">{product.name}</p>
        <div className="flex items-center justify-between gap-1">
          <div>
            <span className="text-sm font-bold text-[#333333]">{fmt(price)}</span>
            {compareAtPrice && <span className="text-xs text-[#767676] line-through ml-1">{fmt(compareAtPrice)}</span>}
          </div>
          <button onClick={handleAdd} disabled={adding || product.stock === 0}
            className="w-7 h-7 bg-[#7FAF8E] text-white rounded-full flex items-center justify-center hover:bg-[#6A9B7D] disabled:opacity-50 flex-shrink-0">
            {adding ? <Loader2 className="w-3 h-3 animate-spin" /> : added ? <Check className="w-3 h-3" /> : <ShoppingCart className="w-3 h-3" />}
          </button>
        </div>
      </div>
    </Link>
  );
}

function HorizontalScroll({ title, products }: { title: string; products: any[] }) {
  if (products.length === 0) return null;
  return (
    <div className="mt-10">
      <h2 className="text-xl font-bold text-[#333333] mb-4">{title}</h2>
      <div className="flex gap-4 overflow-x-auto pb-2 sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 sm:overflow-visible">
        {products.map(p => <ProductCard key={p.id} product={p} />)}
      </div>
    </div>
  );
}

export function ProductRecommendations({ productId, categoryId, ageGroup }: { productId: string; categoryId: string; ageGroup?: string | null }) {
  const [frequently, setFrequently] = useState<any[]>([]);
  const [similar, setSimilar] = useState<any[]>([]);

  useEffect(() => {
    const params = new URLSearchParams({ productId, categoryId, limit: '8' });
    if (ageGroup) params.set('ageGroup', ageGroup);
    fetch(`/api/products/recommendations?${params}`)
      .then(r => r.json())
      .then(d => {
        setFrequently(d.frequently || []);
        setSimilar(d.similar || []);
      })
      .catch(() => {});
  }, [productId, categoryId, ageGroup]);

  if (frequently.length === 0 && similar.length === 0) return null;

  return (
    <>
      <HorizontalScroll title="Customers Also Bought" products={frequently} />
      <HorizontalScroll title="You Might Also Like" products={similar} />
    </>
  );
}
