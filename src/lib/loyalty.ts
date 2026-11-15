import { prisma } from '@/lib/prisma';

// Get loyalty config from DB settings (with fallbacks)
export async function getLoyaltyConfig() {
  const s = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
  return {
    earnRate: s?.loyaltyEarnRate ?? 1,       // % of the order value given back as points (1 = 1%)
    redeemRate: s?.loyaltyRedeemRate ?? 1,   // ₹ value per point
    minRedeem: s?.loyaltyMinRedeem ?? 50,    // minimum points to redeem
    maxRedeemPct: s?.loyaltyMaxRedeemPct ?? 20, // max % of order payable with points
  };
}

export async function getUserBalance(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { loyaltyBalance: true },
  });
  return user?.loyaltyBalance || 0;
}

export async function earnPoints(userId: string, points: number, description: string, orderId?: string) {
  await prisma.$transaction([
    prisma.loyaltyPoint.create({
      data: { userId, points, type: 'EARNED', description, orderId },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { loyaltyBalance: { increment: points } },
    }),
  ]);
}

export async function redeemPoints(userId: string, points: number, description: string, orderId?: string) {
  const balance = await getUserBalance(userId);
  if (balance < points) throw new Error('Insufficient points balance');

  await prisma.$transaction([
    prisma.loyaltyPoint.create({
      data: { userId, points: -points, type: 'REDEEMED', description, orderId },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { loyaltyBalance: { decrement: points } },
    }),
  ]);
}
