'use client';

// Quick view: pick options and add to cart from a product grid without leaving the page.

import { useEffect, useState } from 'react';
import { ShopEmoji } from '@/components/ui/shop-emoji';
import Link from 'next/link';
import { Check, Loader2, Minus, Plus, ShoppingCart, X } from 'lucide-react';
import { useQuickView } from '@/lib/quick-view';
import { useShopActions } from '@/lib/shop-actions';
import { useMoney } from '@/lib/currency-context';
import { SmartImage } from '@/components/ui/smart-image';

interface QuickProduct {
  id: string; name: string; slug: string; shortDescription: string | null; price: number; compareAtPrice: number | null; gstRate: number; stock: number;
  colors: string | null; sizes: string | null;
  images: { url: string; alt: string | null }[];
  variants: { color: string; size: string; stock: number }[];
  category: { name: string } | null;
}

const parse = <T,>(raw: string | null): T[] => {
  try { const v = raw ? JSON.parse(raw) : []; return Array.isArray(v) ? v : []; } catch { return []; }
};

export function QuickViewModal() {
  const { slug, close } = useQuickView();
  const { addToCart } = useShopActions();
  const { format } = useMoney();
  const [product, setProduct] = useState<QuickProduct | null>(null);
  const [image, setImage] = useState(0);
  const [color, setColor] = useState('');
  const [size, setSize] = useState('');
  const [qty, setQty] = useState(1);
  const [state, setState] = useState<'idle' | 'adding' | 'added'>('idle');

  useEffect(() => {
    if (!slug) return;
    setProduct(null);
    setImage(0);
    setQty(1);
    setState('idle');
    fetch(`/api/products/by-slug/${encodeURIComponent(slug)}`).then((r) => (r.ok ? r.json() : null)).then((p: QuickProduct | null) => {
      if (!p) { close(); return; }
      const colors = parse<{ name: string }>(p.colors);
      const sizes = parse<{ value: string }>(p.sizes);
      const first = p.variants.find((v) => v.stock > 0);
      setColor(first?.color || colors[0]?.name || '');
      setSize(first?.size || sizes[0]?.value || '');
      setProduct(p);
    }).catch(() => close());
  }, [slug, close]);

  useEffect(() => {
    if (!slug) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [slug, close]);

  if (!slug) return null;

  const colors = product ? parse<{ name: string; hex: string }>(product.colors) : [];
  const sizes = product ? parse<{ label: string; value: string }>(product.sizes) : [];
  const tracks = !!product && product.variants.length > 0;
  const stockFor = (c: string, s: string) => (tracks ? product!.variants.find((v) => v.color === c && v.size === s)?.stock ?? 0 : product?.stock ?? 0);
  const stock = product ? stockFor(color, size) : 0;
  const variant = [color && `Colour: ${color}`, size && `Size: ${sizes.find((s) => s.value === size)?.label || size}`].filter(Boolean).join(' / ');

  const add = async () => {
    if (!product) return;
    setState('adding');
    const ok = await addToCart({ productId: product.id, name: product.name, slug: product.slug, price: product.price, compareAtPrice: product.compareAtPrice, image: product.images[0]?.url || '', gstRate: product.gstRate, variant }, qty);
    setState(ok ? 'added' : 'idle');
    if (ok) setTimeout(close, 600);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 sm:items-center sm:p-4" onClick={close}>
      <div role="dialog" aria-modal="true" aria-label={product?.name || 'Quick view'} onClick={(e) => e.stopPropagation()}
        className="relative max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-3xl bg-white shadow-xl sm:rounded-3xl">
        <button onClick={close} aria-label="Close" className="absolute right-3 top-3 z-10 rounded-full bg-white/90 p-2 text-text-secondary shadow-sm hover:text-text-primary"><X className="h-5 w-5" /></button>
        {!product ? (
          <div className="flex h-72 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-primary-500" /></div>
        ) : (
          <div className="grid gap-6 p-5 sm:grid-cols-2 sm:p-6">
            <div>
              <div className="relative aspect-square overflow-hidden rounded-2xl bg-[#F8F6F2]">
                {product.images[image] ? <SmartImage src={product.images[image].url} alt={product.images[image].alt || product.name} sizes="(min-width: 640px) 360px, 100vw" /> : <div className="flex h-full items-center justify-center text-5xl">{<ShopEmoji />}</div>}
              </div>
              {product.images.length > 1 && (
                <div className="mt-2 flex gap-2 overflow-x-auto">
                  {product.images.map((img, i) => (
                    <button key={img.url} onClick={() => setImage(i)} aria-label={`Photo ${i + 1}`} className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 ${i === image ? 'border-primary-500' : 'border-transparent'}`}>
                      <SmartImage src={img.url} alt="" sizes="56px" />
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-col">
              {product.category && <p className="text-xs font-medium uppercase tracking-wide text-primary-400">{product.category.name}</p>}
              <h2 className="mt-1 text-xl font-bold text-text-primary">{product.name}</h2>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-text-primary">{format(product.price)}</span>
                {product.compareAtPrice && product.compareAtPrice > product.price && <span className="text-sm text-text-muted line-through">{format(product.compareAtPrice)}</span>}
              </div>
              {product.shortDescription && <p className="mt-3 line-clamp-3 text-sm text-text-secondary">{product.shortDescription}</p>}

              {colors.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-text-primary">Colour: <span className="font-normal text-text-secondary">{color}</span></p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {colors.map((c) => {
                      const out = tracks && !product.variants.some((v) => v.color === c.name && v.stock > 0);
                      return (
                        <button key={c.name} onClick={() => { setColor(c.name); setQty(1); }} title={out ? `${c.name} (sold out)` : c.name} aria-label={c.name}
                          className={`relative h-9 w-9 rounded-full border-2 ${color === c.name ? 'border-primary-500 ring-2 ring-primary-200' : 'border-white ring-1 ring-cream-400'} ${out ? 'opacity-40' : ''}`} style={{ background: c.hex }} />
                      );
                    })}
                  </div>
                </div>
              )}
              {sizes.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-text-primary">Size</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {sizes.map((s) => {
                      const out = tracks && stockFor(color, s.value) <= 0;
                      return (
                        <button key={s.value} onClick={() => { setSize(s.value); setQty(1); }}
                          className={`rounded-xl border px-3 py-1.5 text-sm ${size === s.value ? 'border-primary-500 bg-primary-500 text-white' : 'border-cream-400 text-text-primary'} ${out ? 'line-through opacity-50' : ''}`}>
                          {s.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <p className={`mt-4 text-sm ${stock > 0 ? 'text-primary-600' : 'text-red-500'}`}>{stock > 0 ? (stock <= 5 ? `Only ${stock} left` : 'In stock') : 'Sold out'}</p>
              <div className="mt-auto flex items-center gap-3 pt-5">
                <div className="flex items-center rounded-full border border-cream-400">
                  <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Fewer" className="p-2.5"><Minus className="h-4 w-4" /></button>
                  <span className="w-6 text-center text-sm">{qty}</span>
                  <button onClick={() => setQty((q) => Math.min(stock || 1, q + 1))} aria-label="More" className="p-2.5"><Plus className="h-4 w-4" /></button>
                </div>
                <button onClick={add} disabled={stock <= 0 || state !== 'idle'} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-primary-500 font-semibold text-white hover:bg-primary-600 disabled:opacity-50">
                  {state === 'adding' ? <Loader2 className="h-4 w-4 animate-spin" /> : state === 'added' ? <Check className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}
                  {state === 'added' ? 'Added' : 'Add to cart'}
                </button>
              </div>
              <Link href={`/products/${product.slug}`} onClick={close} className="mt-3 text-center text-sm font-medium text-primary-500 hover:underline">View full details</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
