export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    select: {
      slug: true,
      _count: { select: { products: { where: { status: 'ACTIVE' } } } },
    },
  });

  const counts: Record<string, number> = {};
  for (const cat of categories) {
    counts[cat.slug] = cat._count.products;
  }

  return NextResponse.json({ counts });
}
