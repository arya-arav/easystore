'use client';

import { useState, useEffect, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, MessageCircle, RefreshCw } from 'lucide-react';
import { useSettings, useShopType } from '@/lib/settings-context';

type LoginTab = 'password' | 'email-otp' | 'whatsapp';

function LoginForm() {
  const shopType = useShopType();
  const router = useRouter();
  // A fresh install has no admin yet: send them to the setup wizard instead.
  useEffect(() => {
    fetch('/api/setup').then((r) => r.json()).then((d) => { if (d.needsSetup) router.replace('/setup'); }).catch(() => {});
  }, [router]);
  const searchParams = useSearchParams();
  // Where to go after signing in (e.g. back to checkout). Same-site paths only.
  const requested = searchParams.get('redirect') || '';
  const redirectTo = requested.startsWith('/') && !requested.startsWith('//') ? requested : '/';
  const { settings } = useSettings();
  const [tab, setTab] = useState<LoginTab>('password');

  // Password login state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // OTP state (shared for email-otp and whatsapp)
  const [otpTarget, setOtpTarget] = useState(''); // email or phone
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  useEffect(() => {
    if (searchParams.get('verified') === 'true') setInfo('Email verified! You can now sign in.');
    if (searchParams.get('registered') === 'true') setInfo('Account created! Please check your email to verify.');
  }, [searchParams]);

  // OTP countdown timer
  useEffect(() => {
    if (otpTimer <= 0) return;
    const t = setTimeout(() => setOtpTimer(v => v - 1), 1000);
    return () => clearTimeout(t);
  }, [otpTimer]);

  const resetOtp = () => { setOtpSent(false); setOtp(''); setOtpTimer(0); };

  // ── Password login ──────────────────────────────────────
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    const result = await signIn('credentials', { email, password, redirect: false });
    if (result?.error) {
      const check = await fetch('/api/auth/check-verified', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const d = await check.json();
      setError(d.unverified ? 'Please verify your email before signing in.' : 'Invalid email or password');
    } else {
      router.push(redirectTo); router.refresh();
    }
    setLoading(false);
  };

  // ── Send OTP ────────────────────────────────────────────
  const handleSendOtp = async () => {
    if (!otpTarget.trim()) { setError(tab === 'whatsapp' ? 'Enter your WhatsApp number' : 'Enter your email'); return; }
    setError(''); setLoading(true);
    const type = tab === 'whatsapp' ? 'whatsapp' : 'email';
    const res = await fetch('/api/auth/send-otp', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target: otpTarget.trim(), type, purpose: 'login' }),
    });
    const data = await res.json();
    if (res.ok) {
      setOtpSent(true);
      setOtpTimer(60);
      setInfo(`OTP sent to ${otpTarget}`);
    } else {
      setError(data.error || 'Failed to send OTP');
    }
    setLoading(false);
  };

  // ── Verify OTP & login ──────────────────────────────────
  const handleOtpLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) { setError('Enter the 6-digit OTP'); return; }
    setError(''); setLoading(true);

    const res = await fetch('/api/auth/verify-otp', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target: otpTarget.trim(), code: otp, purpose: 'login' }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error || 'Invalid OTP');
      setLoading(false);
      return;
    }

    // Sign in using the OTP provider with the verified user ID
    const result = await signIn('otp', {
      userId: data.user.id,
      loginToken: data.loginToken,
      redirect: false,
    });

    if (result?.error) {
      setError('Login failed. Please try again.');
    } else {
      router.push(redirectTo); router.refresh();
    }
    setLoading(false);
  };

  const inputCls = 'w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-[#7FAF8E] focus:ring-2 focus:ring-[#DDEBE7] outline-none transition-all text-sm';

  const tabs: { id: LoginTab; label: string; icon: React.ReactNode }[] = [
    { id: 'password', label: 'Password', icon: <Lock className="w-4 h-4" /> },
    { id: 'email-otp', label: 'Email OTP', icon: <Mail className="w-4 h-4" /> },
    { id: 'whatsapp', label: 'WhatsApp', icon: <MessageCircle className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F0E8] via-white to-[#DDEBE7] flex items-center justify-center px-4 py-6">
      <div className="max-w-md w-full">
        <div className="text-center mb-5">
          <Link href="/" className="inline-block">
            {settings.logo && settings.logo !== '/images/logo.png'
              ? <img src={settings.logo} alt={settings.storeName} className="h-12 object-contain mx-auto" />
              : <h1 className="text-3xl font-bold text-[#7FAF8E]">{shopType.emoji} {settings.storeName}</h1>
            }
          </Link>
          <p className="mt-1.5 text-gray-500 text-sm">Welcome back!</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-8 border border-[#EEEEEE]">
          <h2 className="text-2xl font-bold text-gray-800 mb-5 text-center">Sign In</h2>

          {/* Tab switcher */}
          <div className="flex bg-[#F7F7F5] rounded-2xl p-1 mb-6 gap-1">
            {tabs.map(t => (
              <button key={t.id} onClick={() => { setTab(t.id); setError(''); setInfo(''); resetOtp(); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-all ${
                  tab === t.id ? 'bg-white text-[#7FAF8E] shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {info && <div className="bg-green-50 border border-green-200 text-green-700 rounded-2xl p-3 mb-4 text-sm">{info}</div>}
          {error && <div className="bg-red-50 border border-red-200 text-red-600 rounded-2xl p-3 mb-4 text-sm">{error}</div>}

          {/* ── Password tab ── */}
          {tab === 'password' && (
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  className={inputCls} placeholder="your@email.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                  className={inputCls} placeholder="••••••••" />
              </div>
              <div className="flex justify-end">
                <Link href="/auth/forgot-password" className="text-xs text-[#7FAF8E] hover:underline">Forgot password?</Link>
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-[#7FAF8E] text-white py-3 rounded-2xl font-semibold hover:bg-[#6A9B7D] transition-colors disabled:opacity-50">
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          )}

          {/* ── Email OTP tab ── */}
          {tab === 'email-otp' && (
            <form onSubmit={handleOtpLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                <div className="flex gap-2">
                  <input type="email" value={otpTarget} onChange={e => { setOtpTarget(e.target.value); resetOtp(); }}
                    className={inputCls} placeholder="your@email.com" disabled={otpSent} />
                  {!otpSent && (
                    <button type="button" onClick={handleSendOtp} disabled={loading || !otpTarget}
                      className="px-4 py-3 bg-[#7FAF8E] text-white rounded-2xl text-sm font-medium hover:bg-[#6A9B7D] disabled:opacity-50 whitespace-nowrap">
                      {loading ? '...' : 'Send OTP'}
                    </button>
                  )}
                </div>
              </div>
              {otpSent && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Enter 6-digit OTP</label>
                    <input type="text" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className={`${inputCls} text-center text-2xl tracking-[0.5em] font-bold`}
                      placeholder="000000" maxLength={6} autoFocus />
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{otpTimer > 0 ? `Resend in ${otpTimer}s` : ''}</span>
                    <button type="button" onClick={() => { resetOtp(); }} disabled={otpTimer > 0}
                      className="flex items-center gap-1 text-[#7FAF8E] hover:underline disabled:opacity-40">
                      <RefreshCw className="w-3 h-3" /> Change email
                    </button>
                  </div>
                  <button type="submit" disabled={loading || otp.length !== 6}
                    className="w-full bg-[#7FAF8E] text-white py-3 rounded-2xl font-semibold hover:bg-[#6A9B7D] disabled:opacity-50">
                    {loading ? 'Verifying...' : 'Verify & Sign In'}
                  </button>
                </>
              )}
            </form>
          )}

          {/* ── WhatsApp OTP tab ── */}
          {tab === 'whatsapp' && (
            <form onSubmit={handleOtpLogin} className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-xs text-green-700 flex items-start gap-2">
                <MessageCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>We&apos;ll send a 6-digit OTP to your WhatsApp number. Make sure WhatsApp is active on this number.</span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">WhatsApp Number</label>
                <div className="flex gap-2">
                  <div className="flex items-center px-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm text-gray-600 font-medium">+91</div>
                  <input type="tel" value={otpTarget} onChange={e => { setOtpTarget(e.target.value.replace(/\D/g, '')); resetOtp(); }}
                    className={inputCls} placeholder="98765 43210" maxLength={10} disabled={otpSent} />
                  {!otpSent && (
                    <button type="button" onClick={handleSendOtp} disabled={loading || otpTarget.length < 10}
                      className="px-4 py-3 bg-green-500 text-white rounded-2xl text-sm font-medium hover:bg-green-600 disabled:opacity-50 whitespace-nowrap">
                      {loading ? '...' : 'Send'}
                    </button>
                  )}
                </div>
              </div>
              {otpSent && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Enter OTP from WhatsApp</label>
                    <input type="text" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className={`${inputCls} text-center text-2xl tracking-[0.5em] font-bold`}
                      placeholder="000000" maxLength={6} autoFocus />
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{otpTimer > 0 ? `Resend in ${otpTimer}s` : ''}</span>
                    <button type="button" onClick={resetOtp} disabled={otpTimer > 0}
                      className="flex items-center gap-1 text-green-600 hover:underline disabled:opacity-40">
                      <RefreshCw className="w-3 h-3" /> Change number
                    </button>
                  </div>
                  <button type="submit" disabled={loading || otp.length !== 6}
                    className="w-full bg-green-500 text-white py-3 rounded-2xl font-semibold hover:bg-green-600 disabled:opacity-50">
                    {loading ? 'Verifying...' : 'Verify & Sign In'}
                  </button>
                </>
              )}
            </form>
          )}

          {/* Google */}
          <div className="mt-5">
            <div className="relative flex items-center my-4">
              <div className="flex-1 border-t border-gray-200" />
              <span className="px-3 text-xs text-gray-400">or</span>
              <div className="flex-1 border-t border-gray-200" />
            </div>
            <button onClick={() => signIn('google', { callbackUrl: redirectTo })}
              className="w-full flex items-center justify-center gap-3 bg-white border border-gray-200 rounded-2xl py-3 hover:bg-gray-50 transition-all text-sm font-medium text-gray-700">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.23v2.84C4.13 20.49 7.79 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.42.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.79 1 4.13 3.48 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>
          </div>

          <p className="mt-5 text-center text-sm text-gray-500">
            New to {settings.storeName}?{' '}
            <Link href="/auth/register" className="text-[#7FAF8E] font-semibold hover:underline">Create account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}
