import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET - what the quick-view pop-up needs for one product
export async function GET(_request: NextRequest, props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  const product = await prisma.product.findFirst({
    where: { slug, status: 'ACTIVE' },
    select: {
      id: true, name: true, slug: true, shortDescription: true, price: true, compareAtPrice: true, gstRate: true, stock: true,
      colors: true, sizes: true,
      images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 6, select: { url: true, alt: true } },
      variants: { select: { color: true, size: true, stock: true } },
      category: { select: { name: true } },
    },
  });
  if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({
    ...product,
    price: Number(product.price),
    compareAtPrice: product.compareAtPrice != null ? Number(product.compareAtPrice) : null,
    gstRate: Number(product.gstRate),
  });
}
