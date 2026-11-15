'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Star } from 'lucide-react';
import {
  Button, Container, EmptyState, Field, Input, Select, ORDER_STATUS_TONE, PAYMENT_STATUS_TONE, Row, SectionHeader, StatusBadge, TwoColumn,
  inr, shortDate,
} from '@/components/admin/ui';
import { Drawer } from '@/components/admin/overlays';
import { useBreadcrumb } from '../../../admin-layout';

interface Customer {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  createdAt: string;
  emailVerified: string | null;
  loyaltyBalance: number;
  customerGroup: { id: string; name: string; discountPercent: string } | null;
  orders: { id: string; orderNumber: string; createdAt: string; total: string; status: string; paymentStatus: string; _count: { items: number } }[];
  reviews: { id: string; rating: number; title: string | null; comment: string | null; createdAt: string; product: { name: string } | null }[];
  wishlist: { id: string; product: { name: string; price: string } | null }[];
  addresses: { id: string; name: string; phone: string; addressLine1: string; addressLine2: string | null; city: string; state: string; pincode: string; country: string; type: string; isDefault: boolean }[];
  loyaltyPoints: { id: string; points: number; type: string; description: string; createdAt: string }[];
  _count: { orders: number; reviews: number };
}

export function CustomerDetail({ customer, lifetime }: { customer: Customer; lifetime: { spent: number; orders: number } }) {
  const router = useRouter();
  useBreadcrumb(customer.name || customer.email);

  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({ name: customer.name || '', phone: customer.phone || '', customerGroupId: customer.customerGroup?.id || '' });
  const [groups, setGroups] = useState<{ id: string; name: string; discountPercent: string }[]>([]);
  useEffect(() => {
    fetch('/api/admin/customer-groups').then((r) => (r.ok ? r.json() : null)).then((d) => d && setGroups(d.groups || [])).catch(() => {});
  }, []);
  const [pointsOpen, setPointsOpen] = useState(false);
  const [bonus, setBonus] = useState({ points: '', description: '' });
  const [saving, setSaving] = useState(false);

  const save = async (url: string, method: string, body: unknown, done: string) => {
    setSaving(true);
    try {
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error || 'Could not save'); return false; }
      toast.success(done);
      router.refresh();
      return true;
    } finally {
      setSaving(false);
    }
  };

  const aov = lifetime.orders ? lifetime.spent / lifetime.orders : 0;

  const main = (
    <>
      <Container>
        <SectionHeader level={1} title={customer.name || customer.email} subtitle={customer.email} actions={<Button onClick={() => setEditOpen(true)}>Edit</Button>} />
        <div className="grid grid-cols-2 divide-ui-border sm:grid-cols-4 sm:divide-x">
          {[
            ['Orders', String(customer._count.orders)],
            ['Total spent', inr(lifetime.spent)],
            ['Average order', inr(aov)],
            ['Loyalty points', String(customer.loyaltyBalance)],
          ].map(([label, value]) => (
            <div key={label} className="px-6 py-4">
              <p className="text-ui-subtle">{label}</p>
              <p className="mt-0.5 text-[16px] font-medium">{value}</p>
            </div>
          ))}
        </div>
      </Container>

      <Container>
        <SectionHeader title="Orders" subtitle={customer._count.orders > customer.orders.length ? `Latest ${customer.orders.length} of ${customer._count.orders}` : undefined}
          actions={customer._count.orders > 0 ? <Link href={`/admin/orders?q=${encodeURIComponent(customer.email)}`} className="font-medium text-ui-subtle hover:text-ui-fg">View all</Link> : undefined} />
        {customer.orders.length === 0 ? (
          <EmptyState title="No orders yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <tbody>
                {customer.orders.map((o) => (
                  <tr key={o.id} onClick={() => router.push(`/admin/orders/${o.id}`)} className="h-12 cursor-pointer border-b border-ui-border last:border-0 hover:bg-ui-hover">
                    <td className="pl-6 pr-6 font-medium">#{o.orderNumber}</td>
                    <td className="whitespace-nowrap pr-6 text-ui-subtle">{shortDate(o.createdAt)}</td>
                    <td className="pr-6"><StatusBadge status={o.paymentStatus} tones={PAYMENT_STATUS_TONE} /></td>
                    <td className="pr-6"><StatusBadge status={o.status} tones={ORDER_STATUS_TONE} /></td>
                    <td className="pr-6 text-right">{inr(o.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Container>

      <Container>
        <SectionHeader title="Reviews" subtitle={customer._count.reviews ? `${customer._count.reviews} in total` : undefined} />
        {customer.reviews.length === 0 ? <EmptyState title="No reviews yet" /> : customer.reviews.map((r) => (
          <div key={r.id} className="px-6 py-3">
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium">{r.product?.name || 'Deleted product'}</span>
              <span className="flex items-center gap-1 text-amber-500">{r.rating}<Star className="h-3.5 w-3.5 fill-current" /></span>
            </div>
            {(r.title || r.comment) && <p className="mt-0.5 text-ui-subtle">{[r.title, r.comment].filter(Boolean).join(' - ')}</p>}
          </div>
        ))}
      </Container>
    </>
  );

  const side = (
    <>
      <Container>
        <SectionHeader title="Details" />
        <Row label="Email">{customer.email}</Row>
        <Row label="Phone">{customer.phone}</Row>
        <Row label="Group">{customer.customerGroup ? `${customer.customerGroup.name} (${Number(customer.customerGroup.discountPercent)}% off)` : 'None'}</Row>
        <Row label="Email verified">{customer.emailVerified ? 'Yes' : 'No'}</Row>
        <Row label="Customer since">{shortDate(customer.createdAt)}</Row>
      </Container>

      <Container>
        <SectionHeader title="Loyalty" subtitle={`${customer.loyaltyBalance} points available`} actions={<Button size="small" onClick={() => setPointsOpen(true)}>Give points</Button>} />
        {customer.loyaltyPoints.length === 0 ? <p className="px-6 py-4 text-ui-subtle">No points activity yet.</p> : customer.loyaltyPoints.map((p) => (
          <div key={p.id} className="flex items-center justify-between gap-3 px-6 py-2.5">
            <div className="min-w-0">
              <p className="truncate">{p.description}</p>
              <p className="text-[12px] text-ui-subtle">{shortDate(p.createdAt)}</p>
            </div>
            <span className={p.points >= 0 ? 'text-emerald-600' : 'text-ui-subtle'}>{p.points > 0 ? '+' : ''}{p.points}</span>
          </div>
        ))}
      </Container>

      <Container>
        <SectionHeader title="Addresses" />
        {customer.addresses.length === 0 ? <p className="px-6 py-4 text-ui-subtle">No saved addresses.</p> : customer.addresses.map((a) => (
          <div key={a.id} className="px-6 py-3">
            <p className="font-medium">{a.name} <span className="font-normal text-ui-subtle">· {a.type.toLowerCase()}{a.isDefault ? ' · default' : ''}</span></p>
            <p className="text-ui-subtle">{[a.addressLine1, a.addressLine2, `${a.city}, ${a.state} ${a.pincode}`, a.country, a.phone].filter(Boolean).join(', ')}</p>
          </div>
        ))}
      </Container>

      <Container>
        <SectionHeader title="Wishlist" subtitle={`${customer.wishlist.length} item${customer.wishlist.length === 1 ? '' : 's'}`} />
        {customer.wishlist.slice(0, 8).map((w) => (
          <div key={w.id} className="flex justify-between gap-3 px-6 py-2.5">
            <span className="truncate">{w.product?.name || 'Deleted product'}</span>
            {w.product && <span className="text-ui-subtle">{inr(w.product.price)}</span>}
          </div>
        ))}
      </Container>
    </>
  );

  return (
    <>
      <TwoColumn main={main} side={side} />

      <Drawer open={editOpen} onClose={() => setEditOpen(false)} title="Edit customer"
        footer={<><Button onClick={() => setEditOpen(false)}>Cancel</Button><Button variant="primary" loading={saving} onClick={async () => {
          if (await save(`/api/admin/customers/${customer.id}`, 'PUT', form, 'Customer updated')) setEditOpen(false);
        }}>Save</Button></>}>
        <div className="space-y-4">
          <Field label="Name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Phone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91" /></Field>
          <Field label="Customer group" hint="Members get the group's discount on every order.">
            <Select value={form.customerGroupId} onChange={(e) => setForm({ ...form, customerGroupId: e.target.value })}>
              <option value="">No group</option>
              {groups.map((g) => <option key={g.id} value={g.id}>{g.name} ({Number(g.discountPercent)}% off)</option>)}
            </Select>
          </Field>
          <Field label="Email" hint="Customers change their own email from their account."><Input value={customer.email} disabled /></Field>
        </div>
      </Drawer>

      <Drawer open={pointsOpen} onClose={() => setPointsOpen(false)} title="Give loyalty points" description="Added to the customer's balance straight away."
        footer={<><Button onClick={() => setPointsOpen(false)}>Cancel</Button><Button variant="primary" loading={saving} disabled={!(Number(bonus.points) > 0)} onClick={async () => {
          if (await save('/api/admin/loyalty', 'POST', { userId: customer.id, points: Math.floor(Number(bonus.points)), description: bonus.description || undefined }, 'Points added')) {
            setPointsOpen(false);
            setBonus({ points: '', description: '' });
          }
        }}>Give points</Button></>}>
        <div className="space-y-4">
          <Field label="Points"><Input type="number" min={1} value={bonus.points} onChange={(e) => setBonus({ ...bonus, points: e.target.value })} /></Field>
          <Field label="Reason (shown to the customer)"><Input value={bonus.description} onChange={(e) => setBonus({ ...bonus, description: e.target.value })} placeholder="e.g. Sorry for the late delivery" /></Field>
        </div>
      </Drawer>
    </>
  );
}
