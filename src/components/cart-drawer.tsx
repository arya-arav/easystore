'use client';

import { useEffect, useState } from 'react';
import { ShopEmoji } from '@/components/ui/shop-emoji';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Minus, Plus, ShoppingBag, Trash2, Truck, X } from 'lucide-react';
import { useCart } from '@/lib/cart-context';
import { useShopActions } from '@/lib/shop-actions';
import { useMoney } from '@/lib/currency-context';
import { useShippingOffer } from '@/lib/use-shipping-offer';

/** Slide-out cart, opened by adding to cart or the header cart icon. */
export function CartDrawer() {
  const { items, isOpen, closeCart } = useCart();
  const { setLineQuantity, removeLine } = useShopActions();
  const { format } = useMoney();
  const shippingOffer = useShippingOffer();
  const pathname = usePathname();
  const [quote, setQuote] = useState<{ bundleDiscount: number } | null>(null);

  // Close when navigating, and on Escape
  useEffect(() => { closeCart(); }, [pathname, closeCart]);
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeCart();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, closeCart]);

  // Bundle savings from the server (same calculation checkout uses)
  const quoteKey = JSON.stringify(items.map((l) => [l.productId, l.quantity]));
  useEffect(() => {
    if (!isOpen || items.length === 0) return;
    const controller = new AbortController();
    fetch('/api/checkout/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({ items: items.map((l) => ({ productId: l.productId, quantity: l.quantity })) }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((q) => { if (q) setQuote(q); })
      .catch(() => {});
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, quoteKey]);

  const subtotal = items.reduce((sum, l) => sum + l.price * l.quantity, 0);
  const savings = items.length ? quote?.bundleDiscount ?? 0 : 0;
  const count = items.reduce((sum, l) => sum + l.quantity, 0);
  const threshold = shippingOffer.threshold;
  const toFree = threshold ? Math.max(0, threshold - subtotal) : null;

  return (
    <div className={`fixed inset-0 z-[90] ${isOpen ? '' : 'pointer-events-none'}`} aria-hidden={!isOpen}>
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
        onClick={closeCart}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
        className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <header className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="text-lg font-bold text-gray-900">Your cart {count > 0 && <span className="text-sm font-normal text-gray-500">({count})</span>}</h2>
          <button onClick={closeCart} aria-label="Close cart" className="rounded-full p-2 text-gray-500 hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </header>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <ShoppingBag className="w-12 h-12 text-gray-300" />
            <p className="font-semibold text-gray-900">Your cart is empty</p>
            <Link href="/products" onClick={closeCart} className="rounded-full bg-primary-500 px-6 py-2.5 font-semibold text-white hover:bg-primary-600">
              Start shopping
            </Link>
          </div>
        ) : (
          <>
            {threshold != null && (
              <div className="border-b border-gray-100 px-5 py-3">
                <p className="flex items-center gap-2 text-sm text-gray-700">
                  <Truck className="w-4 h-4 text-primary-500" />
                  {toFree && toFree > 0 ? <>Add <span className="font-semibold">{format(toFree)}</span> more for free shipping</> : 'You’ve unlocked free shipping!'}
                </p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100">
                  <div className="h-full rounded-full bg-primary-500 transition-all" style={{ width: `${Math.min(100, (subtotal / threshold) * 100)}%` }} />
                </div>
              </div>
            )}

            <ul className="flex-1 divide-y divide-gray-100 overflow-y-auto px-5">
              {items.map((line) => (
                <li key={line.id} className="flex gap-3 py-4">
                  <Link href={`/products/${line.slug}`} onClick={closeCart} className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-gray-50">
                    {line.image ? <img src={line.image} alt="" className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center text-3xl">{<ShopEmoji />}</span>}
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <Link href={`/products/${line.slug}`} onClick={closeCart} className="line-clamp-2 text-sm font-medium text-gray-900 hover:text-primary-600">{line.name}</Link>
                    {line.variant && <p className="text-xs text-gray-500">{line.variant}</p>}
                    <div className="mt-auto flex items-center justify-between pt-2">
                      <div className="flex items-center rounded-full border border-gray-200">
                        <button onClick={() => setLineQuantity(line, line.quantity - 1)} disabled={line.quantity <= 1} aria-label="Decrease quantity" className="p-1.5 text-gray-500 disabled:opacity-30">
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-7 text-center text-sm font-medium">{line.quantity}</span>
                        <button onClick={() => setLineQuantity(line, line.quantity + 1)} aria-label="Increase quantity" className="p-1.5 text-gray-500">
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">{format(line.price * line.quantity)}</span>
                    </div>
                  </div>
                  <button onClick={() => removeLine(line)} aria-label={`Remove ${line.name}`} className="self-start p-1 text-gray-400 hover:text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>

            <footer className="space-y-3 border-t border-gray-100 px-5 py-4">
              {savings > 0 && (
                <div className="flex justify-between text-sm text-primary-600">
                  <span>Bundle savings</span>
                  <span>− {format(savings)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-gray-900">
                <span>Subtotal</span>
                <span>{format(subtotal - savings)}</span>
              </div>
              <p className="text-xs text-gray-500">Shipping and discounts are calculated at checkout.</p>
              <Link href="/checkout" onClick={closeCart} className="block w-full rounded-full bg-primary-500 py-3.5 text-center font-semibold text-white hover:bg-primary-600">
                Checkout
              </Link>
              <Link href="/cart" onClick={closeCart} className="block w-full rounded-full border border-gray-200 py-3 text-center text-sm font-semibold text-gray-700 hover:border-gray-400">
                View cart
              </Link>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
}
