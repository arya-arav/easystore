'use client';

import { useCart } from '@/lib/cart-context';
import { ShopEmoji } from '@/components/ui/shop-emoji';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import { useShopActions } from '@/lib/shop-actions';
import { useSettings, useShopType } from '@/lib/settings-context';
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  Truck,
  Shield,
  RotateCcw,
  CreditCard,
  Star,
  Minus,
  Plus,
  Check,
  Loader2,
  Package,
  Ruler,
  ShoppingCart,
  Eye,
  Flame, Maximize2, Camera, X } from 'lucide-react';
import { trackRecentlyViewed, RecentlyViewedSection } from '@/components/recently-viewed';
import { ProductRecommendations } from '@/components/product-recommendations';
import { useMoney } from '@/lib/currency-context';
import { useShippingOffer } from '@/lib/use-shipping-offer';
import { ImageLightbox, type LightboxImage } from '@/components/product/image-lightbox';
import { DeliveryEstimate } from '@/components/product/delivery-estimate';
import { DEFAULT_PRODUCT_PAGE, GALLERY_SPLITS } from '@/lib/layout-settings';
import { SmartImage } from '@/components/ui/smart-image';
import { BannerSlider } from '@/components/home/banner-slider';

// Color swatches for product variants (pastel colors) - fallback only
const colorSwatches: Record<string, string> = {
  'Soft Pink': '#FFD6E0',
  'Baby Blue': '#B5D8EB',
  'Mint Green': '#C4EACB',
  'Soft Yellow': '#FFF4B8',
  'Lavender': '#E6D5F2',
  'Peach': '#FFDAB3',
  'Cream': '#FFF8E7',
  'White': '#FFFFFF',
};

interface ProductImage {
  id: string;
  url: string;
  alt: string | null;
}

interface ProductReview {
  id: string;
  rating: number;
  title?: string | null;
  comment?: string | null;
  isVerified: boolean;
  images?: string[];
  createdAt: Date;
  user: { name: string };
}

interface RelatedProduct {
  id: string;
  name: string;
  slug: string;
  price: number | { toNumber: () => number };
  compareAtPrice: number | { toNumber: () => number } | null;
  primaryImage?: string | null;
  images: { url: string }[];
  category: { name: string; slug: string };
  avgRating: number;
}

interface ProductDetailClientProps {
  product: {
    id: string;
    name: string;
    slug: string;
    description: string;
    shortDescription?: string | null;
    price: number | { toNumber: () => number };
    compareAtPrice: number | { toNumber: () => number } | null;
    stock: number;
    /** Stock per colour/size (empty when the product uses one stock number). */
    variants?: { color: string; size: string; stock: number }[];
    sku?: string | null;
    ageGroup?: string | null;
    gender?: string | null;
    gstRate: number | { toNumber: () => number };
    isNewArrival: boolean;
    isBestseller: boolean;
    isFeatured: boolean;
    colors?: string | null;
    sizes?: string | null;
    sizeGuideType?: string | null;
    category: { name: string; slug: string; parent?: { name: string; slug: string } | null };
    images: ProductImage[];
    reviews: ProductReview[];
    avgRating: number;
    reviewCount: number;
  };
  relatedProducts: RelatedProduct[];
  /** Frequently bought together (src/lib/bundles.ts); its discount is applied in the cart. */
  bundleProducts: RelatedProduct[];
}

