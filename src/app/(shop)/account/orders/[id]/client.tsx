'use client';

import { useEffect, useState } from 'react';
import { ShopEmoji } from '@/components/ui/shop-emoji';
import Link from 'next/link';
import { Check, Printer } from 'lucide-react';
import { formatOrderMoney } from '@/lib/markets';
import { ReturnRequest } from '@/components/account/return-request';
import { OrderActions } from '@/components/account/order-actions';
import { AccountHeader, AccountSection, StatusPill, accountButton } from '@/components/account/ui';

interface OrderItem {
  id: string;
  productName: string;
  variant?: string | null;
  productSku: string;
  price: number;
  quantity: number;
  product?: { id: string; slug: string; images: { url: string }[] };
}

interface Order {
  currency?: string;
  exchangeRate?: number | string;
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  subtotal: number;
  discount: number;
  couponCode?: string;
  gstAmount: number;
  shippingCharge: number;
  shippingMethod?: string | null;
  codFee?: number | string;
  giftWrap?: boolean;
  giftMessage?: string | null;
  total: number;
  createdAt: string;
  trackingNumber?: string;
  trackingUrl?: string;
  customerNotes?: string;
  shippingName: string;
  shippingPhone: string;
  shippingAddressLine1: string;
  shippingAddressLine2?: string;
  shippingCity: string;
  shippingState: string;
  shippingPincode: string;
  shippingCountry?: string;
  items: OrderItem[];
  statusHistory: { id: string; status: string; note?: string; createdAt: string }[];
}

const STEPS = [
  { key: 'PENDING', label: 'Placed' },
  { key: 'CONFIRMED', label: 'Confirmed' },
  { key: 'SHIPPED', label: 'Shipped' },
  { key: 'DELIVERED', label: 'Delivered' },
];
const STEP_OF: Record<string, number> = { PENDING: 0, CONFIRMED: 1, PROCESSING: 1, SHIPPED: 2, OUT_FOR_DELIVERY: 2, DELIVERED: 3 };
const PAYMENT: Record<string, string> = { RAZORPAY: 'Paid online (Razorpay)', UPI: 'UPI transfer', COD: 'Cash on delivery', STRIPE: 'Card (Stripe)' };

const fmtDate = (d: string) => new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
const fmtDateTime = (d: string) => new Date(d).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

