'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { BASE_CURRENCY, HOME_COUNTRY, convertFromInr, formatMoney, type MarketsConfig } from '@/lib/markets';

const STORAGE_KEY = 'bb-currency';

interface PublicCurrency {
  code: string;
  name: string;
  symbol: string;
  rate: number;
}

interface CurrencyContextValue {
  /** Currency prices are shown (and, for international orders, charged) in. */
  currency: string;
  setCurrency: (code: string) => void;
  currencies: PublicCurrency[];
  international: boolean;
  /** Shopper's country from geolocation, if known. */
  country: string | null;
  shipping: MarketsConfig['shipping'] | null;
  /** INR → selected currency. */
  convert: (inr: number) => number;
  /** Selected currency → INR. */
  toInr: (amount: number) => number;
  /** Formats an INR amount in the selected currency. */
  format: (inr: number) => string;
  ready: boolean;
}

const fallback: CurrencyContextValue = {
  currency: BASE_CURRENCY,
  setCurrency: () => {},
  currencies: [{ code: 'INR', name: 'Indian Rupee', symbol: '₹', rate: 1 }],
  international: false,
  country: null,
  shipping: null,
  convert: (inr) => inr,
  toInr: (amount) => amount,
  format: (inr) => formatMoney(inr, BASE_CURRENCY),
  ready: false,
};

const CurrencyContext = createContext<CurrencyContextValue>(fallback);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<{ currencies: PublicCurrency[]; international: boolean; country: string | null; suggested: string; shipping: MarketsConfig['shipping'] | null } | null>(null);
  const [currency, setCurrencyState] = useState(BASE_CURRENCY);

  useEffect(() => {
    fetch('/api/markets?v=3') // version bump: skip copies cached before a change
      .then((r) => r.json())
      .then((d) => {
        const currencies: PublicCurrency[] = Array.isArray(d.currencies) && d.currencies.length ? d.currencies : fallback.currencies;
        setData({ currencies, international: !!d.international, country: d.country || null, suggested: d.suggestedCurrency || BASE_CURRENCY, shipping: d.shipping || null });
        let saved: string | null = null;
        try {
          saved = localStorage.getItem(STORAGE_KEY);
        } catch {}
        const pick = [saved, d.suggestedCurrency].find((c) => c && currencies.some((x) => x.code === c));
        setCurrencyState(pick || BASE_CURRENCY);
      })
      .catch(() => setData({ currencies: fallback.currencies, international: false, country: null, suggested: BASE_CURRENCY, shipping: null }));
  }, []);

  const setCurrency = useCallback((code: string) => {
    setCurrencyState(code);
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch {}
  }, []);

  const value = useMemo<CurrencyContextValue>(() => {
    const currencies = data?.currencies || fallback.currencies;
    const rate = currencies.find((c) => c.code === currency)?.rate || 1;
    const active = currencies.some((c) => c.code === currency) ? currency : BASE_CURRENCY;
    const convert = (inr: number) => (active === BASE_CURRENCY ? inr : convertFromInr(inr, active, rate));
    return {
      currency: active,
      setCurrency,
      currencies,
      international: data?.international ?? false,
      country: data?.country ?? null,
      shipping: data?.shipping ?? null,
      convert,
      toInr: (amount: number) => (active === BASE_CURRENCY || !rate ? amount : amount / rate),
      format: (inr: number) => formatMoney(convert(Number(inr) || 0), active),
      ready: !!data,
    };
  }, [data, currency, setCurrency]);

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export const useMoney = () => useContext(CurrencyContext);

/** True when the shopper looks to be in India (or we don't know). */
export const isHomeCountry = (country: string | null) => !country || country === HOME_COUNTRY;
