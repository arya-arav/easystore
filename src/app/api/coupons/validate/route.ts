import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { evaluateCoupon } from '@/lib/discounts';
import { getMarkets } from '@/lib/markets-server';
import { cartCouponLines } from '@/lib/server-cart';

export const dynamic = 'force-dynamic';

// Checks a coupon against the signed-in shopper's cart (the same rules /api/orders applies).
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Sign in to use a coupon' }, { status: 401 });

    const { code, currency } = await request.json();
    const markets = await getMarkets();
    const cur = typeof currency === 'string' && markets.rates[currency] ? currency : 'INR';
    const lines = await cartCouponLines(session.user.id);
    if (lines.length === 0) return NextResponse.json({ error: 'Your cart is empty' }, { status: 400 });

    const result = await evaluateCoupon(code, lines, session.user.id, { currency: cur, rate: markets.rates[cur] ?? 1 });
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: 400 });

    return NextResponse.json({ valid: true, coupon: { ...result.coupon, discountAmount: result.amount } });
  } catch (error) {
    console.error('Coupon validation error:', error);
    return NextResponse.json({ error: 'Failed to validate coupon' }, { status: 500 });
  }
}
