'use client';

import { useState, useEffect } from 'react';
import { readSavedCoupon, rememberCoupon } from '@/lib/saved-coupon';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Check, ChevronLeft, Loader2, Package, MapPin, CreditCard, ShoppingBag, Plus, Home, Building, MapPinned } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useCart } from '@/lib/cart-context';
import { useCartSyncState } from '@/lib/shop-actions';
import { useMoney } from '@/lib/currency-context';
import { COUNTRIES, HOME_COUNTRY, countryName, toCountryCode } from '@/lib/markets';
import { GuestSignIn } from '@/components/checkout/guest-sign-in';
import { PAYMENT_LABELS, PaymentMethodPicker, type PaymentMethodId, type PublicPaymentSettings } from '@/components/checkout/payment-methods';

declare global {
  interface Window {
    Razorpay: any;
  }
}

const steps = ['Cart', 'Shipping', 'Payment', 'Review'];
// Kept in the address (?step=) so refresh and the browser's back button keep your place
const STEP_KEYS = ['', 'shipping', 'payment', 'review'];

const indianStates = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
];

interface CartItem {
  id: string;
  variant?: string;
  product: { id: string; name: string; slug: string; price: number; primaryImage?: string; images?: { url: string }[] };
  quantity: number;
}

interface Settings {
  policies?: { returnWindowDays: number; giftWrapCharge: number; codFee: number };
  freeShippingAbove: number;
  baseShippingRate: number;
  payment?: PublicPaymentSettings;
}

interface SavedAddress {
  id: string;
  name: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  type: 'HOME' | 'OFFICE' | 'OTHER';
  isDefault: boolean;
  country?: string;
}

