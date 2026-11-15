import { prisma } from '@/lib/prisma';
import { COUNTRIES, CURRENCIES } from '@/lib/markets';

// Cleans the admin region form and checks that countries don't overlap between regions.

const METHODS = ['RAZORPAY', 'UPI', 'COD', 'STRIPE'];
const CODES = new Set(COUNTRIES.map((c) => c.code));
const num = (v: unknown, fallback: number) => (v === '' || v == null || !Number.isFinite(Number(v)) ? fallback : Math.max(0, Number(v)));

export interface RegionInput {
  name: string;
  countries: string[];
  currency: string;
  paymentMethods: string[];
  taxRate: number | null;
  isActive: boolean;
  sortOrder: number;
  shippingOptions: { name: string; price: number; freeAbove: number | null; minDays: number; maxDays: number; isActive: boolean; sortOrder: number }[];
}

export function regionData(body: any): RegionInput | { error: string } {
  const name = String(body.name || '').trim();
  if (!name) return { error: 'Give the region a name' };
  const countries = Array.from(new Set((Array.isArray(body.countries) ? body.countries : []).map((c: unknown) => String(c).toUpperCase())))
    .filter((c) => c === '*' || CODES.has(c as string)) as string[];
  if (countries.length === 0) return { error: 'Choose at least one country (or "Rest of the world")' };
  const currency = String(body.currency || 'INR').toUpperCase();
  if (!CURRENCIES[currency]) return { error: 'Choose a currency' };
  const paymentMethods = (Array.isArray(body.paymentMethods) ? body.paymentMethods : []).map(String).filter((m: string) => METHODS.includes(m));
  const options = (Array.isArray(body.shippingOptions) ? body.shippingOptions : [])
    .map((o: any, i: number) => {
      const minDays = Math.round(num(o.minDays, 3));
      return {
        name: String(o.name || '').trim(),
        price: num(o.price, 0),
        freeAbove: o.freeAbove === '' || o.freeAbove == null ? null : num(o.freeAbove, 0),
        minDays,
        maxDays: Math.max(minDays, Math.round(num(o.maxDays, minDays))),
        isActive: o.isActive !== false,
        sortOrder: i,
      };
    })
    .filter((o: { name: string }) => o.name);
  if (options.length === 0) return { error: 'Add at least one delivery option' };
  return {
    name,
    countries,
    currency,
    paymentMethods,
    taxRate: body.taxRate === '' || body.taxRate == null ? null : Math.min(100, num(body.taxRate, 0)),
    isActive: body.isActive !== false,
    sortOrder: Math.round(num(body.sortOrder, 0)),
    shippingOptions: options,
  };
}

/** Countries can belong to one region only (and only one "rest of the world" region). */
export async function overlapError(countries: string[], exceptId?: string) {
  const others = await prisma.region.findMany({ where: { isActive: true, ...(exceptId ? { id: { not: exceptId } } : {}) }, select: { name: true, countries: true } });
  for (const other of others) {
    const clash = countries.find((c) => other.countries.includes(c));
    if (clash) {
      const label = clash === '*' ? '"Rest of the world"' : COUNTRIES.find((c) => c.code === clash)?.name || clash;
      return `${label} is already in the ${other.name} region`;
    }
  }
  return null;
}
