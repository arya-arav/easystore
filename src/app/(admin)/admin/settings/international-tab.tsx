'use client';

import { AlertTriangle, CheckCircle, Globe } from 'lucide-react';
import { CURRENCIES, DEFAULT_MARKETS, convertFromInr, formatMoney, parseMarketsConfig, type MarketsConfig } from '@/lib/markets';

interface InternationalTabProps {
  formData: Record<string, any>;
  setFormData: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  inputClass: string;
  labelClass: string;
}

export function InternationalTab({ formData, setFormData, inputClass, labelClass }: InternationalTabProps) {
  const markets: MarketsConfig = parseMarketsConfig(formData.markets ?? DEFAULT_MARKETS);
  const stripeReady = !!formData.stripeConfigured;
  const paymentMethods = formData.paymentMethods || {};

  const setMarkets = (patch: Partial<MarketsConfig>) =>
    setFormData((prev) => ({ ...prev, markets: { ...parseMarketsConfig(prev.markets ?? DEFAULT_MARKETS), ...patch } }));
  const setShipping = (patch: Partial<MarketsConfig['shipping']>) => setMarkets({ shipping: { ...markets.shipping, ...patch } });

  const toggleCurrency = (code: string) => {
    if (code === 'INR') return;
    const on = markets.currencies.includes(code);
    setMarkets({ currencies: on ? markets.currencies.filter((c) => c !== code) : [...markets.currencies, code] });
  };

  const sample = 1000; // ₹ example for the rates preview
  const updated = markets.ratesUpdatedAt ? new Date(markets.ratesUpdatedAt).toLocaleString() : null;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm p-6 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
              <Globe className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-gray-800">Sell internationally</h2>
              <p className="text-sm text-gray-500 mt-1">
                Ship worldwide, show prices in local currencies and take card payments through Stripe.
                Product prices stay in INR; other currencies are converted automatically.
              </p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={markets.international}
            aria-label="Sell internationally"
            onClick={() => setMarkets({ international: !markets.international })}
            className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${markets.international ? 'bg-primary-500' : 'bg-gray-300'}`}
          >
            <span className={`absolute left-0 top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${markets.international ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>

        {markets.international && (
          <div className={`flex gap-3 rounded-xl border p-4 text-sm ${stripeReady && paymentMethods.stripe ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}>
            {stripeReady && paymentMethods.stripe ? (
              <CheckCircle className="w-5 h-5 shrink-0 text-green-600" />
            ) : (
              <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600" />
            )}
            <p className={stripeReady && paymentMethods.stripe ? 'text-green-800' : 'text-amber-800'}>
              {!stripeReady
                ? 'International customers pay by card through Stripe, which isn’t connected yet. Add STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET as Secrets in Cloudflare. Until then, customers abroad can browse but not check out.'
                : !paymentMethods.stripe
                  ? 'Card payment (Stripe) is switched off in the Payment tab, so customers abroad can’t check out.'
                  : 'Stripe is connected. Customers abroad can check out and pay by card in their currency.'}
            </p>
          </div>
        )}
      </div>

      <div className={`bg-white rounded-2xl shadow-sm p-6 space-y-5 ${markets.international ? '' : 'opacity-50 pointer-events-none'}`}>
        <div>
          <h2 className="text-lg font-bold text-gray-800">Currencies</h2>
          <p className="text-sm text-gray-500 mt-1">
            Shoppers can switch to these in the top bar; visitors start with their country’s currency. Rates update automatically twice a day.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {Object.values(CURRENCIES).map((c) => {
            const on = markets.currencies.includes(c.code);
            const rate = markets.rates[c.code];
            return (
              <label key={c.code} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 ${on ? 'border-primary-200 bg-primary-50/40' : 'border-gray-100'}`}>
                <input type="checkbox" checked={on} disabled={c.code === 'INR'} onChange={() => toggleCurrency(c.code)} className="h-4 w-4 accent-[#7FAF8E]" />
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium text-gray-800">{c.code} · {c.name}</span>
                  <span className="block text-xs text-gray-400">
                    {c.code === 'INR' ? 'Base currency' : rate ? `${formatMoney(sample, 'INR')} ≈ ${formatMoney(convertFromInr(sample, c.code, rate), c.code)}` : 'Rate loads after saving'}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
        <p className="text-xs text-gray-400">{updated ? `Exchange rates last updated ${updated}.` : 'Exchange rates are fetched the first time the store loads after you switch this on.'}</p>
      </div>

      <div className={`bg-white rounded-2xl shadow-sm p-6 space-y-5 ${markets.international ? '' : 'opacity-50 pointer-events-none'}`}>
        <div>
          <h2 className="text-lg font-bold text-gray-800">International shipping</h2>
          <p className="text-sm text-gray-500 mt-1">One flat rate for orders shipping outside India, in INR (shown to shoppers in their currency).</p>
        </div>
        <div className="grid md:grid-cols-2 gap-5">
          <div>
            <label className={labelClass}>Shipping rate (₹)</label>
            <input type="number" min={0} value={markets.shipping.rate} onChange={(e) => setShipping({ rate: Number(e.target.value) || 0 })} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Free shipping above (₹, optional)</label>
            <input
              type="number"
              min={0}
              value={markets.shipping.freeAbove ?? ''}
              onChange={(e) => setShipping({ freeAbove: e.target.value === '' ? null : Number(e.target.value) })}
              className={inputClass}
              placeholder="No free shipping"
            />
          </div>
          <div>
            <label className={labelClass}>Delivery time, from (days)</label>
            <input type="number" min={1} value={markets.shipping.minDays} onChange={(e) => setShipping({ minDays: Number(e.target.value) || 1 })} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Delivery time, to (days)</label>
            <input type="number" min={1} value={markets.shipping.maxDays} onChange={(e) => setShipping({ maxDays: Number(e.target.value) || 1 })} className={inputClass} />
          </div>
        </div>
      </div>
    </div>
  );
}
