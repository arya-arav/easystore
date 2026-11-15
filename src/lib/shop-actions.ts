'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { create } from 'zustand';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import { cartKey, useCart, type CartItem, type WishlistItem } from '@/lib/cart-context';
import { hasOptions } from '@/lib/product-options';

export { hasOptions };

// One place for adding to cart and toggling the wishlist, used by every page.
// The browser copy updates instantly (so guests can shop); for signed-in
// shoppers the same change is sent to the server.

export interface CartProductInput {
  productId: string;
  name: string;
  slug: string;
  price: number;
  compareAtPrice?: number | null;
  image?: string | null;
  gstRate?: number;
  variant?: string;
}

/** Which signed-in user the browser cart was last merged for (see CartSync). */
export const useCartSyncState = create<{ syncedFor: string | null; setSyncedFor: (id: string | null) => void }>((set) => ({
  syncedFor: null,
  setSyncedFor: (syncedFor) => set({ syncedFor }),
}));

const send = (method: string, url: string, body: unknown) =>
  fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

export function useShopActions() {
  const { status } = useSession();
  const signedIn = status === 'authenticated';
  const { addItem, updateQuantity, removeItem, items, addToWishlist, removeFromWishlist, isInWishlist, openCart } = useCart();

  /** Adds to the cart. Resolves false only if a signed-in shopper's server cart refused it. */
  const addToCart = useCallback(
    async (product: CartProductInput, quantity = 1, options: { silent?: boolean } = {}) => {
      const variant = product.variant || '';
      if (signedIn) {
        const res = await send('POST', '/api/cart', { productId: product.productId, quantity, variant }).catch(() => null);
        if (!res?.ok) {
          const err = await res?.json().catch(() => ({}));
          toast.error(err?.error || 'Could not add to cart. Please try again.');
          return false;
        }
      }
      addItem(
        {
          productId: product.productId,
          variant,
          name: product.name,
          slug: product.slug,
          price: product.price,
          compareAtPrice: product.compareAtPrice ?? null,
          image: product.image || '',
          gstRate: product.gstRate ?? 18,
        },
        quantity
      );
      if (!options.silent) openCart();
      return true;
    },
    [signedIn, addItem, openCart]
  );

  const setLineQuantity = useCallback(
    async (line: Pick<CartItem, 'id' | 'productId' | 'variant'> & { quantity?: number }, quantity: number) => {
      const previous = line.quantity;
      updateQuantity(line.id, quantity);
      if (!signedIn) return;
      const res = await send('PUT', '/api/cart', { productId: line.productId, variant: line.variant, quantity }).catch(() => null);
      if (res && !res.ok) {
        const err = await res.json().catch(() => ({}));
        if (previous) updateQuantity(line.id, typeof err.available === 'number' && err.available > 0 ? Math.min(previous, err.available) : previous);
        toast.error(err.error || 'Could not update the quantity');
      }
    },
    [signedIn, updateQuantity]
  );

  const removeLine = useCallback(
    (line: Pick<CartItem, 'id' | 'productId' | 'variant'>) => {
      removeItem(line.id);
      if (signedIn) send('DELETE', '/api/cart', { productId: line.productId, variant: line.variant }).catch(() => {});
    },
    [signedIn, removeItem]
  );

  const toggleWishlist = useCallback(
    (product: Omit<WishlistItem, 'id'>) => {
      if (isInWishlist(product.productId)) {
        removeFromWishlist(product.productId);
        if (signedIn) send('DELETE', '/api/wishlist', { productId: product.productId }).catch(() => {});
        return false;
      }
      addToWishlist(product);
      if (signedIn) send('POST', '/api/wishlist', { productId: product.productId }).catch(() => {});
      toast.success('Added to wishlist!', { icon: '❤️' });
      return true;
    },
    [signedIn, isInWishlist, addToWishlist, removeFromWishlist]
  );

  const lineFor = useCallback((productId: string, variant = '') => items.find((i) => i.id === cartKey(productId, variant)), [items]);

  return { addToCart, setLineQuantity, removeLine, toggleWishlist, isInWishlist, lineFor, signedIn };
}

export interface QuickAddProduct {
  id: string;
  name: string;
  slug: string;
  price: number | string;
  compareAtPrice?: number | string | null;
  image?: string | null;
  colors?: string | null;
  sizes?: string | null;
}

/** "Add to cart" from product grids, with the button's loading/added state. */
export function useQuickAdd() {
  const router = useRouter();
  const { addToCart } = useShopActions();
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addedId, setAddedId] = useState<string | null>(null);

  const quickAdd = useCallback(
    async (e: React.MouseEvent, product: QuickAddProduct) => {
      e.preventDefault();
      e.stopPropagation();
      if (hasOptions(product)) {
        toast('Choose your options first', { icon: '👕' });
        router.push(`/products/${product.slug}`);
        return;
      }
      setAddingId(product.id);
      try {
        const ok = await addToCart({
          productId: product.id,
          name: product.name,
          slug: product.slug,
          price: Number(product.price),
          compareAtPrice: product.compareAtPrice != null ? Number(product.compareAtPrice) : null,
          image: product.image,
        });
        if (ok) {
          setAddedId(product.id);
          setTimeout(() => setAddedId((id) => (id === product.id ? null : id)), 2000);
        }
      } finally {
        setAddingId(null);
      }
    },
    [addToCart, router]
  );

  return { quickAdd, addingId, addedId };
}
