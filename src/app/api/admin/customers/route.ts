import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { requireStaff } from '@/lib/admin-auth';
import { csvResponse, dayRange, listParams } from '@/lib/admin-list';

export const dynamic = 'force-dynamic';

const SORTS = {
  created_desc: { createdAt: 'desc' },
  created_asc: { createdAt: 'asc' },
  name_asc: { name: 'asc' },
  orders_desc: { orders: { _count: 'desc' } },
} as const;

// GET - customers: ?q=&has_orders=yes|no&from=&to=&sort=&page=&limit= (&format=csv)
export async function GET(request: NextRequest) {
  try {
    if (!(await requireStaff(['ADMIN']))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { sp, q, skip, limit, orderBy } = listParams(request, SORTS, 'created_desc');

    const where: any = { role: 'CUSTOMER' };
    const search = q || sp.get('search') || '';
    if (search) {
      const has = { contains: search, mode: 'insensitive' };
      where.OR = [{ name: has }, { email: has }, { phone: has }];
    }
    if (sp.get('group') === 'none') where.customerGroupId = null;
    else if (sp.get('group')) where.customerGroupId = sp.get('group');
    if (sp.get('has_orders') === 'yes') where.orders = { some: {} };
    if (sp.get('has_orders') === 'no') where.orders = { none: {} };
    const created = dayRange(sp.get('from'), sp.get('to'));
    if (created) where.createdAt = created;

    const csv = sp.get('format') === 'csv';
    const customers = await prisma.user.findMany({
      where,
      select: { id: true, name: true, email: true, phone: true, createdAt: true, loyaltyBalance: true, emailVerified: true, customerGroup: { select: { name: true } }, _count: { select: { orders: true } } },
      orderBy,
      skip: csv ? 0 : skip,
      take: csv ? 10000 : limit,
    });
    const total = csv ? customers.length : await prisma.user.count({ where });

    // Lifetime spend of this page's customers (cancelled/refunded orders excluded)
    const spend = await prisma.order.groupBy({
      by: ['userId'],
      where: { userId: { in: customers.map((c) => c.id) }, status: { notIn: ['CANCELLED', 'REFUNDED', 'RETURNED'] } },
      _sum: { total: true },
    });
    const spentBy = new Map(spend.map((s) => [s.userId, Number(s._sum.total || 0)]));
    const rows = customers.map((c) => ({ ...c, totalSpent: spentBy.get(c.id) || 0 }));

    if (csv) {
      return csvResponse(
        `customers-${new Date().toISOString().slice(0, 10)}.csv`,
        ['Name', 'Email', 'Phone', 'Group', 'Joined', 'Orders', 'Total spent (INR)', 'Loyalty points', 'Email verified'],
        rows.map((c) => [c.name, c.email, c.phone, c.customerGroup?.name, c.createdAt, c._count.orders, c.totalSpent, c.loyaltyBalance, c.emailVerified ? 'yes' : 'no'])
      );
    }
    return NextResponse.json({ customers: rows, total });
  } catch (error) {
    console.error('Customers fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 });
  }
}
