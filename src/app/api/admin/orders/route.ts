import { OrderStatus, PaymentMethod, PaymentStatus, type Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { requireStaff } from '@/lib/admin-auth';
import { csvResponse, dayRange, listParams } from '@/lib/admin-list';

export const dynamic = 'force-dynamic';

const SORTS = {
  created_desc: { createdAt: 'desc' },
  created_asc: { createdAt: 'asc' },
  total_desc: { total: 'desc' },
  total_asc: { total: 'asc' },
} as const;

function oneOf<T extends string>(values: Record<string, T>, v: string | null): T | undefined {
  return v && (Object.values(values) as string[]).includes(v) ? (v as T) : undefined;
}

function orderWhere(sp: URLSearchParams, q: string) {
  const where: Prisma.OrderWhereInput = {};
  // Unknown values from the URL are ignored (they used to make the database query fail)
  const status = oneOf(OrderStatus, sp.get('status'));
  const payment = oneOf(PaymentStatus, sp.get('payment'));
  const method = oneOf(PaymentMethod, sp.get('method'));
  if (status) where.status = status;
  if (payment) where.paymentStatus = payment;
  if (method) where.paymentMethod = method;
  const created = dayRange(sp.get('from'), sp.get('to'));
  if (created) where.createdAt = created;
  if (q) {
    const has = { contains: q.replace(/^#/, ''), mode: 'insensitive' as const };
    where.OR = [{ orderNumber: has }, { shippingName: has }, { shippingPhone: has }, { user: { email: has } }, { couponCode: has }];
  }
  return where;
}

// GET - orders for admin: ?q=&status=&payment=&method=&from=&to=&sort=&page=&limit= (&format=csv)
export async function GET(request: NextRequest) {
  try {
    if (!(await requireStaff())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { sp, q, skip, limit, orderBy } = listParams(request, SORTS, 'created_desc');
    const where = orderWhere(sp, q);

    if (sp.get('format') === 'csv') {
      const orders = await prisma.order.findMany({
        where,
        include: { user: { select: { email: true } }, items: { select: { productName: true, variant: true, quantity: true, price: true } } },
        orderBy,
        take: 5000,
      });
      return csvResponse(
        `orders-${new Date().toISOString().slice(0, 10)}.csv`,
        ['Order', 'Date', 'Customer', 'Email', 'Phone', 'City', 'State', 'Pincode', 'Country', 'Items', 'Subtotal', 'Discount', 'Coupon', 'Shipping', 'GST', 'Total (INR)', 'Currency', 'Payment method', 'Payment status', 'Status', 'Tracking'],
        orders.map((o) => [
          o.orderNumber, o.createdAt, o.shippingName, o.user?.email, o.shippingPhone, o.shippingCity, o.shippingState, o.shippingPincode, o.shippingCountry,
          o.items.map((i) => `${i.quantity} x ${i.productName}${i.variant ? ` (${i.variant})` : ''}`).join('; '),
          o.subtotal, o.discount, o.couponCode, o.shippingCharge, o.gstAmount, o.total, o.currency, o.paymentMethod, o.paymentStatus, o.status, o.trackingNumber,
        ])
      );
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        select: {
          id: true, orderNumber: true, createdAt: true, shippingName: true, shippingCity: true, shippingCountry: true, total: true, currency: true,
          paymentMethod: true, paymentStatus: true, status: true, couponCode: true,
          user: { select: { name: true, email: true } },
          _count: { select: { items: true } },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    return NextResponse.json({ orders, total });
  } catch (error) {
    console.error('Admin orders GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}
