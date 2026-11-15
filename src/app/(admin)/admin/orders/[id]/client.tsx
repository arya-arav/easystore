'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Copy, ExternalLink, Printer } from 'lucide-react';
import {
  Badge, Button, Container, Field, Heading, Input, ORDER_STATUS_TONE, PAYMENT_STATUS_TONE, Row, SectionHeader, Select, StatusBadge,
  TwoColumn, cx, dateTime, humanize, inr,
} from '@/components/admin/ui';
import { Drawer, useConfirm } from '@/components/admin/overlays';
import { useBreadcrumb } from '../../../admin-layout';

const NOTE_PREFIX = 'Note: ';

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  paymentId: string | null;
  subtotal: string;
  discount: string;
  couponCode: string | null;
  pointsEarned: number;
  pointsRedeemed: number;
  gstAmount: string;
  shippingCharge: string;
  shippingMethod: string | null;
  codFee: string;
  total: string;
  currency: string;
  exchangeRate: string;
  createdAt: string;
  deliveredAt: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  customerNotes: string | null;
  giftWrap: boolean;
  giftMessage: string | null;
  shippingName: string;
  shippingPhone: string;
  shippingAddressLine1: string;
  shippingAddressLine2: string | null;
  shippingCity: string;
  shippingState: string;
  shippingPincode: string;
  shippingCountry: string;
  billingSameAsShipping: boolean;
  billingName: string | null;
  billingAddressLine1: string | null;
  billingAddressLine2: string | null;
  billingCity: string | null;
  billingState: string | null;
  billingPincode: string | null;
  user: { id: string; name: string | null; email: string; phone: string | null; _count: { orders: number } } | null;
  items: {
    id: string;
    productName: string;
    productSku: string;
    variant: string | null;
    price: string;
    quantity: number;
    product: { id: string; slug: string; images: { url: string }[] } | null;
  }[];
  statusHistory: { id: string; status: string; note: string | null; createdAt: string }[];
  refunds: { id: string; amount: string; reason: string; note: string | null; createdBy: string | null; createdAt: string }[];
  returns: { id: string; status: string; reason: string; customerNote: string | null; adminNote: string | null; items: string; requestedBy: string; createdAt: string }[];
}

const RETURN_TONE: Record<string, 'orange' | 'green' | 'red'> = { REQUESTED: 'orange', RECEIVED: 'green', REJECTED: 'red' };

const STATUSES = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'RETURNED', 'REFUNDED'];
const NEXT_STEP: Record<string, { status: string; label: string }> = {
  PENDING: { status: 'CONFIRMED', label: 'Confirm order' },
  CONFIRMED: { status: 'PROCESSING', label: 'Start packing' },
  PROCESSING: { status: 'SHIPPED', label: 'Mark as shipped' },
  SHIPPED: { status: 'OUT_FOR_DELIVERY', label: 'Out for delivery' },
  OUT_FOR_DELIVERY: { status: 'DELIVERED', label: 'Mark as delivered' },
};
const ENDED = ['CANCELLED', 'RETURNED', 'REFUNDED'];

const copy = (text: string, what: string) => {
  navigator.clipboard?.writeText(text).then(() => toast.success(`${what} copied`)).catch(() => {});
};

