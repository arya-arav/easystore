'use client';

import Link from 'next/link';
import { ShopEmoji } from '@/components/ui/shop-emoji';
import { Check, Eye, Heart, Loader2, ShoppingCart, Star } from 'lucide-react';
import { useQuickView } from '@/lib/quick-view';
import { useSettings } from '@/lib/settings-context';
import type { CardStyleId, ImageShape } from '@/lib/layout-settings';
import { useMoney } from '@/lib/currency-context';
import { SmartImage } from '@/components/ui/smart-image';

export interface ProductCardData {
  id: string;
  name: string;
  slug: string;
  price: number;
  compareAtPrice?: number | null;
  image?: string | null;
  categoryName?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  isNewArrival?: boolean;
  isBestseller?: boolean;
}

interface ProductCardProps {
  product: ProductCardData;
  /** Defaults to the style chosen in Admin → Settings → Design. */
  cardStyle?: CardStyleId;
  imageShape?: ImageShape;
  inWishlist?: boolean;
  onToggleWishlist?: (e: React.MouseEvent) => void;
  onAddToCart?: (e: React.MouseEvent) => void;
  adding?: boolean;
  added?: boolean;
}


/** Shared product tile for the homepage, Products, Category and Search pages. */
export function ProductCard({
  product,
  cardStyle,
  imageShape,
  inWishlist = false,
  onToggleWishlist,
  onAddToCart,
  adding = false,
  added = false,
}: ProductCardProps) {
  const { settings } = useSettings();
  const { format: formatPrice } = useMoney();
  const openQuickView = useQuickView((s) => s.open);
  const style = cardStyle ?? settings.layout?.cardStyle ?? 'classic';
  const shape = imageShape ?? settings.layout?.imageShape ?? 'square';

  const { price, compareAtPrice } = product;
  const onSale = !!compareAtPrice && compareAtPrice > price;
  const discount = onSale ? Math.round(((compareAtPrice! - price) / compareAtPrice!) * 100) : 0;
  const aspect = shape === 'portrait' ? 'aspect-[3/4]' : 'aspect-square';
  const href = `/products/${product.slug}`;

  const cartIcon = adding ? (
    <Loader2 className="w-4 h-4 animate-spin" />
  ) : added ? (
    <Check className="w-4 h-4" />
  ) : (
    <ShoppingCart className="w-4 h-4" />
  );
  const cartLabel = adding ? 'Adding…' : added ? 'Added!' : 'Add to Cart';

  const container = {
    classic: 'bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-lg hover:-translate-y-0.5',
    soft: 'bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1',
    minimal: 'bg-transparent',
  }[style];

  const imageWrap = {
    classic: 'bg-[#F8F6F2]',
    soft: 'bg-[#DDEBE7] m-2 rounded-2xl',
    minimal: 'bg-[#F8F6F2] rounded-2xl',
  }[style];

  return (
    <div className={`group relative flex flex-col transition-all duration-300 ${container}`}>
      <Link href={href} className={`relative block overflow-hidden ${aspect} ${imageWrap}`}>
        {product.image ? (
          <SmartImage
            src={product.image}
            alt={product.name}
            sizes="(min-width: 1280px) 22vw, (min-width: 1024px) 28vw, (min-width: 640px) 33vw, 50vw"
            className="group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl">{<ShopEmoji />}</div>
        )}

        <div className="absolute top-2 left-2 flex flex-col items-start gap-1">
          {product.isNewArrival && <span className="bg-[#7FAF8E] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">NEW</span>}
          {product.isBestseller && <span className="bg-orange-400 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">HOT</span>}
          {onSale && <span className="bg-red-400 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{discount}% OFF</span>}
        </div>

        {/* Minimal: add to cart sits on the image (always visible on touch screens) */}
        {style === 'minimal' && onAddToCart && (
          <div className="absolute inset-x-2 bottom-2 md:opacity-0 md:translate-y-2 md:group-hover:opacity-100 md:group-hover:translate-y-0 transition-all">
            <button
              type="button"
              onClick={onAddToCart}
              disabled={adding}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-full bg-white/95 text-gray-800 text-xs font-semibold shadow hover:bg-white disabled:opacity-70"
            >
              {cartIcon} {cartLabel}
            </button>
          </div>
        )}
        {/* Quick view (desktop hover) */}
        <span className="pointer-events-none absolute inset-x-0 bottom-2 hidden justify-center md:flex">
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); openQuickView(product.slug); }}
            className={`pointer-events-auto flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-gray-800 shadow opacity-0 translate-y-2 transition-all group-hover:opacity-100 group-hover:translate-y-0 focus-visible:opacity-100 hover:bg-white ${style === 'minimal' && onAddToCart ? 'mb-10' : ''}`}
          >
            <Eye className="h-3.5 w-3.5" /> Quick view
          </button>
        </span>
      </Link>

      {onToggleWishlist && (
        <button
          type="button"
          onClick={onToggleWishlist}
          aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
          className={`absolute ${style === 'soft' ? 'top-4 right-4' : 'top-2 right-2'} w-8 h-8 rounded-full flex items-center justify-center transition-all ${
            inWishlist ? 'bg-red-400 text-white' : 'bg-white/90 text-gray-400 hover:text-red-400'
          }`}
        >
          <Heart className={`w-4 h-4 ${inWishlist ? 'fill-current' : ''}`} />
        </button>
      )}

      <div className={`flex flex-1 flex-col ${style === 'minimal' ? 'pt-3 px-0.5' : style === 'soft' ? 'px-4 pb-4 pt-2' : 'p-3.5'}`}>
        {product.categoryName && style !== 'minimal' && (
          <p className="text-[10px] text-[#7FAF8E] font-semibold uppercase tracking-wide mb-1">{product.categoryName}</p>
        )}
        <Link href={href}>
          <h3 className="text-sm font-medium text-gray-800 line-clamp-2 leading-snug hover:text-[#7FAF8E] transition-colors">
            {product.name}
          </h3>
        </Link>

        {!!product.rating && style !== 'minimal' && (
          <div className="flex items-center gap-0.5 mt-1.5">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className={`w-3 h-3 ${i < Math.round(product.rating || 0) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'}`} />
            ))}
            {!!product.reviewCount && <span className="text-[10px] text-gray-400 ml-1">({product.reviewCount})</span>}
          </div>
        )}

        <div className="mt-auto pt-2.5 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className={`font-bold text-gray-900 ${style === 'minimal' ? 'text-sm' : 'text-base'}`}>{formatPrice(price)}</span>
            {onSale && <span className="text-xs text-gray-400 line-through ml-1.5">{formatPrice(compareAtPrice!)}</span>}
          </div>
          {style === 'classic' && onAddToCart && (
            <button
              type="button"
              onClick={onAddToCart}
              disabled={adding}
              aria-label={cartLabel}
              className="w-9 h-9 shrink-0 bg-[#7FAF8E] text-white rounded-full flex items-center justify-center hover:bg-[#6A9B7D] transition-colors disabled:opacity-60"
            >
              {cartIcon}
            </button>
          )}
        </div>

        {style === 'soft' && onAddToCart && (
          <button
            type="button"
            onClick={onAddToCart}
            disabled={adding}
            className="mt-3 w-full flex items-center justify-center gap-1.5 py-2.5 bg-[#7FAF8E] text-white rounded-full text-xs font-semibold hover:bg-[#6A9B7D] transition-colors disabled:opacity-60"
          >
            {cartIcon} {cartLabel}
          </button>
        )}
      </div>
    </div>
  );
}
