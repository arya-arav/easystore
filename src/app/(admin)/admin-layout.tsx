'use client';

// Admin shell, laid out like the Medusa dashboard: 220px sidebar (304px drawer on mobile),
// a slim top bar with breadcrumbs, and content up to 1600px wide with 12px gutters.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { signOut } from 'next-auth/react';
import {
  LayoutDashboard, Package, ShoppingCart, Users, FolderTree, Image as ImageIcon, Tag, Star, Settings, LogOut, Menu, X,
  BarChart3, Bell, KeyRound, Mail, Moon, Sun, MessageSquare, Quote, Search, ChevronRight, ExternalLink, Keyboard, Undo2, Layers, UserCog, Globe2, ScrollText,
  Store,
} from 'lucide-react';
import { useSettings } from '@/lib/settings-context';
import { ConfirmProvider } from '@/components/admin/overlays';
import { cx, Kbd } from '@/components/admin/ui';
import { CommandPalette, ShortcutsHelp, useAdminShortcuts } from './command-palette';

interface User { id: string; email: string; name?: string | null; role: string; }

export interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Roles that can use it (its API answers 401 for others). Default: ADMIN and SELLER. */
  adminOnly?: boolean;
  /** Key for the "G then key" shortcut. */
  key?: string;
}

export const NAV_GROUPS: { label?: string; items: NavItem[] }[] = [
  {
    items: [
      { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, key: 'd' },
      { href: '/admin/orders', label: 'Orders', icon: ShoppingCart, key: 'o' },
      { href: '/admin/returns', label: 'Returns', icon: Undo2 },
      { href: '/admin/products', label: 'Products', icon: Package, key: 'p' },
      { href: '/admin/categories', label: 'Categories', icon: FolderTree, key: 'g' },
      { href: '/admin/collections', label: 'Collections', icon: Layers },
      { href: '/admin/customers', label: 'Customers', icon: Users, adminOnly: true, key: 'c' },
      { href: '/admin/coupons', label: 'Promotions', icon: Tag, key: 'm' },
      { href: '/admin/reports', label: 'Reports', icon: BarChart3, adminOnly: true, key: 'r' },
    ],
  },
  {
    label: 'Content',
    items: [
      { href: '/admin/banners', label: 'Banners', icon: ImageIcon, adminOnly: true },
      { href: '/admin/reviews', label: 'Reviews', icon: Star, adminOnly: true },
      { href: '/admin/testimonials', label: 'Testimonials', icon: Quote, adminOnly: true },
      { href: '/admin/newsletter', label: 'Newsletter', icon: Mail, adminOnly: true },
      { href: '/admin/contacts', label: 'Messages', icon: MessageSquare, adminOnly: true },
    ],
  },
  {
    label: 'Settings',
    items: [
      { href: '/admin/settings', label: 'Store settings', icon: Settings, adminOnly: true, key: 's' },
      { href: '/admin/store-type', label: 'Store type & demo', icon: Store, adminOnly: true },
      { href: '/admin/regions', label: 'Regions', icon: Globe2, adminOnly: true },
      { href: '/admin/policies', label: 'Policies', icon: ScrollText, adminOnly: true },
      { href: '/admin/staff', label: 'Staff', icon: UserCog, adminOnly: true },
      { href: '/admin/api-keys', label: 'API keys', icon: KeyRound, adminOnly: true },
    ],
  },
];

/* ── Breadcrumbs: pages can name the last crumb (e.g. "#BB0421") ── */

const CrumbContext = createContext<(label: string | null) => void>(() => {});
/** Sets the label shown for the current page's last breadcrumb. */
export function useBreadcrumb(label: string | null | undefined) {
  const set = useContext(CrumbContext);
  useEffect(() => {
    set(label || null);
    return () => set(null);
  }, [label, set]);
}

const SEGMENT_LABELS: Record<string, string> = { new: 'Create', edit: 'Edit', import: 'Import', groups: 'Groups' };

