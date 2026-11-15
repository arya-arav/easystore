import { prisma } from '@/lib/prisma';
import { CURRENCIES, parseMarketsConfig, type MarketsConfig } from '@/lib/markets';

const RATES_URL = 'https://open.er-api.com/v6/latest/INR';
const RATES_MAX_AGE_MS = 12 * 60 * 60 * 1000;

async function fetchRates(): Promise<Record<string, number> | null> {
  try {
    const res = await fetch(RATES_URL, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const data = (await res.json()) as { result?: string; rates?: Record<string, number> };
    if (data.result !== 'success' || !data.rates) return null;
    const rates: Record<string, number> = { INR: 1 };
    for (const code of Object.keys(CURRENCIES)) {
      const rate = data.rates[code];
      if (typeof rate === 'number' && rate > 0) rates[code] = rate;
    }
    return rates;
  } catch {
    return null;
  }
}

/**
 * Market settings, with exchange rates refreshed when international selling is on
 * and the cached rates are older than 12 hours. A failed refresh keeps the old rates.
 */
export async function getMarkets(): Promise<MarketsConfig> {
  const row = await prisma.siteSettings.findUnique({ where: { id: 'default' }, select: { markets: true } });
  const config = parseMarketsConfig(row?.markets);
  if (!config.international) return config;

  const age = config.ratesUpdatedAt ? Date.now() - new Date(config.ratesUpdatedAt).getTime() : Infinity;
  if (age < RATES_MAX_AGE_MS) return config;

  const rates = await fetchRates();
  if (!rates) return config;

  const updated: MarketsConfig = { ...config, rates, ratesUpdatedAt: new Date().toISOString() };
  await prisma.siteSettings
    .update({ where: { id: 'default' }, data: { markets: JSON.stringify(updated) } })
    .catch(() => {});
  return updated;
}

/** The shopper's country from Cloudflare's geolocation header (absent in local dev). */
export function requestCountry(headers: Headers): string | null {
  const country = headers.get('cf-ipcountry');
  return country && /^[A-Z]{2}$/.test(country) && country !== 'XX' ? country : null;
}