export function OrderDetailClient({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/orders/${orderId}`)
      .then((r) => r.json())
      .then((data) => (data.error ? setError(data.error) : setOrder(data)))
      .catch(() => setError('Could not load this order'));
  }, [orderId]);

  if (error) {
    return (
      <div className="rounded-2xl bg-white px-6 py-12 text-center shadow-sm">
        <p className="text-text-secondary">{error}</p>
        <Link href="/account/orders" className={accountButton('secondary', 'mt-4')}>Back to orders</Link>
      </div>
    );
  }
  if (!order) return <div className="space-y-4">{[0, 1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-white" />)}</div>;

  const money = (inr: number | string) => formatOrderMoney(order, Number(inr));
  const ended = ['CANCELLED', 'RETURNED', 'REFUNDED'].includes(order.status);
  const step = STEP_OF[order.status] ?? 0;
  const paid = order.paymentStatus === 'COMPLETED';

  return (
    <div>
      <style>{`@media print { .no-print { display: none !important; } header, footer { display: none !important; } }`}</style>
      <AccountHeader
        title="Order details"
        description={<>Order <span className="font-medium text-text-primary">#{order.orderNumber}</span> · placed {fmtDate(order.createdAt)}</>}
        actions={
          <div className="no-print flex flex-wrap gap-2">
            <OrderActions orderId={order.id} status={order.status} items={order.items} onCancelled={() => setOrder({ ...order, status: 'CANCELLED' })} />
            <button onClick={() => window.print()} className="flex items-center gap-1.5 rounded-xl border border-[#E5E5E5] px-3 py-2 text-sm text-[#555555] hover:bg-[#F7F7F5]">
              <Printer className="h-4 w-4" /> Print
            </button>
          </div>
        }
      />

      {/* Progress */}
      <AccountSection>
        {ended ? (
          <div className="flex items-center gap-3"><StatusPill status={order.status} /><p className="text-sm text-text-secondary">This order was {order.status.toLowerCase()}.</p></div>
        ) : (
          <ol className="grid grid-cols-4">
            {STEPS.map((s, i) => {
              const done = i <= step;
              return (
                <li key={s.key} className="relative flex flex-col items-center text-center">
                  {i > 0 && <span className={`absolute right-1/2 top-3.5 h-0.5 w-full ${i <= step ? 'bg-primary-500' : 'bg-gray-200'}`} />}
                  <span className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${done ? 'bg-primary-500 text-white' : 'bg-gray-200 text-text-muted'}`}>
                    {done ? <Check className="h-4 w-4" /> : i + 1}
                  </span>
                  <span className={`mt-2 text-xs ${done ? 'font-medium text-text-primary' : 'text-text-muted'}`}>{s.label}</span>
                </li>
              );
            })}
          </ol>
        )}
        {order.trackingNumber && (
          <p className="mt-5 text-sm text-text-secondary">
            Tracking number <span className="font-medium text-text-primary">{order.trackingNumber}</span>
            {order.trackingUrl && <> · <a href={order.trackingUrl} target="_blank" rel="noreferrer" className="font-medium text-primary-500 hover:underline">Track parcel</a></>}
          </p>
        )}
      </AccountSection>

      {/* Items */}
      <AccountSection title="Items">
        <ul className="divide-y divide-gray-100">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-center gap-4 py-3 first:pt-0">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-50">
                {item.product?.images?.[0]?.url ? <img src={item.product.images[0].url} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-xl">{<ShopEmoji />}</div>}
              </div>
              <div className="min-w-0 flex-1">
                {item.product ? (
                  <Link href={`/products/${item.product.slug}`} className="block truncate text-sm font-medium text-text-primary hover:underline">{item.productName}</Link>
                ) : <p className="truncate text-sm font-medium text-text-primary">{item.productName}</p>}
                {item.variant && <p className="text-xs text-text-secondary">{item.variant}</p>}
                <p className="text-xs text-text-muted">{item.quantity} × {money(item.price)}</p>
              </div>
              <p className="text-sm font-medium text-text-primary">{money(Number(item.price) * item.quantity)}</p>
            </li>
          ))}
        </ul>
      </AccountSection>

      {/* Delivery and payment */}
      <AccountSection title="Delivery">
        <div className="grid gap-6 text-sm sm:grid-cols-3">
          <div>
            <p className="font-medium text-text-primary">Shipping address</p>
            <p className="mt-1 text-text-secondary">
              {order.shippingName}<br />
              {order.shippingAddressLine1}{order.shippingAddressLine2 ? `, ${order.shippingAddressLine2}` : ''}<br />
              {order.shippingCity}, {order.shippingState} {order.shippingPincode}{order.shippingCountry && order.shippingCountry !== 'India' ? `, ${order.shippingCountry}` : ''}
            </p>
          </div>
          <div>
            <p className="font-medium text-text-primary">Contact</p>
            <p className="mt-1 text-text-secondary">{order.shippingPhone}</p>
          </div>
          <div>
            <p className="font-medium text-text-primary">Method</p>
            <p className="mt-1 text-text-secondary">{order.shippingMethod || 'Standard delivery'} · {Number(order.shippingCharge) === 0 ? 'Free' : money(order.shippingCharge)}</p>
          </div>
        </div>
      </AccountSection>

      <AccountSection title="Payment">
        <div className="grid gap-6 text-sm sm:grid-cols-3">
          <div>
            <p className="font-medium text-text-primary">Method</p>
            <p className="mt-1 text-text-secondary">{PAYMENT[order.paymentMethod] || order.paymentMethod}</p>
          </div>
          <div>
            <p className="font-medium text-text-primary">Status</p>
            <p className="mt-1 text-text-secondary">{paid ? 'Paid' : order.paymentStatus === 'REFUNDED' ? 'Refunded' : order.paymentMethod === 'COD' ? 'Pay when it arrives' : 'Awaiting payment'}</p>
          </div>
        </div>
      </AccountSection>

      {/* Summary */}
      <AccountSection title="Order summary">
        <dl className="max-w-sm space-y-2 text-sm">
          <div className="flex justify-between"><dt className="text-text-secondary">Subtotal</dt><dd className="text-text-primary">{money(order.subtotal)}</dd></div>
          {Number(order.discount) > 0 && <div className="flex justify-between"><dt className="text-text-secondary">Discount{order.couponCode ? ` (${order.couponCode})` : ''}</dt><dd className="text-primary-600">− {money(order.discount)}</dd></div>}
          <div className="flex justify-between"><dt className="text-text-secondary">Shipping</dt><dd className="text-text-primary">{Number(order.shippingCharge) === 0 ? 'Free' : money(order.shippingCharge)}</dd></div>
          {Number(order.codFee || 0) > 0 && <div className="flex justify-between"><dt className="text-text-secondary">Cash on delivery fee</dt><dd className="text-text-primary">{money(order.codFee!)}</dd></div>}
          {order.giftWrap && <div className="flex justify-between"><dt className="text-text-secondary">Gift wrap</dt><dd className="text-text-primary">Yes</dd></div>}
          <div className="flex justify-between text-xs"><dt className="text-text-muted">GST included</dt><dd className="text-text-muted">{money(order.gstAmount)}</dd></div>
          <div className="flex justify-between border-t border-gray-200 pt-2 text-base font-semibold"><dt className="text-text-primary">Total</dt><dd className="text-text-primary">{money(order.total)}</dd></div>
        </dl>
      </AccountSection>

      {order.status === 'DELIVERED' && <div className="mb-6"><ReturnRequest orderId={order.id} /></div>}

      {order.statusHistory.length > 0 && (
        <AccountSection title="Updates" className="no-print">
          <ol className="space-y-3">
            {[...order.statusHistory].reverse().map((h) => (
              <li key={h.id} className="flex gap-3 text-sm">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary-400" />
                <div>
                  <p className="text-text-primary">{h.note && !h.note.startsWith('Status updated to') ? h.note : `Marked as ${h.status.toLowerCase().replace(/_/g, ' ')}`}</p>
                  <p className="text-xs text-text-muted">{fmtDateTime(h.createdAt)}</p>
                </div>
              </li>
            ))}
          </ol>
        </AccountSection>
      )}

      {(order.customerNotes || order.giftMessage) && (
        <AccountSection title="Your notes">
          {order.customerNotes && <p className="text-sm text-text-secondary">{order.customerNotes}</p>}
          {order.giftMessage && <p className="mt-2 text-sm italic text-text-secondary">Gift message: “{order.giftMessage}”</p>}
        </AccountSection>
      )}
    </div>
  );
}
