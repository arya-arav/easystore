export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { NOTE_PREFIX } from '@/lib/admin-orders';

export async function GET(request: NextRequest) {
  const orderNumber = request.nextUrl.searchParams.get('orderNumber')?.trim().toUpperCase();
  const email = request.nextUrl.searchParams.get('email')?.trim().toLowerCase();
  const phone = request.nextUrl.searchParams.get('phone')?.trim();

  if (!orderNumber) {
    return NextResponse.json({ error: 'Order number is required' }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: {
      user: { select: { email: true, phone: true } },
      items: {
        select: {
          productName: true,
          productSku: true,
          quantity: true,
          price: true,
          productImage: true,
        },
      },
      statusHistory: {
        orderBy: { createdAt: 'asc' },
        select: { status: true, note: true, createdAt: true },
      },
    },
  });

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  // Verify ownership — must match email or phone (or shipping phone)
  const emailMatch = email && order.user?.email?.toLowerCase() === email;
  const phoneMatch = phone && (
    order.user?.phone === phone ||
    order.shippingPhone === phone ||
    order.shippingPhone?.replace(/\D/g, '') === phone.replace(/\D/g, '')
  );
  // Both the order number and the customer's email or phone are needed
  if (!emailMatch && !phoneMatch) {
    return NextResponse.json({ error: 'Order not found. Check your order number and email or phone.' }, { status: 404 });
  }

  // Return safe public fields only
  return NextResponse.json({
    order: {
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      createdAt: order.createdAt,
      total: order.total,
      shippingCharge: order.shippingCharge,
      trackingNumber: order.trackingNumber,
      shippingName: order.shippingName,
      shippingCity: order.shippingCity,
      shippingState: order.shippingState,
      shippingPincode: order.shippingPincode,
      items: order.items,
      statusHistory: order.statusHistory.filter((h) => !h.note?.startsWith(NOTE_PREFIX)),
    },
  });
}
