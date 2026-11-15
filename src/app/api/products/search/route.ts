export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fuzzyProductIds } from '@/lib/fuzzy-search';

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim() || '';
  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '5');

  if (!q || q.length < 2) return NextResponse.json({ products: [] });

  const products = await prisma.product.findMany({
    where: {
      status: 'ACTIVE',
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { shortDescription: { contains: q, mode: 'insensitive' } },
        { sku: { contains: q, mode: 'insensitive' } },
        { category: { name: { contains: q, mode: 'insensitive' } } },
        { tags: { some: { name: { contains: q, mode: 'insensitive' } } } },
      ],
    },
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      compareAtPrice: true,
      images: { where: { isPrimary: true }, take: 1, select: { url: true } },
      category: { select: { name: true } },
    },
    take: limit,
    orderBy: { createdAt: 'desc' },
  });

  if (products.length === 0) {
    // Nothing matched as typed: try forgiving typos ("tedy" → "teddy")
    const ids = await fuzzyProductIds(q, limit);
    if (ids.length) {
      const found = await prisma.product.findMany({
        where: { id: { in: ids } },
        select: {
          id: true, name: true, slug: true, price: true, compareAtPrice: true,
          images: { where: { isPrimary: true }, take: 1, select: { url: true } },
          category: { select: { name: true } },
        },
      });
      return NextResponse.json({ products: ids.map((id) => found.find((p) => p.id === id)).filter(Boolean), fuzzy: true });
    }
  }

  return NextResponse.json({ products });
}
