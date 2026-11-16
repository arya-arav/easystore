import { prisma } from '@/lib/prisma';
import { markOrderPaid } from '@/lib/order-payments';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import { verifyRazorpaySignature } from '@/lib/razorpay';



// Verify Razorpay Payment
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await request.json();

    // Verify signature
    const isValid = verifyRazorpaySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 });
    }

    // Find the customer's order from the Razorpay order id saved by /api/create-payment.
    // Only Razorpay orders: the same field holds Stripe's checkout id for card orders.
    const existing = await prisma.order.findFirst({
      where: { orderId: razorpay_order_id, userId: session.user.id, paymentMethod: { in: ['RAZORPAY', 'UPI'] } },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    const orderId = existing.id;

    // Once only, even when the webhook already recorded it
    await markOrderPaid(orderId, razorpay_payment_id, 'Payment verified via Razorpay');
    const order = await prisma.order.findUnique({ where: { id: orderId } });

    return NextResponse.json({ success: true, order });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Payment verification failed' },
      { status: 500 }
    );
  }
}
