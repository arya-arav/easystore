import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireStaff } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

// GET ?q= - quick search for the admin ⌘K palette
export async function GET(request: NextRequest) {
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const q = (request.nextUrl.searchParams.get('q') || '').trim().replace(/^#/, '');
  if (q.length < 2) return NextResponse.json({ orders: [], products: [], customers: [] });
  const has = { contains: q, mode: 'insensitive' as const };

  const [orders, products, customers] = await Promise.all([
    prisma.order.findMany({
      where: { OR: [{ orderNumber: has }, { shippingName: has }, { shippingPhone: has }, { user: { email: has } }] },
      select: { id: true, orderNumber: true, shippingName: true, total: true, status: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.product.findMany({
      where: { OR: [{ name: has }, { sku: has }, { slug: has }] },
      select: { id: true, name: true, sku: true, status: true, images: { take: 1, orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], select: { url: true } } },
      take: 5,
    }),
    staff.role === 'ADMIN'
      ? prisma.user.findMany({
          where: { role: 'CUSTOMER', OR: [{ name: has }, { email: has }, { phone: has }] },
          select: { id: true, name: true, email: true },
          take: 5,
        })
      : Promise.resolve([]),
  ]);

  return NextResponse.json({ orders, products, customers });
}
