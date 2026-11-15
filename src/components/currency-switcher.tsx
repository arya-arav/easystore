'use client';

import { useMoney } from '@/lib/currency-context';

/** Compact currency picker; hidden when only INR is available. */
export function CurrencySwitcher({ className = '' }: { className?: string }) {
  const { currency, setCurrency, currencies } = useMoney();
  if (currencies.length < 2) return null;

  return (
    <label className={`inline-flex items-center ${className}`}>
      <span className="sr-only">Currency</span>
      <select
        value={currency}
        onChange={(e) => setCurrency(e.target.value)}
        className="cursor-pointer rounded-full border border-transparent bg-transparent py-1 pl-2 pr-6 text-xs font-medium text-current hover:border-current/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-300"
      >
        {currencies.map((c) => (
          <option key={c.code} value={c.code} className="text-gray-900">
            {c.code} {c.symbol !== c.code ? c.symbol : ''}
          </option>
        ))}
      </select>
    </label>
  );
}
