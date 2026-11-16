import type { OrderStatus, PaymentStatus, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { applyOrderStatusRewards } from '@/lib/order-rewards';
import { sendOrderEmail } from '@/lib/order-emails';

// Admin changes to an order. The order page and bulk actions both go through here, so
// stock, loyalty points, customer emails and the timeline stay consistent.

export const NOTE_PREFIX = 'Note: ';

const ORDER_STATUSES = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'RETURNED', 'REFUNDED'] as const;
const PAYMENT_STATUSES = ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED'] as const;

export interface OrderChange {
  status?: string;
  paymentStatus?: string;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  note?: string;
}

export async function updateOrder(id: string, change: OrderChange) {
  const order = await prisma.order.findUnique({ where: { id }, select: { status: true, paymentStatus: true, userId: true } });
  if (!order) return { error: 'Order not found' };

  const status = change.status && (ORDER_STATUSES as readonly string[]).includes(change.status) ? (change.status as OrderStatus) : undefined;
  const paymentStatus = change.paymentStatus && (PAYMENT_STATUSES as readonly string[]).includes(change.paymentStatus) ? (change.paymentStatus as PaymentStatus) : undefined;
  const statusChanged = !!status && status !== order.status;
  const paymentChanged = !!paymentStatus && paymentStatus !== order.paymentStatus;

  const data: Prisma.OrderUpdateInput = {};
  if (statusChanged) data.status = status;
  if (statusChanged && status === 'DELIVERED') data.deliveredAt = new Date();
  if (paymentChanged) data.paymentStatus = paymentStatus;
  if (change.trackingNumber !== undefined) data.trackingNumber = change.trackingNumber?.trim() || null;
  if (change.trackingUrl !== undefined) data.trackingUrl = change.trackingUrl?.trim() || null;
  const updated = await prisma.order.update({ where: { id }, data });

  if (statusChanged) {
    // Points are credited on delivery and reversed (with stock returned) when an order ends early
    await applyOrderStatusRewards(id, status!, order.status).catch((error) => console.error('Order rewards failed:', error));
    await prisma.orderStatusHistory.create({ data: { orderId: id, status: status!, note: change.note?.trim() || `Status updated to ${status}` } });
    if (status === 'SHIPPED' || status === 'CONFIRMED') {
      await sendOrderEmail(status === 'SHIPPED' ? 'orderShipped' : 'orderConfirmation', id).catch((error) => console.error('Order email failed:', error));
    }
  } else if (change.note?.trim()) {
    await prisma.orderStatusHistory.create({ data: { orderId: id, status: updated.status, note: NOTE_PREFIX + change.note.trim() } });
  }
  if (paymentChanged) {
    await prisma.orderStatusHistory.create({ data: { orderId: id, status: updated.status, note: `Payment marked as ${paymentStatus === 'COMPLETED' ? 'paid' : paymentStatus!.toLowerCase()}` } });
  }

  return { order: updated };
}
