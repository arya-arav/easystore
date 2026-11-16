import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { convertFromInr } from '@/lib/markets';
import { isStripeConfigured } from '@/lib/payment-settings';
import { createCheckoutSession } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

// Starts Stripe Checkout for one of the shopper's unpaid STRIPE orders.
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isStripeConfigured()) return NextResponse.json({ error: 'Card payment is not available' }, { status: 400 });

    const { orderId } = await request.json();
    const order = await prisma.order.findFirst({
      where: { id: orderId, userId: session.user.id },
      select: { id: true, orderNumber: true, total: true, currency: true, exchangeRate: true, paymentMethod: true, paymentStatus: true },
    });
    if (!order || order.paymentMethod !== 'STRIPE') return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    if (order.paymentStatus === 'COMPLETED') return NextResponse.json({ error: 'This order is already paid' }, { status: 400 });

    // Charge the stored INR total at the rate fixed when the order was placed.
    const amount = convertFromInr(Number(order.total), order.currency, Number(order.exchangeRate));
    const origin = request.nextUrl.origin;
    const checkout = await createCheckoutSession({
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount,
      currency: order.currency,
      customerEmail: session.user.email,
      successUrl: `${origin}/checkout/success?order=${order.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${origin}/checkout/success?order=${order.id}&cancelled=1`,
    });

    await prisma.order.update({ where: { id: order.id }, data: { orderId: checkout.id } });
    return NextResponse.json({ url: checkout.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json({ error: 'Could not start card payment. Please try again.' }, { status: 500 });
  }
}
