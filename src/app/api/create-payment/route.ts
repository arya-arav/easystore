import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createRazorpayOrder, RAZORPAY_KEY_ID } from '@/lib/razorpay';
import { isRazorpayConfigured } from '@/lib/payment-settings';

// Create Razorpay Order for checkout
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isRazorpayConfigured()) {
      return NextResponse.json({ error: 'Online payment is not available' }, { status: 400 });
    }

    const { orderId } = await request.json();

    // Charge the total stored on the customer's own order, never an amount from the browser
    const order = await prisma.order.findFirst({
      where: { id: orderId, userId: session.user.id },
      select: { id: true, orderNumber: true, total: true, paymentMethod: true, paymentStatus: true },
    });
    if (!order || order.paymentMethod !== 'RAZORPAY') {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    if (order.paymentStatus === 'COMPLETED') {
      return NextResponse.json({ error: 'This order is already paid' }, { status: 400 });
    }

    // notes.order_id lets the Razorpay webhook find the order
    const razorpayOrder = await createRazorpayOrder(Number(order.total), order.orderNumber, {
      order_id: order.id,
    });

    await prisma.order.update({
      where: { id: order.id },
      data: { orderId: razorpayOrder.id },
    });

    return NextResponse.json({
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId: RAZORPAY_KEY_ID,
      shopOrderId: order.id,
      prefill: {
        name: session.user.name,
        email: session.user.email,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to create payment order' },
      { status: 500 }
    );
  }
}
