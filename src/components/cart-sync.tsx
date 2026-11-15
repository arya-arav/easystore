'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { cartKey, useCart, type CartItem } from '@/lib/cart-context';
import { useCartSyncState } from '@/lib/shop-actions';

/**
 * When a shopper signs in, merges the browser cart and wishlist into their
 * account, then shows the account's copy (which now includes both).
 */
export function CartSync() {
  const { data: session, status } = useSession();
  const userId = session?.user?.id || null;
  const { syncedFor, setSyncedFor } = useCartSyncState();

  useEffect(() => {
    if (status === 'unauthenticated') {
      setSyncedFor(null);
      return;
    }
    if (status !== 'authenticated' || !userId || syncedFor === userId) return;

    let cancelled = false;
    (async () => {
      const { items, wishlist, replaceItems, replaceWishlist } = useCart.getState();
      try {
        const [cartRes] = await Promise.all([
          fetch('/api/cart/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: items.map((i) => ({ productId: i.productId, variant: i.variant, quantity: i.quantity })) }),
          }),
          wishlist.length
            ? fetch('/api/wishlist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productIds: wishlist.map((w) => w.productId) }),
              })
            : null,
        ]);
        const [cartData, wishData] = await Promise.all([
          cartRes.ok ? cartRes.json() : null,
          fetch('/api/wishlist').then((r) => (r.ok ? r.json() : null)),
        ]);
        if (cancelled) return;

        if (cartData?.cartItems) {
          replaceItems(
            cartData.cartItems.map((line: any): CartItem => ({
              id: cartKey(line.product.id, line.variant),
              productId: line.product.id,
              variant: line.variant || '',
              name: line.product.name,
              slug: line.product.slug,
              price: line.product.price,
              compareAtPrice: line.product.compareAtPrice ?? null,
              image: line.product.images?.[0]?.url || '',
              quantity: line.quantity,
              gstRate: line.product.gstRate ?? 18,
            }))
          );
        }
        if (wishData?.items) replaceWishlist(wishData.items);
      } catch (error) {
        console.error('Cart sync failed:', error);
      } finally {
        if (!cancelled) setSyncedFor(userId);
      }
    })();

    return () => { cancelled = true; };
  }, [status, userId, syncedFor, setSyncedFor]);

  return null;
}
