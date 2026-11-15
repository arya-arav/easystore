export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const productId = request.nextUrl.searchParams.get('productId');
  const categoryId = request.nextUrl.searchParams.get('categoryId');
  const ageGroup = request.nextUrl.searchParams.get('ageGroup');
  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '8');

  if (!productId || !categoryId) {
    return NextResponse.json({ frequently: [], similar: [] });
  }

  // "Customers also bought" — find products that appear in the same orders
  const orderItems = await prisma.orderItem.findMany({
    where: { productId },
    select: { orderId: true },
    take: 100,
  });

  const orderIds = orderItems.map(i => i.orderId);

  let frequently: any[] = [];
  if (orderIds.length > 0) {
    const coItems = await prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        orderId: { in: orderIds },
        productId: { not: productId },
      },
      _count: { productId: true },
      orderBy: { _count: { productId: 'desc' } },
      take: limit,
    });

    if (coItems.length > 0) {
      const coProductIds = coItems.map(i => i.productId).filter(Boolean) as string[];
      frequently = await prisma.product.findMany({
        where: { id: { in: coProductIds }, status: 'ACTIVE' },
        include: { images: { where: { isPrimary: true }, take: 1 }, category: { select: { name: true } } },
      });
      // Sort by co-purchase frequency
      frequently.sort((a, b) => {
        const aCount = coItems.find(i => i.productId === a.id)?._count.productId || 0;
        const bCount = coItems.find(i => i.productId === b.id)?._count.productId || 0;
        return bCount - aCount;
      });
    }
  }

  // "You might like" — same category + age group, exclude current product
  const similarWhere: any = {
    status: 'ACTIVE',
    id: { not: productId },
    categoryId,
  };
  if (ageGroup) similarWhere.ageGroup = ageGroup;

  const similar = await prisma.product.findMany({
    where: similarWhere,
    include: { images: { where: { isPrimary: true }, take: 1 }, category: { select: { name: true } } },
    orderBy: [{ isBestseller: 'desc' }, { isFeatured: 'desc' }, { createdAt: 'desc' }],
    take: limit,
  });

  return NextResponse.json({ frequently, similar });
}
