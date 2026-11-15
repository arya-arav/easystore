'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// The shopper's cart and wishlist, kept in the browser so guests can shop.
// When signed in, src/components/cart-sync.tsx merges them with the account's
// server copy, and src/lib/shop-actions.ts keeps both in step.

export interface CartItem {
  /** Line key: one line per product + chosen options. See cartKey(). */
  id: string;
  productId: string;
  /** Chosen options, e.g. "Size: M / Colour: Red"; '' when the product has none. */
  variant: string;
  name: string;
  slug: string;
  price: number;
  compareAtPrice: number | null;
  image: string;
  quantity: number;
  gstRate: number;
}

export interface WishlistItem {
  id: string;
  productId: string;
  name: string;
  slug: string;
  price: number;
  compareAtPrice: number | null;
  image: string;
}

export interface SavedForLaterItem extends Omit<CartItem, 'gstRate'> {}

export const cartKey = (productId: string, variant = '') => `${productId}::${variant}`;

interface CartStore {
  items: CartItem[];
  wishlist: WishlistItem[];
  savedForLater: SavedForLaterItem[];
  isOpen: boolean;
  addItem: (item: Omit<CartItem, 'quantity' | 'id' | 'variant'> & { variant?: string }, quantity?: number) => void;
  /** Removes a cart line by its key (CartItem.id). */
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  replaceItems: (items: CartItem[]) => void;
  clearCart: () => void;
  toggleCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  // Wishlist
  addToWishlist: (item: Omit<WishlistItem, 'id'>) => void;
  removeFromWishlist: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;
  replaceWishlist: (items: WishlistItem[]) => void;
  // Save for later
  moveToSavedForLater: (id: string) => void;
  moveToCart: (id: string) => void;
  removeFromSaved: (id: string) => void;
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      wishlist: [],
      savedForLater: [],
      isOpen: false,

      addItem: (item, quantity = 1) => {
        const variant = item.variant || '';
        const id = cartKey(item.productId, variant);
        const items = get().items;
        if (items.some((i) => i.id === id)) {
          set({ items: items.map((i) => (i.id === id ? { ...i, quantity: i.quantity + quantity } : i)) });
        } else {
          set({ items: [...items, { ...item, id, variant, quantity }] });
        }
      },

      removeItem: (id) => set({ items: get().items.filter((i) => i.id !== id) }),

      updateQuantity: (id, quantity) => {
        if (quantity < 1) {
          get().removeItem(id);
          return;
        }
        set({ items: get().items.map((i) => (i.id === id ? { ...i, quantity } : i)) });
      },

      replaceItems: (items) => set({ items }),
      clearCart: () => set({ items: [] }),

      toggleCart: () => set({ isOpen: !get().isOpen }),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),

      addToWishlist: (item) => {
        const wishlist = get().wishlist;
        if (!wishlist.some((w) => w.productId === item.productId)) {
          set({ wishlist: [...wishlist, { ...item, id: `wishlist-${item.productId}` }] });
        }
      },
      removeFromWishlist: (productId) => set({ wishlist: get().wishlist.filter((w) => w.productId !== productId) }),
      isInWishlist: (productId) => get().wishlist.some((w) => w.productId === productId),
      replaceWishlist: (wishlist) => set({ wishlist }),

      moveToSavedForLater: (id) => {
        const item = get().items.find((i) => i.id === id);
        if (!item) return;
        const { gstRate: _gstRate, ...saved } = item;
        set({
          items: get().items.filter((i) => i.id !== id),
          savedForLater: [...get().savedForLater.filter((s) => s.id !== id), saved],
        });
      },
      moveToCart: (id) => {
        const saved = get().savedForLater.find((s) => s.id === id);
        if (!saved) return;
        set({ savedForLater: get().savedForLater.filter((s) => s.id !== id) });
        get().addItem({ ...saved, gstRate: 18 }, saved.quantity);
      },
      removeFromSaved: (id) => set({ savedForLater: get().savedForLater.filter((s) => s.id !== id) }),
    }),
    {
      name: 'easystore-cart',
      storage: createJSONStorage(() => localStorage),
      version: 1,
      // v0 lines had no variant and were keyed by productId.
      migrate: (persisted: any) => {
        const upgrade = (line: any) => ({ ...line, variant: line.variant || '', id: cartKey(line.productId, line.variant || '') });
        return {
          ...persisted,
          items: (persisted?.items || []).map(upgrade),
          savedForLater: (persisted?.savedForLater || []).map(upgrade),
        };
      },
    }
  )
);

export function CartProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
