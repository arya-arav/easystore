'use client';

import Link from 'next/link';
import { ShopEmoji } from '@/components/ui/shop-emoji';
import { Heart, Trash2, ShoppingCart } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/lib/cart-context';
import { useShopActions } from '@/lib/shop-actions';
import { useMoney } from '@/lib/currency-context';
import { AccountHeader, accountButton } from '@/components/account/ui';
import { thumbSrc } from '@/lib/image-hosts';


export default function WishlistPage() {
  const { format: fmt } = useMoney();
  const router = useRouter();
  const { wishlist } = useCart();
  const { addToCart, toggleWishlist } = useShopActions();

  // Products with sizes/colours are refused without a choice; send the shopper to pick one.
  const handleAddToCart = async (item: (typeof wishlist)[number]) => {
    const ok = await addToCart({ productId: item.productId, name: item.name, slug: item.slug, price: item.price, compareAtPrice: item.compareAtPrice, image: item.image });
    if (!ok) router.push(`/products/${item.slug}`);
  };

  return (
    <div>
      <AccountHeader title="Wishlist" description={wishlist.length ? `${wishlist.length} saved item${wishlist.length === 1 ? '' : 's'}. Add them to your cart when you're ready.` : 'Tap the heart on any product to save it here.'} />

      {wishlist.length === 0 ? (
        <div className="rounded-2xl bg-white px-6 py-12 text-center shadow-sm">
          <Heart className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="font-medium text-text-primary">Your wishlist is empty</p>
          <p className="mt-1 text-sm text-text-secondary">Save items you love for later.</p>
          <Link href="/products" className={accountButton('primary', 'mt-4')}>Browse products</Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {wishlist.map(item => (
            <div key={item.id} className="overflow-hidden rounded-2xl bg-white shadow-sm transition-shadow hover:shadow-md">
              <Link href={`/products/${item.slug}`}>
                <div className="aspect-square bg-[#F8F6F2]">
                  {item.image
                    ? <img src={thumbSrc(item.image, 384)} loading="lazy" alt={item.name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-4xl">{<ShopEmoji />}</div>}
                </div>
              </Link>
              <div className="p-4">
                <Link href={`/products/${item.slug}`} className="text-sm font-medium text-[#333333] hover:text-[#7FAF8E] line-clamp-2">
                  {item.name}
                </Link>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="font-bold text-[#333333]">{fmt(item.price)}</span>
                  {item.compareAtPrice && <span className="text-xs text-[#767676] line-through">{fmt(item.compareAtPrice)}</span>}
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => handleAddToCart(item)}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-[#7FAF8E] text-white py-2 rounded-xl text-xs font-semibold hover:bg-[#6A9B7D] transition-colors">
                    <ShoppingCart className="w-3.5 h-3.5" /> Add to Cart
                  </button>
                  <button onClick={() => toggleWishlist(item)} aria-label="Remove from wishlist"
                    className="p-2 text-[#767676] hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
