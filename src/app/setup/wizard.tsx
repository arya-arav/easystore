'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, Loader2, Sparkles } from 'lucide-react';
import { SHOP_TYPES, SHOP_TYPE_IDS, type ShopTypeId } from '@/lib/shop-types';

const STEPS = ['Shop type', 'Store', 'Admin', 'Finish'];
const field = 'h-11 w-full rounded-xl border border-gray-200 bg-white px-3.5 text-[15px] text-gray-900 outline-none transition focus:border-gray-900 focus:ring-4 focus:ring-gray-900/5';

export function SetupWizard() {
  const [step, setStep] = useState(0);
  const [shopType, setShopType] = useState<ShopTypeId | null>(null);
  const [store, setStore] = useState({ storeName: '', storeEmail: '', storePhone: '' });
  const [admin, setAdmin] = useState({ adminName: '', adminEmail: '', password: '' });
  const [show, setShow] = useState(false);
  const [demo, setDemo] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const type = shopType ? SHOP_TYPES[shopType] : null;
  const demoCount = type ? Object.values(type.demo).reduce((n, list) => n + list.length, 0) : 0;
  const validEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
  const canNext = [!!shopType, store.storeName.trim().length > 0, validEmail(admin.adminEmail) && admin.password.length >= 8, true][step];

  const finish = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopType, ...store, ...admin, demo }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setError(d.error || 'Setup failed. Please try again.'); setBusy(false); return; }
      const signed = await signIn('credentials', { email: admin.adminEmail.trim().toLowerCase(), password: admin.password, redirect: false });
      window.location.href = signed?.ok ? '/admin' : '/auth/login';
    } catch {
      setError('Could not reach the server. Check your connection and try again.');
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F6F4] px-4 py-10 font-sans text-gray-900 sm:py-16">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-600 shadow-sm"><Sparkles className="h-3.5 w-3.5" /> EasyStore setup</span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Let’s set up your store</h1>
          <p className="mt-2 text-gray-500">Four quick steps. You can change everything later in the admin.</p>
        </div>

        {/* Progress */}
        <ol className="mb-6 grid grid-cols-4 gap-2">
          {STEPS.map((label, i) => (
            <li key={label} className="flex flex-col gap-1.5">
              <span className={`h-1.5 rounded-full transition-colors ${i <= step ? 'bg-gray-900' : 'bg-gray-200'}`} />
              <span className={`text-xs font-medium ${i === step ? 'text-gray-900' : 'text-gray-400'}`}>{i + 1}. {label}</span>
            </li>
          ))}
        </ol>

        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5 sm:p-8">
          {step === 0 && (
            <div>
              <h2 className="text-xl font-semibold">What will you sell?</h2>
              <p className="mt-1 text-sm text-gray-500">This sets up categories, filters, homepage wording and colours to suit your shop.</p>
              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {SHOP_TYPE_IDS.map((id) => {
                  const t = SHOP_TYPES[id];
                  const on = shopType === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setShopType(id)}
                      aria-pressed={on}
                      className={`relative flex flex-col items-start gap-2 rounded-2xl p-4 text-left ring-1 transition ${on ? 'bg-gray-900 text-white ring-gray-900' : 'bg-white ring-gray-200 hover:ring-gray-400'}`}
                    >
                      {on && <Check className="absolute right-3 top-3 h-4 w-4" />}
                      <span className="text-3xl">{t.emoji}</span>
                      <span className="font-semibold">{t.name}</span>
                      <span className={`text-xs leading-snug ${on ? 'text-white/70' : 'text-gray-500'}`}>{t.description}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <h2 className="text-xl font-semibold">About your store</h2>
              <p className="mt-1 text-sm text-gray-500">Shown in the header, emails and invoices.</p>
              <div className="mt-6 grid gap-4">
                <label className="grid gap-1.5 text-sm font-medium">Store name
                  <input autoFocus className={field} value={store.storeName} maxLength={60} onChange={(e) => setStore({ ...store, storeName: e.target.value })} placeholder={type ? `My ${type.name.split(' ')[0]} Shop` : 'My Shop'} />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-1.5 text-sm font-medium">Support email <span className="font-normal text-gray-400">(optional)</span>
                    <input type="email" className={field} value={store.storeEmail} onChange={(e) => setStore({ ...store, storeEmail: e.target.value })} placeholder="support@yourshop.com" />
                  </label>
                  <label className="grid gap-1.5 text-sm font-medium">Phone / WhatsApp <span className="font-normal text-gray-400">(optional)</span>
                    <input type="tel" className={field} value={store.storePhone} onChange={(e) => setStore({ ...store, storePhone: e.target.value })} placeholder="+91 98765 43210" />
                  </label>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-xl font-semibold">Your admin account</h2>
              <p className="mt-1 text-sm text-gray-500">You’ll use this to sign in to the admin. Add more staff later.</p>
              <div className="mt-6 grid gap-4">
                <label className="grid gap-1.5 text-sm font-medium">Your name
                  <input autoFocus className={field} value={admin.adminName} onChange={(e) => setAdmin({ ...admin, adminName: e.target.value })} placeholder="Your name" autoComplete="name" />
                </label>
                <label className="grid gap-1.5 text-sm font-medium">Email
                  <input type="email" className={field} value={admin.adminEmail} onChange={(e) => setAdmin({ ...admin, adminEmail: e.target.value })} placeholder="you@example.com" autoComplete="email" />
                </label>
                <label className="grid gap-1.5 text-sm font-medium">Password
                  <span className="relative">
                    <input type={show ? 'text' : 'password'} className={`${field} pr-11`} value={admin.password} onChange={(e) => setAdmin({ ...admin, password: e.target.value })} placeholder="At least 8 characters" autoComplete="new-password" />
                    <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700">
                      {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </span>
                  {admin.password && admin.password.length < 8 && <span className="text-xs font-normal text-red-600">{8 - admin.password.length} more characters</span>}
                </label>
              </div>
            </div>
          )}

          {step === 3 && type && (
            <div>
              <h2 className="text-xl font-semibold">Almost done</h2>
              <p className="mt-1 text-sm text-gray-500">Here’s what we’ll set up.</p>

              <ul className="mt-6 divide-y divide-gray-100 rounded-2xl ring-1 ring-gray-200">
                <li className="flex items-center gap-3 p-4"><span className="text-2xl">{type.emoji}</span><span><span className="block font-medium">{store.storeName}</span><span className="text-sm text-gray-500">{type.name} store</span></span></li>
                <li className="p-4 text-sm"><span className="font-medium">{type.categories.length} categories:</span> <span className="text-gray-500">{type.categories.map((c) => c.name).join(', ')}</span></li>
                <li className="p-4 text-sm"><span className="font-medium">Admin:</span> <span className="text-gray-500">{admin.adminEmail}</span></li>
              </ul>

              <button
                type="button"
                onClick={() => setDemo(!demo)}
                aria-pressed={demo}
                className={`mt-4 flex w-full items-start gap-3 rounded-2xl p-4 text-left ring-1 transition ${demo ? 'bg-emerald-50 ring-emerald-300' : 'ring-gray-200 hover:ring-gray-400'}`}
              >
                <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${demo ? 'bg-emerald-600 text-white' : 'ring-1 ring-gray-300'}`}>{demo && <Check className="h-3.5 w-3.5" />}</span>
                <span>
                  <span className="block font-medium">Add demo products</span>
                  <span className="text-sm text-gray-500">{demoCount} sample products with pictures, plus {type.reviews.length} reviews, so you can see how the store looks. Remove them all in one click later (Settings → Store type).</span>
                </span>
              </button>

              {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
            </div>
          )}

          <div className="mt-8 flex items-center justify-between gap-3">
            {step > 0 ? (
              <button type="button" onClick={() => setStep(step - 1)} disabled={busy} className="inline-flex h-11 items-center gap-1.5 rounded-xl px-4 text-sm font-medium text-gray-600 hover:bg-gray-100">
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
            ) : <span />}
            {step < 3 ? (
              <button type="button" onClick={() => setStep(step + 1)} disabled={!canNext} className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-gray-900 px-5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-40">
                Continue <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button type="button" onClick={finish} disabled={busy} className="inline-flex h-11 items-center gap-2 rounded-xl bg-gray-900 px-5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-60">
                {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Setting up…</> : <>Create my store <ArrowRight className="h-4 w-4" /></>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
