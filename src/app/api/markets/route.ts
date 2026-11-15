import { NextRequest, NextResponse } from 'next/server';
import { getMarkets, requestCountry } from '@/lib/markets-server';
import { CURRENCIES, suggestedCurrency, usableCurrencies } from '@/lib/markets';
import { getRegions, regionFor } from '@/lib/regions';

export const dynamic = 'force-dynamic';

// What the storefront needs for currencies and international shipping.
export async function GET(request: NextRequest) {
  try {
    const config = await getMarkets();
    const country = requestCountry(request.headers);
    // The shopper's region decides the suggested currency and the delivery promise
    const regions = await getRegions();
    const region = regionFor(regions, country);
    const usable = usableCurrencies(config);
    const cheapest = region?.shippingOptions.reduce<typeof region.shippingOptions[number] | null>((a, b) => (!a || b.price < a.price ? b : a), null) ?? null;
    const shipping = cheapest
      ? { rate: cheapest.price, freeAbove: cheapest.freeAbove, minDays: Math.min(...region!.shippingOptions.map((o) => o.minDays)), maxDays: cheapest.maxDays }
      : config.shipping;
    const currencies = usableCurrencies(config).map((code) => ({
      code,
      name: CURRENCIES[code].name,
      symbol: CURRENCIES[code].symbol,
      rate: config.rates[code] ?? (code === 'INR' ? 1 : 0),
    }));

    return NextResponse.json(
      {
        // Selling abroad: any region other than the home country
        international: regions.some((r) => r.countries.some((c) => c !== 'IN')),
        country,
        region: region ? { name: region.name, currency: region.currency } : null,
        suggestedCurrency: region && usable.includes(region.currency) ? region.currency : suggestedCurrency(country, config),
        currencies,
        shipping,
      },
      { headers: { 'Cache-Control': 'private, max-age=300' } }
    );
  } catch (error) {
    console.error('Markets error:', error);
    return NextResponse.json({
      international: false,
      country: null,
      suggestedCurrency: 'INR',
      currencies: [{ code: 'INR', name: CURRENCIES.INR.name, symbol: CURRENCIES.INR.symbol, rate: 1 }],
      shipping: null,
    });
  }
}
