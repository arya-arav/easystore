import { Metadata } from 'next';
import { OrderDetailClient } from './client';

export const metadata: Metadata = { title: 'Order Details' };

export default async function OrderDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  return <OrderDetailClient orderId={params.id} />;
}
