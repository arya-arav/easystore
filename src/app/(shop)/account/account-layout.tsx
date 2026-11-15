'use client';

// Account area: a soft tinted page with white rounded cards. Desktop has a profile card
// with an icon menu on the left; phones get the same profile card on top with the menu
// as a row of chips. Colours follow the store theme (primary-*).

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { Gift, Heart, LayoutDashboard, LogOut, MapPin, Package, Settings, Star } from 'lucide-react';

interface AccountLayoutProps {
  user: { name?: string | null; email?: string | null; image?: string | null };
  children: React.ReactNode;
}

export const ACCOUNT_LINKS = [
  { href: '/account', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/account/orders', label: 'My orders', icon: Package },
  { href: '/account/wishlist', label: 'Wishlist', icon: Heart },
  { href: '/account/addresses', label: 'Addresses', icon: MapPin },
  { href: '/account/loyalty', label: 'Loyalty points', icon: Star },
  { href: '/account/referral', label: 'Refer & earn', icon: Gift },
  { href: '/account/settings', label: 'Profile', icon: Settings },
];

export function AccountLayout({ user, children }: AccountLayoutProps) {
  const pathname = usePathname();
  const isActive = (href: string, exact?: boolean) => (exact ? pathname === href : pathname === href || pathname.startsWith(href + '/'));
  const initials = (user.name || user.email || 'U').split(/[\s@]/).filter(Boolean).map((p) => p[0]).join('').slice(0, 2).toUpperCase();

  const avatar = (size: string) => (
    <span className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-100 font-semibold text-primary-600 ${size}`}>
      {user.image ? <img src={user.image} alt="" className="h-full w-full object-cover" /> : initials}
    </span>
  );

  return (
    <div className="min-h-screen bg-bg-primary py-6 sm:py-10">
      <div className="content-container max-w-6xl">
        {/* Phones: profile and menu chips on top */}
        <div className="mb-5 lg:hidden">
          <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
            {avatar('h-12 w-12 text-base')}
            <div className="min-w-0">
              <p className="truncate font-semibold text-text-primary">{user.name || 'My account'}</p>
              <p className="truncate text-xs text-text-secondary">{user.email}</p>
            </div>
          </div>
          <nav aria-label="Account" className="-mx-4 mt-3 overflow-x-auto px-4 [scrollbar-width:none]">
            <div className="flex w-max gap-2">
              {ACCOUNT_LINKS.map(({ href, label, icon: Icon, exact }) => (
                <Link key={href} href={href}
                  className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
                    isActive(href, exact) ? 'bg-primary-500 text-white shadow-sm' : 'bg-white text-text-secondary shadow-sm'}`}>
                  <Icon className="h-4 w-4" /> {label}
                </Link>
              ))}
              <button type="button" onClick={() => signOut({ callbackUrl: '/' })} className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-white px-3.5 py-2 text-sm font-medium text-text-secondary shadow-sm">
                <LogOut className="h-4 w-4" /> Log out
              </button>
            </div>
          </nav>
        </div>

        <div className="flex items-start gap-6">
          {/* Desktop: profile card with menu */}
          <aside className="sticky top-24 hidden w-64 shrink-0 overflow-hidden rounded-2xl bg-white shadow-sm lg:block">
            <div className="bg-gradient-to-br from-primary-50 to-white px-5 pb-5 pt-6 text-center">
              <div className="mx-auto w-fit">{avatar('h-16 w-16 text-xl ring-4 ring-white')}</div>
              <p className="mt-3 truncate font-semibold text-text-primary">{user.name || 'My account'}</p>
              <p className="truncate text-xs text-text-secondary">{user.email}</p>
            </div>
            <nav aria-label="Account" className="space-y-0.5 p-3">
              {ACCOUNT_LINKS.map(({ href, label, icon: Icon, exact }) => (
                <Link key={href} href={href} aria-current={isActive(href, exact) ? 'page' : undefined}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive(href, exact) ? 'bg-primary-50 text-primary-600' : 'text-text-secondary hover:bg-gray-50 hover:text-text-primary'}`}>
                  <Icon className="h-[18px] w-[18px]" /> {label}
                </Link>
              ))}
            </nav>
            <div className="border-t border-gray-100 p-3">
              <button type="button" onClick={() => signOut({ callbackUrl: '/' })} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-red-50 hover:text-red-500">
                <LogOut className="h-[18px] w-[18px]" /> Log out
              </button>
            </div>
          </aside>

          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </div>
  );
}