export function OrderDetail({ order, refundReasons: REFUND_REASONS, returnReasons: RETURN_REASONS }: { order: Order; refundReasons: string[]; returnReasons: string[] }) {
  const router = useRouter();
  const confirm = useConfirm();
  useBreadcrumb(`#${order.orderNumber}`);

  const [saving, setSaving] = useState<string | null>(null);
  const patch = async (key: string, body: Record<string, unknown>, done?: string) => {
    setSaving(key);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error || 'Could not save'); return false; }
      if (done) toast.success(done);
      router.refresh();
      return true;
    } finally {
      setSaving(null);
    }
  };

  const changeStatus = async (status: string) => {
    if (ENDED.includes(status)) {
      const ok = await confirm({
        title: `Mark this order as ${humanize(status).toLowerCase()}?`,
        description: 'Its items go back into stock and any loyalty points are reversed. This cannot be undone from here.',
        confirmText: `Mark ${humanize(status).toLowerCase()}`,
        danger: true,
      });
      if (!ok) return;
    }
    await patch('status', { status }, `Order marked as ${humanize(status).toLowerCase()}`);
  };

  // Fulfilment form
  const [status, setStatus] = useState(order.status);
  const [trackingNumber, setTrackingNumber] = useState(order.trackingNumber || '');
  const [trackingUrl, setTrackingUrl] = useState(order.trackingUrl || '');
  const fulfilmentDirty = status !== order.status || trackingNumber !== (order.trackingNumber || '') || trackingUrl !== (order.trackingUrl || '');

  // Notes
  const [note, setNote] = useState('');

  // Refund drawer
  const refunded = order.refunds.reduce((n, r) => n + Number(r.amount), 0);
  const refundable = Math.max(0, Math.round((Number(order.total) - refunded) * 100) / 100);
  const [refundOpen, setRefundOpen] = useState(false);
  const [refund, setRefund] = useState({ amount: '', reason: REFUND_REASONS[0], note: '' });

  // Return drawer
  const [returnOpen, setReturnOpen] = useState(false);
  const [returnable, setReturnable] = useState<{ id: string; productName: string; variant: string | null; returnable: number }[]>([]);
  const [returnQty, setReturnQty] = useState<Record<string, number>>({});
  const [returnForm, setReturnForm] = useState({ reason: RETURN_REASONS[0], note: '' });
  const openReturn = async () => {
    const res = await fetch(`/api/admin/orders/${order.id}/returns`);
    const data = await res.json().catch(() => ({ items: [] }));
    setReturnable(data.items || []);
    setReturnQty({});
    setReturnOpen(true);
  };
  const post = async (key: string, url: string, body: unknown, done: string, method = 'POST') => {
    setSaving(key);
    try {
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error || 'Could not save'); return false; }
      toast.success(done);
      router.refresh();
      return true;
    } finally {
      setSaving(null);
    }
  };
  const itemName = (id: string) => order.items.find((i) => i.id === id)?.productName || 'Item';

  // Address drawer
  const [addressOpen, setAddressOpen] = useState(false);
  const [address, setAddress] = useState({
    shippingName: order.shippingName, shippingPhone: order.shippingPhone, shippingAddressLine1: order.shippingAddressLine1,
    shippingAddressLine2: order.shippingAddressLine2 || '', shippingCity: order.shippingCity, shippingState: order.shippingState,
    shippingPincode: order.shippingPincode, shippingCountry: order.shippingCountry,
  });

  const next = NEXT_STEP[order.status];
  const paid = order.paymentStatus === 'COMPLETED';
  const foreign = order.currency !== 'INR' && Number(order.exchangeRate) > 0;
  const inCurrency = (n: number | string) =>
    new Intl.NumberFormat('en', { style: 'currency', currency: order.currency }).format(Number(n) * Number(order.exchangeRate));
  const addressText = [order.shippingName, order.shippingAddressLine1, order.shippingAddressLine2, `${order.shippingCity}, ${order.shippingState} ${order.shippingPincode}`, order.shippingCountry, order.shippingPhone].filter(Boolean).join('\n');

  const timeline = [
    ...order.statusHistory.map((h) => ({
      id: h.id,
      at: h.createdAt,
      kind: h.note?.startsWith(NOTE_PREFIX) ? 'note' : 'event',
      title: h.note?.startsWith(NOTE_PREFIX) ? 'Note' : h.note?.startsWith('Status updated to') ? `Marked as ${humanize(h.status).toLowerCase()}` : h.note || humanize(h.status),
      body: h.note?.startsWith(NOTE_PREFIX) ? h.note.slice(NOTE_PREFIX.length) : null,
    })),
    { id: 'placed', at: order.createdAt, kind: 'event', title: `Order placed · ${inr(order.total)}`, body: `${order.paymentMethod} · ${order.items.reduce((n, i) => n + i.quantity, 0)} item(s)` },
  ];

  const main = (
    <>
      {/* Header */}
      <Container>
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <Heading>#{order.orderNumber}</Heading>
              <button type="button" onClick={() => copy(order.orderNumber, 'Order number')} className="text-ui-muted hover:text-ui-fg" aria-label="Copy order number"><Copy className="h-3.5 w-3.5" /></button>
            </div>
            <p className="text-ui-subtle">{dateTime(order.createdAt)}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={order.paymentStatus} tones={PAYMENT_STATUS_TONE} />
            <StatusBadge status={order.status} tones={ORDER_STATUS_TONE} />
            <Button onClick={() => window.open(`/api/orders/${order.id}/invoice`, '_blank')}><Printer className="h-3.5 w-3.5" /> Invoice</Button>
            {next && <Button variant="primary" loading={saving === 'status'} onClick={() => changeStatus(next.status)}>{next.label}</Button>}
          </div>
        </div>
      </Container>

      {/* Summary */}
      <Container>
        <SectionHeader title="Summary" />
        <div className="divide-y divide-ui-border">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center gap-3 px-6 py-3">
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-ui-hover">
                {item.product?.images?.[0]?.url && <img src={item.product.images[0].url} alt="" className="h-full w-full object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                {item.product ? (
                  <Link href={`/admin/products/${item.product.id}`} className="block truncate font-medium hover:underline">{item.productName}</Link>
                ) : (
                  <p className="truncate font-medium">{item.productName}</p>
                )}
                <p className="truncate text-[12px] text-ui-subtle">{[item.variant, item.productSku].filter(Boolean).join(' · ')}</p>
              </div>
              <span className="whitespace-nowrap text-ui-subtle">{inr(item.price)} × {item.quantity}</span>
              <span className="w-24 text-right">{inr(Number(item.price) * item.quantity)}</span>
            </div>
          ))}
        </div>
        <div className="space-y-1.5 px-6 py-4">
          <Line label="Subtotal" value={inr(order.subtotal)} />
          {Number(order.discount) > 0 && <Line label={order.couponCode ? `Discounts (${order.couponCode})` : 'Discounts'} value={`− ${inr(order.discount)}`} />}
          {order.pointsRedeemed > 0 && <Line label="Loyalty points used" value={`${order.pointsRedeemed} pts`} muted />}
          <Line label={order.shippingMethod ? `Shipping (${order.shippingMethod})` : 'Shipping'} value={Number(order.shippingCharge) === 0 ? 'Free' : inr(order.shippingCharge)} />
          {Number(order.codFee) > 0 && <Line label="Cash on delivery fee" value={inr(order.codFee)} />}
          {order.giftWrap && <Line label="Gift wrap" value="Yes" />}
          <Line label="GST (included)" value={inr(order.gstAmount)} muted />
        </div>
        <div className="space-y-1 px-6 py-4">
          <Line label={<span className="font-medium text-ui-fg">Total</span>} value={<span className="font-medium">{inr(order.total)}</span>} />
          {foreign && <Line label={`Charged in ${order.currency}`} value={inCurrency(order.total)} muted />}
          <Line label={paid ? 'Paid by customer' : 'Outstanding'} value={inr(order.total)} muted />
          {order.pointsEarned > 0 && <Line label="Points earned" value={`${order.pointsEarned} pts${order.status === 'DELIVERED' ? '' : ' (credited on delivery)'}`} muted />}
        </div>
      </Container>

      {/* Payment */}
      <Container>
        <SectionHeader
          title="Payment"
          actions={
            <>
              {!paid && !ENDED.includes(order.status) && (
                <Button loading={saving === 'paid'} onClick={() => patch('paid', { paymentStatus: 'COMPLETED' }, 'Marked as paid')}>Mark as paid</Button>
              )}
              {refundable > 0 && (paid || refunded > 0) && (
                <Button onClick={() => { setRefund({ amount: String(refundable), reason: REFUND_REASONS[0], note: '' }); setRefundOpen(true); }}>Refund</Button>
              )}
            </>
          }
        />
        <Row label="Method">{order.paymentMethod}</Row>
        {order.refunds.length > 0 && (
          <div className="px-6 py-3">
            <p className="mb-1.5 font-medium text-ui-subtle">Refunds</p>
            {order.refunds.map((r) => (
              <div key={r.id} className="flex items-baseline justify-between gap-3 py-1">
                <span className="min-w-0">
                  <span>{r.reason}</span>
                  {r.note && <span className="text-ui-subtle"> · {r.note}</span>}
                  <span className="block text-[12px] text-ui-muted">{dateTime(r.createdAt)}{r.createdBy ? ` · ${r.createdBy}` : ''}</span>
                </span>
                <span className="whitespace-nowrap">− {inr(r.amount)}</span>
              </div>
            ))}
            <div className="mt-1 flex justify-between border-t border-ui-border pt-1.5 font-medium">
              <span>Net paid</span><span>{inr(Number(order.total) - refunded)}</span>
            </div>
          </div>
        )}
        <Row label="Status"><StatusBadge status={order.paymentStatus} tones={PAYMENT_STATUS_TONE} /></Row>
        {order.paymentId && (
          <Row label="Payment ID">
            <span className="inline-flex items-center gap-1.5 font-mono text-[12px]">{order.paymentId}
              <button type="button" onClick={() => copy(order.paymentId!, 'Payment ID')} className="text-ui-muted hover:text-ui-fg" aria-label="Copy payment ID"><Copy className="h-3.5 w-3.5" /></button>
            </span>
          </Row>
        )}
      </Container>

      {/* Fulfilment */}
      <Container>
        <SectionHeader
          title="Fulfilment"
          subtitle={order.deliveredAt ? `Delivered ${dateTime(order.deliveredAt)}` : undefined}
          actions={order.trackingUrl ? (
            <a href={order.trackingUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-ui-subtle hover:text-ui-fg">Track <ExternalLink className="h-3.5 w-3.5" /></a>
          ) : undefined}
        />
        <div className="grid gap-3 px-6 py-4 sm:grid-cols-3">
          <Field label="Status">
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUSES.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}
            </Select>
          </Field>
          <Field label="Tracking number">
            <Input value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} placeholder="e.g. 1234567890" />
          </Field>
          <Field label="Tracking link">
            <Input value={trackingUrl} onChange={(e) => setTrackingUrl(e.target.value)} placeholder="https://" />
          </Field>
        </div>
        <div className="flex justify-end gap-2 px-6 py-3">
          {fulfilmentDirty && <Button variant="transparent" onClick={() => { setStatus(order.status); setTrackingNumber(order.trackingNumber || ''); setTrackingUrl(order.trackingUrl || ''); }}>Reset</Button>}
          <Button variant="primary" disabled={!fulfilmentDirty} loading={saving === 'fulfilment'} onClick={async () => {
            if (status !== order.status && ENDED.includes(status)) {
              const ok = await confirm({ title: `Mark as ${humanize(status).toLowerCase()}?`, description: 'Items go back into stock and loyalty points are reversed.', confirmText: 'Save', danger: true });
              if (!ok) return;
            }
            await patch('fulfilment', { status, trackingNumber, trackingUrl }, 'Fulfilment saved');
          }}>Save</Button>
        </div>
      </Container>

      {/* Returns */}
      <Container>
        <SectionHeader
          title="Returns"
          subtitle={order.returns.length === 0 ? 'Nothing returned.' : undefined}
          actions={['DELIVERED', 'RETURNED', 'SHIPPED', 'OUT_FOR_DELIVERY'].includes(order.status) ? <Button size="small" onClick={openReturn}>Create return</Button> : undefined}
        />
        {order.returns.map((r) => {
          const lines = JSON.parse(r.items || '[]') as { itemId: string; quantity: number }[];
          return (
            <div key={r.id} className="space-y-1.5 px-6 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge tone={RETURN_TONE[r.status] || 'grey'}>{humanize(r.status)}</Badge>
                  <span className="font-medium">{r.reason}</span>
                  <span className="text-ui-subtle">· {r.requestedBy === 'CUSTOMER' ? 'customer request' : 'by staff'} · {dateTime(r.createdAt)}</span>
                </div>
                {r.status === 'REQUESTED' && (
                  <div className="flex gap-2">
                    <Button size="small" loading={saving === `reject-${r.id}`} onClick={async () => {
                      if (await confirm({ title: 'Reject this return?', description: 'The customer keeps the items and nothing goes back into stock.', confirmText: 'Reject', danger: true })) {
                        await post(`reject-${r.id}`, `/api/admin/returns/${r.id}`, { action: 'reject' }, 'Return rejected', 'PATCH');
                      }
                    }}>Reject</Button>
                    <Button size="small" variant="primary" loading={saving === `receive-${r.id}`} onClick={() => post(`receive-${r.id}`, `/api/admin/returns/${r.id}`, { action: 'receive' }, 'Return received, items back in stock', 'PATCH')}>Mark received</Button>
                  </div>
                )}
              </div>
              <p className="text-ui-subtle">{lines.map((l) => `${l.quantity} × ${itemName(l.itemId)}`).join(', ')}</p>
              {r.customerNote && <p className="rounded-md bg-ui-hover px-2 py-1.5">“{r.customerNote}”</p>}
              {r.status === 'RECEIVED' && refundable > 0 && <p className="text-[12px] text-amber-600">Items are back in stock. Record the refund in Payment when you send the money.</p>}
            </div>
          );
        })}
      </Container>

      {/* Activity */}
      <Container>
        <SectionHeader title="Activity" />
        <div className="px-6 py-4">
          <form onSubmit={async (e) => {
            e.preventDefault();
            if (!note.trim()) return;
            if (await patch('note', { note }, 'Note added')) setNote('');
          }} className="flex gap-2">
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Leave a note (only staff can see it)" />
            <Button type="submit" disabled={!note.trim()} loading={saving === 'note'}>Add</Button>
          </form>
          <ol className="mt-4">
            {timeline.map((t, i) => (
              <li key={t.id} className="relative flex gap-3 pb-4 last:pb-0">
                {i < timeline.length - 1 && <span className="absolute left-[5px] top-4 h-full w-px bg-ui-border" />}
                <span className={cx('relative mt-1.5 h-[11px] w-[11px] shrink-0 rounded-full border-2', t.kind === 'note' ? 'border-blue-400 bg-ui-base' : 'border-ui-muted bg-ui-base')} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="font-medium">{t.title}</p>
                    <time className="shrink-0 text-[12px] text-ui-subtle">{dateTime(t.at)}</time>
                  </div>
                  {t.body && <p className={cx('mt-0.5', t.kind === 'note' ? 'rounded-md bg-ui-hover px-2 py-1.5 text-ui-fg' : 'text-ui-subtle')}>{t.body}</p>}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </Container>
    </>
  );

  const side = (
    <>
      <Container>
        <SectionHeader title="Customer" />
        <div className="space-y-1 px-6 py-4">
          {order.user ? (
            <Link href={`/admin/customers/${order.user.id}`} className="font-medium hover:underline">{order.user.name || order.user.email}</Link>
          ) : <p className="font-medium">Guest</p>}
          {order.user?.email && (
            <p className="flex items-center gap-1.5 text-ui-subtle">{order.user.email}
              <button type="button" onClick={() => copy(order.user!.email, 'Email')} aria-label="Copy email" className="text-ui-muted hover:text-ui-fg"><Copy className="h-3.5 w-3.5" /></button>
            </p>
          )}
          <p className="text-ui-subtle">{order.shippingPhone}</p>
          {order.user && <p className="text-ui-subtle">{order.user._count.orders} order{order.user._count.orders === 1 ? '' : 's'} in total</p>}
        </div>
      </Container>

      <Container>
        <SectionHeader
          title="Shipping address"
          actions={
            <>
              <Button size="small" variant="transparent" onClick={() => copy(addressText, 'Address')}><Copy className="h-3.5 w-3.5" /> Copy</Button>
              <Button size="small" onClick={() => setAddressOpen(true)}>Edit</Button>
            </>
          }
        />
        <p className="whitespace-pre-line px-6 py-4 text-ui-fg">{addressText}</p>
      </Container>

      <Container>
        <SectionHeader title="Billing address" />
        <p className="whitespace-pre-line px-6 py-4 text-ui-subtle">
          {order.billingSameAsShipping || !order.billingAddressLine1
            ? 'Same as shipping address'
            : [order.billingName, order.billingAddressLine1, order.billingAddressLine2, `${order.billingCity}, ${order.billingState} ${order.billingPincode}`].filter(Boolean).join('\n')}
        </p>
      </Container>

      {(order.customerNotes || order.giftMessage) && (
        <Container>
          <SectionHeader title="From the customer" />
          {order.customerNotes && <Row label="Order note">{order.customerNotes}</Row>}
          {order.giftMessage && <Row label="Gift message">{order.giftMessage}</Row>}
        </Container>
      )}
    </>
  );

  return (
    <>
      <TwoColumn main={main} side={side} />
      <Drawer
        open={addressOpen}
        onClose={() => setAddressOpen(false)}
        title="Edit shipping address"
        footer={
          <>
            <Button onClick={() => setAddressOpen(false)}>Cancel</Button>
            <Button variant="primary" loading={saving === 'address'} onClick={async () => {
              if (await patch('address', { address }, 'Address updated')) setAddressOpen(false);
            }}>Save</Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name"><Input value={address.shippingName} onChange={(e) => setAddress({ ...address, shippingName: e.target.value })} /></Field>
          <Field label="Phone"><Input value={address.shippingPhone} onChange={(e) => setAddress({ ...address, shippingPhone: e.target.value })} /></Field>
          <Field label="Address" className="sm:col-span-2"><Input value={address.shippingAddressLine1} onChange={(e) => setAddress({ ...address, shippingAddressLine1: e.target.value })} /></Field>
          <Field label="Apartment, landmark (optional)" className="sm:col-span-2"><Input value={address.shippingAddressLine2} onChange={(e) => setAddress({ ...address, shippingAddressLine2: e.target.value })} /></Field>
          <Field label="City"><Input value={address.shippingCity} onChange={(e) => setAddress({ ...address, shippingCity: e.target.value })} /></Field>
          <Field label="State"><Input value={address.shippingState} onChange={(e) => setAddress({ ...address, shippingState: e.target.value })} /></Field>
          <Field label="PIN / postal code"><Input value={address.shippingPincode} onChange={(e) => setAddress({ ...address, shippingPincode: e.target.value })} /></Field>
          <Field label="Country"><Input value={address.shippingCountry} onChange={(e) => setAddress({ ...address, shippingCountry: e.target.value })} /></Field>
        </div>
      </Drawer>

      <Drawer
        open={refundOpen}
        onClose={() => setRefundOpen(false)}
        title="Refund"
        description={`Up to ${inr(refundable)} can be refunded. Send the money from your payment provider (Razorpay, Stripe or UPI) as well; this records it.`}
        footer={
          <>
            <Button onClick={() => setRefundOpen(false)}>Cancel</Button>
            <Button variant="primary" loading={saving === 'refund'} disabled={!(Number(refund.amount) > 0)} onClick={async () => {
              if (await post('refund', `/api/admin/orders/${order.id}/refunds`, { amount: Number(refund.amount), reason: refund.reason, note: refund.note }, 'Refund recorded')) setRefundOpen(false);
            }}>Record refund</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Amount (₹)">
            <Input type="number" min={0} step="0.01" max={refundable} value={refund.amount} onChange={(e) => setRefund({ ...refund, amount: e.target.value })} />
          </Field>
          <Field label="Reason">
            <Select value={refund.reason} onChange={(e) => setRefund({ ...refund, reason: e.target.value })}>
              {REFUND_REASONS.map((r) => <option key={r}>{r}</option>)}
            </Select>
          </Field>
          <Field label="Note (optional)"><Input value={refund.note} onChange={(e) => setRefund({ ...refund, note: e.target.value })} placeholder="e.g. Razorpay refund rfnd_…" /></Field>
        </div>
      </Drawer>

      <Drawer
        open={returnOpen}
        onClose={() => setReturnOpen(false)}
        title="Create return"
        description="Choose what's coming back. Items go back into stock when you mark the return as received."
        footer={
          <>
            <Button onClick={() => setReturnOpen(false)}>Cancel</Button>
            <Button variant="primary" loading={saving === 'return'} disabled={!Object.values(returnQty).some((q) => q > 0)} onClick={async () => {
              const items = Object.entries(returnQty).filter(([, q]) => q > 0).map(([itemId, quantity]) => ({ itemId, quantity }));
              if (await post('return', `/api/admin/orders/${order.id}/returns`, { items, reason: returnForm.reason, note: returnForm.note }, 'Return created')) setReturnOpen(false);
            }}>Create return</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="divide-y divide-ui-border rounded-md shadow-ui-field">
            {returnable.map((i) => (
              <div key={i.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate font-medium">{i.productName}</p>
                  <p className="text-[12px] text-ui-subtle">{i.variant ? `${i.variant} · ` : ''}{i.returnable} can be returned</p>
                </div>
                <Input type="number" min={0} max={i.returnable} disabled={i.returnable === 0} value={returnQty[i.id] ?? 0}
                  onChange={(e) => setReturnQty({ ...returnQty, [i.id]: Math.max(0, Math.min(i.returnable, Math.floor(Number(e.target.value) || 0))) })} className="w-20" aria-label={`Quantity of ${i.productName} to return`} />
              </div>
            ))}
          </div>
          <Field label="Reason">
            <Select value={returnForm.reason} onChange={(e) => setReturnForm({ ...returnForm, reason: e.target.value })}>
              {RETURN_REASONS.map((r) => <option key={r}>{r}</option>)}
            </Select>
          </Field>
          <Field label="Note (optional)"><Input value={returnForm.note} onChange={(e) => setReturnForm({ ...returnForm, note: e.target.value })} /></Field>
        </div>
      </Drawer>
    </>
  );
}

function Line({ label, value, muted }: { label: React.ReactNode; value: React.ReactNode; muted?: boolean }) {
  return (
    <div className={cx('flex items-center justify-between gap-4', muted ? 'text-ui-subtle' : 'text-ui-fg')}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
