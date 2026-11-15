'use client';

import { useEffect, useState } from 'react';
import { ShopEmoji } from '@/components/ui/shop-emoji';
import Link from 'next/link';
import { ChevronRight, Heart, MapPin, Package, ShoppingBag, Star } from 'lucide-react';
import { AccountHeader, AccountSection, StatusPill, accountButton } from '@/components/account/ui';
import { formatOrderMoney } from '@/lib/markets';
import { useCart } from '@/lib/cart-context';

interface User { id: string; email: string; name?: string | null; role: string }
interface OrderSummary {
  id: string;
  orderNumber: string;
  createdAt: string;
  status: string;
  total: number;
  currency?: string;
  exchangeRate?: number;
  items: { id: string; productName: string; quantity: number; product?: { images?: { url: string }[] } | null }[];
}

const fmtDate = (d: string) => new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

export function DashboardClient({ user }: { user: User }) {
  const { wishlist } = useCart();
  const [orders, setOrders] = useState<OrderSummary[] | null>(null);
  const [addressCount, setAddressCount] = useState<number | null>(null);
  const [profile, setProfile] = useState<{ name?: string | null; phone?: string | null } | null>(null);
  const [points, setPoints] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/orders').then((r) => r.json()).then((d) => setOrders(d.orders || [])).catch(() => setOrders([]));
    fetch('/api/addresses').then((r) => r.json()).then((d) => setAddressCount((d.addresses || []).length)).catch(() => setAddressCount(0));
    fetch('/api/account/profile').then((r) => (r.ok ? r.json() : null)).then((d) => setProfile(d?.user || d)).catch(() => {});
    fetch('/api/loyalty').then((r) => (r.ok ? r.json() : null)).then((d) => setPoints(d?.balance ?? 0)).catch(() => {});
  }, []);

  const checks = [
    { done: true, label: 'email' },
    { done: !!profile?.name?.trim(), label: 'name', href: '/account/settings' },
    { done: !!profile?.phone?.trim(), label: 'phone number', href: '/account/settings' },
    { done: (addressCount ?? 0) > 0, label: 'delivery address', href: '/account/addresses' },
  ];
  const completion = profile && addressCount !== null ? Math.round((checks.filter((c) => c.done).length / checks.length) * 100) : null;
  const nextStep = checks.find((c) => !c.done);
  const firstName = (profile?.name || user.name || '').split(' ')[0];

  const tiles = [
    { label: 'Orders', value: orders?.length, href: '/account/orders', icon: Package, tone: 'bg-primary-50 text-primary-600' },
    { label: 'Wishlist', value: wishlist.length, href: '/account/wishlist', icon: Heart, tone: 'bg-pink-50 text-pink-500' },
    { label: 'Points', value: points, href: '/account/loyalty', icon: Star, tone: 'bg-amber-50 text-amber-500' },
    { label: 'Addresses', value: addressCount, href: '/account/addresses', icon: MapPin, tone: 'bg-sky-50 text-sky-500' },
  ];

  return (
    <div>
      <AccountHeader title={`Hello ${firstName || 'there'} 👋`} description="Here's what's happening with your orders and rewards." />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {tiles.map((t) => (
          <Link key={t.label} href={t.href} className="group rounded-2xl bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md sm:p-5">
            <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${t.tone}`}><t.icon className="h-5 w-5" /></span>
            <p className="mt-4 text-2xl font-bold text-text-primary">{t.value ?? '–'}</p>
            <p className="text-sm text-text-secondary">{t.label}</p>
          </Link>
        ))}
      </div>

      {completion !== null && completion < 100 && nextStep?.href && (
        <Link href={nextStep.href} className="mb-5 block rounded-2xl bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-semibold text-text-primary">Your profile is {completion}% complete</span>
            <span className="font-medium text-primary-500">Add your {nextStep.label} →</span>
          </div>
          <div className="mt-3 h-2 rounded-full bg-gray-100" role="progressbar" aria-valuenow={completion} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-2 rounded-full bg-primary-500 transition-all" style={{ width: `${completion}%` }} />
          </div>
          <p className="mt-2 text-xs text-text-muted">A complete profile makes checkout faster.</p>
        </Link>
      )}

      <AccountSection title="Recent orders" actions={orders && orders.length > 0 ? <Link href="/account/orders" className="text-sm font-medium text-primary-500 hover:underline">View all</Link> : undefined}>
        {orders === null ? (
          <div className="space-y-3">{[0, 1].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100" />)}</div>
        ) : orders.length === 0 ? (
          <div className="py-8 text-center">
            <ShoppingBag className="mx-auto h-10 w-10 text-gray-300" />
            <p className="mt-3 font-medium text-text-primary">No orders yet</p>
            <p className="mt-1 text-sm text-text-secondary">Your orders will show up here.</p>
            <Link href="/products" className={accountButton('primary', 'mt-4')}>Start shopping</Link>
          </div>
        ) : (
          <ul className="-mx-2 divide-y divide-gray-100">
            {orders.slice(0, 4).map((o) => (
              <li key={o.id}>
                <Link href={`/account/orders/${o.id}`} className="flex items-center gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-gray-50 sm:gap-4">
                  <div className="flex -space-x-3">
                    {o.items.slice(0, 2).map((it) => (
                      <span key={it.id} className="h-12 w-12 overflow-hidden rounded-xl border-2 border-white bg-bg-primary">
                        {it.product?.images?.[0]?.url ? <img src={it.product.images[0].url} alt="" className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center">{<ShopEmoji />}</span>}
                      </span>
                    ))}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-text-primary">#{o.orderNumber}</p>
                    <p className="text-xs text-text-muted">{fmtDate(o.createdAt)} · {o.items.reduce((n, i) => n + i.quantity, 0)} items</p>
                  </div>
                  <StatusPill status={o.status} />
                  <span className="hidden w-20 text-right text-sm font-semibold text-text-primary sm:block">{formatOrderMoney(o, o.total)}</span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-text-muted" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </AccountSection>
    </div>
  );
}
