import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const coupon = await prisma.coupon.findUnique({
    where: { id: params.id },
  });

  if (!coupon) {
    return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
  }

  return NextResponse.json(coupon);
}

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'SELLER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = await request.json();

  const coupon = await prisma.coupon.update({
    where: { id: params.id },
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
      isActive: data.isActive,
    },
  });

  return NextResponse.json(coupon);
}

export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const data = await request.json();

  const coupon = await prisma.coupon.update({
    where: { id: params.id },
    data: { isActive: data.isActive },
  });

  return NextResponse.json(coupon);
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  await prisma.coupon.delete({
    where: { id: params.id },
  });

  return NextResponse.json({ success: true });
}
