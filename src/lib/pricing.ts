import { prisma } from '@/lib/prisma';
import { findBundles, type AppliedBundle, type PricedLine } from '@/lib/bundles';
import { evaluateCoupon, evaluatePoints } from '@/lib/discounts';
import { type MarketsConfig } from '@/lib/markets';
import { getRegions, optionCharge, regionFor, regionPaymentMethods } from '@/lib/regions';
import { getPolicies } from '@/lib/policies-server';
import type { PaymentMethodId } from '@/lib/payment-settings';

// The one place an order's money is worked out (all amounts INR). Used by the order
// API and by /api/checkout/quote, which shows shoppers the same numbers before they pay.

export interface PriceInput {
  lines: PricedLine[];
  country: string;
  markets: MarketsConfig;
  userId?: string | null; // needed for coupons and points
  couponCode?: string | null;
  pointsToRedeem?: number;
  giftWrap?: boolean;
  /** Shopper's display currency, for amounts in error messages */
  currency?: string | null;
  /** Delivery option picked at checkout (default: the cheapest for this order) */
  shippingOptionId?: string | null;
  /** Adds the COD fee (Settings → Policies) when it is cash on delivery */
  paymentMethod?: string | null;
}

export interface QuotedShippingOption { id: string; name: string; charge: number; minDays: number; maxDays: number }

export interface PriceBreakdown {
  subtotal: number;
  bundles: AppliedBundle[];
  bundleDiscount: number;
  coupon: { id: string; code: string } | null;
  couponDiscount: number;
  /** Customer group discount (e.g. VIP 10%) for signed-in members */
  group: { name: string; percent: number } | null;
  groupDiscount: number;
  pointsUsed: number;
  pointsDiscount: number;
  discount: number; // bundle + group + coupon + points
  shippingCharge: number;
  /** Delivery options for the destination, with this order's charge for each */
  shippingOptions: QuotedShippingOption[];
  shippingOption: QuotedShippingOption | null;
  region: { id: string; name: string; currency: string; taxRate: number | null } | null;
  paymentMethods: PaymentMethodId[];
  codFee: number;
  giftWrapCharge: number;
  total: number;
}

export async function priceOrder(input: PriceInput): Promise<PriceBreakdown | { error: string }> {
  const { lines, country, markets } = input;
  const settings = await prisma.siteSettings.findUnique({
    where: { id: 'default' },
    select: { freeShippingAbove: true, baseShippingRate: true, bundleDiscount: true },
  });

  const subtotal = lines.reduce((sum, l) => sum + l.price * l.quantity, 0);

  const bundles = await findBundles(lines, settings?.bundleDiscount ?? 5);
  const bundleDiscount = bundles.reduce((sum, b) => sum + b.saving, 0);

  // Customer group discount on what's left after bundle savings
  let group: PriceBreakdown['group'] = null;
  let groupDiscount = 0;
  if (input.userId) {
    const member = await prisma.user.findUnique({ where: { id: input.userId }, select: { customerGroup: { select: { name: true, discountPercent: true } } } });
    const percent = Number(member?.customerGroup?.discountPercent || 0);
    if (member?.customerGroup && percent > 0) {
      group = { name: member.customerGroup.name, percent };
      groupDiscount = Math.round(Math.max(0, subtotal - bundleDiscount) * percent) / 100;
    }
  }

  let coupon: PriceBreakdown['coupon'] = null;
  let couponDiscount = 0;
  if (input.couponCode?.trim()) {
    const cur = input.currency && markets.rates[input.currency] ? input.currency : 'INR';
    const result = await evaluateCoupon(input.couponCode, lines, input.userId, { currency: cur, rate: markets.rates[cur] ?? 1 });
    if ('error' in result) return { error: result.error };
    coupon = { id: result.coupon.id, code: result.coupon.code };
    couponDiscount = result.amount;
  }

  let pointsUsed = 0;
  let pointsDiscount = 0;
  if (input.userId && (input.pointsToRedeem || 0) > 0) {
    const result = await evaluatePoints(input.userId, input.pointsToRedeem!, Math.max(0, subtotal - bundleDiscount - groupDiscount));
    if ('error' in result) return { error: result.error };
    pointsUsed = result.points;
    pointsDiscount = result.amount;
  }

  const discount = Math.min(subtotal, bundleDiscount + groupDiscount + couponDiscount + pointsDiscount);
  // Delivery: the destination's region and its options. Free-delivery thresholds look at
  // the subtotal before discounts, as the storefront advertises.
  const [regions, policies] = await Promise.all([getRegions(), getPolicies()]);
  const region = regionFor(regions, country);
  if (!region) return { error: 'Sorry, we don’t deliver to this country yet.' };
  const shippingOptions: QuotedShippingOption[] = region.shippingOptions.map((o) => ({ id: o.id, name: o.name, charge: optionCharge(o, subtotal), minDays: o.minDays, maxDays: o.maxDays }));
  if (shippingOptions.length === 0) return { error: 'Delivery to this country isn’t set up yet.' };
  const cheapest = shippingOptions.reduce((a, b) => (b.charge < a.charge ? b : a));
  const shippingOption = shippingOptions.find((o) => o.id === input.shippingOptionId) || cheapest;
  const shippingCharge = shippingOption.charge;
  const paymentMethods = await regionPaymentMethods(region);
  const codFee = input.paymentMethod === 'COD' ? policies.codFee : 0;
  const giftWrapCharge = input.giftWrap ? policies.giftWrapCharge : 0;

  return {
    subtotal,
    bundles,
    bundleDiscount,
    coupon,
    couponDiscount,
    group,
    groupDiscount,
    pointsUsed,
    pointsDiscount,
    discount,
    shippingCharge,
    shippingOptions,
    shippingOption,
    region: { id: region.id, name: region.name, currency: region.currency, taxRate: region.taxRate },
    paymentMethods,
    codFee,
    giftWrapCharge,
    total: Math.max(0, subtotal + shippingCharge + codFee + giftWrapCharge - discount),
  };
}
