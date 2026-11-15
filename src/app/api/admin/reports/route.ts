import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30d';

    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    switch (period) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    // Get total revenue and orders
    const orders = await prisma.order.findMany({
      where: {
        createdAt: { gte: startDate },
        status: { notIn: ['CANCELLED', 'REFUNDED'] },
      },
      include: {
        items: { include: { product: true } },
      },
    });

    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total), 0);
    const totalOrders = orders.length;
    const averageOrderValue = totalOrders > 0 ? Math.round((totalRevenue / totalOrders) * 100) / 100 : 0;

    // Get total customers
    const totalCustomers = await prisma.user.count({
      where: { role: 'CUSTOMER' },
    });

    // Get total products
    const totalProducts = await prisma.product.count({
      where: { status: 'ACTIVE' },
    });

    // Top selling products
    const orderItems = orders.flatMap((o) => o.items);
    const productSales: Record<string, { name: string; quantity: number; revenue: number }> = {};

    orderItems.forEach((item) => {
      if (!productSales[item.productId]) {
        productSales[item.productId] = {
          name: item.productName,
          quantity: 0,
          revenue: 0,
        };
      }
      productSales[item.productId].quantity += item.quantity;
      productSales[item.productId].revenue += Number(item.price) * item.quantity;
    });

    const topProducts = Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Order status breakdown
    const allOrders = await prisma.order.findMany({
      select: { status: true },
    });

    const orderStatusBreakdown: Record<string, number> = {};
    allOrders.forEach((o) => {
      orderStatusBreakdown[o.status] = (orderStatusBreakdown[o.status] || 0) + 1;
    });

    return NextResponse.json({
      totalRevenue,
      totalOrders,
      totalProducts,
      totalCustomers,
      averageOrderValue,
      topProducts,
      orderStatusBreakdown,
    });
  } catch (error) {
    console.error('Reports error:', error);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}
