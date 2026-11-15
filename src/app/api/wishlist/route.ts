export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ items: [] });

  const items = await prisma.wishlistItem.findMany({
    where: { userId: session.user.id },
    include: {
      product: {
        include: { images: { where: { isPrimary: true }, take: 1 } },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({
    items: items.map(i => ({
      id: i.id,
      productId: i.productId,
      name: i.product.name,
      slug: i.product.slug,
      price: Number(i.product.price),
      compareAtPrice: i.product.compareAtPrice ? Number(i.product.compareAtPrice) : null,
      image: i.product.images[0]?.url || '',
    })),
  });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { productId, productIds } = await request.json();

  // Bulk add: merges a browser wishlist into the account when a shopper signs in.
  if (Array.isArray(productIds)) {
    const ids = productIds.filter((id: unknown) => typeof id === 'string').slice(0, 200);
    const existingProducts = await prisma.product.findMany({ where: { id: { in: ids } }, select: { id: true } });
    await prisma.wishlistItem.createMany({
      data: existingProducts.map((p) => ({ userId: session.user.id, productId: p.id })),
      skipDuplicates: true,
    });
    return NextResponse.json({ success: true });
  }

  if (!productId) return NextResponse.json({ error: 'productId required' }, { status: 400 });

  const existing = await prisma.wishlistItem.findUnique({
    where: { userId_productId: { userId: session.user.id, productId } },
  });
  if (existing) return NextResponse.json({ success: true, alreadyExists: true });

  await prisma.wishlistItem.create({ data: { userId: session.user.id, productId } });
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { productId } = await request.json();
  await prisma.wishlistItem.deleteMany({
    where: { userId: session.user.id, productId },
  });
  return NextResponse.json({ success: true });
}
