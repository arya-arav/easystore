import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { updateOrder } from '@/lib/admin-orders';

export const dynamic = 'force-dynamic';

const CANCELLABLE = ['PENDING', 'CONFIRMED'];

// POST { reason } - the customer cancels their own order before it is packed
export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Please sign in' }, { status: 401 });
  const order = await prisma.order.findFirst({ where: { id, userId: session.user.id }, select: { status: true, paymentStatus: true } });
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  if (!CANCELLABLE.includes(order.status)) {
    return NextResponse.json({ error: 'This order is already being packed or shipped. Please contact us, or request a return once it arrives.' }, { status: 400 });
  }
  const { reason } = await request.json().catch(() => ({}));
  const why = typeof reason === 'string' && reason.trim() ? reason.trim().slice(0, 200) : 'No reason given';
  // Same path as staff cancelling: stock goes back, points are reversed
  const result = await updateOrder(id, { status: 'CANCELLED', note: `Cancelled by customer: ${why}` });
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: 400 });
  if (order.paymentStatus === 'COMPLETED') {
    await prisma.orderStatusHistory.create({ data: { orderId: id, status: 'CANCELLED', note: 'Paid online - refund needed (Payment → Refund)' } });
  }
  return NextResponse.json({ success: true });
}
