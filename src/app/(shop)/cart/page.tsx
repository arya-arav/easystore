'use client';

import { useState, useEffect } from 'react';
import { ShopEmoji } from '@/components/ui/shop-emoji';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, Tag, Bookmark, Heart, Truck } from 'lucide-react';
import { cartKey, useCart } from '@/lib/cart-context';
import { useShopActions } from '@/lib/shop-actions';
import { useSettings } from '@/lib/settings-context';
import toast from 'react-hot-toast';
import { useMoney } from '@/lib/currency-context';
import { useShippingOffer } from '@/lib/use-shipping-offer';
import { readSavedCoupon, rememberCoupon } from '@/lib/saved-coupon';

interface CartItem {
  id: string;
  quantity: number;
  variant: string;
  product: {
    id: string;
    name: string;
    slug: string;
    price: number;
    compareAtPrice?: number | null;
    images: { url: string }[];
    category: { name: string };
  };
}

export default function CartPage() {
  const router = useRouter();
  const { items, moveToSavedForLater, moveToCart, removeFromSaved, savedForLater, replaceItems } = useCart();
  const { setLineQuantity, removeLine, signedIn } = useShopActions();
  const { settings } = useSettings();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); setAppliedCode(readSavedCoupon()); }, []);
  // Domestic or international threshold, whichever applies to this shopper (0 = always free)
  const shippingOffer = useShippingOffer();
  const freeShippingThreshold = mounted ? (shippingOffer.threshold ?? 0) : 0;
  const money = useMoney();
  const formatPrice = money.format;
  const [couponCode, setCouponCode] = useState('');
  const [appliedCode, setAppliedCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponLoading, setCouponLoading] = useState(false);

  // The cart lives in the browser (so guests can shop). For signed-in shoppers,
  // refresh it from the account so prices and removed products are current.
  useEffect(() => {
    if (!signedIn) return;
    fetch('/api/cart')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.cartItems) return;
        replaceItems(data.cartItems.map((line: any) => ({
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
        })));
      })
      .catch(() => {});
  }, [signedIn, replaceItems]);

  const cartItems: CartItem[] = mounted
    ? items.map((line) => ({
        id: line.id,
        quantity: line.quantity,
        variant: line.variant,
        product: {
          id: line.productId,
          name: line.name,
          slug: line.slug,
          price: line.price,
          compareAtPrice: line.compareAtPrice,
          images: line.image ? [{ url: line.image }] : [],
          category: { name: '' },
        },
      }))
    : [];
  const loading = !mounted;
  const updating: string | null = null;
  const lineOf = (id: string) => items.find((l) => l.id === id);

  const updateQuantity = (id: string, quantity: number) => {
    const line = lineOf(id);
    if (line && quantity >= 1) setLineQuantity(line, quantity);
  };

  const removeItem = (id: string) => {
    const line = lineOf(id);
    if (line) removeLine(line);
  };

  const handleMoveToSaved = (id: string) => {
    const line = lineOf(id);
    if (!line) return;
    if (signedIn) fetch('/api/cart', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId: line.productId, variant: line.variant }) }).catch(() => {});
    moveToSavedForLater(id);
    toast.success('Moved to Save for Later');
  };

  const handleMoveToCart = (id: string) => {
    const saved = savedForLater.find((s) => s.id === id);
    if (!saved) return;
    if (signedIn) fetch('/api/cart', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId: saved.productId, variant: saved.variant, quantity: saved.quantity }) }).catch(() => {});
    moveToCart(id);
    toast.success('Moved to Cart');
  };

  // Checked against the server cart (same rules as checkout); checkout picks the code up again.
  const applyCoupon = async () => {
    const code = couponCode.trim().toUpperCase();
    if (!code) return;
    if (!signedIn) {
      rememberCoupon(code);
      setAppliedCode(code);
      toast.success('Coupon saved — it will be applied at checkout after you sign in');
      return;
    }
    setCouponLoading(true);
    try {
      const res = await fetch('/api/coupons/validate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code, currency: money.currency }) });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.valid) {
        rememberCoupon(code);
        setAppliedCode(code);
        setCouponDiscount(Number(data.coupon.discountAmount) || 0);
        setCouponCode('');
        toast.success('Coupon applied');
      } else {
        toast.error(data.error || 'Invalid or expired coupon code');
      }
    } catch {
      toast.error('Could not check the coupon. Please try again.');
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = () => {
    rememberCoupon('');
    setAppliedCode('');
    setCouponDiscount(0);
  };

  const subtotal = cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  // Bundle savings and shipping from the server (the same calculation checkout charges).
  const [quote, setQuote] = useState<{ bundleDiscount: number; shippingCharge: number; couponDiscount?: number; groupDiscount?: number; group?: { name: string; percent: number } | null } | null>(null);
  const quoteKey = JSON.stringify([items.map((l) => [l.productId, l.quantity]), appliedCode, money.country]);
  useEffect(() => {
    if (!mounted || items.length === 0) return;
    const controller = new AbortController();
    fetch('/api/checkout/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({ items: items.map((l) => ({ productId: l.productId, quantity: l.quantity })), couponCode: appliedCode || null, country: money.country, currency: money.currency }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((q) => { if (q) setQuote(q); })
      .catch(() => {});
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, quoteKey]);

  const bundleSavings = quote?.bundleDiscount ?? 0;
  const shipping = quote?.shippingCharge ?? (!freeShippingThreshold || subtotal >= freeShippingThreshold ? 0 : (settings.baseShippingRate ?? 49));
  const discount = signedIn && appliedCode ? (quote?.couponDiscount ?? couponDiscount) : 0;
  const groupSavings = quote?.groupDiscount ?? 0;
  const total = subtotal + shipping - discount - bundleSavings - groupSavings;
  const freeShippingProgress = freeShippingThreshold ? Math.min((subtotal / freeShippingThreshold) * 100, 100) : 100;
  const amountToFreeShipping = Math.max(freeShippingThreshold - subtotal, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F7F5] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[#7FAF8E] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (cartItems.length === 0 && savedForLater.length === 0) {
    return (
      <div className="min-h-screen bg-[#F7F7F5] flex flex-col items-center justify-center gap-4 px-4">
        <div className="text-7xl">🛒</div>
        <h2 className="text-2xl font-bold text-[#333333]">Your cart is empty</h2>
        <p className="text-[#777777]">Looks like you haven&apos;t added anything yet!</p>
        <Link href="/products" className="mt-2 inline-flex items-center gap-2 bg-[#7FAF8E] text-white px-6 py-3 rounded-full font-semibold hover:bg-[#6A9B7D] transition-colors">
          Start Shopping <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F7F5]">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-[#E5E5E5]">
        <div className="content-container py-4">
          <nav className="flex items-center gap-2 text-sm">
            <Link href="/" className="text-[#777777] hover:text-[#7FAF8E] transition-colors">Home</Link>
            <span className="text-[#E5E5E5]">/</span>
            <span className="text-[#333333] font-medium">Shopping Cart</span>
          </nav>
        </div>
      </div>

      <div className="content-container py-8">
        <h1 className="text-2xl font-bold text-[#333333] mb-6 flex items-center gap-2">
          <ShoppingBag className="w-6 h-6 text-[#7FAF8E]" />
          Shopping Cart
          <span className="text-base font-normal text-[#777777]">({cartItems.length} {cartItems.length === 1 ? 'item' : 'items'})</span>
        </h1>

        {/* Free Shipping Progress Bar */}
        {cartItems.length > 0 && (
          <div className="bg-white rounded-2xl p-4 border border-[#E5E5E5] mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Truck className="w-4 h-4 text-[#7FAF8E]" />
              {amountToFreeShipping === 0 ? (
                <span className="text-sm font-medium text-[#7FAF8E]">You&apos;ve unlocked FREE shipping! 🎉</span>
              ) : (
                <span className="text-sm text-[#555555]">
                  Add <span className="font-semibold text-[#333333]">{formatPrice(amountToFreeShipping)}</span> more for <span className="font-semibold text-[#7FAF8E]">FREE shipping</span>
                </span>
              )}
            </div>
            <div className="w-full bg-[#E5E5E5] rounded-full h-2">
              <div
                className="bg-[#7FAF8E] h-2 rounded-full transition-all duration-500"
                style={{ width: `${freeShippingProgress}%` }}
              />
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-10 xl:gap-16">
          {/* LEFT — Cart Items */}
          <div className="min-w-0 space-y-4">
            {cartItems.map((item) => (
              <div key={item.id} className="bg-white rounded-2xl p-4 border border-[#E5E5E5] flex gap-4">
                {/* Image */}
                <Link href={`/products/${item.product.slug}`} className="flex-shrink-0">
                  <div className="w-20 h-20 md:w-24 md:h-24 bg-[#F8F6F2] rounded-xl overflow-hidden">
                    {item.product.images[0]?.url
                      ? <img src={item.product.images[0].url} alt={item.product.name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-3xl">{<ShopEmoji />}</div>}
                  </div>
                </Link>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <Link href={`/products/${item.product.slug}`}>
                    <h3 className="font-medium text-[#333333] hover:text-[#7FAF8E] transition-colors line-clamp-2 text-sm md:text-base">{item.product.name}</h3>
                  </Link>
                  {item.variant && <p className="text-xs text-[#777777] mt-0.5">{item.variant}</p>}
                  <p className="font-semibold text-[#333333] mt-1">{formatPrice(item.product.price)}</p>

                  {/* Qty + actions */}
                  <div className="flex items-center gap-3 mt-3 flex-wrap">
                    <div className="flex items-center border border-[#E5E5E5] rounded-full overflow-hidden">
                      <button onClick={() => updateQuantity(item.id, item.quantity - 1)} disabled={updating === item.id || item.quantity <= 1}
                        className="w-8 h-8 flex items-center justify-center text-[#777777] hover:bg-[#F7F7F5] disabled:opacity-40 transition-colors">
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-8 text-center text-sm font-medium text-[#333333]">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, item.quantity + 1)} disabled={updating === item.id}
                        className="w-8 h-8 flex items-center justify-center text-[#777777] hover:bg-[#F7F7F5] disabled:opacity-40 transition-colors">
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <button onClick={() => handleMoveToSaved(item.id)} disabled={updating === item.id}
                      className="text-xs text-[#777777] hover:text-[#7FAF8E] transition-colors flex items-center gap-1 disabled:opacity-40">
                      <Bookmark className="w-3.5 h-3.5" /> Save
                    </button>

                    <button onClick={() => removeItem(item.id)} disabled={updating === item.id}
                      className="text-xs text-[#777777] hover:text-red-500 transition-colors flex items-center gap-1 disabled:opacity-40">
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </button>
                  </div>
                </div>

                {/* Item total */}
                <div className="hidden md:flex flex-col items-end justify-between">
                  <p className="font-semibold text-[#333333]">{formatPrice(item.product.price * item.quantity)}</p>
                  {item.quantity > 1 && <p className="text-xs text-[#767676]">{formatPrice(item.product.price)} each</p>}
                </div>
              </div>
            ))}

            {/* Coupon */}
            <div className="bg-white rounded-2xl p-5 border border-[#E5E5E5]">
              <h3 className="text-sm font-semibold text-[#333333] mb-3 flex items-center gap-2">
                <Tag className="w-4 h-4 text-[#7FAF8E]" /> Discount Code
              </h3>
              <div className="flex gap-2">
                {appliedCode ? (
                  <div className="flex flex-1 items-center justify-between rounded-xl border border-[#AFC8B8] bg-[#F1F7F3] px-4 py-2.5 text-sm">
                    <span className="font-semibold text-[#333333]">{appliedCode}</span>
                    <button onClick={removeCoupon} className="text-[#777777] hover:text-red-500">Remove</button>
                  </div>
                ) : (
                  <>
                    <input type="text" value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())}
                      onKeyDown={e => e.key === 'Enter' && applyCoupon()}
                      placeholder="Enter coupon code"
                      className="flex-1 px-4 py-2.5 rounded-xl border border-[#E5E5E5] text-sm text-[#333333] placeholder-[#AAAAAA] focus:outline-none focus:border-[#AFC8B8]" />
                    <button onClick={applyCoupon} disabled={couponLoading || !couponCode.trim()}
                      className="px-5 py-2.5 bg-[#7FAF8E] text-white rounded-xl text-sm font-medium hover:bg-[#6A9B7D] transition-colors disabled:opacity-50">
                      {couponLoading ? '…' : 'Apply'}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Saved for Later */}
            {savedForLater.length > 0 && (
              <div>
                <h2 className="text-base font-semibold text-[#333333] mb-3 flex items-center gap-2">
                  <Bookmark className="w-4 h-4 text-[#7FAF8E]" /> Saved for Later ({savedForLater.length})
                </h2>
                <div className="space-y-3">
                  {savedForLater.map((item) => (
                    <div key={item.id} className="bg-white rounded-2xl p-4 border border-dashed border-[#E5E5E5] flex gap-4">
                      <div className="w-16 h-16 bg-[#F8F6F2] rounded-xl overflow-hidden flex-shrink-0">
                        {item.image ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center text-2xl">{<ShopEmoji />}</div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link href={`/products/${item.slug}`}>
                          <h3 className="text-sm font-medium text-[#333333] hover:text-[#7FAF8E] line-clamp-1">{item.name}</h3>
                        </Link>
                        <p className="text-sm font-semibold text-[#333333] mt-1">{formatPrice(item.price)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleMoveToCart(item.id)}
                          className="px-3 py-1.5 bg-[#7FAF8E] text-white rounded-full text-xs font-medium hover:bg-[#6A9B7D] transition-colors">
                          Move to Cart
                        </button>
                        <button onClick={() => removeFromSaved(item.id)} className="p-1.5 text-[#767676] hover:text-red-500 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT — Order Summary */}
          {cartItems.length > 0 && (
            <div className="lg:sticky lg:top-24 h-fit">
              <div className="bg-[#DDEBE7] rounded-2xl p-6">
                <h2 className="text-lg font-bold text-[#333333] mb-5">Order Summary</h2>

                <div className="bg-white rounded-xl p-4 space-y-3 mb-5">
                  <div className="flex justify-between text-sm text-[#555555]">
                    <span>Subtotal ({cartItems.length} items)</span>
                    <span className="font-medium text-[#333333]">{formatPrice(subtotal)}</span>
                  </div>
                  {bundleSavings > 0 && (
                    <div className="flex justify-between text-sm text-[#7FAF8E]">
                      <span>Bundle savings</span>
                      <span>− {formatPrice(bundleSavings)}</span>
                    </div>
                  )}
                  {groupSavings > 0 && (
                    <div className="flex justify-between text-sm text-[#7FAF8E]">
                      <span>{quote?.group?.name} discount ({quote?.group?.percent}%)</span>
                      <span>− {formatPrice(groupSavings)}</span>
                    </div>
                  )}
                  {discount > 0 && (
                    <div className="flex justify-between text-sm text-[#7FAF8E]">
                      <span>Discount</span>
                      <span>− {formatPrice(discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm text-[#555555]">
                    <span>Shipping</span>
                    <span className={shipping === 0 ? 'text-[#7FAF8E] font-medium' : 'font-medium text-[#333333]'}>
                      {shipping === 0 ? 'FREE' : formatPrice(shipping)}
                    </span>
                  </div>
                  <div className="border-t border-[#E5E5E5] pt-3 flex justify-between font-bold text-[#333333]">
                    <span>Estimated Total</span>
                    <span>{formatPrice(total)}</span>
                  </div>
                  <p className="text-xs text-[#767676]">Inclusive of all taxes</p>
                </div>

                <button onClick={() => router.push('/checkout')}
                  className="w-full py-3.5 bg-[#7FAF8E] text-white rounded-full font-semibold hover:bg-[#6A9B7D] transition-colors flex items-center justify-center gap-2 mb-3">
                  Proceed to Checkout <ArrowRight className="w-4 h-4" />
                </button>
                <Link href="/products"
                  className="w-full py-3.5 bg-white text-[#555555] rounded-full font-medium hover:bg-[#F7F7F5] transition-colors flex items-center justify-center border border-[#E5E5E5]">
                  Continue Shopping
                </Link>

                <div className="mt-5 pt-4 border-t border-[#C8DDD7] flex justify-center gap-6 text-xs text-[#777777]">
                  <span>🔒 Secure Checkout</span>
                  <span>💳 COD Available</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
