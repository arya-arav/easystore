export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getSiteUrl } from '@/lib/site-url';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getOrCreateReferralCode } from '@/lib/referral';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const code = await getOrCreateReferralCode(session.user.id);

  const referrals = await prisma.referral.findMany({
    where: { referrerId: session.user.id },
    orderBy: { createdAt: 'desc' },
    include: { referred: { select: { name: true, email: true } } },
  });

  const settings = await prisma.siteSettings.findUnique({
    where: { id: 'default' },
    select: { referralRewardPoints: true },
  });

  const baseUrl = (await getSiteUrl());

  return NextResponse.json({
    code,
    referralLink: `${baseUrl}/ref/${code}`,
    referrals,
    rewardPoints: settings?.referralRewardPoints ?? 100,
    stats: {
      total: referrals.length,
      rewarded: referrals.filter(r => r.status === 'REWARDED').length,
      totalPointsEarned: referrals.filter(r => r.status === 'REWARDED').reduce((s, r) => s + r.rewardPoints, 0),
    },
  });
}
