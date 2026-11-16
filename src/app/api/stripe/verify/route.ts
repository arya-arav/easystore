import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { markOrderPaid } from '@/lib/order-payments';
import { retrieveCheckoutSession } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

// Called by the success page when the shopper returns from Stripe, so the order shows
// as paid straight away even if the webhook hasn't arrived yet.
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const sessionId = request.nextUrl.searchParams.get('session_id') || '';
    const orderId = request.nextUrl.searchParams.get('order') || '';
    const order = await prisma.order.findFirst({ where: { id: orderId, userId: session.user.id }, select: { id: true, orderId: true } });
    if (!order || !sessionId || order.orderId !== sessionId) return NextResponse.json({ paid: false }, { status: 404 });

    const checkout = await retrieveCheckoutSession(sessionId);
    const paid = checkout.payment_status === 'paid' && checkout.metadata?.order_id === order.id;
    if (paid) await markOrderPaid(order.id, checkout.payment_intent || checkout.id, 'Card payment received via Stripe');
    return NextResponse.json({ paid });
  } catch (error) {
    console.error('Stripe verify error:', error);
    return NextResponse.json({ paid: false, error: 'Could not check payment' }, { status: 500 });
  }
}
