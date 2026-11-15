// International selling: countries, currencies and the market settings stored as
// JSON in SiteSettings.markets (Admin → Settings → International).
// Prices are stored and administered in INR; other currencies are converted for
// display and charged at the rate recorded on the order.
// Shared by server and browser: nothing here may touch process.env or Prisma.

export const BASE_CURRENCY = 'INR';
export const HOME_COUNTRY = 'IN';

export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
  decimals: number;
  locale: string;
}

export const CURRENCIES: Record<string, CurrencyInfo> = {
  INR: { code: 'INR', name: 'Indian Rupee', symbol: '₹', decimals: 0, locale: 'en-IN' },
  USD: { code: 'USD', name: 'US Dollar', symbol: '$', decimals: 2, locale: 'en-US' },
  EUR: { code: 'EUR', name: 'Euro', symbol: '€', decimals: 2, locale: 'en-IE' },
  GBP: { code: 'GBP', name: 'British Pound', symbol: '£', decimals: 2, locale: 'en-GB' },
  AED: { code: 'AED', name: 'UAE Dirham', symbol: 'AED', decimals: 2, locale: 'en-AE' },
  SAR: { code: 'SAR', name: 'Saudi Riyal', symbol: 'SAR', decimals: 2, locale: 'en-SA' },
  SGD: { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', decimals: 2, locale: 'en-SG' },
  AUD: { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', decimals: 2, locale: 'en-AU' },
  CAD: { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', decimals: 2, locale: 'en-CA' },
  NZD: { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', decimals: 2, locale: 'en-NZ' },
  MYR: { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', decimals: 2, locale: 'en-MY' },
  JPY: { code: 'JPY', name: 'Japanese Yen', symbol: '¥', decimals: 0, locale: 'ja-JP' },
};

export interface CountryInfo {
  code: string; // ISO 3166-1 alpha-2
  name: string;
  currency: string; // Suggested display currency (falls back to USD when not enabled)
  dial: string;
}

// Common destinations first, then alphabetical. The list can be extended freely.
export const COUNTRIES: CountryInfo[] = [
  { code: 'IN', name: 'India', currency: 'INR', dial: '+91' },
  { code: 'US', name: 'United States', currency: 'USD', dial: '+1' },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP', dial: '+44' },
  { code: 'AE', name: 'United Arab Emirates', currency: 'AED', dial: '+971' },
  { code: 'CA', name: 'Canada', currency: 'CAD', dial: '+1' },
  { code: 'AU', name: 'Australia', currency: 'AUD', dial: '+61' },
  { code: 'SG', name: 'Singapore', currency: 'SGD', dial: '+65' },
  { code: 'SA', name: 'Saudi Arabia', currency: 'SAR', dial: '+966' },
  { code: 'AT', name: 'Austria', currency: 'EUR', dial: '+43' },
  { code: 'BH', name: 'Bahrain', currency: 'USD', dial: '+973' },
  { code: 'BE', name: 'Belgium', currency: 'EUR', dial: '+32' },
  { code: 'BD', name: 'Bangladesh', currency: 'USD', dial: '+880' },
  { code: 'DK', name: 'Denmark', currency: 'EUR', dial: '+45' },
  { code: 'FI', name: 'Finland', currency: 'EUR', dial: '+358' },
  { code: 'FR', name: 'France', currency: 'EUR', dial: '+33' },
  { code: 'DE', name: 'Germany', currency: 'EUR', dial: '+49' },
  { code: 'HK', name: 'Hong Kong', currency: 'USD', dial: '+852' },
  { code: 'IE', name: 'Ireland', currency: 'EUR', dial: '+353' },
  { code: 'IT', name: 'Italy', currency: 'EUR', dial: '+39' },
  { code: 'JP', name: 'Japan', currency: 'JPY', dial: '+81' },
  { code: 'KW', name: 'Kuwait', currency: 'USD', dial: '+965' },
  { code: 'MY', name: 'Malaysia', currency: 'MYR', dial: '+60' },
  { code: 'MV', name: 'Maldives', currency: 'USD', dial: '+960' },
  { code: 'MU', name: 'Mauritius', currency: 'USD', dial: '+230' },
  { code: 'NP', name: 'Nepal', currency: 'USD', dial: '+977' },
  { code: 'NL', name: 'Netherlands', currency: 'EUR', dial: '+31' },
  { code: 'NZ', name: 'New Zealand', currency: 'NZD', dial: '+64' },
  { code: 'NO', name: 'Norway', currency: 'EUR', dial: '+47' },
  { code: 'OM', name: 'Oman', currency: 'USD', dial: '+968' },
  { code: 'PT', name: 'Portugal', currency: 'EUR', dial: '+351' },
  { code: 'QA', name: 'Qatar', currency: 'USD', dial: '+974' },
  { code: 'ES', name: 'Spain', currency: 'EUR', dial: '+34' },
  { code: 'LK', name: 'Sri Lanka', currency: 'USD', dial: '+94' },
  { code: 'SE', name: 'Sweden', currency: 'EUR', dial: '+46' },
  { code: 'CH', name: 'Switzerland', currency: 'EUR', dial: '+41' },
  { code: 'ZA', name: 'South Africa', currency: 'USD', dial: '+27' },
];

export const countryName = (code: string | null | undefined) =>
  COUNTRIES.find((c) => c.code === code)?.name || code || '';

/** Orders saved before international selling store the country by name ("India"). */
export function toCountryCode(value: string | null | undefined): string {
  if (!value) return HOME_COUNTRY;
  const upper = value.trim().toUpperCase();
  if (COUNTRIES.some((c) => c.code === upper)) return upper;
  return COUNTRIES.find((c) => c.name.toUpperCase() === upper)?.code || HOME_COUNTRY;
}

export interface MarketsConfig {
  international: boolean; // Sell and ship outside India
  currencies: string[]; // Currencies shoppers can switch to (INR is always available)
  shipping: { rate: number; freeAbove: number | null; minDays: number; maxDays: number }; // International, in INR
  rates: Record<string, number>; // 1 INR = rate units of each currency
  ratesUpdatedAt: string | null;
}

export const DEFAULT_MARKETS: MarketsConfig = {
  international: false,
  currencies: ['INR', 'USD', 'EUR', 'GBP', 'AED'],
  shipping: { rate: 1500, freeAbove: null, minDays: 7, maxDays: 14 },
  rates: { INR: 1 },
  ratesUpdatedAt: null,
};

const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : fallback);

export function parseMarketsConfig(raw: string | null | undefined | Partial<MarketsConfig>): MarketsConfig {
  let s: Record<string, any> = {};
  if (typeof raw === 'string') {
    try {
      s = JSON.parse(raw) || {};
    } catch {
      s = {};
    }
  } else if (raw && typeof raw === 'object') {
    s = raw;
  }
  const currencies = Array.isArray(s.currencies)
    ? s.currencies.filter((c: unknown): c is string => typeof c === 'string' && c in CURRENCIES)
    : DEFAULT_MARKETS.currencies;
  const ship = s.shipping || {};
  const rates: Record<string, number> = { INR: 1 };
  if (s.rates && typeof s.rates === 'object') {
    for (const [code, rate] of Object.entries(s.rates)) {
      if (code in CURRENCIES && typeof rate === 'number' && rate > 0) rates[code] = rate;
    }
  }
  return {
    international: !!s.international,
    currencies: Array.from(new Set(['INR', ...currencies])),
    shipping: {
      rate: num(ship.rate, DEFAULT_MARKETS.shipping.rate),
      freeAbove: ship.freeAbove == null || ship.freeAbove === '' ? null : num(Number(ship.freeAbove), 0) || null,
      minDays: num(ship.minDays, DEFAULT_MARKETS.shipping.minDays),
      maxDays: num(ship.maxDays, DEFAULT_MARKETS.shipping.maxDays),
    },
    rates,
    ratesUpdatedAt: typeof s.ratesUpdatedAt === 'string' ? s.ratesUpdatedAt : null,
  };
}

/** Currencies a shopper can actually use: enabled and with a known exchange rate. */
export function usableCurrencies(config: MarketsConfig): string[] {
  if (!config.international) return ['INR'];
  return config.currencies.filter((c) => c === 'INR' || config.rates[c] > 0);
}

export function suggestedCurrency(country: string | null | undefined, config: MarketsConfig): string {
  const usable = usableCurrencies(config);
  const preferred = COUNTRIES.find((c) => c.code === country)?.currency;
  if (preferred && usable.includes(preferred)) return preferred;
  if (country && country !== HOME_COUNTRY && usable.includes('USD')) return 'USD';
  return 'INR';
}

/** Converts an INR amount, rounded to the currency's usual precision. */
export function convertFromInr(inr: number, currency: string, rate: number): number {
  const decimals = CURRENCIES[currency]?.decimals ?? 2;
  const factor = 10 ** decimals;
  return Math.round(inr * rate * factor) / factor;
}

export function formatMoney(amount: number, currency: string): string {
  const info = CURRENCIES[currency] || CURRENCIES.INR;
  return new Intl.NumberFormat(info.locale, {
    style: 'currency',
    currency: info.code,
    minimumFractionDigits: info.decimals === 0 ? 0 : undefined,
    maximumFractionDigits: info.decimals,
  }).format(amount);
}

/** Formats an INR amount in the currency an order was paid in (orders store INR + rate). */
export function formatOrderMoney(order: { currency?: string | null; exchangeRate?: unknown }, inr: number | string): string {
  const currency = order.currency || 'INR';
  return formatMoney(convertFromInr(Number(inr) || 0, currency, Number(order.exchangeRate) || 1), currency);
}

/** International shipping charge in INR for an INR subtotal. */
export function internationalShipping(subtotalInr: number, config: MarketsConfig): number {
  const { rate, freeAbove } = config.shipping;
  return freeAbove != null && subtotalInr >= freeAbove ? 0 : rate;
}
