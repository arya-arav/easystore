'use client';

import { Suspense } from 'react';
import { useSettings } from '@/lib/settings-context';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { MailCheck, XCircle } from 'lucide-react';

function VerifyEmailContent() {
  const { settings } = useSettings();
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  if (error) {
    return (
      <div className="min-h-screen bg-[#F7F7F5] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-lg p-10 text-center border border-[#EEEEEE]">
          <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-[#333333] mb-2">Link Invalid</h1>
          <p className="text-[#777777] mb-6">
            {error === 'missing' ? 'No verification token found.' : 'This verification link is invalid or has already been used.'}
          </p>
          <Link href="/auth/register"
            className="inline-block bg-[#7FAF8E] text-white px-6 py-3 rounded-2xl font-semibold hover:bg-[#6A9B7D] transition-colors">
            Register Again
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F7F5] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-lg p-10 text-center border border-[#EEEEEE]">
        <div className="w-20 h-20 bg-[#DDEBE7] rounded-full flex items-center justify-center mx-auto mb-6">
          <MailCheck className="w-10 h-10 text-[#7FAF8E]" />
        </div>
        <h1 className="text-2xl font-bold text-[#333333] mb-3">Check your email 📬</h1>
        <p className="text-[#555555] leading-relaxed mb-2">
          Thanks for registering at <strong>{settings.storeName}</strong>!
        </p>
        <p className="text-[#777777] text-sm leading-relaxed mb-8">
          We&apos;ve sent a verification link to your email address. Click the link to activate your account and start shopping.
        </p>
        <div className="bg-[#F7F7F5] rounded-2xl p-4 mb-6 text-sm text-[#777777]">
          Didn&apos;t receive it? Check your spam folder, or{' '}
          <Link href="/auth/register" className="text-[#7FAF8E] hover:underline font-medium">
            register again
          </Link>{' '}
          with the same email.
        </div>
        <Link href="/auth/login"
          className="inline-block text-sm text-[#7FAF8E] hover:underline">
          Already verified? Sign in →
        </Link>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  );
}
