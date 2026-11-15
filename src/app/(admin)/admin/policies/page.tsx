'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Button, Container, Field, Input, SectionHeader, Skeleton, Textarea } from '@/components/admin/ui';

interface Policies { returnWindowDays: number; giftWrapCharge: number; codFee: number; returnReasons: string[]; refundReasons: string[] }

export default function PoliciesPage() {
  const [form, setForm] = useState<{ returnWindowDays: string; giftWrapCharge: string; codFee: string; returnReasons: string; refundReasons: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/admin/policies').then((r) => r.json()).then((p: Policies) => setForm({
      returnWindowDays: String(p.returnWindowDays), giftWrapCharge: String(p.giftWrapCharge), codFee: String(p.codFee),
      returnReasons: p.returnReasons.join('\n'), refundReasons: p.refundReasons.join('\n'),
    })).catch(() => toast.error('Could not load policies'));
  }, []);

  const save = async () => {
    if (!form) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/policies', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          returnWindowDays: form.returnWindowDays, giftWrapCharge: form.giftWrapCharge, codFee: form.codFee,
          returnReasons: form.returnReasons.split('\n'), refundReasons: form.refundReasons.split('\n'),
        }),
      });
      if (res.ok) toast.success('Policies saved'); else toast.error('Could not save');
    } finally {
      setSaving(false);
    }
  };

  if (!form) return <Container><div className="p-6"><Skeleton className="h-40" /></div></Container>;

  return (
    <Container>
      <SectionHeader level={1} title="Policies" subtitle="Returns, extra charges and the reasons staff and customers pick from. These show across the shop (product pages, FAQ, returns page) and apply at checkout." actions={<Button variant="primary" loading={saving} onClick={save}>Save</Button>} />
      <div className="grid gap-4 px-6 py-4 sm:grid-cols-3">
        <Field label="Return window (days)" hint="0 turns returns off. Customers request returns from My Orders.">
          <Input type="number" min={0} max={365} value={form.returnWindowDays} onChange={(e) => setForm({ ...form, returnWindowDays: e.target.value })} />
        </Field>
        <Field label="Gift wrap charge (₹)">
          <Input type="number" min={0} value={form.giftWrapCharge} onChange={(e) => setForm({ ...form, giftWrapCharge: e.target.value })} />
        </Field>
        <Field label="Cash on delivery fee (₹)" hint="Added to COD orders. 0 = no fee.">
          <Input type="number" min={0} value={form.codFee} onChange={(e) => setForm({ ...form, codFee: e.target.value })} />
        </Field>
      </div>
      <div className="grid gap-4 px-6 py-4 sm:grid-cols-2">
        <Field label="Return reasons" hint="One per line. Customers choose one when asking to return.">
          <Textarea rows={7} value={form.returnReasons} onChange={(e) => setForm({ ...form, returnReasons: e.target.value })} />
        </Field>
        <Field label="Refund reasons" hint="One per line. Staff choose one when recording a refund.">
          <Textarea rows={7} value={form.refundReasons} onChange={(e) => setForm({ ...form, refundReasons: e.target.value })} />
        </Field>
      </div>
    </Container>
  );
}
