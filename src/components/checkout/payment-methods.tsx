'use client';

import { useState } from 'react';
import { Banknote, Check, Copy, CreditCard, Globe, Smartphone, ShieldCheck, AlertCircle } from 'lucide-react';
import type { PaymentMethodId } from '@/lib/payment-settings';

export type { PaymentMethodId };

export interface PublicPaymentSettings {
  methods: PaymentMethodId[];
  /** Methods for orders shipping outside India. */
  internationalMethods?: PaymentMethodId[];
  upiId: string;
  upiInstructions: string;
}

export const PAYMENT_LABELS: Record<PaymentMethodId, string> = {
  RAZORPAY: 'Pay Online',
  UPI: 'UPI Transfer',
  COD: 'Cash on Delivery',
  STRIPE: 'Card payment',
};

const OPTIONS: Record<
  PaymentMethodId,
  { icon: typeof CreditCard; title: string; subtitle: string; tags: string[] }
> = {
  RAZORPAY: {
    icon: CreditCard,
    title: 'Pay Online',
    subtitle: 'Secure checkout by Razorpay. Your order is confirmed instantly.',
    tags: ['Cards', 'UPI', 'Net Banking', 'Wallets'],
  },
  UPI: {
    icon: Smartphone,
    title: 'UPI Transfer',
    subtitle: "Place your order, then pay to our UPI ID from any app. We confirm once it's received.",
    tags: ['GPay', 'PhonePe', 'Paytm', 'BHIM'],
  },
  COD: {
    icon: Banknote,
    title: 'Cash on Delivery',
    subtitle: 'Pay in cash when your order arrives at your door.',
    tags: [],
  },
  STRIPE: {
    icon: Globe,
    title: 'Pay by card',
    subtitle: 'Secure checkout by Stripe, charged in your currency.',
    tags: ['Visa', 'Mastercard', 'Amex', 'Apple Pay', 'Google Pay'],
  },
};

export function UpiPaymentDetails({ upiId, instructions, amount }: { upiId: string; instructions?: string; amount?: number }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(upiId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked; the ID is still visible to copy by hand.
    }
  };

  return (
    <div className="rounded-xl bg-white border border-[#DDEBE7] p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-[#777777] mb-1.5">Pay to UPI ID</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 min-w-0 truncate rounded-lg bg-[#F7F7F5] px-3 py-2 text-sm font-semibold text-[#333333]">
          {upiId}
        </code>
        <button
          type="button"
          onClick={copy}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-[#E5E5E5] px-3 py-2 text-sm font-medium text-[#555555] hover:border-[#AFC8B8] hover:text-[#7FAF8E] transition-colors"
        >
          {copied ? <Check className="w-4 h-4 text-[#7FAF8E]" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      {typeof amount === 'number' && (
        <p className="mt-3 text-sm text-[#555555]">
          Amount: <span className="font-semibold text-[#333333]">₹{amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
        </p>
      )}
      {instructions && <p className="mt-2 text-sm text-[#777777] whitespace-pre-line">{instructions}</p>}
    </div>
  );
}

interface PaymentMethodPickerProps {
  settings: PublicPaymentSettings | null;
  value: string;
  onChange: (method: PaymentMethodId) => void;
}

export function PaymentMethodPicker({ settings, value, onChange }: PaymentMethodPickerProps) {
  if (!settings) {
    return (
      <div className="space-y-3">
        {[0, 1].map((i) => (
          <div key={i} className="h-24 rounded-2xl bg-[#F7F7F5] animate-pulse" />
        ))}
      </div>
    );
  }

  if (settings.methods.length === 0) {
    return (
      <div className="flex gap-3 rounded-2xl border border-[#FFE4C4] bg-[#FFF8F0] p-4">
        <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
        <div>
          <p className="font-medium text-[#333333]">Checkout is temporarily unavailable</p>
          <p className="text-sm text-[#777777]">
            We can&apos;t take orders online right now. Please contact us on WhatsApp to order.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3" role="radiogroup" aria-label="Payment method">
      {settings.methods.map((id) => {
        const option = OPTIONS[id];
        const Icon = option.icon;
        const selected = value === id;

        return (
          <div
            key={id}
            className={`rounded-2xl border-2 transition-all ${
              selected ? 'border-[#7FAF8E] bg-[#F8FBF9] shadow-sm' : 'border-[#E5E5E5] bg-white hover:border-[#AFC8B8]'
            }`}
          >
            <button
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(id)}
              className="flex w-full items-start gap-4 p-4 text-left"
            >
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors ${
                  selected ? 'bg-[#7FAF8E] text-white' : 'bg-[#F7F7F5] text-[#7FAF8E]'
                }`}
              >
                <Icon className="w-5 h-5" />
              </span>

              <span className="flex-1 min-w-0">
                <span className="block font-semibold text-[#333333]">{option.title}</span>
                <span className="block text-sm text-[#777777] mt-0.5">{option.subtitle}</span>
                {option.tags.length > 0 && (
                  <span className="mt-2.5 flex flex-wrap gap-1.5">
                    {option.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-[#E5E5E5] bg-white px-2.5 py-0.5 text-xs font-medium text-[#555555]"
                      >
                        {tag}
                      </span>
                    ))}
                  </span>
                )}
              </span>

              <span
                className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                  selected ? 'border-[#7FAF8E] bg-[#7FAF8E]' : 'border-[#CCCCCC]'
                }`}
                aria-hidden
              >
                {selected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
              </span>
            </button>

            {selected && id === 'UPI' && settings.upiId && (
              <div className="px-4 pb-4 -mt-1">
                <UpiPaymentDetails upiId={settings.upiId} instructions={settings.upiInstructions} />
              </div>
            )}
          </div>
        );
      })}

      {settings.methods.includes('STRIPE') && (
        <p className="flex items-center gap-1.5 pt-1 text-xs text-[#777777]">
          <ShieldCheck className="w-4 h-4 text-[#7FAF8E]" />
          Card payments are encrypted and processed by Stripe. We never see your card details.
        </p>
      )}
      {settings.methods.includes('RAZORPAY') && (
        <p className="flex items-center gap-1.5 pt-1 text-xs text-[#777777]">
          <ShieldCheck className="w-4 h-4 text-[#7FAF8E]" />
          Online payments are encrypted and processed by Razorpay. We never see your card details.
        </p>
      )}
    </div>
  );
}
