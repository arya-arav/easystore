import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getMarkets } from '@/lib/markets-server';
import { toCountryCode } from '@/lib/markets';
import { priceOrder } from '@/lib/pricing';
import { cartCouponLines } from '@/lib/server-cart';

export const dynamic = 'force-dynamic';

/**
 * What the order would cost right now: the same calculation /api/orders charges.
 * Signed-in shoppers are priced from their account cart; guests send their browser
 * cart (product ids and quantities only — prices always come from the database).
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id || null;
    const body = await request.json().catch(() => ({}));

    let lines;
    if (userId) {
      lines = await cartCouponLines(userId);
    } else {
      const items: { productId: string; quantity: number }[] = (Array.isArray(body.items) ? body.items : [])
        .slice(0, 100)
        .filter((i: unknown): i is { productId: string; variant?: unknown; quantity?: unknown } => typeof (i as { productId?: unknown })?.productId === 'string');
      const products = await prisma.product.findMany({
        where: { id: { in: items.map((i) => i.productId) }, status: 'ACTIVE' },
        select: { id: true, price: true, categoryId: true },
      });
      const byId = new Map(products.map((p) => [p.id, p]));
      lines = items
        .filter((i) => byId.has(i.productId))
        .map((i) => ({
          productId: i.productId,
          categoryId: byId.get(i.productId)!.categoryId,
          price: Number(byId.get(i.productId)!.price),
          quantity: Math.max(1, Math.min(99, Number(i.quantity) || 1)),
        }));
    }

    const priced = await priceOrder({
      lines,
      country: toCountryCode(body.country),
      markets: await getMarkets(),
      userId,
      couponCode: userId && typeof body.couponCode === 'string' ? body.couponCode : null,
      pointsToRedeem: userId ? Number(body.pointsToRedeem) || 0 : 0,
      giftWrap: !!body.giftWrap,
      currency: typeof body.currency === 'string' ? body.currency : null,
      shippingOptionId: typeof body.shippingOptionId === 'string' ? body.shippingOptionId : null,
      paymentMethod: typeof body.paymentMethod === 'string' ? body.paymentMethod : null,
    });
    if ('error' in priced) return NextResponse.json({ error: priced.error }, { status: 400 });

    const { coupon, ...rest } = priced;
    return NextResponse.json({ ...rest, couponCode: coupon?.code ?? null });
  } catch (error) {
    console.error('Quote error:', error);
    return NextResponse.json({ error: 'Could not price the order' }, { status: 500 });
  }
}
