'use client';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useSession } from 'next-auth/react';
import { Copy, Plus } from 'lucide-react';
import { Badge, Button, Container, Field, Input, SectionHeader, Select, Skeleton, shortDate } from '@/components/admin/ui';
import { Drawer, useConfirm } from '@/components/admin/overlays';

interface Staff { id: string; name: string | null; email: string; role: 'ADMIN' | 'SELLER'; createdAt: string; invitePending: boolean }

const ROLE_HELP = {
  ADMIN: 'Everything, including settings, customers, reports and staff.',
  SELLER: 'Orders, products, categories, collections and promotions. No customers, reports, settings or staff.',
};

export default function StaffPage() {
  const confirm = useConfirm();
  const { data: session } = useSession();
  const me = session?.user?.email;
  const [staff, setStaff] = useState<Staff[] | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: '', name: '', role: 'SELLER' as 'ADMIN' | 'SELLER' });
  const [saving, setSaving] = useState(false);
  const [invite, setInvite] = useState<{ link: string; emailed: boolean } | null>(null);

  const load = useCallback(() => {
    fetch('/api/admin/staff').then((r) => r.json()).then((d) => setStaff(d.staff || [])).catch(() => setStaff([]));
  }, []);
  useEffect(load, [load]);

  const send = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/staff', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(d.error || 'Could not invite'); return; }
      setInvite({ link: d.link, emailed: d.emailed });
      load();
    } finally {
      setSaving(false);
    }
  };

  const changeRole = async (s: Staff, role: string) => {
    const res = await fetch(`/api/admin/staff/${s.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role }) });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) toast.error(d.error || 'Could not change the role');
    else { toast.success('Role updated'); load(); }
  };

  const remove = async (s: Staff) => {
    if (!(await confirm({ title: `Remove ${s.name || s.email}?`, description: 'They lose admin access straight away. Their account stays as a normal customer account.', confirmText: 'Remove access', danger: true }))) return;
    const res = await fetch(`/api/admin/staff/${s.id}`, { method: 'DELETE' });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) toast.error(d.error || 'Could not remove');
    else { toast.success('Access removed'); load(); }
  };

  return (
    <>
      <Container className="overflow-hidden">
        <SectionHeader level={1} title="Staff" subtitle="People who can open this admin." actions={<Button variant="primary" onClick={() => { setForm({ email: '', name: '', role: 'SELLER' }); setInvite(null); setOpen(true); }}><Plus className="h-3.5 w-3.5" /> Invite</Button>} />
        {staff === null ? (
          <div className="space-y-2 p-6"><Skeleton className="h-8" /><Skeleton className="h-8" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="h-10 border-b border-ui-border bg-ui-bg text-left text-ui-subtle">
                  <th className="pl-6 pr-6 font-medium">Person</th>
                  <th className="pr-6 font-medium">Role</th>
                  <th className="pr-6 font-medium">Since</th>
                  <th className="w-[1%] pr-6" />
                </tr>
              </thead>
              <tbody>
                {staff.map((s) => (
                  <tr key={s.id} className="h-12 border-b border-ui-border last:border-0">
                    <td className="pl-6 pr-6">
                      <p className="flex items-center gap-2 font-medium">{s.name || '-'} {s.invitePending && <Badge tone="orange">Invite sent</Badge>}</p>
                      <p className="text-[12px] text-ui-subtle">{s.email}</p>
                    </td>
                    <td className="pr-6">
                      <Select value={s.role} onChange={(e) => changeRole(s, e.target.value)} className="w-auto" aria-label={`Role for ${s.email}`}>
                        <option value="ADMIN">Admin</option>
                        <option value="SELLER">Seller</option>
                      </Select>
                    </td>
                    <td className="whitespace-nowrap pr-6 text-ui-subtle">{shortDate(s.createdAt)}</td>
                    <td className="pr-6">{s.email === me ? <span className="text-ui-subtle">You</span> : <Button size="small" variant="transparent" onClick={() => remove(s)} className="!text-red-600">Remove</Button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="space-y-1 px-6 py-4 text-ui-subtle">
          <p><b className="text-ui-fg">Admin</b>: {ROLE_HELP.ADMIN}</p>
          <p><b className="text-ui-fg">Seller</b>: {ROLE_HELP.SELLER}</p>
        </div>
      </Container>

      <Drawer open={open} onClose={() => setOpen(false)} title="Invite staff" description="They get an email with a link to set their password (valid 7 days)."
        footer={invite ? <Button variant="primary" onClick={() => setOpen(false)}>Done</Button> : <><Button onClick={() => setOpen(false)}>Cancel</Button><Button variant="primary" loading={saving} disabled={!form.email.trim()} onClick={send}>Send invite</Button></>}>
        {invite ? (
          <div className="space-y-3">
            <p>{invite.emailed ? `Invite emailed to ${form.email}.` : 'Email is not set up (Settings → SMTP), so send them this link yourself:'}</p>
            <div className="flex gap-2">
              <Input readOnly value={invite.link} onFocus={(e) => e.target.select()} />
              <Button onClick={() => navigator.clipboard?.writeText(invite.link).then(() => toast.success('Link copied'))}><Copy className="h-3.5 w-3.5" /></Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Field label="Email"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Name (optional)"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Role" hint={ROLE_HELP[form.role]}>
              <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as 'ADMIN' | 'SELLER' })}>
                <option value="SELLER">Seller</option>
                <option value="ADMIN">Admin</option>
              </Select>
            </Field>
          </div>
        )}
      </Drawer>
    </>
  );
}
