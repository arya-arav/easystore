import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  const coupons = await prisma.coupon.findMany({
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json({ coupons });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'SELLER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = await request.json();

  // Check if code already exists
  const existing = await prisma.coupon.findUnique({
    where: { code: data.code },
  });

  if (existing) {
    return NextResponse.json({ error: 'Coupon code already exists' }, { status: 400 });
  }

  const coupon = await prisma.coupon.create({
    data: {
      code: data.code,
      description: data.description || null,
      discountType: data.discountType,
      discountValue: data.discountValue,
      minOrderValue: data.minOrderValue || null,
      maxDiscount: data.maxDiscount || null,
      usageLimit: data.usageLimit || null,
      validFrom: new Date(data.validFrom),
      validTo: new Date(data.validTo),
      isActive: data.isActive ?? true,
    },
  });

  return NextResponse.json(coupon);
}
