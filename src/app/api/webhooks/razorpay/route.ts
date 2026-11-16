import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { applyOrderStatusRewards } from '@/lib/order-rewards';
import { markOrderPaid } from '@/lib/order-payments';
import { hmacMatches } from '@/lib/razorpay';



// Razorpay Webhook Handler
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-razorpay-signature');

    // Verify webhook signature. Without a secret, refuse everything: an empty secret
    // would let anyone sign a "payment captured" event for any order.
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
    if (!webhookSecret) {
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
    }
    if (!hmacMatches(webhookSecret, body, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const event = JSON.parse(body);
    const { payload } = event;

    // Handle different webhook events
    switch (event.event) {
      case 'payment.captured': {
        const payment = payload.payment.entity;
        const orderId = payment.notes?.order_id;

        if (orderId) {
          // Once only, even when the return page already recorded it
          await markOrderPaid(orderId, payment.id, 'Payment captured via Razorpay');
        }
        break;
      }

      case 'payment.failed': {
        const payment = payload.payment.entity;
        const orderId = payment.notes?.order_id;

        if (orderId) {
          // A failed retry must not undo a payment that already went through
          await prisma.order.updateMany({
            where: { id: orderId, paymentStatus: { not: 'COMPLETED' } },
            data: {
              paymentStatus: 'FAILED',
              paymentId: payment.id,
            },
          });
        }
        break;
      }

      case 'refund.created': {
        const refund = payload.refund.entity;
        const paymentId = refund.payment_id;

        const refunded = await prisma.order.findMany({ where: { paymentId }, select: { id: true, status: true } });
        await prisma.order.updateMany({
          where: { paymentId },
          data: {
            paymentStatus: 'REFUNDED',
            status: 'REFUNDED',
          },
        });
        for (const o of refunded) await applyOrderStatusRewards(o.id, 'REFUNDED', o.status);
        break;
      }

      default:
        console.log(`Unhandled webhook event: ${event.event}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
