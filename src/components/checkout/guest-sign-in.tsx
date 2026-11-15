'use client';

// Checkout without a password: the shopper confirms their email with a one-time code and
// carries on. A new email gets an account automatically, so orders can be tracked later.

import { useState } from 'react';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { Loader2, Mail, ShieldCheck } from 'lucide-react';

export function GuestSignIn() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('Enter a valid email address'); return; }
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: email.trim(), type: 'email', purpose: 'register' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(data.error || 'Could not send the code. Please try again.');
      else setSent(true);
    } finally {
      setBusy(false);
    }
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) { setError('Enter the 6-digit code from the email'); return; }
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: email.trim(), code, purpose: 'register', name: name.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error || 'That code did not work'); return; }
      const result = await signIn('otp', { userId: data.user.id, loginToken: data.loginToken, redirect: false });
      if (result?.error) setError('Could not continue. Please try again.');
      // On success the session updates and checkout shows the address step.
    } finally {
      setBusy(false);
    }
  };

  const input = 'w-full px-4 py-3 rounded-xl border border-[#E5E5E5] focus:border-[#7FAF8E] focus:ring-2 focus:ring-[#AFC8B8] outline-none';

  return (
    <div className="min-h-screen bg-[#F7F7F5] py-12">
      <div className="content-container max-w-md">
        <div className="bg-white rounded-2xl shadow-sm border border-[#E5E5E5] p-6 sm:p-8">
          <h1 className="text-xl font-bold text-[#333333]">Checkout</h1>
          <p className="mt-1 text-sm text-[#777777]">No password needed. We&apos;ll email you a code so you can track your order later.</p>

          {!sent ? (
            <form onSubmit={sendCode} className="mt-6 space-y-4">
              <div>
                <label htmlFor="guest-email" className="block text-sm font-medium text-[#333333] mb-2">Email</label>
                <input id="guest-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={input} placeholder="you@example.com" />
              </div>
              <div>
                <label htmlFor="guest-name" className="block text-sm font-medium text-[#333333] mb-2">Your name <span className="font-normal text-[#999999]">(optional)</span></label>
                <input id="guest-name" type="text" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className={input} />
              </div>
              {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
              <button type="submit" disabled={busy} className="w-full h-12 rounded-full bg-[#7FAF8E] text-white font-semibold hover:bg-[#6A9B7D] disabled:opacity-50 flex items-center justify-center gap-2">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />} Continue with email
              </button>
            </form>
          ) : (
            <form onSubmit={verify} className="mt-6 space-y-4">
              <p className="text-sm text-[#555555]">We sent a 6-digit code to <b>{email}</b>.</p>
              <input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} aria-label="6-digit code"
                className={`${input} text-center text-lg tracking-[0.5em]`} placeholder="••••••" autoFocus />
              {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
              <button type="submit" disabled={busy} className="w-full h-12 rounded-full bg-[#7FAF8E] text-white font-semibold hover:bg-[#6A9B7D] disabled:opacity-50 flex items-center justify-center gap-2">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />} Verify and continue
              </button>
              <button type="button" onClick={() => { setSent(false); setCode(''); setError(''); }} className="w-full text-sm text-[#777777] hover:text-[#333333]">Use a different email</button>
            </form>
          )}

          <p className="mt-6 border-t border-[#E5E5E5] pt-4 text-center text-sm text-[#777777]">
            Have a password? <Link href="/auth/login?redirect=/checkout" className="font-medium text-[#7FAF8E] hover:text-[#6A9B7D]">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
