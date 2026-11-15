'use client';

import { useState } from 'react';
import { Mail, CheckCircle } from 'lucide-react';
import { useSettings } from '@/lib/settings-context';

export function NewsletterSection() {
  const { settings } = useSettings();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsSubscribed(true);
        setEmail('');
      } else {
        setError(data.error || 'Something went wrong. Please try again.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubscribed) {
    return (
      <section className="py-12 md:py-16 bg-[#F5F0E8]">
        <div className="content-container text-center">
          <div className="max-w-md mx-auto bg-white rounded-2xl p-8 shadow-sm border border-[#EDE8DF]">
            <CheckCircle className="w-16 h-16 text-[#7FAF8E] mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-[#333333] mb-2">You&apos;re Subscribed!</h3>
            <p className="text-[#777777]">
              Thank you for subscribing to {settings.storeName} newsletter. Check your email for your discount code!
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 md:py-16 bg-[#F5F0E8]">
      <div className="content-container">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-[#333333] mb-3">{settings.newsletterTitle}</h2>
          <p className="text-[#777777] mb-8">{settings.newsletterSubtitle}</p>
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <div className="relative flex-1">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#C4B8A8]" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                className="w-full pl-12 pr-4 py-3 rounded-xl bg-white border border-[#EDE8DF] text-[#333333] placeholder-[#AAAAAA] focus:outline-none focus:ring-2 focus:ring-[#D4C9B8]"
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-3 bg-[#7FAF8E] text-white rounded-xl font-medium hover:bg-[#6A9B7D] transition-colors disabled:opacity-75"
            >
              {isSubmitting ? 'Subscribing...' : 'Subscribe'}
            </button>
          </form>
          {error && <p className="text-sm text-red-500 mt-3">{error}</p>}
          <p className="text-xs text-[#767676] mt-4">
            By subscribing, you agree to receive marketing emails. Unsubscribe anytime.
          </p>
        </div>
      </div>
    </section>
  );
}
