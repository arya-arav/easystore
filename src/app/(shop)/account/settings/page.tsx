'use client';

import { useEffect, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { AccountHeader, AccountSection, EditableRow, accountInput } from '@/components/account/ui';

interface Profile { name: string; email: string; phone: string | null; hasPassword: boolean }

async function send(url: string, method: string, body: unknown): Promise<string | null> {
  const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (res.ok) return null;
  const data = await res.json().catch(() => ({}));
  return data.error || 'Could not save. Please try again.';
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);

  const load = () =>
    fetch('/api/account/profile').then((r) => r.json()).then((d: Profile) => {
      setProfile(d);
      setName(d.name || '');
      setPhone(d.phone || '');
    }).catch(() => {});
  useEffect(() => { load(); }, []);

  if (!profile) {
    return <div className="space-y-4">{[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-white" />)}</div>;
  }

  return (
    <div>
      <AccountHeader title="Profile" description="Your name, contact details and password. Your email can't be changed here." />

      <AccountSection>
        <EditableRow label="Name" value={profile.name || <span className="text-text-muted">Not set</span>}
          onSave={async () => {
            if (!name.trim()) return 'Please enter your name';
            const err = await send('/api/account/profile', 'PATCH', { name: name.trim(), phone: profile.phone || '' });
            if (!err) await load();
            return err;
          }}>
          <input className={accountInput} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" aria-label="Name" />
        </EditableRow>

        <EditableRow label="Email" value={profile.email} disabled hint="Used to sign in and for order updates." onSave={async () => null}>
          {null}
        </EditableRow>

        <EditableRow label="Phone" value={profile.phone || <span className="text-text-muted">Add a number for delivery updates</span>}
          onSave={async () => {
            const err = await send('/api/account/profile', 'PATCH', { name: profile.name, phone: phone.trim() });
            if (!err) await load();
            return err;
          }}>
          <input className={accountInput} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" placeholder="+91 98765 43210" aria-label="Phone" />
        </EditableRow>

        <EditableRow label="Password" value={profile.hasPassword ? '••••••••' : <span className="text-text-muted">No password yet (you sign in with an email code)</span>}
          onSave={async () => {
            if (next.length < 8) return 'Use at least 8 characters';
            if (next !== confirm) return 'The new passwords don’t match';
            const err = await send('/api/account/password', 'POST', { currentPassword: current, newPassword: next });
            if (!err) { setCurrent(''); setNext(''); setConfirm(''); await load(); }
            return err;
          }}>
          {profile.hasPassword && (
            <input className={accountInput} type={show ? 'text' : 'password'} value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" placeholder="Current password" aria-label="Current password" />
          )}
          <div className="relative">
            <input className={`${accountInput} pr-11`} type={show ? 'text' : 'password'} value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" placeholder="New password (8+ characters)" aria-label="New password" />
            <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? 'Hide passwords' : 'Show passwords'} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary">
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <input className={accountInput} type={show ? 'text' : 'password'} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" placeholder="Repeat new password" aria-label="Repeat new password" />
        </EditableRow>
      </AccountSection>
    </div>
  );
}
