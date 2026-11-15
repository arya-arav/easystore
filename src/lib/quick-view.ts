import { create } from 'zustand';

// Which product's quick-view pop-up is open (opened from product cards anywhere).
export const useQuickView = create<{ slug: string | null; open: (slug: string) => void; close: () => void }>((set) => ({
  slug: null,
  open: (slug) => set({ slug }),
  close: () => set({ slug: null }),
}));
