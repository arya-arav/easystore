import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireStaff } from '@/lib/admin-auth';
import { listParams } from '@/lib/admin-list';

export const dynamic = 'force-dynamic';

const SORTS = { created_desc: { createdAt: 'desc' }, created_asc: { createdAt: 'asc' } } as const;

// GET - returns: ?status=&q=&sort=&page=&limit=
export async function GET(request: NextRequest) {
  if (!(await requireStaff())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { sp, q, skip, limit, orderBy } = listParams(request, SORTS, 'created_desc');
  const where: Prisma.OrderReturnWhereInput = {};
  const status = sp.get('status');
  if (status) where.status = status;
  if (q) where.order = { OR: [{ orderNumber: { contains: q.replace(/^#/, ''), mode: 'insensitive' } }, { shippingName: { contains: q, mode: 'insensitive' } }] };
  const [returns, total] = await Promise.all([
    prisma.orderReturn.findMany({
      where, orderBy, skip, take: limit,
      include: { order: { select: { id: true, orderNumber: true, shippingName: true, items: { select: { id: true, productName: true } } } } },
    }),
    prisma.orderReturn.count({ where }),
  ]);
  return NextResponse.json({
    returns: returns.map((r) => {
      const lines = JSON.parse(r.items || '[]') as { itemId: string; quantity: number }[];
      return {
        id: r.id, status: r.status, reason: r.reason, requestedBy: r.requestedBy, createdAt: r.createdAt, customerNote: r.customerNote,
        order: { id: r.order.id, orderNumber: r.order.orderNumber, shippingName: r.order.shippingName },
        items: lines.map((l) => `${l.quantity} × ${r.order.items.find((i) => i.id === l.itemId)?.productName || 'item'}`).join(', '),
      };
    }),
    total,
  });
}
