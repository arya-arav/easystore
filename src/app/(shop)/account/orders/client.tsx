'use client';

import { useEffect, useState } from 'react';
import { ShopEmoji } from '@/components/ui/shop-emoji';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { AccountHeader, StatusPill, accountButton, accountInput } from '@/components/account/ui';
import { formatOrderMoney } from '@/lib/markets';
import { thumbSrc } from '@/lib/image-hosts';

interface OrderItem {
  id: string;
  productName: string;
  variant?: string | null;
  quantity: number;
  price: number;
  product?: { images: { url: string }[] };
}

interface Order {
  currency?: string;
  exchangeRate?: number | string;
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  createdAt: string;
  items: OrderItem[];
}

const fmtDate = (d: string) => new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });

export function OrdersClient() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/orders').then((r) => r.json()).then((d) => setOrders(d.orders || [])).catch(() => setOrders([]));
  }, []);

  const term = search.trim().toLowerCase();
  const filtered = (orders || []).filter((o) => !term || o.orderNumber.toLowerCase().includes(term) || o.items.some((i) => i.productName.toLowerCase().includes(term)));

  return (
    <div>
      <AccountHeader
        title="Orders"
        description="Your previous orders and their status. Open one to track it, download the invoice, buy again or return items."
        actions={orders && orders.length > 3 ? (
          <div className="relative w-full sm:w-60">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Order number or product" aria-label="Search orders" className={`${accountInput} h-10 pl-9`} />
          </div>
        ) : undefined}
      />

      {orders === null ? (
        <div className="space-y-4">{[0, 1, 2].map((i) => <div key={i} className="h-40 animate-pulse rounded-2xl bg-white" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl bg-white px-6 py-12 text-center shadow-sm">
          <p className="font-medium text-text-primary">{term ? 'No orders match' : 'Nothing to see here'}</p>
          <p className="mt-1 text-sm text-text-secondary">{term ? 'Try another order number or product name.' : 'You don’t have any orders yet.'}</p>
          {!term && <Link href="/products" className={accountButton('primary', 'mt-4')}>Continue shopping</Link>}
        </div>
      ) : (
        <ul className="space-y-4">
          {filtered.map((order) => {
            const count = order.items.reduce((n, i) => n + i.quantity, 0);
            return (
              <li key={order.id}>
                <Link href={`/account/orders/${order.id}`} className="block rounded-2xl bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-text-primary">#{order.orderNumber}</p>
                      <p className="text-xs text-text-muted">{fmtDate(order.createdAt)} · {count} item{count === 1 ? '' : 's'}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusPill status={order.status} />
                      <span className="font-semibold text-text-primary">{formatOrderMoney(order, order.total)}</span>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-3 border-t border-gray-100 pt-3">
                    <div className="flex -space-x-3">
                      {order.items.slice(0, 4).map((item) => (
                        <span key={item.id} className="h-14 w-14 overflow-hidden rounded-xl border-2 border-white bg-bg-primary">
                          {item.product?.images?.[0]?.url
                            ? <img src={thumbSrc(item.product.images[0].url, 128)} loading="lazy" alt={item.productName} className="h-full w-full object-cover" />
                            : <span className="flex h-full items-center justify-center text-lg">{<ShopEmoji />}</span>}
                        </span>
                      ))}
                    </div>
                    <p className="min-w-0 flex-1 truncate text-sm text-text-secondary">
                      {order.items.map((i) => i.productName).join(', ')}
                    </p>
                    <span className="hidden text-sm font-medium text-primary-500 sm:inline">See details →</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
