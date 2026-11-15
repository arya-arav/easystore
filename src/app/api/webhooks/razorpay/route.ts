import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

import crypto from 'crypto';
import { applyOrderStatusRewards } from '@/lib/order-rewards';



// Razorpay Webhook Handler
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-razorpay-signature');

    // Verify webhook signature
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(body)
      .digest('hex');

    if (signature !== expectedSignature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const event = JSON.parse(body);
    const { entity, payload } = event;

    // Handle different webhook events
    switch (event.event) {
      case 'payment.captured': {
        const payment = payload.payment.entity;
        const orderId = payment.notes?.order_id;

        if (orderId) {
          await prisma.order.update({
            where: { id: orderId },
            data: {
              paymentStatus: 'COMPLETED',
              paymentId: payment.id,
              status: 'CONFIRMED',
            },
          });

          // Create status history
          await prisma.orderStatusHistory.create({
            data: {
              orderId,
              status: 'CONFIRMED',
              note: 'Payment captured via Razorpay',
            },
          });
        }
        break;
      }

      case 'payment.failed': {
        const payment = payload.payment.entity;
        const orderId = payment.notes?.order_id;

        if (orderId) {
          await prisma.order.update({
            where: { id: orderId },
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
