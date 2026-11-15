'use client';

import { useShopType } from '@/lib/settings-context';

/** The shop type's picture placeholder (🧸 for baby shops, 👗 for fashion…). */
export function ShopEmoji() {
  return <>{useShopType().placeholder}</>;
}
