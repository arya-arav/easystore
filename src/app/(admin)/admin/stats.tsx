'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ArrowRight, Clock, CreditCard, PackageX, Plus, Star } from 'lucide-react';
import { Container, EmptyState, LinkButton, ORDER_STATUS_TONE, PAYMENT_STATUS_TONE, SectionHeader, Skeleton, StatusBadge, cx, inr, shortDate } from '@/components/admin/ui';

interface Stats {
  period: { revenue: number; prevRevenue: number; orders: number; prevOrders: number; aov: number; prevAov: number; customers: number; prevCustomers: number };
  daily: { date: string; revenue: number; orders: number }[];
  attention: { pendingOrders: number; unpaidOrders: number; lowStockProducts: number; outOfStock: number; pendingReviews: number };
  topProducts: { name: string; quantity: number }[];
  recentOrders: { id: string; orderNumber: string; createdAt: string; shippingName: string; total: string; status: string; paymentStatus: string }[];
}

function change(now: number, before: number) {
  if (!before) return now ? { text: 'New', up: true } : null;
  const pct = ((now - before) / before) * 100;
  return { text: `${pct >= 0 ? '+' : ''}${pct.toFixed(Math.abs(pct) < 10 ? 1 : 0)}%`, up: pct >= 0 };
}

export function DashboardStats() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch('/api/admin/stats').then((r) => (r.ok ? r.json() : Promise.reject())).then(setStats).catch(() => setError(true));
  }, []);

  if (error) return <Container><EmptyState title="Could not load the dashboard" description="Refresh the page to try again." /></Container>;
  if (!stats) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-24" />
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const p = stats.period;
  const kpis = [
    { label: 'Revenue', value: inr(p.revenue), delta: change(p.revenue, p.prevRevenue) },
    { label: 'Orders', value: String(p.orders), delta: change(p.orders, p.prevOrders) },
    { label: 'Average order', value: inr(p.aov), delta: change(p.aov, p.prevAov) },
    { label: 'New customers', value: String(p.customers), delta: change(p.customers, p.prevCustomers) },
  ];
  const a = stats.attention;
  const tasks = [
    { n: a.pendingOrders, label: 'orders waiting to be confirmed', href: '/admin/orders?status=PENDING', icon: Clock },
    { n: a.unpaidOrders, label: 'online orders not paid yet', href: '/admin/orders?payment=PENDING', icon: CreditCard },
    { n: a.outOfStock, label: 'products out of stock', href: '/admin/products?stock=out', icon: PackageX },
    { n: a.lowStockProducts, label: 'products running low', href: '/admin/products?stock=low', icon: AlertTriangle },
    { n: a.pendingReviews, label: 'reviews to approve', href: '/admin/reviews', icon: Star },
  ].filter((t) => t.n > 0);
  const max = Math.max(1, ...stats.daily.map((d) => d.revenue));

  return (
    <div className="flex flex-col gap-2">
      <Container>
        <SectionHeader level={1} title="Dashboard" subtitle="Last 30 days, compared with the 30 days before." actions={<LinkButton href="/admin/products/new" variant="primary"><Plus className="h-3.5 w-3.5" /> Add product</LinkButton>} />
        <div className="grid grid-cols-2 xl:grid-cols-4">
          {kpis.map((k, i) => (
            <div key={k.label} className={cx('px-6 py-4', i % 2 === 1 && 'border-l border-ui-border', i >= 2 && 'border-t border-ui-border xl:border-t-0', i === 2 && 'xl:border-l')}>
              <p className="text-ui-subtle">{k.label}</p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-[20px] font-medium leading-7">{k.value}</span>
                {k.delta && <span className={cx('text-[12px] font-medium', k.delta.up ? 'text-emerald-600' : 'text-red-600')}>{k.delta.text}</span>}
              </div>
            </div>
          ))}
        </div>
        <div className="px-6 pb-4 pt-5">
          <div className="flex h-28 items-end gap-[3px]" role="img" aria-label="Revenue per day for the last 30 days">
            {stats.daily.map((d) => (
              <div key={d.date} className="group relative flex-1">
                <div className="rounded-sm bg-ui-subtle opacity-70 transition-opacity group-hover:opacity-100" style={{ height: `${Math.max(2, (d.revenue / max) * 112)}px` }} />
                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-ui-inverted px-2 py-1 text-[12px] text-ui-inverted-fg group-hover:block">
                  {new Date(d.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · {inr(d.revenue)} · {d.orders} order{d.orders === 1 ? '' : 's'}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-1.5 flex justify-between text-[12px] text-ui-muted">
            <span>{shortDate(stats.daily[0].date)}</span>
            <span>Today</span>
          </div>
        </div>
      </Container>

      <div className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_440px]">
        <Container className="overflow-hidden">
          <SectionHeader title="Recent orders" actions={<Link href="/admin/orders" className="inline-flex items-center gap-1 font-medium text-ui-subtle hover:text-ui-fg">View all <ArrowRight className="h-3.5 w-3.5" /></Link>} />
          {stats.recentOrders.length === 0 ? <EmptyState title="No orders yet" /> : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <tbody>
                  {stats.recentOrders.map((o) => (
                    <tr key={o.id} onClick={() => router.push(`/admin/orders/${o.id}`)} className="h-12 cursor-pointer border-b border-ui-border last:border-0 hover:bg-ui-hover">
                      <td className="pl-6 pr-6 font-medium">#{o.orderNumber}</td>
                      <td className="pr-6">{o.shippingName}</td>
                      <td className="hidden whitespace-nowrap pr-6 text-ui-subtle sm:table-cell">{shortDate(o.createdAt)}</td>
                      <td className="pr-6"><StatusBadge status={o.paymentStatus} tones={PAYMENT_STATUS_TONE} /></td>
                      <td className="pr-6"><StatusBadge status={o.status} tones={ORDER_STATUS_TONE} /></td>
                      <td className="pr-6 text-right">{inr(o.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Container>

        <div className="flex flex-col gap-2">
          <Container>
            <SectionHeader title="Needs attention" />
            {tasks.length === 0 ? <p className="px-6 py-4 text-ui-subtle">All caught up.</p> : tasks.map((t) => (
              <Link key={t.label} href={t.href} className="flex items-center gap-3 px-6 py-3 hover:bg-ui-hover">
                <t.icon className="h-4 w-4 text-ui-muted" />
                <span className="flex-1"><span className="font-medium">{t.n}</span> {t.label}</span>
                <ArrowRight className="h-3.5 w-3.5 text-ui-muted" />
              </Link>
            ))}
          </Container>
          <Container>
            <SectionHeader title="Top products" subtitle="Units sold, last 30 days" />
            {stats.topProducts.length === 0 ? <p className="px-6 py-4 text-ui-subtle">No sales yet.</p> : stats.topProducts.map((t, i) => (
              <div key={t.name} className="flex items-center gap-3 px-6 py-2.5">
                <span className="w-4 text-ui-muted">{i + 1}</span>
                <span className="flex-1 truncate">{t.name}</span>
                <span className="text-ui-subtle">{t.quantity}</span>
              </div>
            ))}
          </Container>
        </div>
      </div>
    </div>
  );
}
