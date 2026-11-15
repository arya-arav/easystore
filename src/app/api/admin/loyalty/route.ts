export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { earnPoints } from '@/lib/loyalty';

// GET — top users by loyalty balance
export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const users = await prisma.user.findMany({
    where: { loyaltyBalance: { gt: 0 } },
    select: { id: true, name: true, email: true, loyaltyBalance: true },
    orderBy: { loyaltyBalance: 'desc' },
    take: 50,
  });

  const totalIssued = await prisma.loyaltyPoint.aggregate({
    where: { points: { gt: 0 } },
    _sum: { points: true },
  });

  const totalRedeemed = await prisma.loyaltyPoint.aggregate({
    where: { points: { lt: 0 } },
    _sum: { points: true },
  });

  return NextResponse.json({
    users,
    stats: {
      totalIssued: totalIssued._sum.points || 0,
      totalRedeemed: Math.abs(totalRedeemed._sum.points || 0),
    },
  });
}

// POST — manually award bonus points to a user
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { userId, points, description } = await request.json();
  if (!userId || !points || points <= 0) return NextResponse.json({ error: 'Invalid data' }, { status: 400 });

  await earnPoints(userId, points, description || 'Bonus points from admin');
  return NextResponse.json({ success: true });
}