function Breadcrumbs({ pathname, last, items }: { pathname: string; last: string | null; items: NavItem[] }) {
  const parts = pathname.split('/').filter(Boolean).slice(1); // after "admin"
  const crumbs = [{ href: '/admin', label: 'Dashboard' }];
  let href = '/admin';
  parts.forEach((seg, i) => {
    href += `/${seg}`;
    const nav = items.find((n) => n.href === href);
    const isLast = i === parts.length - 1;
    const label = isLast && last ? last : nav?.label || SEGMENT_LABELS[seg] || (seg.length > 16 ? 'Details' : decodeURIComponent(seg));
    crumbs.push({ href, label });
  });
  const shown = parts.length === 0 ? crumbs : crumbs.slice(1);
  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-[13px] font-medium">
      {shown.map((c, i) => (
        <span key={c.href} className="flex min-w-0 items-center gap-1.5">
          {i > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-ui-muted" />}
          {i === shown.length - 1 ? (
            <span className="truncate text-ui-fg">{c.label}</span>
          ) : (
            <Link href={c.href} className={cx('truncate text-ui-subtle hover:text-ui-fg', i < shown.length - 2 && 'hidden sm:inline')}>{c.label}</Link>
          )}
        </span>
      ))}
    </nav>
  );
}

export function AdminLayout({ user, children }: { user: User; children: React.ReactNode }) {
  const pathname = usePathname();
  const { settings } = useSettings();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [crumb, setCrumb] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [pending, setPending] = useState(0);

  const isAdmin = user.role === 'ADMIN';
  const groups = NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => isAdmin || !i.adminOnly) })).filter((g) => g.items.length);
  const items = groups.flatMap((g) => g.items);

  useEffect(() => {
    try { setDark(localStorage.getItem('admin-dark') === 'true'); } catch {}
  }, []);
  const toggleDark = () => {
    setDark((d) => {
      try { localStorage.setItem('admin-dark', String(!d)); } catch {}
      return !d;
    });
  };

  // Orders waiting for a decision (shown on the bell and the Orders item)
  useEffect(() => {
    fetch('/api/admin/orders?status=PENDING&limit=1')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setPending(Number(d.total) || 0))
      .catch(() => {});
  }, [pathname]);

  useEffect(() => setSidebarOpen(false), [pathname]);

  const openPalette = useCallback(() => setPaletteOpen(true), []);
  useAdminShortcuts({ items, onPalette: openPalette, onHelp: () => setHelpOpen(true), onLogout: () => signOut({ callbackUrl: '/' }) });

  const isActive = (href: string) => (href === '/admin' ? pathname === '/admin' : pathname === href || pathname.startsWith(href + '/'));
  const storeName = settings.storeName || 'My Store';

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-3 pb-2 pt-3">
        <Link href="/admin" className="flex min-w-0 flex-1 items-center gap-2 rounded-md p-1 hover:bg-ui-hover">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-ui-inverted text-[12px] font-medium text-ui-inverted-fg">
            {storeName[0]?.toUpperCase()}
          </span>
          <span className="truncate font-medium text-ui-fg">{storeName}</span>
        </Link>
      </div>
      <div className="px-3 pb-2">
        <button type="button" onClick={openPalette} className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-ui-subtle hover:bg-ui-hover">
          <Search className="h-4 w-4" />
          <span className="flex-1 text-left">Search</span>
          <Kbd>⌘K</Kbd>
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 pb-3">
        {groups.map((group, gi) => (
          <div key={gi} className={cx(gi > 0 && 'mt-3 border-t border-dashed border-ui-border pt-3')}>
            {group.label && <p className="mb-1 px-2 text-[12px] font-medium text-ui-muted">{group.label}</p>}
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cx(
                      'flex h-7 items-center gap-2 rounded-md pl-0.5 pr-2 font-medium transition-colors',
                      isActive(item.href) ? 'bg-ui-base text-ui-fg shadow-ui-card' : 'text-ui-subtle hover:bg-ui-hover hover:text-ui-fg'
                    )}
                  >
                    <span className="flex h-6 w-6 items-center justify-center"><item.icon className="h-4 w-4" /></span>
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.href === '/admin/orders' && pending > 0 && (
                      <span className="rounded bg-ui-hover px-1.5 text-[11px] text-ui-subtle">{pending}</span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className="border-t border-ui-border p-3">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-ui-hover text-[12px] font-medium text-ui-subtle">
            {(user.name || user.email)[0]?.toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-ui-fg">{user.name || 'Admin'}</p>
            <p className="truncate text-[12px] text-ui-subtle">{user.role === 'ADMIN' ? 'Admin' : 'Seller'} · {user.email}</p>
          </div>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-1">
          <button type="button" onClick={toggleDark} title={dark ? 'Light mode' : 'Dark mode'} className="flex h-7 items-center justify-center rounded-md text-ui-subtle hover:bg-ui-hover">
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button type="button" onClick={() => setHelpOpen(true)} title="Keyboard shortcuts" className="flex h-7 items-center justify-center rounded-md text-ui-subtle hover:bg-ui-hover">
            <Keyboard className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => signOut({ callbackUrl: '/' })} title="Sign out" className="flex h-7 items-center justify-center rounded-md text-ui-subtle hover:bg-red-50 hover:text-red-600">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className={cx('admin-ui min-h-screen lg:flex', dark && 'admin-dark')}>
      <ConfirmProvider>
        <CrumbContext.Provider value={setCrumb}>
          {/* Desktop sidebar */}
          <aside className="sticky top-0 hidden h-screen w-[220px] shrink-0 border-r border-ui-border bg-ui-bg lg:block">{sidebar}</aside>

          {/* Mobile sidebar */}
          {sidebarOpen && (
            <>
              <div className="fixed inset-0 z-50 bg-black/30 lg:hidden" onClick={() => setSidebarOpen(false)} />
              <aside className="fixed inset-y-2 left-2 z-50 w-[calc(100%-16px)] max-w-[304px] overflow-hidden rounded-lg bg-ui-bg shadow-ui-modal lg:hidden">
                <button type="button" aria-label="Close menu" onClick={() => setSidebarOpen(false)} className="absolute right-3 top-3 rounded-md p-1 text-ui-subtle hover:bg-ui-hover">
                  <X className="h-4 w-4" />
                </button>
                {sidebar}
              </aside>
            </>
          )}

          <div className="flex min-w-0 flex-1 flex-col">
            {/* Top bar */}
            <header className="sticky top-0 z-30 grid grid-cols-[1fr_auto] items-center gap-3 border-b border-ui-border bg-ui-bg/95 p-3 backdrop-blur">
              <div className="flex min-w-0 items-center gap-1.5">
                <button type="button" aria-label="Open menu" onClick={() => setSidebarOpen(true)} className="rounded-md p-1 text-ui-subtle hover:bg-ui-hover lg:hidden">
                  <Menu className="h-5 w-5" />
                </button>
                <Breadcrumbs pathname={pathname} last={crumb} items={items} />
              </div>
              <div className="flex items-center gap-1">
                <button type="button" onClick={openPalette} aria-label="Search" className="rounded-md p-1.5 text-ui-subtle hover:bg-ui-hover lg:hidden">
                  <Search className="h-4 w-4" />
                </button>
                <Link href="/admin/orders?status=PENDING" aria-label={pending ? `${pending} pending orders` : 'No pending orders'} title={pending ? `${pending} pending orders` : 'No pending orders'} className="relative rounded-md p-1.5 text-ui-subtle hover:bg-ui-hover">
                  <Bell className="h-4 w-4" />
                  {pending > 0 && <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-red-500" />}
                </Link>
                <Link href="/" target="_blank" className="hidden items-center gap-1 rounded-md px-2 py-1.5 font-medium text-ui-subtle hover:bg-ui-hover hover:text-ui-fg sm:flex">
                  View store <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>
            </header>

            <main className="mx-auto flex w-full max-w-[1600px] flex-col gap-2 p-3">{children}</main>
          </div>

          <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} items={items} />
          <ShortcutsHelp open={helpOpen} onClose={() => setHelpOpen(false)} items={items} />
        </CrumbContext.Provider>
      </ConfirmProvider>
    </div>
  );
}
