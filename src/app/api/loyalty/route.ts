export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getUserBalance, getLoyaltyConfig } from '@/lib/loyalty';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [user, history, config] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { loyaltyBalance: true },
    }),
    prisma.loyaltyPoint.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    getLoyaltyConfig(),
  ]);

  return NextResponse.json({
    balance: user?.loyaltyBalance || 0,
    value: (user?.loyaltyBalance || 0) * config.redeemRate,
    history,
    config,
  });
}
