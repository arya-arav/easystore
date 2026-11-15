import { prisma } from '@/lib/prisma';
import { getLoyaltyConfig, getUserBalance } from '@/lib/loyalty';
import { convertFromInr, formatMoney } from '@/lib/markets';

// Coupon and loyalty-point discounts, worked out on the server. The checkout page
// only sends a coupon code and a number of points; amounts are never taken from
// the browser. Used by /api/coupons/validate, /api/loyalty/validate and /api/orders.

export interface CouponLine {
  productId: string;
  categoryId: string | null;
  price: number; // INR, per unit
  quantity: number;
}

export type CouponResult =
  | { ok: true; coupon: { id: string; code: string; description: string | null; discountType: string; discountValue: number; minOrderValue: number | null; maxDiscount: number | null }; amount: number }
  | { ok: false; error: string };

const round2 = (n: number) => Math.round(n * 100) / 100;

export async function evaluateCoupon(
  code: string,
  lines: CouponLine[],
  userId?: string | null,
  /** Currency the shopper sees, for amounts in messages */
  display: { currency: string; rate: number } = { currency: 'INR', rate: 1 }
): Promise<CouponResult> {
  if (!code?.trim()) return { ok: false, error: 'Coupon code is required' };
  const coupon = await prisma.coupon.findUnique({ where: { code: code.trim().toUpperCase() } });
  if (!coupon) return { ok: false, error: 'Invalid coupon code' };
  if (!coupon.isActive) return { ok: false, error: 'This coupon is inactive' };

  const now = new Date();
  if (now < coupon.validFrom) return { ok: false, error: 'This coupon is not yet valid' };
  if (now > coupon.validTo) return { ok: false, error: 'This coupon has expired' };
  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
    return { ok: false, error: 'This coupon has reached its usage limit' };
  }

  if (coupon.applicableTo === 'FIRST_ORDER') {
    if (!userId) return { ok: false, error: 'Sign in to use this first-order coupon' };
    const previous = await prisma.order.count({ where: { userId, status: { not: 'CANCELLED' } } });
    if (previous > 0) return { ok: false, error: 'This coupon is only for your first order' };
  }

  // Category coupons only discount that category's items (including its subcategories).
  let eligible = lines;
  if (coupon.applicableTo === 'SPECIFIC_CATEGORY' && coupon.categoryId) {
    const children = await prisma.category.findMany({ where: { parentId: coupon.categoryId }, select: { id: true } });
    const ids = new Set([coupon.categoryId, ...children.map((c) => c.id)]);
    eligible = lines.filter((l) => l.categoryId && ids.has(l.categoryId));
    if (eligible.length === 0) return { ok: false, error: 'This coupon doesn’t apply to the items in your cart' };
  }

  const subtotal = lines.reduce((sum, l) => sum + l.price * l.quantity, 0);
  const eligibleSubtotal = eligible.reduce((sum, l) => sum + l.price * l.quantity, 0);
  if (coupon.minOrderValue && subtotal < Number(coupon.minOrderValue)) {
    return { ok: false, error: `Minimum order value of ${formatMoney(convertFromInr(Number(coupon.minOrderValue), display.currency, display.rate), display.currency)} required` };
  }

  let amount =
    coupon.discountType === 'PERCENTAGE'
      ? (eligibleSubtotal * Number(coupon.discountValue)) / 100
      : Number(coupon.discountValue);
  if (coupon.maxDiscount) amount = Math.min(amount, Number(coupon.maxDiscount));
  amount = round2(Math.max(0, Math.min(amount, eligibleSubtotal)));

  return {
    ok: true,
    amount,
    coupon: {
      id: coupon.id,
      code: coupon.code,
      description: coupon.description,
      discountType: coupon.discountType,
      discountValue: Number(coupon.discountValue),
      minOrderValue: coupon.minOrderValue ? Number(coupon.minOrderValue) : null,
      maxDiscount: coupon.maxDiscount ? Number(coupon.maxDiscount) : null,
    },
  };
}

export type PointsResult =
  | { ok: true; points: number; amount: number; remainingBalance: number }
  | { ok: false; error: string };

/** How many of the requested points can be used on an order of `orderBase` INR, and what they're worth. */
export async function evaluatePoints(userId: string, requested: number, orderBase: number): Promise<PointsResult> {
  const config = await getLoyaltyConfig();
  const wanted = Math.floor(Number(requested) || 0);
  if (wanted < config.minRedeem) return { ok: false, error: `Minimum ${config.minRedeem} points required to redeem` };

  const balance = await getUserBalance(userId);
  if (balance < wanted) return { ok: false, error: 'Insufficient points balance' };

  const maxAllowed = Math.floor((Math.max(0, orderBase) * config.maxRedeemPct) / 100);
  const amount = Math.min(wanted * config.redeemRate, maxAllowed);
  if (amount <= 0) return { ok: false, error: 'Points can’t be used on this order' };
  const points = Math.ceil(amount / config.redeemRate);
  return { ok: true, points, amount, remainingBalance: balance - points };
}

/** Counts one use of a coupon, unless that would pass its usage limit. Returns false if it's used up. */
export async function claimCouponUse(couponId: string): Promise<boolean> {
  const coupon = await prisma.coupon.findUnique({ where: { id: couponId }, select: { usageLimit: true } });
  if (!coupon) return false;
  const result = await prisma.coupon.updateMany({
    where: coupon.usageLimit === null ? { id: couponId } : { id: couponId, usedCount: { lt: coupon.usageLimit } },
    data: { usedCount: { increment: 1 } },
  });
  return result.count === 1;
}

/** Deducts points only if the balance still covers them (safe against two orders at once). */
export async function spendPoints(userId: string, points: number, description: string, orderId: string): Promise<boolean> {
  const updated = await prisma.user.updateMany({
    where: { id: userId, loyaltyBalance: { gte: points } },
    data: { loyaltyBalance: { decrement: points } },
  });
  if (updated.count !== 1) return false;
  await prisma.loyaltyPoint.create({ data: { userId, points: -points, type: 'REDEEMED', description, orderId } });
  return true;
}
