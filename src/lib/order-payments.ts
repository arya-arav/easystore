import { prisma } from '@/lib/prisma';

/** Marks an order paid and confirmed. Safe to call more than once (webhook + return page). */
export async function markOrderPaid(orderId: string, paymentId: string, note: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { paymentStatus: true, status: true } });
  if (!order || order.paymentStatus === 'COMPLETED') return false;

  await prisma.order.update({
    where: { id: orderId },
    data: {
      paymentStatus: 'COMPLETED',
      paymentId,
      status: order.status === 'PENDING' ? 'CONFIRMED' : order.status,
    },
  });
  await prisma.orderStatusHistory.create({ data: { orderId, status: 'CONFIRMED', note } });
  return true;
}
