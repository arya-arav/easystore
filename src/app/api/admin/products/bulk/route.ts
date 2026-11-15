export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ProductStatus } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'SELLER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { ids, action } = await request.json();
    if (!ids?.length || !action) {
      return NextResponse.json({ error: 'Missing ids or action' }, { status: 400 });
    }

    if (action === 'delete') {
      await prisma.product.deleteMany({ where: { id: { in: ids } } });
      return NextResponse.json({ success: true, count: ids.length });
    }

    if (action === 'draft' || action === 'active' || action === 'archived') {
      const statusMap: Record<string, ProductStatus> = {
        draft: ProductStatus.DRAFT,
        active: ProductStatus.ACTIVE,
        archived: ProductStatus.ARCHIVED,
      };
      await prisma.product.updateMany({
        where: { id: { in: ids } },
        data: { status: statusMap[action] },
      });
      return NextResponse.json({ success: true, count: ids.length });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    console.error('Bulk action error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
