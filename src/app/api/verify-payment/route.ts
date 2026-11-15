import { prisma } from '@/lib/prisma';
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

    // Find the customer's order from the Razorpay order id saved by /api/create-payment
    const existing = await prisma.order.findFirst({
      where: { orderId: razorpay_order_id, userId: session.user.id },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    const orderId = existing.id;

    // Update order status
    const order = await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: 'COMPLETED',
        paymentId: razorpay_payment_id,
        status: 'CONFIRMED',
      },
    });

    // Create status history
    await prisma.orderStatusHistory.create({
      data: {
        orderId,
        status: 'CONFIRMED',
        note: 'Payment verified via Razorpay',
      },
    });

    return NextResponse.json({ success: true, order });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Payment verification failed' },
      { status: 500 }
    );
  }
}
