import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { OrderDetail } from './client';
import { getPolicies } from '@/lib/policies-server';

export const metadata: Metadata = {
  title: 'Order Details',
};

async function getOrder(id: string) {
  return prisma.order.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true, _count: { select: { orders: true } } } },
      items: { include: { product: { select: { id: true, slug: true, images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 1 } } } } },
      statusHistory: { orderBy: { createdAt: 'desc' } },
      refunds: { orderBy: { createdAt: 'desc' } },
      returns: { orderBy: { createdAt: 'desc' } },
    },
  });
}

export default async function OrderDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const order = await getOrder(params.id);
  if (!order) notFound();

  const policies = await getPolicies();
  return <OrderDetail order={JSON.parse(JSON.stringify(order))} refundReasons={policies.refundReasons} returnReasons={policies.returnReasons} />;
}
