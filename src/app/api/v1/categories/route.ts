export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { validateApiKey } from '@/lib/api-key-auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const { valid } = await validateApiKey(request);
  if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const categories = await prisma.category.findMany({
    where: { isActive: true },
    select: { id: true, name: true, slug: true, description: true },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json({ categories });
}
