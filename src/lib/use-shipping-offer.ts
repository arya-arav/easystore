'use client';

import { useSettings } from '@/lib/settings-context';
import { useMoney } from '@/lib/currency-context';
import { HOME_COUNTRY } from '@/lib/markets';

/** The shipping promise to show this shopper: domestic for India, international elsewhere. */
export function useShippingOffer() {
  const { settings } = useSettings();
  const { format, international, country, shipping } = useMoney();
  const abroad = international && !!country && country !== HOME_COUNTRY;

  // The shopper's region (from /api/markets) has the real delivery terms, at home or abroad
  if (shipping) {
    const free = shipping.freeAbove;
    return {
      abroad,
      short: free === 0 ? 'Free shipping' : free ? `Free shipping ${format(free)}+` : abroad ? 'Worldwide shipping' : `Delivery ${format(shipping.rate)}`,
      long: free === 0
        ? `FREE shipping on every order${!abroad && (settings.payment?.methods || []).includes('COD') ? ' • COD available' : ''}`
        : free
          ? `FREE ${abroad ? 'international ' : ''}shipping on orders above ${format(free)}${!abroad && (settings.payment?.methods || []).includes('COD') ? ' • COD available' : ''}`
          : `We ship ${abroad ? 'worldwide' : 'across India'} · delivery in ${shipping.minDays}–${shipping.maxDays} days`,
      threshold: free,
    };
  }

  const threshold = settings.freeShippingAbove ?? 499;
  const cod = (settings.payment?.methods || []).includes('COD') ? ' • COD available' : '';
  if (!threshold) {
    return { abroad: false, short: 'Free shipping', long: `FREE shipping on every order${cod}`, threshold: 0 };
  }
  return {
    abroad: false,
    short: `Free Shipping ${format(threshold)}+`,
    long: `FREE Shipping on orders above ${format(threshold)}${cod}`,
    threshold,
  };
}
