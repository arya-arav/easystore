'use client';

// A grid of product cards with wishlist and quick add (collection pages and the like).

import { ProductCard } from '@/components/product-card';
import { useQuickAdd, useShopActions } from '@/lib/shop-actions';
import { useSettings } from '@/lib/settings-context';
import { productGridClass } from '@/lib/layout-settings';
import type { ListedProduct } from '@/lib/product-query';

export function ProductGrid({ products }: { products: ListedProduct[] }) {
  const { settings } = useSettings();
  const { toggleWishlist, isInWishlist } = useShopActions();
  const { quickAdd, addingId, addedId } = useQuickAdd();

  return (
    <div className={productGridClass(settings.layout.gridColumns)}>
      {products.map((p) => {
        const image = p.images[0]?.url;
        return (
          <ProductCard
            key={p.id}
            product={{ id: p.id, name: p.name, slug: p.slug, price: p.price, compareAtPrice: p.compareAtPrice, image, categoryName: p.category?.name, rating: p.rating, reviewCount: p.reviewCount, isNewArrival: p.isNewArrival, isBestseller: p.isBestseller }}
            inWishlist={isInWishlist(p.id)}
            onToggleWishlist={(e) => { e.preventDefault(); toggleWishlist({ productId: p.id, name: p.name, slug: p.slug, price: p.price, compareAtPrice: p.compareAtPrice, image: image || '' }); }}
            onAddToCart={(e) => quickAdd(e, { ...p, image })}
            adding={addingId === p.id}
            added={addedId === p.id}
          />
        );
      })}
    </div>
  );
}
