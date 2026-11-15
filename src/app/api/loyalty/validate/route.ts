export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { evaluatePoints } from '@/lib/discounts';
import { cartCouponLines } from '@/lib/server-cart';

// Previews a points redemption against the cart (the same rules /api/orders applies).
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { pointsToRedeem } = await request.json();
  const lines = await cartCouponLines(session.user.id);
  const subtotal = lines.reduce((sum, l) => sum + l.price * l.quantity, 0);

  const result = await evaluatePoints(session.user.id, pointsToRedeem, subtotal);
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: 400 });

  return NextResponse.json({
    valid: true,
    pointsToRedeem: result.points,
    discountAmount: result.amount,
    remainingBalance: result.remainingBalance,
  });
}
