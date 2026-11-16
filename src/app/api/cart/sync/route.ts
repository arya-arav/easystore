import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getServerCart, normalizeVariant } from '@/lib/server-cart';

export const dynamic = 'force-dynamic';

/**
 * Merges the browser cart into the signed-in user's cart and returns the result.
 * Called when a shopper signs in. A line already in both keeps the larger
 * quantity, so syncing twice never doubles anything.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { items } = await request.json();
    const lines: { productId: string; variant: string; quantity: number }[] = (Array.isArray(items) ? items : [])
      .slice(0, 100)
      .filter((i: unknown): i is { productId: string; variant?: unknown; quantity?: unknown } => typeof (i as { productId?: unknown })?.productId === 'string')
      .map((i) => ({ productId: i.productId, variant: normalizeVariant(i.variant), quantity: Math.max(1, Math.min(99, Number(i.quantity) || 1)) }));

    if (lines.length > 0) {
      const available = new Set(
        (await prisma.product.findMany({
          where: { id: { in: lines.map((l) => l.productId) }, status: 'ACTIVE' },
          select: { id: true },
        })).map((p) => p.id)
      );

      for (const line of lines.filter((l) => available.has(l.productId))) {
        const key = { userId, productId: line.productId, variant: line.variant };
        const existing = await prisma.cartItem.findUnique({ where: { userId_productId_variant: key } });
        if (!existing) {
          await prisma.cartItem.create({ data: { ...key, quantity: line.quantity } });
        } else if (line.quantity > existing.quantity) {
          await prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: line.quantity } });
        }
      }
    }

    return NextResponse.json({ cartItems: await getServerCart(userId) });
  } catch (error) {
    console.error('Cart sync error:', error);
    return NextResponse.json({ error: 'Failed to sync cart' }, { status: 500 });
  }
}
