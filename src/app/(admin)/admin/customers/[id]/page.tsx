import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { CustomerDetail } from './client';

export const metadata: Metadata = {
  title: 'Customer Details',
};

async function getCustomer(id: string) {
  const customer = await prisma.user.findUnique({
    where: { id },
    include: {
      orders: {
        select: { id: true, orderNumber: true, createdAt: true, total: true, status: true, paymentStatus: true, _count: { select: { items: true } } },
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
      loyaltyPoints: { orderBy: { createdAt: 'desc' }, take: 10 },
      customerGroup: { select: { id: true, name: true, discountPercent: true } },
      reviews: {
        include: { product: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 5,
      },
      wishlist: {
        include: { product: { select: { name: true, price: true } } },
      },
      addresses: true,
      _count: {
        select: { orders: true, reviews: true },
      },
    },
  });
  return customer;
}

export default async function CustomerDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const customer = await getCustomer(params.id);
  if (!customer || customer.role === 'ADMIN') notFound();

  // Lifetime figures over every order, not just the 20 listed
  const lifetime = await prisma.order.aggregate({
    where: { userId: customer.id, status: { notIn: ['CANCELLED', 'REFUNDED', 'RETURNED'] } },
    _sum: { total: true },
    _count: true,
  });
  // Never send password hashes or tokens to the browser
  const { password: _pw, resetToken: _rt, resetTokenExpiry: _re, emailVerifyToken: _ev, ...safe } = customer as any;

  return (
    <CustomerDetail
      customer={JSON.parse(JSON.stringify(safe))}
      lifetime={{ spent: Number(lifetime._sum.total || 0), orders: lifetime._count }}
    />
  );
}
