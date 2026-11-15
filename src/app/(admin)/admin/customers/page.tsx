'use client';

import { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { DataTable, type Column } from '@/components/admin/data-table';
import { LinkButton, SectionHeader, inr, shortDate } from '@/components/admin/ui';

interface CustomerRow {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  createdAt: string;
  loyaltyBalance: number;
  totalSpent: number;
  customerGroup: { name: string } | null;
  _count: { orders: number };
}

const columns: Column<CustomerRow>[] = [
  {
    key: 'customer', header: 'Customer', fixed: true, cell: (c) => (
      <div className="flex min-w-[200px] items-center gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ui-hover text-[12px] font-medium text-ui-subtle">
          {(c.name || c.email)[0]?.toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="truncate font-medium">{c.name || '-'}</p>
          <p className="truncate text-[12px] text-ui-subtle">{c.email}</p>
        </div>
      </div>
    ),
  },
  { key: 'group', header: 'Group', cell: (c) => <span className="text-ui-subtle">{c.customerGroup?.name || '-'}</span> },
  { key: 'phone', header: 'Phone', cell: (c) => <span className="text-ui-subtle">{c.phone || '-'}</span> },
  { key: 'orders', header: 'Orders', cell: (c) => c._count.orders },
  { key: 'spent', header: 'Total spent', cell: (c) => inr(c.totalSpent) },
  { key: 'points', header: 'Points', defaultHidden: true, cell: (c) => c.loyaltyBalance },
  { key: 'joined', header: 'Joined', cell: (c) => <span className="text-ui-subtle">{shortDate(c.createdAt)}</span> },
];

export default function CustomersPage() {
  const [groups, setGroups] = useState<{ value: string; label: string }[]>([]);
  useEffect(() => {
    fetch('/api/admin/customer-groups').then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (d?.groups) setGroups([...d.groups.map((g: any) => ({ value: g.id, label: g.name })), { value: 'none', label: 'No group' }]);
    }).catch(() => {});
  }, []);
  return (
    <DataTable<CustomerRow>
      id="customers"
      endpoint="/api/admin/customers"
      dataKey="customers"
      header={<SectionHeader level={1} title="Customers" subtitle="Everyone with an account." actions={<LinkButton href="/admin/customers/groups"><Users className="h-3.5 w-3.5" /> Groups</LinkButton>} />}
      columns={columns}
      rowHref={(c) => `/admin/customers/${c.id}`}
      searchPlaceholder="Name, email or phone"
      filters={[
        { key: 'group', label: 'Group', options: groups },
        { key: 'has_orders', label: 'Orders', options: [{ value: 'yes', label: 'Has ordered' }, { value: 'no', label: 'Never ordered' }] },
        { key: 'from', label: 'Joined from', type: 'date' },
        { key: 'to', label: 'To', type: 'date' },
      ]}
      sorts={[
        { value: 'created_desc', label: 'Newest' },
        { value: 'created_asc', label: 'Oldest' },
        { value: 'name_asc', label: 'Name A–Z' },
        { value: 'orders_desc', label: 'Most orders' },
      ]}
      exportHref="/api/admin/customers?format=csv"
      emptyTitle="No customers yet"
    />
  );
}
