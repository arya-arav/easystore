import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { requireStaff } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

const DAY = 86_400_000;
const ENDED = ['CANCELLED', 'REFUNDED', 'RETURNED'] as any;

// GET - dashboard figures: last 30 days against the 30 before, plus things needing attention
export async function GET() {
  try {
    if (!(await requireStaff())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const now = Date.now();
    const start = new Date(now - 30 * DAY);
    const prevStart = new Date(now - 60 * DAY);
    const counted = { status: { notIn: ENDED } };

    const [current, previous, customersNow, customersPrev, pendingOrders, unpaidOrders, lowStockProducts, outOfStock, pendingReviews, recentOrders, recent30, top] = await Promise.all([
      prisma.order.aggregate({ where: { ...counted, createdAt: { gte: start } }, _sum: { total: true }, _count: true }),
      prisma.order.aggregate({ where: { ...counted, createdAt: { gte: prevStart, lt: start } }, _sum: { total: true }, _count: true }),
      prisma.user.count({ where: { role: 'CUSTOMER', createdAt: { gte: start } } }),
      prisma.user.count({ where: { role: 'CUSTOMER', createdAt: { gte: prevStart, lt: start } } }),
      prisma.order.count({ where: { status: 'PENDING' } }),
      prisma.order.count({ where: { ...counted, paymentStatus: { in: ['PENDING', 'FAILED'] }, paymentMethod: { not: 'COD' } } }),
      prisma.product.count({ where: { status: 'ACTIVE', stock: { gt: 0, lte: prisma.product.fields.lowStockThreshold } } }),
      prisma.product.count({ where: { status: 'ACTIVE', stock: { lte: 0 } } }),
      prisma.review.count({ where: { isApproved: false } }),
      prisma.order.findMany({
        take: 6,
        orderBy: { createdAt: 'desc' },
        select: { id: true, orderNumber: true, createdAt: true, shippingName: true, total: true, status: true, paymentStatus: true },
      }),
      prisma.order.findMany({ where: { ...counted, createdAt: { gte: start } }, select: { createdAt: true, total: true } }),
      prisma.orderItem.groupBy({
        by: ['productName'],
        where: { order: { ...counted, createdAt: { gte: start } } },
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
      }),
    ]);

    // Revenue per day (IST) for the last 30 days
    const daily: { date: string; revenue: number; orders: number }[] = [];
    const ist = (d: Date) => new Date(d.getTime() + 5.5 * 3_600_000).toISOString().slice(0, 10);
    for (let i = 29; i >= 0; i--) daily.push({ date: ist(new Date(now - i * DAY)), revenue: 0, orders: 0 });
    const byDate = new Map(daily.map((d) => [d.date, d]));
    for (const o of recent30) {
      const d = byDate.get(ist(o.createdAt));
      if (d) { d.revenue += Number(o.total); d.orders++; }
    }

    const revenue = Number(current._sum.total || 0);
    const prevRevenue = Number(previous._sum.total || 0);
    return NextResponse.json({
      period: {
        revenue, prevRevenue,
        orders: current._count, prevOrders: previous._count,
        aov: current._count ? revenue / current._count : 0,
        prevAov: previous._count ? prevRevenue / previous._count : 0,
        customers: customersNow, prevCustomers: customersPrev,
      },
      daily,
      attention: { pendingOrders, unpaidOrders, lowStockProducts, outOfStock, pendingReviews },
      topProducts: top.map((t) => ({ name: t.productName, quantity: t._sum.quantity || 0 })),
      recentOrders,
      // Older fields some screens still read
      pendingOrders,
      lowStockProducts,
    });
  } catch (error) {
    console.error('Stats API error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
