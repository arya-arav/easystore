'use client';

import { useEffect, useState } from 'react';
import { ShopEmoji } from '@/components/ui/shop-emoji';
import { useSettings } from '@/lib/settings-context';
import Link from 'next/link';
import { CheckCircle, MapPin, CreditCard, Package, ArrowRight, ShoppingBag } from 'lucide-react';
import { convertFromInr, formatMoney } from '@/lib/markets';
import { PAYMENT_LABELS, UpiPaymentDetails, type PaymentMethodId, type PublicPaymentSettings } from '@/components/checkout/payment-methods';

interface OrderItem {
  id: string;
  productName: string;
  productImage?: string | null;
  price: number;
  quantity: number;
  product?: { images: { url: string }[] };
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  subtotal: number;
  shippingCharge: number;
  shippingName: string;
  shippingAddressLine1: string;
  shippingAddressLine2?: string | null;
  shippingCity: string;
  shippingState: string;
  shippingPincode: string;
  shippingPhone: string;
  paymentMethod: string;
  paymentStatus: string;
  currency?: string;
  exchangeRate?: number | string;
  createdAt: string;
  items: OrderItem[];
}

export default function SuccessPage() {
  const { settings } = useSettings();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [payment, setPayment] = useState<PublicPaymentSettings | null>(null);

  // Back from Stripe: ?order=…&session_id=… (paid) or ?order=…&cancelled=1
  const [stripeState, setStripeState] = useState<'none' | 'checking' | 'paid' | 'pending' | 'cancelled'>('none');
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('order');
    const sessionId = params.get('session_id');
    const cancelled = params.get('cancelled') === '1';

    const loadOrder = () =>
      fetch('/api/orders')
        .then(r => r.json())
        .then(data => {
          const orders = data.orders || data;
          if (!Array.isArray(orders) || orders.length === 0) return;
          setOrder((orderId && orders.find((o: Order) => o.id === orderId)) || orders[0]);
        })
        .catch(() => {});

    (async () => {
      if (orderId && cancelled) setStripeState('cancelled');
      if (orderId && sessionId) {
        setStripeState('checking');
        const res = await fetch(`/api/stripe/verify?order=${encodeURIComponent(orderId)}&session_id=${encodeURIComponent(sessionId)}`).catch(() => null);
        const data = await res?.json().catch(() => null);
        setStripeState(data?.paid ? 'paid' : 'pending');
      }
      await loadOrder();
      setLoading(false);
    })();
    fetch('/api/settings')
      .then(r => r.json())
      .then(data => setPayment(data.payment || null))
      .catch(() => {});
  }, []);

  // Amounts are stored in INR; show them in the currency the order was placed in.
  const formatPrice = (inr: number) =>
    order ? formatMoney(convertFromInr(Number(inr) || 0, order.currency || 'INR', Number(order.exchangeRate) || 1), order.currency || 'INR') : '';

  const retryCardPayment = async () => {
    if (!order) return;
    setRetrying(true);
    const res = await fetch('/api/stripe/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId: order.id }) }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (data?.url) window.location.href = data.url;
    else setRetrying(false);
  };
  const paymentLabel = (method: string) => PAYMENT_LABELS[method as PaymentMethodId] || method;

  const paymentBadge = (o: Order) => {
    if (o.paymentStatus === 'COMPLETED') return { text: 'Paid', className: 'bg-[#E8F5E9] text-[#7FAF8E]' };
    if (o.paymentMethod === 'COD') return { text: 'Pay on Delivery', className: 'bg-[#FFF4EF] text-red-500' };
    return { text: 'Awaiting Payment', className: 'bg-[#FFF8E1] text-[#B7791F]' };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F7F5] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[#7FAF8E] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F7F5]">
      {/* Hero Banner */}
      <div className="bg-[#DDEBE7] px-4 py-10 md:py-14">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-[#333333] leading-tight">
              Order Confirmed!<br />
              <span className="font-normal text-[#555555]">Thank you for your purchase!</span>
            </h1>
            {order && (
              <div className="flex items-center gap-3 mt-4 flex-wrap">
                <p className="text-[#555555]">Your order number is: <span className="font-semibold text-[#333333]">#{order.orderNumber}</span></p>
                <Link href="/account/orders"
                  className="px-4 py-1.5 bg-white border border-[#C1D9D0] text-[#555555] rounded-full text-sm font-medium hover:bg-[#F0F9F4] transition-colors">
                  View Order Details
                </Link>
              </div>
            )}
            {!order && (
              <p className="text-[#777777] mt-3">Your order has been placed successfully.</p>
            )}
          </div>
          <div className="w-24 h-24 md:w-28 md:h-28 rounded-full border-4 border-[#AFC8B8] flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-14 h-14 md:w-16 md:h-16 text-[#7FAF8E]" strokeWidth={1.5} />
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="content-container max-w-5xl py-8">
        <div className="grid md:grid-cols-2 gap-6">
          {/* LEFT */}
          <div className="space-y-5">
            {/* Shipping Address */}
            {order && (
              <div className="bg-white rounded-2xl p-5 border border-[#E5E5E5]">
                <h2 className="text-base font-semibold text-[#333333] mb-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#7FAF8E]" /> Shipping Address
                </h2>
                <div className="p-3 bg-[#F7F7F5] rounded-xl text-sm text-[#555555] leading-relaxed">
                  <p className="font-medium text-[#333333]">{order.shippingName}</p>
                  <p>{order.shippingAddressLine1}{order.shippingAddressLine2 && `, ${order.shippingAddressLine2}`}</p>
                  <p>{order.shippingCity}, {order.shippingState} — {order.shippingPincode}</p>
                  <p className="mt-1 text-[#777777]">📞 {order.shippingPhone}</p>
                </div>
              </div>
            )}

            {/* Payment Method */}
            {order && (
              <div className="bg-white rounded-2xl p-5 border border-[#E5E5E5]">
                <h2 className="text-base font-semibold text-[#333333] mb-3 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-[#7FAF8E]" /> Payment Method
                </h2>
                <div className="p-3 bg-[#F7F7F5] rounded-xl flex items-center justify-between">
                  <p className="text-sm text-[#555555]">{paymentLabel(order.paymentMethod)}</p>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${paymentBadge(order).className}`}>
                    {paymentBadge(order).text}
                  </span>
                </div>
                {order.paymentMethod === 'STRIPE' && order.paymentStatus !== 'COMPLETED' && (
                  <div className="mt-3 rounded-xl bg-[#FFF8E1] p-3 text-sm text-[#7A5B12]">
                    {stripeState === 'checking' && 'Checking your card payment…'}
                    {stripeState === 'pending' && 'Your payment is being confirmed. This page will show "Paid" once it completes — no need to pay again.'}
                    {(stripeState === 'cancelled' || stripeState === 'none') && (
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <span>Your order is saved but not paid yet.</span>
                        <button onClick={retryCardPayment} disabled={retrying} className="rounded-full bg-[#7FAF8E] px-4 py-2 font-semibold text-white hover:bg-[#6A9B7D] disabled:opacity-60">
                          {retrying ? 'Opening…' : 'Pay by card'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {order.paymentMethod === 'UPI' && order.paymentStatus !== 'COMPLETED' && payment?.upiId && (
                  <div className="mt-3">
                    <p className="text-sm text-[#555555] mb-2">
                      Please pay now to confirm your order. Add your order number <span className="font-semibold">{order.orderNumber}</span> in the payment note.
                    </p>
                    <UpiPaymentDetails upiId={payment.upiId} instructions={payment.upiInstructions} amount={Number(order.total)} />
                  </div>
                )}
              </div>
            )}

            {/* What's next */}
            <div className="bg-white rounded-2xl p-5 border border-[#E5E5E5]">
              <h2 className="text-base font-semibold text-[#333333] mb-3">What&apos;s Next?</h2>
              <ul className="space-y-2.5 text-sm text-[#777777]">
                <li className="flex items-center gap-2"><span>📧</span> Email confirmation sent to your inbox</li>
                <li className="flex items-center gap-2"><span>📱</span> SMS updates on order status</li>
                <li className="flex items-center gap-2"><span>🚚</span> Track your order from your account</li>
              </ul>
            </div>
          </div>

          {/* RIGHT — Order Summary */}
          <div className="bg-white rounded-2xl p-5 border border-[#E5E5E5] h-fit">
            <h2 className="text-base font-semibold text-[#333333] mb-4 flex items-center gap-2">
              <Package className="w-4 h-4 text-[#7FAF8E]" /> Order Summary
            </h2>

            {order ? (
              <>
                <div className="space-y-3 mb-4">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 p-3 bg-[#F7F7F5] rounded-xl">
                      <div className="w-14 h-14 bg-[#EDE8DF] rounded-xl overflow-hidden flex-shrink-0">
                        {(item.productImage || item.product?.images?.[0]?.url)
                          ? <img src={item.productImage || item.product?.images?.[0]?.url} alt={item.productName} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center text-2xl">{<ShopEmoji />}</div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#333333] line-clamp-1">{item.productName}</p>
                        <p className="text-xs text-[#777777]">Qty: {item.quantity}</p>
                      </div>
                      <p className="text-sm font-semibold text-[#333333] flex-shrink-0">{formatPrice(item.price * item.quantity)}</p>
                    </div>
                  ))}
                </div>

                <div className="border-t border-[#E5E5E5] pt-4 space-y-2 text-sm">
                  <div className="flex justify-between text-[#777777]">
                    <span>Subtotal</span>
                    <span>{formatPrice(order.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-[#777777]">
                    <span>Shipping</span>
                    <span className={order.shippingCharge === 0 ? 'text-[#7FAF8E]' : ''}>
                      {order.shippingCharge === 0 ? 'FREE' : formatPrice(order.shippingCharge)}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-[#333333] text-base pt-1 border-t border-[#E5E5E5]">
                    <span>Total</span>
                    <span>{formatPrice(order.total)}</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-[#777777]">
                <ShoppingBag className="w-10 h-10 mx-auto mb-2 text-[#E5E5E5]" />
                <p className="text-sm">Order details will appear here</p>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/account/orders"
            className="flex items-center justify-center gap-2 px-6 py-3 bg-[#7FAF8E] text-white rounded-full font-semibold hover:bg-[#6A9B7D] transition-colors">
            View My Orders <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="/products"
            className="flex items-center justify-center gap-2 px-6 py-3 bg-white border border-[#E5E5E5] text-[#555555] rounded-full font-medium hover:bg-[#F7F7F5] transition-colors">
            Continue Shopping
          </Link>
        </div>

        <p className="text-center text-xs text-[#767676] mt-6">
          Need help? Contact us at <a href={`mailto:${settings.storeEmail}`} className="underline hover:text-[#7FAF8E]">{settings.storeEmail}</a>
        </p>
      </div>
    </div>
  );
}
