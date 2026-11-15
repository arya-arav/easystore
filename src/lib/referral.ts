import { prisma } from '@/lib/prisma';
import { earnPoints } from '@/lib/loyalty';

// Generate a unique 8-char referral code from user name + random
export function generateReferralCode(name: string): string {
  const prefix = name.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 4) || 'BB';
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}${rand}`;
}

// Get or create referral code for a user
export async function getOrCreateReferralCode(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { referralCode: true, name: true },
  });

  if (user?.referralCode) return user.referralCode;

  // Generate unique code
  let code = generateReferralCode(user?.name || 'BB');
  let attempts = 0;
  while (attempts < 10) {
    const existing = await prisma.user.findUnique({ where: { referralCode: code } });
    if (!existing) break;
    code = generateReferralCode(user?.name || 'BB');
    attempts++;
  }

  await prisma.user.update({ where: { id: userId }, data: { referralCode: code } });
  return code;
}

// Track a referral when someone visits via referral link
export async function trackReferralVisit(referralCode: string, referredEmail?: string) {
  const referrer = await prisma.user.findUnique({ where: { referralCode } });
  if (!referrer) return null;

  // Check if referral already exists for this email
  if (referredEmail) {
    const existing = await prisma.referral.findFirst({
      where: { referrerId: referrer.id, referredEmail },
    });
    if (existing) return existing;
  }

  return prisma.referral.create({
    data: {
      referrerId: referrer.id,
      referredEmail,
      referralCode,
      status: 'PENDING',
    },
  });
}

// Complete referral when referred user places their first order
export async function completeReferral(referredUserId: string, orderId: string) {
  const referredUser = await prisma.user.findUnique({
    where: { id: referredUserId },
    select: { email: true },
  });
  if (!referredUser) return;

  // Find pending referral for this user
  const referral = await prisma.referral.findFirst({
    where: {
      OR: [
        { referredId: referredUserId },
        { referredEmail: referredUser.email },
      ],
      status: 'PENDING',
    },
  });

  if (!referral) return;

  // Rewarded on the friend's first delivered order (called when an order is delivered)
  const otherDelivered = await prisma.order.count({
    where: { userId: referredUserId, status: 'DELIVERED', id: { not: orderId } },
  });
  if (otherDelivered > 0) return;

  // Get reward amount from settings
  const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
  const rewardPoints = settings?.referralRewardPoints ?? 100;

  // Award points to referrer
  await earnPoints(
    referral.referrerId,
    rewardPoints,
    `Referral reward — friend placed their first order`,
    orderId
  );

  // Update referral status
  await prisma.referral.update({
    where: { id: referral.id },
    data: {
      status: 'REWARDED',
      referredId: referredUserId,
      rewardPoints,
      orderId,
      completedAt: new Date(),
    },
  });
}
