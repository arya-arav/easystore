import { Metadata } from 'next';
import { OrdersClient } from './client';

export const metadata: Metadata = { title: 'My Orders' };

export default function OrdersPage() {
  return <OrdersClient />;
}