export default function CheckoutPage() {
  const router = useRouter();
  const money = useMoney();
  const { format: formatPrice } = money;
  const { data: session, status } = useSession();

  const [currentStep, setStepState] = useState(1);
  useEffect(() => {
    const read = () => {
      const i = STEP_KEYS.indexOf(new URLSearchParams(window.location.search).get('step') || '');
      setStepState(i > 0 ? i : 1);
    };
    read();
    window.addEventListener('popstate', read);
    return () => window.removeEventListener('popstate', read);
  }, []);
  const setCurrentStep = (n: number) => {
    setStepState(n);
    const url = new URL(window.location.href);
    url.searchParams.set('step', STEP_KEYS[n]);
    window.history.pushState(null, '', url);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const [loading, setLoading] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartLoading, setCartLoading] = useState(true);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [showNewAddressForm, setShowNewAddressForm] = useState(true);

  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponError, setCouponError] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);

  // Loyalty points
  const [loyaltyBalance, setLoyaltyBalance] = useState(0);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const [appliedPoints, setAppliedPoints] = useState(0);
  const [pointsDiscount, setPointsDiscount] = useState(0);
  const [pointsError, setPointsError] = useState('');

  const [formData, setFormData] = useState({
    shippingName: '',
    shippingPhone: '',
    shippingAddressLine1: '',
    shippingAddressLine2: '',
    shippingCity: '',
    shippingState: '',
    shippingPincode: '',
    shippingCountry: 'IN',
    paymentMethod: '' as PaymentMethodId | '',
    customerNotes: '',
    saveAddress: false,
    addressType: 'HOME' as 'HOME' | 'OFFICE' | 'OTHER',
    giftWrap: false,
    giftMessage: '',
    shippingOptionId: '',
    billingSameAsShipping: true,
    billingName: '',
    billingAddressLine1: '',
    billingAddressLine2: '',
    billingCity: '',
    billingState: '',
    billingPincode: '',
  });

  // Fetch cart items once a just-signed-in guest's cart has been merged (CartSync)
  const { syncedFor } = useCartSyncState();
  const cartReady = !!session?.user?.id && syncedFor === session.user.id;
  const clearLocalCart = useCart((s) => s.clearCart);
  useEffect(() => {
    if (!cartReady) return;
    async function fetchCart() {
      try {
        const res = await fetch('/api/cart');
        if (res.ok) {
          const data = await res.json();
          setCartItems(data.cartItems || []);
        }
      } catch (err) {
        console.error('Failed to fetch cart:', err);
      } finally {
        setCartLoading(false);
      }
    }
    fetchCart();
  }, [cartReady]);

  // Shoppers abroad start with their own country selected (when we ship there)
  useEffect(() => {
    if (money.ready && money.international && money.country && money.country !== HOME_COUNTRY) {
      setFormData(prev => (prev.shippingCountry === HOME_COUNTRY && !prev.shippingAddressLine1 ? { ...prev, shippingCountry: money.country! } : prev));
    }
  }, [money.ready, money.international, money.country]);

  const isHome = formData.shippingCountry === HOME_COUNTRY;

  // Payment options depend on the destination: India (Razorpay/UPI/COD) or abroad (card via Stripe)


  // Fetch settings and saved addresses
  useEffect(() => {
    async function fetchData() {
      try {
        const [settingsRes, addressesRes] = await Promise.all([
          fetch('/api/settings'),
          fetch('/api/addresses'),
        ]);

        if (settingsRes.ok) {
          const data = await settingsRes.json();
          setSettings(data);
          const firstMethod = data.payment?.methods?.[0];
          if (firstMethod) setFormData(prev => (prev.paymentMethod ? prev : { ...prev, paymentMethod: firstMethod }));
        }

        if (addressesRes.ok) {
          const data = await addressesRes.json();
          setSavedAddresses(data.addresses || []);
          // Auto-select default address
          const defaultAddr = (data.addresses || []).find((a: SavedAddress) => a.isDefault);
          if (defaultAddr) {
            setSelectedAddressId(defaultAddr.id);
            populateFormFromAddress(defaultAddr);
          } else if (data.addresses?.length > 0) {
            setSelectedAddressId(data.addresses[0].id);
            populateFormFromAddress(data.addresses[0]);
          }
        }
      } catch (err) {
        console.error('Failed to fetch data:', err);
      }
    }
    if (status === 'authenticated') {
      fetchData();
    }
  }, [status]);

  const populateFormFromAddress = (address: SavedAddress) => {
    setFormData(prev => ({
      ...prev,
      shippingName: address.name,
      shippingPhone: address.phone,
      shippingAddressLine1: address.addressLine1,
      shippingAddressLine2: address.addressLine2 || '',
      shippingCity: address.city,
      shippingState: address.state,
      shippingPincode: address.pincode,
      shippingCountry: toCountryCode(address.country),
    }));
  };

  const handleSelectAddress = (address: SavedAddress) => {
    setSelectedAddressId(address.id);
    setShowNewAddressForm(false);
    populateFormFromAddress(address);
  };

  const handleUseNewAddress = () => {
    setSelectedAddressId('');
    setShowNewAddressForm(true);
    setFormData(prev => ({
      ...prev,
      shippingName: '',
      shippingPhone: '',
      shippingAddressLine1: '',
      shippingAddressLine2: '',
      shippingCity: '',
      shippingState: '',
      shippingPincode: '',
    }));
  };

  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    return () => { document.body.removeChild(script); };
  }, []);

  // Calculate totals (INR; shown in the shopper's currency). The server's quote (same
  // calculation the order uses, incl. bundle savings) replaces these estimates once loaded.
  const localSubtotal = cartItems.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0);
  const subtotal = localSubtotal;
  const localShipping = isHome
    ? (subtotal >= (settings?.freeShippingAbove || 499) ? 0 : (settings?.baseShippingRate || 49))
    : money.shipping
      ? (money.shipping.freeAbove != null && subtotal >= money.shipping.freeAbove ? 0 : money.shipping.rate)
      : 0;
  const giftWrapPrice = settings?.policies?.giftWrapCharge ?? 49;
  const giftWrapCharge = formData.giftWrap ? giftWrapPrice : 0;

  const [quote, setQuote] = useState<{
    subtotal: number; shippingCharge: number; bundleDiscount: number; couponDiscount: number; pointsDiscount: number;
    groupDiscount?: number; group?: { name: string; percent: number } | null; total: number;
    shippingOptions?: { id: string; name: string; charge: number; minDays: number; maxDays: number }[];
    shippingOption?: { id: string; name: string } | null;
    paymentMethods?: PaymentMethodId[]; codFee?: number; giftWrapCharge?: number;
  } | null>(null);
  const [quoteError, setQuoteError] = useState('');
  const quoteKey = JSON.stringify([cartItems.map((i) => [i.product.id, i.quantity]), appliedCoupon?.code, appliedPoints, formData.shippingCountry, formData.giftWrap, formData.shippingOptionId, formData.paymentMethod]);
  useEffect(() => {
    if (cartItems.length === 0) return;
    const controller = new AbortController();
    fetch('/api/checkout/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({ couponCode: appliedCoupon?.code || null, pointsToRedeem: appliedPoints || 0, country: formData.shippingCountry, giftWrap: formData.giftWrap, currency: money.currency, shippingOptionId: formData.shippingOptionId || null, paymentMethod: formData.paymentMethod || null }),
    })
      .then(async (r) => ({ ok: r.ok, q: await r.json().catch(() => null) }))
      .then(({ ok, q }) => {
        if (ok && q && typeof q.total === 'number') { setQuote(q); setQuoteError(''); }
        else if (q?.error) setQuoteError(q.error); // e.g. no delivery to this country
      })
      .catch(() => {});
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteKey]);

  const shippingCharge = quote?.shippingCharge ?? localShipping;
  const bundleSavings = quote?.bundleDiscount ?? 0;
  const groupSavings = quote?.groupDiscount ?? 0;
  const discountAmount = bundleSavings + groupSavings + (quote?.couponDiscount ?? (appliedCoupon?.discountAmount || 0)) + (quote?.pointsDiscount ?? pointsDiscount);
  const total = quote?.total ?? (localSubtotal + localShipping + giftWrapCharge - discountAmount);
  // Payment methods come from the destination's region (via the quote); until it loads, a best guess
  const paymentOptions: PublicPaymentSettings | undefined = settings?.payment
    ? { ...settings.payment, methods: quote?.paymentMethods ?? (isHome ? settings.payment.methods : (settings.payment.internationalMethods || [])) }
    : undefined;
  const methodKey = (paymentOptions?.methods || []).join(',');
  useEffect(() => {
    const methods = paymentOptions?.methods || [];
    setFormData(prev => (methods.includes(prev.paymentMethod as PaymentMethodId) ? prev : { ...prev, paymentMethod: methods[0] || '' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [methodKey]);
  const deliveryOptions = quote?.shippingOptions || [];
  const chosenDelivery = quote?.shippingOption?.id || '';

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError('');
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode, subtotal, currency: money.currency }),
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        setAppliedCoupon(data.coupon);
        rememberCoupon(data.coupon.code);
        setCouponCode('');
      } else {
        setCouponError(data.error || 'Invalid coupon');
      }
    } catch (err) {
      setCouponError('Failed to validate coupon');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponError('');
    rememberCoupon('');
  };

  // A coupon entered on the cart page is applied here automatically once the cart is loaded.
  useEffect(() => {
    if (cartLoading || cartItems.length === 0 || appliedCoupon) return;
    const saved = readSavedCoupon();
    if (!saved) return;
    fetch('/api/coupons/validate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: saved, currency: money.currency }) })
      .then((r) => r.json().then((data) => ({ ok: r.ok, data })))
      .then(({ ok, data }) => {
        if (ok && data.valid) setAppliedCoupon(data.coupon);
        else { rememberCoupon(''); setCouponError(data.error || 'Your saved coupon could not be applied'); }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartLoading, cartItems.length]);

  // Fetch loyalty balance when authenticated
  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/loyalty').then(r => r.json()).then(d => setLoyaltyBalance(d.balance || 0)).catch(() => {});
    }
  }, [status]);

  const handleApplyPoints = async () => {
    if (!pointsToRedeem || pointsToRedeem < 50) { setPointsError('Minimum 50 points required'); return; }
    setPointsError('');
    const res = await fetch('/api/loyalty/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pointsToRedeem, orderTotal: subtotal + shippingCharge }),
    });
    const data = await res.json();
    if (res.ok && data.valid) {
      setAppliedPoints(data.pointsToRedeem);
      setPointsDiscount(data.discountAmount);
    } else {
      setPointsError(data.error || 'Cannot apply points');
    }
  };

  const handleRemovePoints = () => { setAppliedPoints(0); setPointsDiscount(0); setPointsToRedeem(0); };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const target = e.target;
    const name = target.name;
    const value = target.type === 'checkbox' ? (target as HTMLInputElement).checked : target.value;
    setFormData({ ...formData, [name]: value });
  };

  const [stepError, setStepError] = useState('');
  const addressProblem = () => {
    const f = formData;
    if (!f.shippingName.trim() || !f.shippingPhone.trim() || !f.shippingAddressLine1.trim() || !f.shippingCity.trim() || !f.shippingPincode.trim()) return 'Please fill in the name, phone, address, city and PIN code.';
    if (isHome && !f.shippingState) return 'Please choose a state.';
    if (isHome && !/^[0-9]{6}$/.test(f.shippingPincode.trim())) return 'PIN code should be 6 digits.';
    if (!f.billingSameAsShipping && (!f.billingName.trim() || !f.billingAddressLine1.trim() || !f.billingCity.trim() || !f.billingPincode.trim())) return 'Please complete the billing address, or tick "same as shipping".';
    return '';
  };
  const handleNext = () => {
    if (currentStep === 1) {
      const problem = addressProblem();
      setStepError(problem);
      if (problem) return;
    }
    if (currentStep === 2 && !formData.paymentMethod) return;
    setStepError('');
    if (currentStep < 3) setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) window.history.back();
  };

  const handlePayment = async (payment: { orderId: string; keyId: string; amount: number; currency: string; shopOrderId: string }) => {
    const options = {
      key: payment.keyId,
      amount: payment.amount,
      currency: payment.currency,
      name: (settings as { storeName?: string } | null)?.storeName || 'Order',
      description: 'Order Payment',
      order_id: payment.orderId,
      notes: { order_id: payment.shopOrderId },
      handler: async (response: any) => {
        try {
          const verifyRes = await fetch('/api/verify-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });
          if (verifyRes.ok) {
            router.push('/checkout/success');
          } else {
            alert('Payment verification failed. Please contact support.');
          }
        } catch (err) {
          console.error('Verification error:', err);
          alert('Something went wrong. Please contact support.');
        }
      },
      prefill: { name: formData.shippingName, email: session?.user?.email, contact: formData.shippingPhone },
      theme: { color: '#FF6B9D' },
    };
    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  const handleSubmit = async () => {
    if (cartItems.length === 0) { alert('Your cart is empty'); return; }
    const problem = addressProblem();
    if (problem) { setStepError(problem); setCurrentStep(1); return; }
    setLoading(true);
    try {
      // Save address if requested
      if (formData.saveAddress) {
        const addrRes = await fetch('/api/addresses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.shippingName,
            phone: formData.shippingPhone,
            addressLine1: formData.shippingAddressLine1,
            addressLine2: formData.shippingAddressLine2,
            city: formData.shippingCity,
            state: formData.shippingState,
            pincode: formData.shippingPincode,
            country: countryName(formData.shippingCountry),
            type: formData.addressType,
            isDefault: savedAddresses.length === 0,
          }),
        });
        
        if (!addrRes.ok) {
          const addrErr = await addrRes.json();
          console.error('Failed to save address:', addrErr);
        }
      }

      const orderRes = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          subtotal,
          shippingCharge,
          total,
          paymentMethod: formData.paymentMethod,
          shippingCountry: formData.shippingCountry,
          currency: money.currency,
          // The server works out the discount from these (amounts sent from here are ignored)
          couponCode: appliedCoupon?.code || null,
          pointsToRedeem: appliedPoints || 0,
          customerNotes: formData.customerNotes,
          giftWrap: formData.giftWrap,
          giftMessage: formData.giftMessage,
          items: cartItems.map(item => ({
            productId: item.product.id,
            productName: item.product.name,
            productSku: item.product.slug,
            productImage: item.product.primaryImage || item.product.images?.[0]?.url,
            price: Number(item.product.price),
            quantity: item.quantity,
          })),
        }),
      });

      if (!orderRes.ok) {
        const err = await orderRes.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to create order');
      }

      const orderData = await orderRes.json();
      clearLocalCart(); // the order API has emptied the account cart
      rememberCoupon('');

      if (formData.paymentMethod === 'STRIPE') {
        const stripeRes = await fetch('/api/stripe/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: orderData.id }),
        });
        const stripeData = await stripeRes.json().catch(() => ({}));
        if (stripeRes.ok && stripeData.url) {
          window.location.href = stripeData.url;
          return;
        }
        alert(stripeData.error || 'We could not start the card payment. Your order is saved — please contact us to complete it.');
        router.push('/checkout/success');
      } else if (formData.paymentMethod === 'RAZORPAY') {
        const paymentRes = await fetch('/api/create-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: orderData.id }),
        });
        if (paymentRes.ok) {
          const paymentData = await paymentRes.json();
          await handlePayment(paymentData);
        } else {
          alert('We could not start the online payment. Your order is saved — please contact us on WhatsApp to complete it.');
          router.push('/checkout/success');
        }
      } else {
        router.push('/checkout/success');
      }
    } catch (err) {
      console.error('Order error:', err);
      alert(err instanceof Error && err.message ? err.message : 'Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'unauthenticated') {
    return <GuestSignIn />;
  }

  if (cartLoading) {
    return (
      <div className="min-h-screen bg-[#F7F7F5] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#7FAF8E]" />
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-[#F7F7F5] flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-sm p-8 max-w-md text-center">
          <ShoppingBag className="w-16 h-16 mx-auto text-[#E5E5E5] mb-4" />
          <h2 className="text-xl font-bold text-[#333333] mb-4">Your Cart is Empty</h2>
          <p className="text-[#777777] mb-6">Add some products before checkout.</p>
          <Link href="/products" className="inline-block bg-[#7FAF8E] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#6A9B7D]">Browse Products</Link>
        </div>
      </div>
    );
  }

  const getAddressIcon = (type: string) => {
    switch (type) {
      case 'HOME': return <Home className="w-4 h-4" />;
      case 'OFFICE': return <Building className="w-4 h-4" />;
      default: return <MapPinned className="w-4 h-4" />;
    }
  };

  return (
    <div className="bg-[#F7F7F5] min-h-screen">
      {/* Progress Steps */}
      <div className="bg-white border-b border-[#E5E5E5]">
        <div className="content-container py-4">
          <div className="flex items-center justify-center">
            {steps.map((step, index) => (
              <div key={step} className="flex items-center">
                <button type="button" disabled={index >= currentStep}
                  onClick={() => (index === 0 ? router.push('/cart') : setCurrentStep(index))}
                  aria-label={index < currentStep ? `Back to ${step}` : step}
                  className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${index < currentStep ? 'bg-[#7FAF8E] text-white hover:bg-[#6A9B7D]' : index === currentStep ? 'bg-[#AFC8B8] text-white border-2 border-[#7FAF8E]' : 'bg-[#E5E5E5] text-[#777777]'}`}>
                  {index < currentStep ? <Check className="w-4 h-4" /> : index + 1}
                </button>
                <span className={`ml-2 hidden sm:inline ${index <= currentStep ? 'text-[#333333]' : 'text-[#777777]'}`}>{step}</span>
                {index < steps.length - 1 && <div className={`w-8 sm:w-16 h-0.5 mx-2 sm:mx-4 ${index < currentStep ? 'bg-[#7FAF8E]' : 'bg-[#E5E5E5]'}`} />}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="content-container py-8">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-[#777777] hover:text-[#333333] mb-6">
          <ChevronLeft className="w-4 h-4" /> Back
        </button>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_416px] lg:gap-10 xl:gap-16">
          {/* Form */}
          <div className="min-w-0">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#E5E5E5]">
              {/* Step 1: Shipping */}
              {currentStep === 1 && (
                <div>
                  <h2 className="text-xl font-bold text-[#333333] mb-6 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-[#7FAF8E]" /> Shipping Address
                  </h2>

                  {/* Saved Addresses */}
                  {savedAddresses.length > 0 && !showNewAddressForm && (
                    <div className="mb-6">
                      <h3 className="text-sm font-medium text-[#777777] mb-3">Your Saved Addresses</h3>
                      <div className="space-y-3">
                        {savedAddresses.map((address) => (
                          <label
                            key={address.id}
                            className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                              selectedAddressId === address.id
                                ? 'border-[#7FAF8E] bg-[#F8F6F2]'
                                : 'border-[#E5E5E5] hover:border-[#AFC8B8]'
                            }`}
                          >
                            <input
                              type="radio"
                              name="savedAddress"
                              value={address.id}
                              checked={selectedAddressId === address.id}
                              onChange={() => handleSelectAddress(address)}
                              className="mt-1 w-4 h-4 text-[#7FAF8E]"
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                {getAddressIcon(address.type)}
                                <span className="font-medium text-[#333333]">{address.name}</span>
                                {address.isDefault && (
                                  <span className="text-xs bg-[#AFC8B8] text-[#333333] px-2 py-0.5 rounded-full">Default</span>
                                )}
                              </div>
                              <p className="text-sm text-[#777777]">
                                {address.addressLine1}
                                {address.addressLine2 && `, ${address.addressLine2}`}
                              </p>
                              <p className="text-sm text-[#777777]">
                                {address.city}, {address.state} - {address.pincode}
                              </p>
                              <p className="text-sm text-[#777777]">Phone: {address.phone}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                      <button
                        onClick={handleUseNewAddress}
                        className="mt-4 flex items-center gap-2 text-[#7FAF8E] hover:text-[#6A9B7D] font-medium"
                      >
                        <Plus className="w-4 h-4" /> Add New Address
                      </button>
                    </div>
                  )}

                  {/* New Address Form */}
                  {(showNewAddressForm || savedAddresses.length === 0) && (
                    <>
                      {savedAddresses.length > 0 && (
                        <button
                          onClick={() => setShowNewAddressForm(false)}
                          className="mb-4 text-[#7FAF8E] hover:text-[#6A9B7D] text-sm"
                        >
                          ← Use saved address
                        </button>
                      )}
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-[#333333] mb-2">Full Name *</label>
                          <input type="text" name="shippingName" value={formData.shippingName} onChange={handleChange} required className="w-full px-4 py-3 rounded-xl border border-[#E5E5E5] focus:border-[#7FAF8E] focus:ring-2 focus:ring-[#AFC8B8] outline-none" placeholder="Recipient's name" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-[#333333] mb-2">Phone Number *</label>
                          <input type="tel" name="shippingPhone" value={formData.shippingPhone} onChange={handleChange} required className="w-full px-4 py-3 rounded-xl border border-[#E5E5E5] focus:border-[#7FAF8E] focus:ring-2 focus:ring-[#AFC8B8] outline-none" placeholder="+91 98765 43210" />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-[#333333] mb-2">Address Line 1 *</label>
                          <input type="text" name="shippingAddressLine1" value={formData.shippingAddressLine1} onChange={handleChange} required className="w-full px-4 py-3 rounded-xl border border-[#E5E5E5] focus:border-[#7FAF8E] focus:ring-2 focus:ring-[#AFC8B8] outline-none" placeholder="House/Flat No., Building Name" />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-[#333333] mb-2">Address Line 2</label>
                          <input type="text" name="shippingAddressLine2" value={formData.shippingAddressLine2} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-[#E5E5E5] focus:border-[#7FAF8E] focus:ring-2 focus:ring-[#AFC8B8] outline-none" placeholder="Street, Area, Landmark" />
                        </div>
                        {money.international && (
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-[#333333] mb-2">Country *</label>
                            <select name="shippingCountry" value={formData.shippingCountry} onChange={(e) => setFormData(prev => ({ ...prev, shippingCountry: e.target.value, shippingState: '' }))} className="w-full px-4 py-3 rounded-xl border border-[#E5E5E5] focus:border-[#7FAF8E] outline-none">
                              {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                            </select>
                          </div>
                        )}
                        <div>
                          <label className="block text-sm font-medium text-[#333333] mb-2">City *</label>
                          <input type="text" name="shippingCity" value={formData.shippingCity} onChange={handleChange} required className="w-full px-4 py-3 rounded-xl border border-[#E5E5E5] focus:border-[#7FAF8E] focus:ring-2 focus:ring-[#AFC8B8] outline-none" placeholder="Mumbai" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-[#333333] mb-2">{isHome ? 'State *' : 'State / Region'}</label>
                          {isHome ? (
                            <select name="shippingState" value={formData.shippingState} onChange={handleChange} required className="w-full px-4 py-3 rounded-xl border border-[#E5E5E5] focus:border-[#7FAF8E] outline-none">
                              <option value="">Select State</option>
                              {indianStates.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          ) : (
                            <input type="text" name="shippingState" value={formData.shippingState} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-[#E5E5E5] focus:border-[#7FAF8E] focus:ring-2 focus:ring-[#AFC8B8] outline-none" placeholder="e.g. California" />
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-[#333333] mb-2">{isHome ? 'PIN code *' : 'Postal / ZIP code *'}</label>
                          <input type="text" name="shippingPincode" value={formData.shippingPincode} onChange={handleChange} required className="w-full px-4 py-3 rounded-xl border border-[#E5E5E5] focus:border-[#7FAF8E] focus:ring-2 focus:ring-[#AFC8B8] outline-none" placeholder={isHome ? '400001' : 'e.g. 94105'} pattern={isHome ? '[0-9]{6}' : '[A-Za-z0-9 -]{3,10}'} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-[#333333] mb-2">Address Type</label>
                          <select name="addressType" value={formData.addressType} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-[#E5E5E5] focus:border-[#7FAF8E] outline-none">
                            <option value="HOME">Home</option>
                            <option value="OFFICE">Office</option>
                            <option value="OTHER">Other</option>
                          </select>
                        </div>
                        <div className="md:col-span-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" name="saveAddress" checked={formData.saveAddress} onChange={handleChange} className="w-4 h-4 text-[#7FAF8E] rounded" />
                            <span className="text-sm text-[#777777]">Save this address for future orders</span>
                          </label>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Billing address */}
                  <div className="mt-6 border-t border-[#E5E5E5] pt-5">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" name="billingSameAsShipping" checked={formData.billingSameAsShipping} onChange={handleChange} className="w-4 h-4 text-[#7FAF8E] rounded" />
                      <span className="text-sm text-[#333333]">Billing address is the same as shipping</span>
                    </label>
                    {!formData.billingSameAsShipping && (
                      <div className="grid md:grid-cols-2 gap-4 mt-4">
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-[#333333] mb-2">Name on the bill *</label>
                          <input type="text" name="billingName" value={formData.billingName} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-[#E5E5E5] focus:border-[#7FAF8E] focus:ring-2 focus:ring-[#AFC8B8] outline-none" placeholder="Name or company" />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-[#333333] mb-2">Address *</label>
                          <input type="text" name="billingAddressLine1" value={formData.billingAddressLine1} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-[#E5E5E5] focus:border-[#7FAF8E] focus:ring-2 focus:ring-[#AFC8B8] outline-none" />
                        </div>
                        <div className="md:col-span-2">
                          <input type="text" name="billingAddressLine2" value={formData.billingAddressLine2} onChange={handleChange} aria-label="Billing address line 2" className="w-full px-4 py-3 rounded-xl border border-[#E5E5E5] focus:border-[#7FAF8E] focus:ring-2 focus:ring-[#AFC8B8] outline-none" placeholder="Area, landmark (optional)" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-[#333333] mb-2">City *</label>
                          <input type="text" name="billingCity" value={formData.billingCity} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-[#E5E5E5] focus:border-[#7FAF8E] focus:ring-2 focus:ring-[#AFC8B8] outline-none" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-[#333333] mb-2">State</label>
                          <input type="text" name="billingState" value={formData.billingState} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-[#E5E5E5] focus:border-[#7FAF8E] focus:ring-2 focus:ring-[#AFC8B8] outline-none" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-[#333333] mb-2">PIN / postal code *</label>
                          <input type="text" name="billingPincode" value={formData.billingPincode} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-[#E5E5E5] focus:border-[#7FAF8E] focus:ring-2 focus:ring-[#AFC8B8] outline-none" />
                        </div>
                      </div>
                    )}
                  </div>
                  {stepError && <p role="alert" className="mt-4 text-sm text-red-600">{stepError}</p>}
                </div>
              )}

              {/* Step 2: Payment */}
              {currentStep === 2 && (
                <div>
                  <div className="mb-6 flex items-start justify-between gap-4 rounded-xl border border-[#E5E5E5] p-4">
                    <div className="text-sm">
                      <p className="font-medium text-[#333333]">Shipping to {formData.shippingName}</p>
                      <p className="text-[#777777]">{[formData.shippingAddressLine1, formData.shippingAddressLine2, formData.shippingCity, formData.shippingState, formData.shippingPincode].filter(Boolean).join(', ')}</p>
                    </div>
                    <button type="button" onClick={() => setCurrentStep(1)} className="text-sm font-medium text-[#7FAF8E] hover:text-[#6A9B7D]">Edit</button>
                  </div>

                  {/* Delivery options for this country (Admin → Settings → Regions) */}
                  {quoteError ? (
                    <p role="alert" className="mb-6 rounded-xl bg-red-50 p-4 text-sm text-red-600">{quoteError}</p>
                  ) : deliveryOptions.length > 0 && (
                    <div className="mb-6">
                      <h3 className="font-medium text-[#333333] mb-3">Delivery</h3>
                      <div className="space-y-2">
                        {deliveryOptions.map((o) => (
                          <label key={o.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-4 transition-colors ${chosenDelivery === o.id ? 'border-[#7FAF8E] bg-[#F8F6F2]' : 'border-[#E5E5E5] hover:border-[#AFC8B8]'}`}>
                            <input type="radio" name="shippingOptionId" value={o.id} checked={chosenDelivery === o.id} onChange={() => setFormData((prev) => ({ ...prev, shippingOptionId: o.id }))} className="h-4 w-4 text-[#7FAF8E]" />
                            <span className="flex-1">
                              <span className="block font-medium text-[#333333]">{o.name}</span>
                              <span className="text-sm text-[#777777]">{o.minDays === o.maxDays ? `${o.minDays}` : `${o.minDays}–${o.maxDays}`} working days</span>
                            </span>
                            <span className={o.charge === 0 ? 'font-medium text-[#7FAF8E]' : 'font-medium text-[#333333]'}>{o.charge === 0 ? 'FREE' : formatPrice(o.charge)}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Coupon Section */}
                  <div className="mb-6 p-4 bg-[#F7F7F5] rounded-xl">
                    <h3 className="font-medium text-[#333333] mb-3">Have a coupon?</h3>
                    {appliedCoupon ? (
                      <div className="flex items-center justify-between bg-[#E8F5E9] border border-[#AFC8B8] rounded-lg p-3">
                        <div>
                          <p className="font-medium text-[#7FAF8E]">{appliedCoupon.code}</p>
                          <p className="text-sm text-[#777777]">{appliedCoupon.discountType === 'PERCENTAGE' ? `${appliedCoupon.discountValue}% off` : `${formatPrice(appliedCoupon.discountValue)} off`} - Save {formatPrice(appliedCoupon.discountAmount)}</p>
                        </div>
                        <button onClick={handleRemoveCoupon} className="text-red-500 hover:text-[#E67B5A] text-sm font-medium">Remove</button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input type="text" value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} placeholder="Enter coupon code" className="flex-1 px-4 py-2 rounded-lg border border-[#E5E5E5] focus:border-[#7FAF8E] outline-none" />
                        <button onClick={handleApplyCoupon} disabled={couponLoading || !couponCode.trim()} className="px-4 py-2 bg-[#7FAF8E] text-white rounded-lg font-medium hover:bg-[#6A9B7D] disabled:opacity-50">{couponLoading ? '...' : 'Apply'}</button>
                      </div>
                    )}
                    {couponError && <p className="text-red-500 text-sm mt-2">{couponError}</p>}
                  </div>

                  {/* Loyalty Points */}
                  {loyaltyBalance >= 50 && (
                    <div className="mb-6 p-4 bg-[#F7F7F5] rounded-xl">
                      <h3 className="font-medium text-[#333333] mb-1 flex items-center gap-2">
                        ⭐ Loyalty Points
                        <span className="text-xs text-[#7FAF8E] font-normal">({loyaltyBalance} pts available = {formatPrice(loyaltyBalance)})</span>
                      </h3>
                      {appliedPoints > 0 ? (
                        <div className="flex items-center justify-between bg-[#DDEBE7] border border-[#AFC8B8] rounded-lg p-3">
                          <p className="text-sm text-[#7FAF8E] font-medium">{appliedPoints} points applied — Save {formatPrice(pointsDiscount)}</p>
                          <button onClick={handleRemovePoints} className="text-red-500 text-sm font-medium">Remove</button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <input type="number" value={pointsToRedeem || ''} onChange={e => setPointsToRedeem(Number(e.target.value))}
                            placeholder={`Min 50, max ${loyaltyBalance}`} max={loyaltyBalance} min={50}
                            className="flex-1 px-4 py-2 rounded-lg border border-[#E5E5E5] focus:border-[#7FAF8E] outline-none text-sm" />
                          <button onClick={handleApplyPoints} className="px-4 py-2 bg-[#7FAF8E] text-white rounded-lg font-medium hover:bg-[#6A9B7D] text-sm">Apply</button>
                        </div>
                      )}
                      {pointsError && <p className="text-red-500 text-sm mt-2">{pointsError}</p>}
                    </div>
                  )}

                  <h2 className="text-xl font-bold text-[#333333] mb-6 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-[#7FAF8E]" /> Payment Method
                  </h2>
                  <PaymentMethodPicker
                    settings={settings ? paymentOptions ?? { methods: [], upiId: '', upiInstructions: '' } : null}
                    value={formData.paymentMethod}
                    onChange={method => setFormData(prev => ({ ...prev, paymentMethod: method }))}
                  />
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-[#333333] mb-2">Order Notes (Optional)</label>
                    <textarea name="customerNotes" value={formData.customerNotes} onChange={handleChange} rows={3} className="w-full px-4 py-3 rounded-xl border border-[#E5E5E5] focus:border-[#7FAF8E] focus:ring-2 focus:ring-[#AFC8B8] outline-none" placeholder="Any special instructions for delivery..." />
                  </div>

                  {/* Gift Options */}
                  <div className="mt-4 p-4 bg-[#FFF8F0] rounded-xl border border-[#FFE4C4]">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" name="giftWrap" checked={formData.giftWrap} onChange={handleChange}
                        className="w-4 h-4 rounded accent-[#7FAF8E]" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-[#333333]">🎁 Gift Wrapping (+{formatPrice(giftWrapPrice)})</p>
                        <p className="text-xs text-[#777777]">Beautiful gift wrap with ribbon — perfect for gifting</p>
                      </div>
                    </label>
                    {formData.giftWrap && (
                      <div className="mt-3">
                        <label className="block text-xs font-medium text-[#555555] mb-1.5">Gift Message (Optional)</label>
                        <textarea name="giftMessage" value={formData.giftMessage} onChange={handleChange} rows={2}
                          className="w-full px-3 py-2 rounded-xl border border-[#E5E5E5] focus:border-[#7FAF8E] outline-none text-sm"
                          placeholder="Write a personal message for the recipient..." maxLength={200} />
                        <p className="text-xs text-[#767676] mt-1">{formData.giftMessage.length}/200</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 3: Confirm */}
              {currentStep === 3 && (
                <div>
                  <h2 className="text-xl font-bold text-[#333333] mb-6 flex items-center gap-2">
                    <Package className="w-5 h-5 text-[#7FAF8E]" /> Review & Confirm
                  </h2>
                  <div className="bg-[#F7F7F5] rounded-xl p-4 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-[#333333]">Shipping Address</h3>
                      <button type="button" onClick={() => setCurrentStep(1)} className="text-sm font-medium text-[#7FAF8E] hover:text-[#6A9B7D]">Edit</button>
                    </div>
                    <p className="text-[#777777]">
                      {formData.shippingName}<br />
                      {formData.shippingAddressLine1} {formData.shippingAddressLine2 && <>, {formData.shippingAddressLine2}</>}<br />
                      {formData.shippingCity}{formData.shippingState ? `, ${formData.shippingState}` : ''} - {formData.shippingPincode}{!isHome && <>, {countryName(formData.shippingCountry)}</>}<br />
                      Phone: {formData.shippingPhone}
                    </p>
                  </div>
                  {!formData.billingSameAsShipping && (
                    <div className="bg-[#F7F7F5] rounded-xl p-4 mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-[#333333]">Billing Address</h3>
                        <button type="button" onClick={() => setCurrentStep(1)} className="text-sm font-medium text-[#7FAF8E] hover:text-[#6A9B7D]">Edit</button>
                      </div>
                      <p className="text-[#777777]">{[formData.billingName, formData.billingAddressLine1, formData.billingAddressLine2, formData.billingCity, formData.billingState, formData.billingPincode].filter(Boolean).join(', ')}</p>
                    </div>
                  )}
                  <div className="bg-[#F7F7F5] rounded-xl p-4 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-[#333333]">Payment Method</h3>
                      <button type="button" onClick={() => setCurrentStep(2)} className="text-sm font-medium text-[#7FAF8E] hover:text-[#6A9B7D]">Edit</button>
                    </div>
                    <p className="text-[#777777]">
                      {formData.paymentMethod ? PAYMENT_LABELS[formData.paymentMethod] : 'Not selected'}
                    </p>
                  </div>
                  {formData.customerNotes && (
                    <div className="bg-[#F7F7F5] rounded-xl p-4">
                      <h3 className="font-medium text-[#333333] mb-2">Order Notes</h3>
                      <p className="text-[#777777]">{formData.customerNotes}</p>
                    </div>
                  )}
                  {formData.giftWrap && (
                    <div className="bg-[#FFF8F0] rounded-xl p-4 border border-[#FFE4C4]">
                      <h3 className="font-medium text-[#333333] mb-1">🎁 Gift Wrapping (+{formatPrice(giftWrapPrice)})</h3>
                      {formData.giftMessage && <p className="text-sm text-[#777777] italic">&quot;{formData.giftMessage}&quot;</p>}
                    </div>
                  )}
                </div>
              )}

              {/* Navigation */}
              <div className="flex justify-between mt-8 pt-6 border-t border-[#E5E5E5]">
                <button onClick={handleBack} disabled={currentStep === 1} className="px-6 py-3 rounded-xl border border-[#E5E5E5] text-[#777777] hover:bg-[#F7F7F5] disabled:opacity-50 disabled:cursor-not-allowed">Back</button>
                {currentStep < 3 ? (
                  <button onClick={handleNext} disabled={currentStep === 2 && !formData.paymentMethod} className="px-6 py-3 rounded-xl bg-[#7FAF8E] text-white font-semibold hover:bg-[#6A9B7D] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Continue</button>
                ) : (
                  <button onClick={handleSubmit} disabled={loading || !formData.paymentMethod} className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#7FAF8E] to-[#AFC8B8] text-white font-semibold hover:from-[#6A9B7D] hover:to-[#9BBBA8] transition-all disabled:opacity-50 flex items-center gap-2">
                    {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</> : <>Place Order 🎉</>}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:sticky lg:top-24 h-fit">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#E5E5E5]">
              <h2 className="text-lg font-bold text-[#333333] mb-4">Order Summary</h2>
              <div className="space-y-3 border-b border-[#E5E5E5] pb-4 mb-4">
                {cartItems.map(item => (
                  <div key={item.id} className="flex gap-3">
                    <div className="w-16 h-16 bg-[#F8F6F2] rounded-lg overflow-hidden flex-shrink-0">
                      {(item.product.primaryImage || item.product.images?.[0]?.url) && (
                        <img src={item.product.primaryImage || item.product.images?.[0]?.url} alt={item.product.name} className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-[#333333] text-sm line-clamp-2">{item.product.name}</p>
                      {item.variant && <p className="text-xs text-[#777777]">{item.variant}</p>}
                      <p className="text-sm text-[#777777]">Qty: {item.quantity}</p>
                      <p className="text-sm font-semibold text-[#7FAF8E]">{formatPrice(Number(item.product.price) * item.quantity)}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-[#777777]">Subtotal</span><span className="font-medium">{formatPrice(subtotal)}</span></div>
                <div className="flex justify-between"><span className="text-[#777777]">Shipping</span><span className={shippingCharge === 0 ? 'text-[#7FAF8E] font-medium' : ''}>{shippingCharge === 0 ? 'FREE' : formatPrice(shippingCharge)}</span></div>
                {formData.giftWrap && <div className="flex justify-between"><span className="text-[#777777]">🎁 Gift Wrapping</span><span>{formatPrice(quote?.giftWrapCharge ?? giftWrapPrice)}</span></div>}
                {(quote?.codFee ?? 0) > 0 && <div className="flex justify-between"><span className="text-[#777777]">Cash on delivery fee</span><span>{formatPrice(quote!.codFee!)}</span></div>}
                {bundleSavings > 0 && <div className="flex justify-between text-[#7FAF8E]"><span>Bundle savings</span><span>-{formatPrice(bundleSavings)}</span></div>}
                {groupSavings > 0 && <div className="flex justify-between text-[#7FAF8E]"><span>{quote?.group?.name} discount ({quote?.group?.percent}%)</span><span>-{formatPrice(groupSavings)}</span></div>}
                {appliedCoupon && <div className="flex justify-between text-[#7FAF8E]"><span>Discount ({appliedCoupon.code})</span><span>-{formatPrice(appliedCoupon.discountAmount)}</span></div>}
                {appliedPoints > 0 && <div className="flex justify-between text-[#7FAF8E]"><span>Points Redeemed ({appliedPoints} pts)</span><span>-{formatPrice(pointsDiscount)}</span></div>}
                <div className="flex justify-between pt-2 border-t border-[#E5E5E5] text-base font-bold"><span>Total</span><span className="text-[#7FAF8E]">{formatPrice(total)}</span></div>
              </div>
              <Link href="/cart" className="block text-center text-[#7FAF8E] hover:text-[#6A9B7D] text-sm mt-4">Edit Cart</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
