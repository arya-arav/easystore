export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireStaff } from '@/lib/admin-auth';
import { updateOrder } from '@/lib/admin-orders';

export async function GET(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  if (!(await requireStaff())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      user: { select: { name: true, email: true, phone: true } },
      items: { include: { product: { include: { images: { where: { isPrimary: true }, take: 1 } } } } },
      statusHistory: { orderBy: { createdAt: 'desc' } },
    },
  });

  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  return NextResponse.json(order);
}

const ADDRESS_FIELDS = ['shippingName', 'shippingPhone', 'shippingAddressLine1', 'shippingAddressLine2', 'shippingCity', 'shippingState', 'shippingPincode', 'shippingCountry'] as const;

// PATCH { status?, paymentStatus?, trackingNumber?, trackingUrl?, note?, address? }
export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  if (!(await requireStaff())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));

  if (body.address && typeof body.address === 'object') {
    const data: Record<string, string | null> = {};
    for (const f of ADDRESS_FIELDS) {
      if (typeof body.address[f] === 'string') data[f] = body.address[f].trim() || (f === 'shippingAddressLine2' ? null : '');
    }
    if (ADDRESS_FIELDS.some((f) => f !== 'shippingAddressLine2' && data[f] === '')) {
      return NextResponse.json({ error: 'Fill in every address field' }, { status: 400 });
    }
    const order = await prisma.order.update({ where: { id: params.id }, data });
    await prisma.orderStatusHistory.create({ data: { orderId: params.id, status: order.status, note: 'Shipping address updated' } });
  }

  const result = await updateOrder(params.id, {
    status: body.status,
    paymentStatus: body.paymentStatus,
    trackingNumber: body.trackingNumber,
    trackingUrl: body.trackingUrl,
    note: body.note,
  });
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: 404 });
  return NextResponse.json({ success: true, order: result.order });
}