export default function ProductDetailClient({ product, relatedProducts, bundleProducts }: ProductDetailClientProps) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { addToCart, toggleWishlist, isInWishlist } = useShopActions();
  const isWishlisted = isInWishlist(product.id);
  const { settings } = useSettings();
  const shopType = useShopType();
  const ageLabel = shopType.ages?.find((a) => a.value === product.ageGroup)?.label;
  const audienceLabel = shopType.audience?.options.find((o) => o.value === product.gender)?.label;
  const returnDays = settings.policies?.returnWindowDays ?? 7;
  // Product page layout (Admin → Settings → Design → Product page)
  const pp = settings.layout?.productPage ?? DEFAULT_PRODUCT_PAGE;
  const photoAspect = pp.imageShape === 'portrait' ? 'aspect-[3/4]' : 'aspect-square';
  const allPhotos = pp.gallery === 'grid' || pp.gallery === 'stacked';
  const codOn = (settings.payment?.methods || []).includes('COD');
  const ctaRef = useRef<HTMLDivElement>(null);
  const [ctaVisible, setCtaVisible] = useState(true);
  useEffect(() => {
    const el = ctaRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) => setCtaVisible(entry.isIntersecting || entry.boundingClientRect.top > window.innerHeight));
    io.observe(el);
    return () => io.disconnect();
  }, []);
  // Hover zoom on the main photo (desktop): the photo follows the pointer at 2x
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Track recently viewed
  useEffect(() => {
    trackRecentlyViewed({
      id: product.id,
      slug: product.slug,
      name: product.name,
      price: typeof product.price === 'object' ? product.price.toNumber() : Number(product.price),
      image: product.images[0]?.url || '',
      category: product.category.name,
    });
  }, [product.id]);
  const lowStockThreshold = mounted ? (settings.lowStockThreshold || 10) : 10;
  const showUrgency = mounted ? (settings.showUrgencyIndicators !== false) : false;

  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [lightbox, setLightbox] = useState<{ images: LightboxImage[]; index: number } | null>(null);
  const swipeStart = useRef<number | null>(null);
  const [activeTab, setActiveTab] = useState<'description' | 'size' | 'shipping' | 'reviews'>('description');
  const [expandedAccordion, setExpandedAccordion] = useState<string | null>('description');
  const [addingToCart, setAddingToCart] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const [showZoom, setShowZoom] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewHover, setReviewHover] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewPhotos, setReviewPhotos] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const uploadReviewPhoto = async (file: File) => {
    if (reviewPhotos.length >= 3) return;
    setUploadingPhoto(true);
    setReviewError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/reviews/upload', { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) setReviewPhotos((p) => [...p, data.url].slice(0, 3));
      else setReviewError(data.error || 'Photo upload failed');
    } finally {
      setUploadingPhoto(false);
    }
  };
  const [reviewTitle, setReviewTitle] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [addingBundle, setAddingBundle] = useState(false);
  const [bundleAdded, setBundleAdded] = useState(false);

  const handleSubmitReview = async () => {
    if (!reviewRating) { setReviewError('Please select a rating'); return; }
    if (status === 'unauthenticated') {
      router.push(`/auth/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setSubmittingReview(true);
    setReviewError('');
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id, rating: reviewRating, title: reviewTitle, comment: reviewComment, images: reviewPhotos }),
      });
      if (res.ok) {
        setReviewSuccess(true);
        setShowReviewForm(false);
        setReviewRating(0);
        setReviewTitle('');
        setReviewComment('');
        setReviewPhotos([]);
      } else {
        const d = await res.json();
        setReviewError(d.error || 'Failed to submit review');
      }
    } catch {
      setReviewError('Something went wrong. Please try again.');
    } finally {
      setSubmittingReview(false);
    }
  };

  // Parse dynamic colors and sizes from product data
  const parseOptions = <T,>(raw?: string | null): T[] => {
    try {
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };
  const productColors = parseOptions<{ name: string; hex: string }>(product.colors);
  const productSizes = parseOptions<{ label: string; value: string }>(product.sizes);
  const variantRows = product.variants || [];
  const tracksVariants = variantRows.length > 0;
  const stockFor = (color: string, size: string) =>
    tracksVariants ? variantRows.find((v) => v.color === color && v.size === size)?.stock ?? 0 : product.stock;
  const firstInStock = tracksVariants ? variantRows.find((v) => v.stock > 0) : undefined;
  const [selectedColor, setSelectedColor] = useState(firstInStock?.color || productColors[0]?.name || '');
  const [selectedSize, setSelectedSize] = useState(firstInStock?.size || productSizes[0]?.value || '');
  // Stock for exactly what's selected (the whole product when there are no per-option counts)
  const selectedStock = stockFor(selectedColor, selectedSize);
  const colorInStock = (color: string) => !tracksVariants || variantRows.some((v) => v.color === color && v.stock > 0);
  const sizeInStock = (size: string) => !tracksVariants || stockFor(selectedColor, size) > 0;

  const price = typeof product.price === 'object' ? product.price.toNumber() : product.price;
  const compareAtPrice = product.compareAtPrice
    ? typeof product.compareAtPrice === 'object'
      ? product.compareAtPrice.toNumber()
      : product.compareAtPrice
    : null;
  const gstRate = typeof product.gstRate === 'object' ? product.gstRate.toNumber() : product.gstRate;
  const discount = compareAtPrice ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100) : 0;

  const { format: formatPrice } = useMoney();
  const shippingOffer = useShippingOffer();

  // The options the shopper picked, saved on the cart line and the order.
  const variant = [
    selectedColor && `Colour: ${selectedColor}`,
    selectedSize && `Size: ${productSizes.find((sz) => sz.value === selectedSize)?.label || selectedSize}`,
  ].filter(Boolean).join(' / ');

  const cartProduct = {
    productId: product.id,
    name: product.name,
    slug: product.slug,
    price,
    compareAtPrice,
    image: product.images[0]?.url || '',
    gstRate,
    variant,
  };

  const handleAddToCart = async () => {
    setAddingToCart(true);
    try {
      if (await addToCart(cartProduct, quantity)) {
        setAddedToCart(true);
        setTimeout(() => setAddedToCart(false), 3000);
      }
    } finally {
      setAddingToCart(false);
    }
  };

  const handleBuyNow = async () => {
    setAddingToCart(true);
    try {
      if (await addToCart(cartProduct, quantity, { silent: true })) router.push('/checkout');
    } finally {
      setAddingToCart(false);
    }
  };

  const toggleAccordion = (section: string) => {
    setExpandedAccordion(expandedAccordion === section ? null : section);
  };

  // The product's detail sections; each layout (tabs / accordion / all open) renders them
  const detailTabs = [
    { id: 'description', label: 'Description' },
    ...(productSizes.length > 0 ? [{ id: 'size', label: 'Size Guide' }] : []),
    { id: 'shipping', label: 'Shipping & Returns' },
    { id: 'reviews', label: `Reviews (${product.reviewCount})` },
  ];
  const renderPanel = (activeTab: string) => (
    <>
              {activeTab === 'description' && (
                <div>
                  <p className="text-[#777777] leading-relaxed whitespace-pre-line">{product.description}</p>
                  <div className="mt-6 grid md:grid-cols-2 gap-4">
                    {shopType.highlights.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 bg-[#F7F7F5] rounded-xl">
                        <div className="w-6 h-6 bg-[#7FAF8E] rounded-full flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 text-white" />
                        </div>
                        <span className="text-[#333333]">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'size' && (
                <div className="space-y-6">
                  {productSizes.length > 0 ? (
                    <>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-[#F7F7F5]">
                            <tr>
                              {product.sizeGuideType === 'CLOTHING' && (
                                <>
                                  <th className="px-4 py-3 text-left text-[#333333] font-medium">Size</th>
                                  <th className="px-4 py-3 text-left text-[#333333] font-medium">Age Range</th>
                                </>
                              )}
                              {product.sizeGuideType === 'FOOTWEAR' && (
                                <>
                                  <th className="px-4 py-3 text-left text-[#333333] font-medium">UK Size</th>
                                  <th className="px-4 py-3 text-left text-[#333333] font-medium">Age Range</th>
                                </>
                              )}
                              {product.sizeGuideType === 'TOY' && (
                                <>
                                  <th className="px-4 py-3 text-left text-[#333333] font-medium">Size</th>
                                  <th className="px-4 py-3 text-left text-[#333333] font-medium">Dimensions</th>
                                </>
                              )}
                              {product.sizeGuideType === 'DIAPER' && (
                                <>
                                  <th className="px-4 py-3 text-left text-[#333333] font-medium">Size</th>
                                  <th className="px-4 py-3 text-left text-[#333333] font-medium">Baby Weight</th>
                                </>
                              )}
                              {(!product.sizeGuideType || product.sizeGuideType === 'NONE') && (
                                <th className="px-4 py-3 text-left text-[#333333] font-medium">Available Sizes</th>
                              )}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E5E5E5]">
                            {productSizes.map((s) => (
                              <tr key={s.value} className={selectedSize === s.value ? 'bg-[#F0F7F3]' : ''}>
                                <td className="px-4 py-3 text-[#333333] font-medium">{s.label}</td>
                                {(product.sizeGuideType === 'CLOTHING' || product.sizeGuideType === 'FOOTWEAR' || product.sizeGuideType === 'TOY' || product.sizeGuideType === 'DIAPER') && (
                                  <td className="px-4 py-3 text-[#777777]">{s.label}</td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="p-4 bg-[#F8F6F2] rounded-xl flex items-start gap-3">
                        <Ruler className="w-5 h-5 text-[#7FAF8E] mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-[#333333]">
                            {product.sizeGuideType === 'CLOTHING' && 'How to Choose Size'}
                            {product.sizeGuideType === 'FOOTWEAR' && 'How to Measure Foot'}
                            {product.sizeGuideType === 'TOY' && 'About Toy Sizes'}
                            {product.sizeGuideType === 'DIAPER' && 'Choosing the Right Diaper Size'}
                            {(!product.sizeGuideType || product.sizeGuideType === 'NONE') && 'Size Information'}
                          </p>
                          <p className="text-sm text-[#777777] mt-1">
                            {product.sizeGuideType === 'CLOTHING' && 'Measure your child\'s height and weight. When in doubt, size up for longer wear.'}
                            {product.sizeGuideType === 'FOOTWEAR' && 'Measure foot length while standing. Add 0.5–1cm for comfort.'}
                            {product.sizeGuideType === 'TOY' && 'Toy dimensions are approximate. Actual size may vary slightly.'}
                            {product.sizeGuideType === 'DIAPER' && 'Choose based on your baby\'s current weight for the best fit and leak protection.'}
                            {(!product.sizeGuideType || product.sizeGuideType === 'NONE') && 'Select your preferred size above.'}
                          </p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8 text-[#777777]">
                      <Ruler className="w-10 h-10 mx-auto mb-2 text-[#E5E5E5]" />
                      <p>No size guide available for this product.</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'shipping' && (
                <div className="grid md:grid-cols-3 gap-6">
                  {[
                    { icon: Truck, title: 'Shipping', items: [
                      shippingOffer.threshold ? `Free shipping on orders above ${formatPrice(shippingOffer.threshold)}` : 'We ship worldwide',
                      `Delivered in ${settings.minDeliveryDays || 3}-${settings.maxDeliveryDays || 7} working days`,
                      'Tracking link sent when your order ships',
                    ] },
                    { icon: RotateCcw, title: 'Returns', items: [
                      `${returnDays}-day returns from delivery`,
                      'Request a return from My Orders',
                      'Unused, in original packaging; refund after we receive it',
                    ] },
                    { icon: CreditCard, title: 'Payment', items: [
                      ...(settings.payment?.methods?.map((m) => ({ RAZORPAY: 'Cards, UPI and net banking', UPI: 'UPI transfer', COD: 'Cash on delivery', STRIPE: 'International cards' } as Record<string, string>)[m]).filter(Boolean) || ['Cash on delivery']),
                      'Secure checkout',
                    ] },
                  ].map((item, idx) => (
                    <div key={idx} className="p-5 bg-[#F7F7F5] rounded-xl">
                      <item.icon className="w-6 h-6 text-[#7FAF8E] mb-3" />
                      <h4 className="font-medium text-[#333333] mb-2">{item.title}</h4>
                      <ul className="text-sm text-[#777777] space-y-1">{item.items.map((i, j) => <li key={j}>• {i}</li>)}</ul>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'reviews' && (
                <div>
                  <div className="flex flex-col md:flex-row gap-6 mb-6 p-4 bg-[#F7F7F5] rounded-xl">
                    <div className="text-center md:text-left">
                      <div className="text-4xl font-bold text-[#333333]">{product.avgRating.toFixed(1)}</div>
                      <div className="flex items-center justify-center md:justify-start gap-1 mt-1">
                        {[...Array(5)].map((_, i) => <Star key={i} className={`w-4 h-4 ${i < Math.round(product.avgRating) ? 'text-[#F6C453] fill-[#F6C453]' : 'text-[#E5E5E5]'}`} />)}
                      </div>
                      <p className="text-sm text-[#777777] mt-1">{product.reviewCount} reviews</p>
                    </div>
                    <button
                      onClick={() => { if (status === 'unauthenticated') { router.push(`/auth/login?redirect=${encodeURIComponent(window.location.pathname)}`); return; } setShowReviewForm(v => !v); setReviewSuccess(false); setReviewError(''); }}
                      className="md:ml-auto px-5 py-2.5 bg-[#7FAF8E] text-white rounded-full font-medium hover:bg-[#6A9B7D] transition-colors self-start"
                    >
                      {showReviewForm ? 'Cancel' : 'Write a Review'}
                    </button>
                  </div>

                  {/* Review success message */}
                  {reviewSuccess && (
                    <div className="mb-4 p-4 bg-[#E8F5E9] text-[#7FAF8E] rounded-xl flex items-center gap-2 text-sm font-medium">
                      <Check className="w-4 h-4" /> Thank you! Your review has been submitted.
                    </div>
                  )}

                  {/* Inline review form */}
                  {showReviewForm && (
                    <div className="mb-6 p-5 bg-white border border-[#E5E5E5] rounded-2xl space-y-4">
                      <p className="font-semibold text-[#333333]">Your Review</p>

                      {/* Star rating picker */}
                      <div>
                        <p className="text-sm text-[#777777] mb-2">Rating *</p>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map(star => (
                            <button key={star} type="button"
                              onMouseEnter={() => setReviewHover(star)}
                              onMouseLeave={() => setReviewHover(0)}
                              onClick={() => setReviewRating(star)}
                              className="p-0.5 transition-transform hover:scale-110"
                            >
                              <Star className={`w-7 h-7 transition-colors ${star <= (reviewHover || reviewRating) ? 'text-[#F6C453] fill-[#F6C453]' : 'text-[#E5E5E5]'}`} />
                            </button>
                          ))}
                          {reviewRating > 0 && (
                            <span className="ml-2 text-sm text-[#777777] self-center">
                              {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][reviewRating]}
                            </span>
                          )}
                        </div>
                      </div>

                      <div>
                        <p className="text-sm text-[#777777] mb-1">Title</p>
                        <input
                          type="text"
                          value={reviewTitle}
                          onChange={e => setReviewTitle(e.target.value)}
                          placeholder="Summarise your experience"
                          className="w-full px-4 py-2.5 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:border-[#7FAF8E]"
                        />
                      </div>

                      <div>
                        <p className="text-sm text-[#777777] mb-1">Review</p>
                        <textarea
                          value={reviewComment}
                          onChange={e => setReviewComment(e.target.value)}
                          placeholder="Tell others what you think about this product..."
                          rows={4}
                          className="w-full px-4 py-2.5 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:border-[#7FAF8E] resize-none"
                        />
                      </div>

                      <div>
                        <p className="text-sm text-[#777777] mb-2">Photos (optional, up to 3)</p>
                        <div className="flex flex-wrap gap-2">
                          {reviewPhotos.map((url) => (
                            <div key={url} className="relative h-20 w-20 overflow-hidden rounded-xl border border-[#E5E5E5]">
                              <img src={url} alt="" className="h-full w-full object-cover" />
                              <button type="button" onClick={() => setReviewPhotos((p) => p.filter((u) => u !== url))} aria-label="Remove photo"
                                className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white"><X className="w-3.5 h-3.5" /></button>
                            </div>
                          ))}
                          {reviewPhotos.length < 3 && (
                            <label className={`flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-[#E5E5E5] text-xs text-[#777777] hover:border-[#7FAF8E] ${uploadingPhoto ? 'opacity-60 pointer-events-none' : ''}`}>
                              {uploadingPhoto ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
                              {uploadingPhoto ? 'Uploading' : 'Add photo'}
                              <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only"
                                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadReviewPhoto(f); e.target.value = ''; }} />
                            </label>
                          )}
                        </div>
                      </div>

                      {reviewError && <p className="text-sm text-red-500">{reviewError}</p>}

                      <button
                        onClick={handleSubmitReview}
                        disabled={submittingReview}
                        className="px-6 py-2.5 bg-[#7FAF8E] text-white rounded-full text-sm font-semibold hover:bg-[#6A9B7D] disabled:opacity-50 flex items-center gap-2"
                      >
                        {submittingReview ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : 'Submit Review'}
                      </button>
                    </div>
                  )}

                  {(() => {
                    const photos = product.reviews.flatMap((r) => (r.images || []).map((url) => ({ url, alt: `Photo from ${r.user.name || 'a customer'}` })));
                    if (photos.length === 0) return null;
                    return (
                      <div className="mb-5">
                        <p className="text-sm font-semibold text-[#333333] mb-2">Customer photos</p>
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {photos.map((photo, i) => (
                            <button key={`${photo.url}-${i}`} onClick={() => setLightbox({ images: photos, index: i })} aria-label={`Open customer photo ${i + 1}`}
                              className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-[#E5E5E5]">
                              <img src={photo.url} alt="" className="h-full w-full object-cover" />
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {product.reviews.length === 0 ? (
                    <div className="text-center py-8"><p className="text-[#777777]">No reviews yet. Be the first!</p></div>
                  ) : (
                    <div className="space-y-4">
                      {product.reviews.slice(0, 5).map((review) => (
                        <div key={review.id} className="p-4 bg-[#F7F7F5] rounded-xl">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                {[...Array(5)].map((_, i) => <Star key={i} className={`w-3.5 h-3.5 ${i < review.rating ? 'text-[#F6C453] fill-[#F6C453]' : 'text-[#E5E5E5]'}`} />)}
                                {review.isVerified && <span className="flex items-center gap-1 text-xs bg-[#E8F5E9] text-[#7FAF8E] px-2 py-0.5 rounded-full"><Check className="w-3 h-3" />Verified</span>}
                              </div>
                              <p className="font-medium text-[#333333]">{review.user.name}</p>
                            </div>
                            <span className="text-xs text-[#777777]">{new Date(review.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                          </div>
                          {review.comment && <p className="text-sm text-[#777777]">{review.comment}</p>}
                          {!!review.images?.length && (
                            <div className="mt-3 flex gap-2">
                              {review.images.map((url, i) => (
                                <button key={url} onClick={() => setLightbox({ images: review.images!.map((u) => ({ url: u })), index: i })} aria-label={`Open photo ${i + 1}`}
                                  className="h-16 w-16 overflow-hidden rounded-lg border border-[#E5E5E5]">
                                  <img src={url} alt="" className="h-full w-full object-cover" />
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
    </>
  );

  return (
    <>
    <div className="min-h-screen bg-[#F7F7F5]">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-[#E5E5E5]">
        <div className="content-container py-4">
          <nav className="flex items-center gap-2 text-sm flex-wrap">
            <Link href="/" className="text-[#777777] hover:text-[#7FAF8E] transition-colors">Home</Link>
            <span className="text-[#E5E5E5]">/</span>
            <Link href="/products" className="text-[#777777] hover:text-[#7FAF8E] transition-colors">Products</Link>
            {product.category.parent && (
              <>
                <span className="text-[#E5E5E5]">/</span>
                <Link href={`/category/${product.category.parent.slug}`} className="text-[#777777] hover:text-[#7FAF8E] transition-colors">{product.category.parent.name}</Link>
              </>
            )}
            <span className="text-[#E5E5E5]">/</span>
            <Link href={`/category/${product.category.slug}`} className="text-[#777777] hover:text-[#7FAF8E] transition-colors">{product.category.name}</Link>
            <span className="text-[#E5E5E5]">/</span>
            <span className="text-[#333333] font-medium truncate max-w-[200px]">{product.name}</span>
          </nav>
        </div>
      </div>

      {lightbox && (
        <ImageLightbox
          images={lightbox.images}
          index={lightbox.index}
          title={product.name}
          onIndexChange={(index) => setLightbox((lb) => (lb ? { ...lb, index } : lb))}
          onClose={() => setLightbox(null)}
        />
      )}

      <div className="content-container py-8">
        {/* Gallery (wider, stays in view while the details scroll) + details */}
        <div className={`grid gap-8 ${GALLERY_SPLITS[pp.split].className} lg:gap-12 xl:gap-16`}>
          {/* LEFT - Image Gallery */}
          {/* Photos are capped at 640px wide (Medusa's storefront shows ~660px) so they don't dwarf the details */}
          <div className={`w-full space-y-4 lg:max-w-[640px] lg:justify-self-end ${pp.stickyGallery && !allPhotos ? 'lg:sticky lg:top-24 lg:self-start' : ''}`}>
            {/* Every photo at once on desktop (grid / stacked); phones keep the swipeable photo */}
            {allPhotos && product.images.length > 0 && (
              <div className={`hidden lg:grid gap-3 ${pp.gallery === 'grid' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {product.images.map((img, idx) => (
                  <button key={img.id} type="button" onClick={() => setLightbox({ images: product.images, index: idx })} aria-label={`Open photo ${idx + 1}`}
                    className={`relative overflow-hidden rounded-2xl border border-[#E5E5E5] bg-white cursor-zoom-in ${photoAspect} ${pp.gallery === 'grid' && idx === 0 && product.images.length % 2 === 1 ? 'col-span-2' : ''}`}>
                    <SmartImage src={img.url} alt={img.alt || `${product.name} photo ${idx + 1}`} sizes="(min-width: 1024px) 50vw, 100vw" priority={idx === 0} />
                  </button>
                ))}
              </div>
            )}
            <div className={`${allPhotos && product.images.length > 0 ? 'lg:hidden ' : ''}${pp.gallery === 'thumbs-side' ? 'lg:flex lg:flex-row-reverse lg:items-start lg:gap-3' : 'space-y-4'}`}>
            <div className={`relative bg-white rounded-2xl overflow-hidden ${photoAspect} shadow-sm border border-[#E5E5E5] group ${pp.gallery === 'thumbs-side' ? 'lg:flex-1' : ''}`}>
              {product.images[selectedImage]?.url ? (
                <button
                  type="button"
                  onClick={() => setLightbox({ images: product.images, index: selectedImage })}
                  onTouchStart={(e) => { swipeStart.current = e.touches[0].clientX; }}
                  onTouchEnd={(e) => {
                    if (swipeStart.current === null || product.images.length < 2) return;
                    const dx = e.changedTouches[0].clientX - swipeStart.current;
                    swipeStart.current = null;
                    if (Math.abs(dx) > 50) setSelectedImage((prev) => (prev + (dx < 0 ? 1 : -1) + product.images.length) % product.images.length);
                  }}
                  onMouseMove={(e) => {
                    if (!pp.zoom || window.matchMedia('(hover: none)').matches) return;
                    const r = e.currentTarget.getBoundingClientRect();
                    setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
                  }}
                  onMouseLeave={() => setZoom(null)}
                  aria-label="Open photo gallery"
                  className="relative block w-full h-full cursor-zoom-in overflow-hidden"
                >
                  <div className="absolute inset-0 transition-transform duration-150 ease-out" style={zoom ? { transform: 'scale(2)', transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}>
                    <SmartImage
                      src={product.images[selectedImage].url}
                      alt={product.images[selectedImage].alt || product.name}
                      sizes="(min-width: 1024px) 800px, 100vw"
                      priority={selectedImage === 0}
                    />
                  </div>
                  <span className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-[#555555] shadow-sm opacity-0 transition-opacity group-hover:opacity-100 max-lg:opacity-100">
                    <Maximize2 className="w-3.5 h-3.5" /> Tap to zoom
                  </span>
                </button>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-[#F8F6F2]">
                  <span className="text-8xl">{<ShopEmoji />}</span>
                </div>
              )}

              {product.images.length > 1 && (
                <>
                  <button onClick={() => setSelectedImage((prev) => (prev - 1 + product.images.length) % product.images.length)} className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 backdrop-blur rounded-full shadow-md flex items-center justify-center hover:bg-white transition-all">
                    <ChevronLeft className="w-5 h-5 text-[#333333]" />
                  </button>
                  <button onClick={() => setSelectedImage((prev) => (prev + 1) % product.images.length)} className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 backdrop-blur rounded-full shadow-md flex items-center justify-center hover:bg-white transition-all">
                    <ChevronRight className="w-5 h-5 text-[#333333]" />
                  </button>
                </>
              )}

              <div className="absolute top-4 left-4 flex flex-col gap-2">
                {discount > 0 && <span className="bg-red-400 text-white text-sm font-bold px-3 py-1.5 rounded-full">{discount}% OFF</span>}
                {product.isNewArrival && <span className="bg-[#AFC8B8] text-[#333333] text-sm font-bold px-3 py-1.5 rounded-full">NEW</span>}
                {product.isBestseller && <span className="bg-[#F6C453] text-[#333333] text-sm font-bold px-3 py-1.5 rounded-full flex items-center gap-1"><Star className="w-3 h-3 fill-current" />BEST</span>}
              </div>

              <button onClick={() => toggleWishlist({ productId: product.id, name: product.name, slug: product.slug, price, compareAtPrice, image: product.images[0]?.url || '' })} aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'} className={`absolute top-4 right-4 w-10 h-10 rounded-full shadow-md flex items-center justify-center transition-all ${isWishlisted ? 'bg-red-400 text-white' : 'bg-white/90 backdrop-blur text-[#777777] hover:text-red-500 hover:bg-white'}`}>
                <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-current' : ''}`} />
              </button>
            </div>

            {product.images.length > 1 && (
              <div className={`flex gap-3 overflow-x-auto pb-2 ${pp.gallery === 'thumbs-side' ? 'mt-4 lg:mt-0 lg:w-20 lg:shrink-0 lg:flex-col lg:overflow-y-auto lg:pb-0 lg:max-h-[640px]' : ''}`}>
                {product.images.map((img, idx) => (
                  <button key={img.id} onClick={() => setSelectedImage(idx)} className={`flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-all ${selectedImage === idx ? 'border-[#7FAF8E] ring-2 ring-[#AFC8B8]' : 'border-[#E5E5E5] hover:border-[#AFC8B8]'}`}>
                    <span className="relative block h-full w-full"><SmartImage src={img.url} alt={img.alt || `${product.name} photo ${idx + 1}`} sizes="80px" /></span>
                  </button>
                ))}
              </div>
            )}

            </div>

            {/* Mobile Trust Icons */}
            {pp.showTrustIcons && <div className="grid grid-cols-4 gap-3 lg:hidden mt-4">
              {[{ icon: Truck, label: 'Free Shipping' }, { icon: Shield, label: '100% Safe' }, { icon: RotateCcw, label: `${returnDays}-Day Returns` }, { icon: CreditCard, label: codOn ? 'COD' : 'Secure pay' }].map((item, idx) => (
                <div key={idx} className="flex flex-col items-center text-center p-3 bg-white rounded-xl border border-[#E5E5E5]">
                  <item.icon className="w-5 h-5 text-[#7FAF8E] mb-1" />
                  <span className="text-xs text-[#777777]">{item.label}</span>
                </div>
              ))}
            </div>}
          </div>

          {/* RIGHT - Product Details (stays in view beside a photo grid/stack) */}
          <div className={`lg:py-2 ${allPhotos && pp.stickyGallery ? 'lg:sticky lg:top-24 lg:self-start' : ''}`}>
            <Link href={`/category/${product.category.slug}`} className="text-sm text-[#AFC8B8] font-medium hover:text-[#7FAF8E] transition-colors uppercase tracking-wide">{product.category.name}</Link>
            <h1 className="text-2xl md:text-3xl font-bold text-[#333333] mt-2 leading-tight">{product.name}</h1>

            <div className="flex items-center gap-3 mt-3">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={`w-4 h-4 ${i < Math.round(product.avgRating) ? 'text-[#F6C453] fill-[#F6C453]' : 'text-[#E5E5E5]'}`} />
                ))}
              </div>
              <span className="text-sm text-[#777777]">{product.avgRating.toFixed(1)} ({product.reviewCount} reviews)</span>
            </div>

            {product.shortDescription && <p className="text-[#777777] mt-4 leading-relaxed">{product.shortDescription}</p>}

            <div className="flex flex-wrap gap-2 mt-4">
              {ageLabel && <span className="px-3 py-1.5 bg-[#F8F6F2] text-[#777777] text-sm rounded-full">Age: {ageLabel}</span>}
              {audienceLabel && product.gender !== 'UNISEX' && <span className="px-3 py-1.5 bg-[#F8F6F2] text-[#777777] text-sm rounded-full">For: {audienceLabel}</span>}
            </div>

            <div className="mt-6 p-4 bg-white rounded-xl border border-[#E5E5E5]">
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="text-2xl font-bold text-[#333333]">{formatPrice(price)}</span>
                {compareAtPrice && (
                  <>
                    <span className="text-lg text-[#777777] line-through">{formatPrice(compareAtPrice)}</span>
                    <span className="text-sm text-[#7FAF8E] font-medium">Save {formatPrice(compareAtPrice - price)}</span>
                  </>
                )}
              </div>
              <p className="text-xs text-[#777777] mt-1">Inclusive of all taxes</p>
            </div>

            <div className="mt-4">
              {selectedStock > 0 ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 bg-[#7FAF8E] rounded-full"></div>
                    <span className="text-sm text-[#7FAF8E] font-medium">In Stock</span>
                    {selectedStock <= lowStockThreshold && (
                      <span className="text-sm text-red-500 font-medium">— Only {selectedStock} left!</span>
                    )}
                  </div>
                  {showUrgency && selectedStock <= lowStockThreshold && (
                    <div className="flex items-center gap-2 text-xs text-red-500 bg-[#FFF4EF] px-3 py-2 rounded-lg">
                      <Flame className="w-3.5 h-3.5" />
                      <span>High demand — selling fast!</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 bg-red-400 rounded-full"></div>
                  <span className="text-sm text-red-500 font-medium">Out of Stock</span>
                </div>
              )}
            </div>

            {/* Color Selector - only shown if product has colors */}
            {productColors.length > 0 && (
              <div className="mt-6">
                <label className="block text-sm font-medium text-[#333333] mb-3">
                  Color: <span className="font-normal text-[#777777]">{selectedColor}</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {productColors.map(({ name, hex }) => {
                    const soldOut = !colorInStock(name);
                    return (
                      <button key={name} onClick={() => { setSelectedColor(name); setQuantity(1); }}
                        aria-label={`${name}${soldOut ? ' (sold out)' : ''}`} aria-pressed={selectedColor === name}
                        className={`relative w-10 h-10 rounded-full border-2 transition-all overflow-hidden ${
                          selectedColor === name
                            ? 'border-[#7FAF8E] ring-2 ring-[#AFC8B8] ring-offset-2'
                            : 'border-[#E5E5E5] hover:border-[#AFC8B8]'
                        } ${soldOut ? 'opacity-40' : ''}`}
                        style={{ backgroundColor: hex }} title={soldOut ? `${name} — sold out` : name}>
                        {soldOut && <span className="absolute left-1/2 top-1/2 h-[2px] w-[140%] -translate-x-1/2 -translate-y-1/2 -rotate-45 bg-gray-600" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Size Selector - only shown if product has sizes */}
            {productSizes.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-[#333333]">
                    Size: <span className="font-normal text-[#777777]">
                      {productSizes.find(s => s.value === selectedSize)?.label || ''}
                    </span>
                  </label>
                  {product.sizeGuideType && product.sizeGuideType !== 'NONE' && (
                    <button onClick={() => setActiveTab('size')}
                      className="text-xs text-[#7FAF8E] underline hover:text-[#6A9B7D]">
                      Size Guide
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {productSizes.map((s) => {
                    const soldOut = !sizeInStock(s.value);
                    return (
                      <button key={s.value} onClick={() => { setSelectedSize(s.value); setQuantity(1); }}
                        aria-pressed={selectedSize === s.value} title={soldOut ? 'Sold out' : undefined}
                        className={`px-3 py-1.5 rounded-xl border text-sm font-medium transition-all ${
                          selectedSize === s.value
                            ? 'border-[#7FAF8E] bg-[#7FAF8E] text-white'
                            : 'border-[#E5E5E5] text-[#333333] hover:border-[#AFC8B8]'
                        } ${soldOut ? 'line-through opacity-50' : ''}`}>
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {pp.showDeliveryEstimate && (
              <div className="mb-6">
                <DeliveryEstimate price={price} />
              </div>
            )}

            {/* Quantity */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-[#333333] mb-3">Quantity</label>
              <div className="flex items-center bg-white border border-[#E5E5E5] rounded-full w-fit">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-10 h-10 flex items-center justify-center text-[#777777] hover:bg-[#F7F7F5] transition-colors" disabled={quantity <= 1}><Minus className="w-4 h-4" /></button>
                <input type="number" value={quantity} onChange={(e) => setQuantity(Math.max(1, Math.min(selectedStock, parseInt(e.target.value) || 1)))} className="w-12 text-center py-2 bg-transparent font-medium text-[#333333] focus:outline-none" min={1} max={selectedStock} />
                <button onClick={() => setQuantity(Math.min(selectedStock, quantity + 1))} className="w-10 h-10 flex items-center justify-center text-[#777777] hover:bg-[#F7F7F5] transition-colors" disabled={quantity >= selectedStock}><Plus className="w-4 h-4" /></button>
              </div>
            </div>

            {/* CTA Buttons */}
            <div ref={ctaRef} className="mt-6 space-y-3">
              <button onClick={handleAddToCart} disabled={selectedStock <= 0 || addingToCart} className="w-full h-12 px-6 bg-[#7FAF8E] text-white rounded-full font-semibold text-base hover:bg-[#6A9B7D] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm">
                {addingToCart ? <><Loader2 className="w-5 h-5 animate-spin" />Adding...</> : addedToCart ? <><Check className="w-5 h-5" />Added!</> : <><Package className="w-5 h-5" />Add to Cart</>}
              </button>
              {pp.showBuyNow && <button onClick={handleBuyNow} disabled={selectedStock <= 0 || addingToCart} className="w-full h-12 px-6 bg-white border-2 border-[#7FAF8E] text-[#7FAF8E] rounded-full font-semibold text-base hover:bg-[#F7F7F5] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Buy Now</button>}
            </div>

            {/* Desktop Trust Icons */}
            {pp.showTrustIcons && <div className="hidden lg:grid grid-cols-4 gap-4 mt-8">
              {[{ icon: Truck, title: 'Free Shipping', desc: shippingOffer.threshold ? `Above ${formatPrice(shippingOffer.threshold)}` : 'Worldwide' }, { icon: Shield, title: 'Safe for Babies', desc: '100% Non-toxic' }, { icon: RotateCcw, title: 'Easy Returns', desc: `${returnDays}-day returns` }, codOn ? { icon: CreditCard, title: 'COD Available', desc: 'Pay on delivery' } : { icon: CreditCard, title: 'Secure Checkout', desc: 'Safe payments' }].map((item, idx) => (
                <div key={idx} className="text-center">
                  <div className="w-12 h-12 bg-[#F8F6F2] rounded-full flex items-center justify-center mx-auto mb-2">
                    <item.icon className="w-5 h-5 text-[#7FAF8E]" />
                  </div>
                  <p className="text-sm font-medium text-[#333333]">{item.title}</p>
                  <p className="text-xs text-[#777777]">{item.desc}</p>
                </div>
              ))}
            </div>}

          </div>
        </div>

        {/* Details: tabs, accordion or all open (Admin → Settings → Design → Product page) */}
        {pp.details === 'tabs' && (
          <div className="hidden md:block mt-12">
            <div className="bg-white rounded-2xl border border-[#E5E5E5] overflow-hidden">
              <div className="flex border-b border-[#E5E5E5]">
                {detailTabs.map((tab) => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id as typeof activeTab)} className={`flex-1 px-6 py-4 font-medium text-sm transition-colors relative ${activeTab === tab.id ? 'text-[#7FAF8E]' : 'text-[#777777] hover:text-[#333333]'}`}>
                    {tab.label}
                    {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#7FAF8E]"></div>}
                  </button>
                ))}
              </div>
              <div className="p-6">{renderPanel(activeTab)}</div>
            </div>
          </div>
        )}

        {pp.details === 'expanded' ? (
          <div className="mt-10 space-y-4">
            {detailTabs.map((tab) => (
              <section key={tab.id} className="bg-white rounded-2xl border border-[#E5E5E5] p-5 md:p-6">
                <h2 className="mb-4 text-lg font-semibold text-[#333333]">{tab.label}</h2>
                {renderPanel(tab.id)}
              </section>
            ))}
          </div>
        ) : (
          <div className={`${pp.details === 'tabs' ? 'md:hidden ' : ''}mt-8 space-y-3`}>
            {detailTabs.map((section) => (
              <div key={section.id} className="bg-white rounded-xl border border-[#E5E5E5] overflow-hidden">
                <button onClick={() => toggleAccordion(section.id)} aria-expanded={expandedAccordion === section.id} className="w-full flex items-center justify-between p-4 text-left">
                  <span className="font-medium text-[#333333]">{section.label}</span>
                  {expandedAccordion === section.id ? <ChevronLeft className="w-5 h-5 text-[#777777] rotate-90" /> : <ChevronLeft className="w-5 h-5 text-[#777777] -rotate-90" />}
                </button>
                {expandedAccordion === section.id && <div className="px-4 pb-4">{renderPanel(section.id)}</div>}
              </div>
            ))}
          </div>
        )}

        {/* Frequently Bought Together */}
        {bundleProducts.length >= 2 && (() => {
          const bundleItems = bundleProducts;
          const bundlePercent = mounted ? (settings.bundleDiscount ?? 5) : 5;
          const mainPrice = Number(price); // ensure number, not string/Decimal
          const totalOriginal = mainPrice + bundleItems.reduce((sum, item) => {
            const p = typeof item.price === 'object' ? item.price.toNumber() : Number(item.price);
            return sum + p;
          }, 0);

          const handleAddBundle = async () => {
            setAddingBundle(true);
            try {
              // Lines keep their own prices; the cart and checkout apply the bundle saving.
              await addToCart(cartProduct, 1, { silent: true });
              for (const item of bundleItems) {
                const itemPrice = typeof item.price === 'object' ? item.price.toNumber() : Number(item.price);
                await addToCart({ productId: item.id, name: item.name, slug: item.slug, price: itemPrice, image: item.images[0]?.url || '' }, 1, { silent: true });
              }
              setBundleAdded(true);
              setTimeout(() => setBundleAdded(false), 2500);
              toast.success(`${1 + bundleItems.length} items added to your cart`);
              useCart.getState().openCart();
            } finally {
              setAddingBundle(false);
            }
          };

          return (
            <div className="mt-12">
              <h2 className="text-xl font-bold text-[#333333] mb-4 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-[#7FAF8E]" />
                Frequently Bought Together
              </h2>
              <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6">
                <div className="flex flex-wrap items-center gap-4">
                  {/* Main product */}
                  <div className="flex flex-col items-center gap-2 w-28">
                    <div className="w-24 h-24 rounded-xl overflow-hidden bg-[#F8F6F2] border border-[#E5E5E5]">
                      {product.images[0]?.url
                        ? <img src={product.images[0].url} alt={product.name} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-3xl">{<ShopEmoji />}</div>}
                    </div>
                    <p className="text-xs text-[#333333] text-center line-clamp-2 font-medium">{product.name}</p>
                    <p className="text-xs font-bold text-[#333333]">{formatPrice(mainPrice)}</p>
                  </div>

                  {bundleItems.map(item => {
                    const itemPrice = typeof item.price === 'object' ? item.price.toNumber() : Number(item.price);
                    return (
                      <div key={item.id} className="flex items-center gap-4">
                        <span className="text-2xl text-[#767676] font-light">+</span>
                        <div className="flex flex-col items-center gap-2 w-28">
                          <div className="w-24 h-24 rounded-xl overflow-hidden bg-[#F8F6F2] border border-[#E5E5E5]">
                            {item.images[0]?.url
                              ? <img src={item.images[0].url} alt={item.name} className="w-full h-full object-cover" />
                              : <div className="w-full h-full flex items-center justify-center text-3xl">{<ShopEmoji />}</div>}
                          </div>
                          <p className="text-xs text-[#333333] text-center line-clamp-2 font-medium">{item.name}</p>
                          <p className="text-xs font-bold text-[#333333]">{formatPrice(itemPrice)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-4 pt-4 border-t border-[#F0F0F0]">
                  <div>
                    <p className="text-xs text-[#767676] line-through">{formatPrice(totalOriginal)}</p>
                    <p className="text-xl font-bold text-[#333333]">{formatPrice(totalOriginal - Math.round((totalOriginal * bundlePercent) / 100))}</p>
                    <p className="text-xs text-[#7FAF8E] font-medium">
                      Save {formatPrice(Math.round((totalOriginal * bundlePercent) / 100))} ({bundlePercent}% off) — applied in your cart
                    </p>
                  </div>
                  <button
                    onClick={handleAddBundle}
                    disabled={product.stock === 0 || addingBundle}
                    className="px-6 py-2.5 bg-[#7FAF8E] text-white rounded-full text-sm font-semibold hover:bg-[#6A9B7D] transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {addingBundle
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Adding...</>
                      : bundleAdded
                      ? <><Check className="w-4 h-4" /> Added!</>
                      : <><ShoppingCart className="w-4 h-4" /> Add All to Cart</>
                    }
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Product page banners (Admin → Banners → Product pages) */}
        <BannerSlider position="PRODUCT_PAGE" nested className="mt-12" categorySlugs={[product.category.slug, ...(product.category.parent ? [product.category.parent.slug] : [])]} />

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="mt-12">
            <h2 className="text-xl font-bold text-[#333333] mb-6">You May Also Like</h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-5">
              {relatedProducts.slice(0, 5).map((item) => (
                <Link key={item.id} href={`/products/${item.slug}`} className="group bg-white rounded-2xl overflow-hidden shadow-sm border border-[#E5E5E5] hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                  <div className="relative aspect-square bg-[#F8F6F2] overflow-hidden">
                    {item.images[0]?.url || item.primaryImage ? (
                      <img src={item.primaryImage || item.images[0]?.url} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl">{<ShopEmoji />}</div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-xs text-[#AFC8B8] uppercase">{item.category?.name}</p>
                    <h3 className="mt-1 text-sm font-medium text-[#333333] line-clamp-2 group-hover:text-[#7FAF8E] transition-colors">{item.name}</h3>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="font-bold text-[#333333]">{formatPrice(typeof item.price === 'object' ? item.price.toNumber() : item.price)}</span>
                      {item.compareAtPrice && <span className="text-xs text-[#777777] line-through">{formatPrice(typeof item.compareAtPrice === 'object' ? item.compareAtPrice.toNumber() : item.compareAtPrice)}</span>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sticky Add to Cart - Mobile: appears once the main buttons scroll out of view */}
      {pp.mobileBar && <div aria-hidden={ctaVisible} className={`lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#E5E5E5] p-4 z-40 shadow-lg transition-transform duration-200 ${ctaVisible ? 'translate-y-full' : 'translate-y-0'}`}>
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <div className="flex-shrink-0">
            <p className="text-xs text-[#777777]">Price</p>
            <p className="text-base font-bold text-[#333333]">{formatPrice(price)}</p>
          </div>
          <button
            onClick={handleAddToCart}
            disabled={selectedStock <= 0 || addingToCart}
            className="flex-1 py-3 bg-[#7FAF8E] text-white rounded-full font-semibold hover:bg-[#6A9B7D] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {addingToCart ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : addedToCart ? (
              <><Check className="w-5 h-5" />Added!</>
            ) : (
              <><Package className="w-5 h-5" />Add to Cart</>
            )}
          </button>
          {pp.showBuyNow && <button
            onClick={handleBuyNow}
            disabled={selectedStock <= 0 || addingToCart}
            className="flex-1 py-3 bg-white border-2 border-[#7FAF8E] text-[#7FAF8E] rounded-full font-semibold hover:bg-[#F7F7F5] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            Buy Now
          </button>}
        </div>
      </div>}
    </div>
    <div className="content-container pb-12">
      <ProductRecommendations
        productId={product.id}
        categoryId={product.category.slug}
        ageGroup={product.ageGroup}
      />
      <RecentlyViewedSection excludeId={product.id} />
    </div>
    </>
  );
}
