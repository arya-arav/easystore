'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Plus, Trash2 } from 'lucide-react';
import { Button, Container, EmptyState, Field, IconButton, Input, SectionHeader, Skeleton, Textarea } from '@/components/admin/ui';
import { Drawer, useConfirm } from '@/components/admin/overlays';

interface Group { id: string; name: string; description: string | null; discountPercent: string; _count: { customers: number } }

const EMPTY = { name: '', description: '', discountPercent: '10', addEmails: '' };

export default function CustomerGroupsPage() {
  const confirm = useConfirm();
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [editing, setEditing] = useState<Group | 'new' | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    fetch('/api/admin/customer-groups').then((r) => r.json()).then((d) => setGroups(d.groups || [])).catch(() => setGroups([]));
  }, []);
  useEffect(load, [load]);

  const open = (g: Group | 'new') => {
    setEditing(g);
    setForm(g === 'new' ? EMPTY : { name: g.name, description: g.description || '', discountPercent: String(Number(g.discountPercent)), addEmails: '' });
  };

  const save = async () => {
    setSaving(true);
    try {
      const isNew = editing === 'new';
      const res = await fetch(isNew ? '/api/admin/customer-groups' : `/api/admin/customer-groups/${(editing as Group).id}`, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, description: form.description, discountPercent: Number(form.discountPercent) }),
      });
      const group = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(group.error || 'Could not save'); return; }
      const emails = form.addEmails.split(/[\s,;]+/).filter((e) => e.includes('@'));
      if (emails.length) {
        const r = await fetch(`/api/admin/customer-groups/${group.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ addEmails: emails }) });
        const d = await r.json().catch(() => ({}));
        toast.success(`${d.added} customer(s) added${d.notFound ? `, ${d.notFound} email(s) had no customer account` : ''}`);
      } else toast.success('Group saved');
      setEditing(null);
      load();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (g: Group) => {
    if (!(await confirm({ title: `Delete "${g.name}"?`, description: `Its ${g._count.customers} customer(s) stay, they just lose the group discount.`, confirmText: 'Delete', danger: true }))) return;
    const res = await fetch(`/api/admin/customer-groups/${g.id}`, { method: 'DELETE' });
    if (res.ok) { toast.success('Group deleted'); load(); } else toast.error('Could not delete');
  };

  return (
    <>
      <Container className="overflow-hidden">
        <SectionHeader level={1} title="Customer groups" subtitle="Members get the group's discount on every order (shown in their cart and checkout). Use it for VIPs, wholesale buyers or staff." actions={<Button variant="primary" onClick={() => open('new')}><Plus className="h-3.5 w-3.5" /> Create</Button>} />
        {groups === null ? (
          <div className="space-y-2 p-6"><Skeleton className="h-8" /><Skeleton className="h-8" /></div>
        ) : groups.length === 0 ? (
          <EmptyState title="No groups yet" description="Create one, then add customers by email or from a customer's page." action={<Button onClick={() => open('new')}>Create a group</Button>} />
        ) : (
          <table className="w-full">
            <thead>
              <tr className="h-10 border-b border-ui-border bg-ui-bg text-left text-ui-subtle">
                <th className="pl-6 pr-6 font-medium">Group</th>
                <th className="pr-6 font-medium">Discount</th>
                <th className="pr-6 font-medium">Customers</th>
                <th className="w-[1%] pr-6" />
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <tr key={g.id} onClick={(e) => { if (!(e.target as HTMLElement).closest('button,a')) open(g); }} className="h-12 cursor-pointer border-b border-ui-border last:border-0 hover:bg-ui-hover">
                  <td className="pl-6 pr-6">
                    <p className="font-medium">{g.name}</p>
                    {g.description && <p className="text-[12px] text-ui-subtle">{g.description}</p>}
                  </td>
                  <td className="pr-6">{Number(g.discountPercent)}%</td>
                  <td className="pr-6"><Link href={`/admin/customers?group=${g.id}`} className="hover:underline">{g._count.customers}</Link></td>
                  <td className="pr-6"><IconButton label="Delete" onClick={() => remove(g)} className="hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></IconButton></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Container>

      <Drawer open={!!editing} onClose={() => setEditing(null)} title={editing === 'new' ? 'Create group' : 'Edit group'}
        footer={<><Button onClick={() => setEditing(null)}>Cancel</Button><Button variant="primary" loading={saving} disabled={!form.name.trim()} onClick={save}>Save</Button></>}>
        <div className="space-y-4">
          <Field label="Name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. VIP" /></Field>
          <Field label="Discount on every order (%)" hint="Applied after bundle savings, before coupons. Up to 90%.">
            <Input type="number" min={0} max={90} step="0.5" value={form.discountPercent} onChange={(e) => setForm({ ...form, discountPercent: e.target.value })} />
          </Field>
          <Field label="Description (only staff see it)"><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <Field label="Add customers by email" hint="Separate with commas or new lines. They must have an account.">
            <Textarea rows={3} value={form.addEmails} onChange={(e) => setForm({ ...form, addEmails: e.target.value })} placeholder="asha@example.com, ravi@example.com" />
          </Field>
        </div>
      </Drawer>
    </>
  );
}
