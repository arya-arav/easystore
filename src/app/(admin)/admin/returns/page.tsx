'use client';

import { DataTable, type Column } from '@/components/admin/data-table';
import { Badge, SectionHeader, humanize, shortDate } from '@/components/admin/ui';

interface ReturnRow {
  id: string;
  status: string;
  reason: string;
  requestedBy: string;
  createdAt: string;
  customerNote: string | null;
  items: string;
  order: { id: string; orderNumber: string; shippingName: string };
}

const TONE: Record<string, 'orange' | 'green' | 'red'> = { REQUESTED: 'orange', RECEIVED: 'green', REJECTED: 'red' };

const columns: Column<ReturnRow>[] = [
  { key: 'order', header: 'Order', fixed: true, cell: (r) => <span className="font-medium">#{r.order.orderNumber}</span> },
  { key: 'customer', header: 'Customer', cell: (r) => r.order.shippingName },
  { key: 'items', header: 'Items', cell: (r) => <span className="line-clamp-1 max-w-[320px] text-ui-subtle">{r.items}</span> },
  { key: 'reason', header: 'Reason', cell: (r) => r.reason },
  { key: 'from', header: 'Opened by', defaultHidden: true, cell: (r) => (r.requestedBy === 'CUSTOMER' ? 'Customer' : 'Staff') },
  { key: 'date', header: 'Date', cell: (r) => <span className="whitespace-nowrap text-ui-subtle">{shortDate(r.createdAt)}</span> },
  { key: 'status', header: 'Status', cell: (r) => <Badge tone={TONE[r.status] || 'grey'}>{humanize(r.status)}</Badge> },
];

export default function ReturnsPage() {
  return (
    <DataTable<ReturnRow>
      id="returns"
      endpoint="/api/admin/returns"
      dataKey="returns"
      header={<SectionHeader level={1} title="Returns" subtitle="Return requests from customers and staff. Open one to receive it into stock or refund it." />}
      columns={columns}
      rowHref={(r) => `/admin/orders/${r.order.id}`}
      searchPlaceholder="Order no. or name"
      filters={[{ key: 'status', label: 'Status', options: [{ value: 'REQUESTED', label: 'Requested' }, { value: 'RECEIVED', label: 'Received' }, { value: 'REJECTED', label: 'Rejected' }] }]}
      sorts={[{ value: 'created_desc', label: 'Newest first' }, { value: 'created_asc', label: 'Oldest first' }]}
      emptyTitle="No returns"
      emptyDescription="Customers can ask to return items within 7 days of delivery from their order page."
    />
  );
}
