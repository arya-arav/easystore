import { prisma } from '@/lib/prisma';

/**
 * Marks an order paid and confirmed. Safe to call more than once, and at the same time
 * (webhook + return page): only the call that flips the payment status records it.
 * Returns whether this call did it.
 */
export async function markOrderPaid(orderId: string, paymentId: string, note: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { status: true } });
  if (!order) return false;

  const flipped = await prisma.order.updateMany({
    where: { id: orderId, paymentStatus: { not: 'COMPLETED' } },
    data: {
      paymentStatus: 'COMPLETED',
      paymentId,
      ...(order.status === 'PENDING' ? { status: 'CONFIRMED' as const } : {}),
    },
  });
  if (flipped.count !== 1) return false;

  await prisma.orderStatusHistory.create({ data: { orderId, status: 'CONFIRMED', note } });
  return true;
}
