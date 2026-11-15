import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { markOrderPaid } from '@/lib/order-payments';
import { verifyWebhook } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

// Stripe → us. Endpoint: https://<your-domain>/api/webhooks/stripe
// Events: checkout.session.completed, checkout.session.async_payment_succeeded,
// checkout.session.async_payment_failed, checkout.session.expired
export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });

  const body = await request.text();
  const event = verifyWebhook(body, request.headers.get('stripe-signature'), secret);
  if (!event) return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });

  const checkout = event.data.object;
  const orderId: string | undefined = checkout?.metadata?.order_id;
  if (!orderId) return NextResponse.json({ received: true });

  try {
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded':
        if (checkout.payment_status === 'paid') {
          await markOrderPaid(orderId, checkout.payment_intent || checkout.id, 'Card payment received via Stripe');
        }
        break;
      case 'checkout.session.async_payment_failed':
      case 'checkout.session.expired':
        await prisma.order.updateMany({
          where: { id: orderId, paymentStatus: { not: 'COMPLETED' } },
          data: { paymentStatus: 'FAILED' },
        });
        break;
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Stripe webhook error:', error);
    return NextResponse.json({ error: 'Webhook handling failed' }, { status: 500 });
  }
}
