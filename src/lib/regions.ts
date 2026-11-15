import { prisma } from '@/lib/prisma';
import { getMarkets } from '@/lib/markets-server';
import { HOME_COUNTRY } from '@/lib/markets';
import { availablePaymentMethods, parsePaymentConfig, type PaymentMethodId } from '@/lib/payment-settings';

// Where we sell (Admin → Settings → Regions, Medusa-style). A region lists its
// countries ("*" = everywhere not in another region), the currency shown there, the
// payment methods offered, an optional tax rate and its delivery options.
//
// Until regions are set up, the old settings act as two regions: India (Shipping tab
// rates, Razorpay/UPI/COD) and, when international selling is on, the rest of the world
// (International tab rate, Stripe), so nothing changes for shoppers.

export interface ShippingOptionInfo {
  id: string;
  name: string;
  price: number; // INR
  freeAbove: number | null; // INR subtotal
  minDays: number;
  maxDays: number;
}

export interface RegionInfo {
  id: string;
  name: string;
  countries: string[];
  currency: string;
  paymentMethods: PaymentMethodId[];
  taxRate: number | null;
  shippingOptions: ShippingOptionInfo[];
  /** Built from the old settings (no regions saved yet). */
  legacy?: boolean;
}

const METHODS: PaymentMethodId[] = ['RAZORPAY', 'UPI', 'COD', 'STRIPE'];

export async function getRegions(): Promise<RegionInfo[]> {
  const saved = await prisma.region.findMany({
    where: { isActive: true },
    include: { shippingOptions: { where: { isActive: true }, orderBy: [{ sortOrder: 'asc' }, { price: 'asc' }] } },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });
  if (saved.length) {
    return saved.map((r) => ({
      id: r.id,
      name: r.name,
      countries: r.countries,
      currency: r.currency,
      paymentMethods: r.paymentMethods.filter((m): m is PaymentMethodId => (METHODS as string[]).includes(m)),
      taxRate: r.taxRate != null ? Number(r.taxRate) : null,
      shippingOptions: r.shippingOptions.map((o) => ({
        id: o.id, name: o.name, price: Number(o.price), freeAbove: o.freeAbove != null ? Number(o.freeAbove) : null, minDays: o.minDays, maxDays: o.maxDays,
      })),
    }));
  }
  return legacyRegions();
}

/** The old single-country + international settings, expressed as regions. */
export async function legacyRegions(): Promise<RegionInfo[]> {
  const [settings, markets] = await Promise.all([
    prisma.siteSettings.findUnique({
      where: { id: 'default' },
      select: { paymentMethods: true, freeShippingAbove: true, baseShippingRate: true, minDeliveryDays: true, maxDeliveryDays: true },
    }),
    getMarkets(),
  ]);
  const pay = parsePaymentConfig(settings?.paymentMethods);
  const regions: RegionInfo[] = [{
    id: 'legacy-in',
    name: 'India',
    countries: [HOME_COUNTRY],
    currency: 'INR',
    paymentMethods: [pay.online && 'RAZORPAY', pay.upi && 'UPI', pay.cod && 'COD'].filter(Boolean) as PaymentMethodId[],
    taxRate: null,
    legacy: true,
    shippingOptions: [{
      id: 'legacy-in-standard',
      name: 'Standard delivery',
      price: Number(settings?.baseShippingRate ?? 49),
      freeAbove: settings?.freeShippingAbove != null ? Number(settings.freeShippingAbove) : 499,
      minDays: settings?.minDeliveryDays ?? 3,
      maxDays: settings?.maxDeliveryDays ?? 7,
    }],
  }];
  if (markets.international) {
    regions.push({
      id: 'legacy-intl',
      name: 'Rest of the world',
      countries: ['*'],
      currency: 'USD',
      paymentMethods: pay.stripe ? ['STRIPE'] : [],
      taxRate: null,
      legacy: true,
      shippingOptions: [{
        id: 'legacy-intl-standard',
        name: 'International delivery',
        price: markets.shipping.rate,
        freeAbove: markets.shipping.freeAbove,
        minDays: markets.shipping.minDays,
        maxDays: markets.shipping.maxDays,
      }],
    });
  }
  return regions;
}

/** The region that sells to this country: an exact match first, then a "*" region. */
export function regionFor(regions: RegionInfo[], country: string | null | undefined): RegionInfo | null {
  const code = (country || HOME_COUNTRY).toUpperCase();
  return regions.find((r) => r.countries.includes(code)) || regions.find((r) => r.countries.includes('*')) || null;
}

/** What an option costs for this subtotal (free once the subtotal reaches freeAbove). */
export function optionCharge(option: ShippingOptionInfo, subtotalInr: number) {
  return option.freeAbove != null && subtotalInr >= option.freeAbove ? 0 : option.price;
}

/** Payment methods the shopper can actually use in this region (switched on, keys present). */
export async function regionPaymentMethods(region: RegionInfo | null): Promise<PaymentMethodId[]> {
  if (!region) return [];
  const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' }, select: { paymentMethods: true } });
  const config = parsePaymentConfig(settings?.paymentMethods);
  const ready = new Set([...availablePaymentMethods(config, 'IN'), ...availablePaymentMethods(config, 'INTL')]);
  return region.paymentMethods.filter((m) => ready.has(m));
}
