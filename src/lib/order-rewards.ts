import { prisma } from '@/lib/prisma';
import { getLoyaltyConfig } from '@/lib/loyalty';
import { completeReferral } from '@/lib/referral';
import { restockOrder } from '@/lib/variant-stock';

// Loyalty points follow the order's fate:
// - Delivered: the customer earns points (and their referrer's reward is paid).
// - Cancelled / returned / refunded: points they spent come back, points earned are taken back,
//   and the items go back into stock.
// Every step checks the ledger (LoyaltyPoint rows for the order), so repeating a status is harmless.

const ENDED_STATUSES = new Set(['CANCELLED', 'RETURNED', 'REFUNDED']);

export async function applyOrderStatusRewards(orderId: string, newStatus: string, previousStatus?: string | null) {
  if (newStatus === previousStatus) return;
  if (newStatus === 'DELIVERED') await rewardDeliveredOrder(orderId);
  else if (ENDED_STATUSES.has(newStatus)) {
    await settleEndedOrder(orderId);
    await restockOrder(orderId);
  }
}

async function rewardDeliveredOrder(orderId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { userId: true, total: true, orderNumber: true } });
  if (!order) return;

  const already = await prisma.loyaltyPoint.count({ where: { orderId, userId: order.userId, type: 'EARNED' } });
  if (already === 0) {
    // earnRate is the % of the order value given back; points are worth redeemRate ₹ each.
    const { earnRate, redeemRate } = await getLoyaltyConfig();
    const points = Math.floor((Number(order.total) * earnRate) / 100 / (redeemRate || 1));
    if (points > 0) {
      await prisma.$transaction([
        prisma.loyaltyPoint.create({ data: { userId: order.userId, points, type: 'EARNED', description: `Earned for order #${order.orderNumber}`, orderId } }),
        prisma.user.update({ where: { id: order.userId }, data: { loyaltyBalance: { increment: points } } }),
      ]);
    }
  }

  await completeReferral(order.userId, orderId).catch((error) => console.error('Referral reward failed:', error));
}

async function settleEndedOrder(orderId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { userId: true, orderNumber: true } });
  if (!order) return;
  const ledger = await prisma.loyaltyPoint.findMany({ where: { orderId } });

  // Give back points the customer spent on this order
  const spent = -ledger.filter((p) => p.type === 'REDEEMED' && p.userId === order.userId).reduce((sum, p) => sum + p.points, 0);
  const alreadyReturned = ledger.some((p) => p.type === 'REDEMPTION_RETURNED');
  if (spent > 0 && !alreadyReturned) {
    await prisma.$transaction([
      prisma.loyaltyPoint.create({ data: { userId: order.userId, points: spent, type: 'REDEMPTION_RETURNED', description: `Points returned — order #${order.orderNumber} ended`, orderId } }),
      prisma.user.update({ where: { id: order.userId }, data: { loyaltyBalance: { increment: spent } } }),
    ]);
  }

  // Take back points earned from this order (the customer's, and any referral reward), never below zero
  const reversed = new Set(ledger.filter((p) => p.type === 'EARNED_REVERSED').map((p) => p.userId));
  for (const earned of ledger.filter((p) => p.type === 'EARNED' && !reversed.has(p.userId))) {
    const user = await prisma.user.findUnique({ where: { id: earned.userId }, select: { loyaltyBalance: true } });
    const take = Math.min(earned.points, Math.max(0, user?.loyaltyBalance ?? 0));
    await prisma.$transaction([
      prisma.loyaltyPoint.create({ data: { userId: earned.userId, points: -take, type: 'EARNED_REVERSED', description: `Points reversed — order #${order.orderNumber} ended`, orderId } }),
      prisma.user.update({ where: { id: earned.userId }, data: { loyaltyBalance: { decrement: take } } }),
    ]);
  }
}
