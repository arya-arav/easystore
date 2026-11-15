'use client';

import toast from 'react-hot-toast';
import { DataTable, type Column } from '@/components/admin/data-table';
import { useConfirm } from '@/components/admin/overlays';
import { ORDER_STATUS_TONE, PAYMENT_STATUS_TONE, SectionHeader, StatusBadge, humanize, inr, shortDate } from '@/components/admin/ui';

interface OrderRow {
  id: string;
  orderNumber: string;
  createdAt: string;
  shippingName: string;
  shippingCity: string;
  shippingCountry: string;
  total: string;
  currency: string;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  couponCode: string | null;
  user: { name: string | null; email: string } | null;
  _count: { items: number };
}

const STATUSES = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'RETURNED', 'REFUNDED'];
const PAYMENTS = ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED'];
const METHODS = ['COD', 'UPI', 'RAZORPAY', 'STRIPE'];

const columns: Column<OrderRow>[] = [
  { key: 'order', header: 'Order', fixed: true, cell: (o) => <span className="font-medium">#{o.orderNumber}</span> },
  { key: 'date', header: 'Date', cell: (o) => <span className="whitespace-nowrap text-ui-subtle">{shortDate(o.createdAt)}</span> },
  {
    key: 'customer', header: 'Customer', cell: (o) => (
      <div className="min-w-0">
        <p className="truncate">{o.shippingName}</p>
        <p className="truncate text-[12px] text-ui-subtle">{o.user?.email}</p>
      </div>
    ),
  },
  { key: 'destination', header: 'Destination', defaultHidden: true, cell: (o) => <span className="text-ui-subtle">{o.shippingCity}, {o.shippingCountry}</span> },
  { key: 'items', header: 'Items', defaultHidden: true, cell: (o) => o._count.items },
  { key: 'payment', header: 'Payment', cell: (o) => <StatusBadge status={o.paymentStatus} tones={PAYMENT_STATUS_TONE} /> },
  { key: 'method', header: 'Method', cell: (o) => <span className="text-ui-subtle">{o.paymentMethod}</span> },
  { key: 'status', header: 'Fulfilment', cell: (o) => <StatusBadge status={o.status} tones={ORDER_STATUS_TONE} /> },
  { key: 'coupon', header: 'Coupon', defaultHidden: true, cell: (o) => o.couponCode || <span className="text-ui-muted">-</span> },
  { key: 'total', header: 'Total', className: 'text-right', cell: (o) => <span className="whitespace-nowrap">{inr(o.total)}{o.currency !== 'INR' && <span className="ml-1 text-[12px] text-ui-subtle">{o.currency}</span>}</span> },
];

export default function AdminOrdersPage() {
  const confirm = useConfirm();

  const setStatus = (status: string) => async (rows: OrderRow[]) => {
    const ok = await confirm({
      title: `Mark ${rows.length} order${rows.length > 1 ? 's' : ''} as ${humanize(status).toLowerCase()}?`,
      description: status === 'CANCELLED' ? 'Items go back into stock and loyalty points are reversed.' : 'Customers get the usual status email where one applies.',
      confirmText: 'Update',
      danger: status === 'CANCELLED',
    });
    if (!ok) return;
    const res = await fetch('/api/admin/orders/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: rows.map((r) => r.id), status }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) toast.success(`${data.updated} order(s) updated`);
    else toast.error(data.error || 'Could not update the orders');
  };

  return (
    <DataTable<OrderRow>
      id="orders"
      endpoint="/api/admin/orders"
      dataKey="orders"
      header={<SectionHeader level={1} title="Orders" subtitle="Every order, newest first. Click a row to open it." />}
      columns={columns}
      rowHref={(o) => `/admin/orders/${o.id}`}
      searchPlaceholder="Order no., name, phone, email"
      filters={[
        { key: 'status', label: 'Fulfilment', options: STATUSES.map((s) => ({ value: s, label: humanize(s) })) },
        { key: 'payment', label: 'Payment', options: PAYMENTS.map((s) => ({ value: s, label: s === 'COMPLETED' ? 'Paid' : humanize(s) })) },
        { key: 'method', label: 'Method', options: METHODS.map((s) => ({ value: s, label: s })) },
        { key: 'from', label: 'From', type: 'date' },
        { key: 'to', label: 'To', type: 'date' },
      ]}
      sorts={[
        { value: 'created_desc', label: 'Newest first' },
        { value: 'created_asc', label: 'Oldest first' },
        { value: 'total_desc', label: 'Highest total' },
        { value: 'total_asc', label: 'Lowest total' },
      ]}
      bulkActions={[
        { label: 'Confirm', run: setStatus('CONFIRMED') },
        { label: 'Processing', run: setStatus('PROCESSING') },
        { label: 'Shipped', run: setStatus('SHIPPED') },
        { label: 'Delivered', run: setStatus('DELIVERED') },
        { label: 'Cancel', danger: true, run: setStatus('CANCELLED') },
      ]}
      exportHref="/api/admin/orders?format=csv"
      emptyTitle="No orders yet"
      emptyDescription="Orders appear here as soon as customers check out."
    />
  );
}
