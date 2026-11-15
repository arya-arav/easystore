'use client';

import Link from 'next/link';
import { ShopEmoji } from '@/components/ui/shop-emoji';
import Image from 'next/image';
import { ShoppingCart, Heart, User, Search, Menu, X, ChevronDown } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/lib/cart-context';
import { useSettings, useShopType } from '@/lib/settings-context';
import { useMoney } from '@/lib/currency-context';
import { CurrencySwitcher } from '@/components/currency-switcher';
import { FallbackImage } from '@/components/ui/fallback-image';
import { categoryPictures } from '@/lib/category-picture';
import { useShippingOffer } from '@/lib/use-shipping-offer';

interface NavCategory { name: string; href: string; image?: string | null; cover?: string | null; count?: number; children?: { name: string; href: string }[] }

// Shown until categories load, or if they can't be fetched.
const FALLBACK_CATEGORIES: NavCategory[] = [
  { name: 'Toys', href: '/category/toys' },
  { name: 'Accessories', href: '/category/accessories' },
  { name: 'Feeding', href: '/category/feeding-nursing' },
  { name: 'Diapers', href: '/category/diapers-wipes' },
  { name: 'Nursery', href: '/category/nursery-furniture' },
];
const MAX_NAV_LINKS = 5;

// Top-level categories that have products, in Admin → Categories order. Fetched once per page load.
let navCategoriesPromise: Promise<NavCategory[]> | null = null;
export function loadNavCategories() {
  navCategoriesPromise ??= fetch('/api/categories')
    .then((r) => (r.ok ? r.json() : []))
    .then((data: any[]) =>
      (Array.isArray(data) ? data : [])
        .filter((c) => !c.parentId && (c._count?.products ?? 0) > 0)
        .map((c) => ({
          name: c.name,
          href: `/category/${c.slug}`,
          image: c.image,
          cover: c.cover,
          count: c._count?.products ?? 0,
          children: data.filter((k: any) => k.parentId === c.id).map((k: any) => ({ name: k.name, href: `/category/${k.slug}` })),
        }))
    )
    .catch(() => []);
  return navCategoriesPromise;
}


export function Header() {
  const { format: fmt } = useMoney();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [categories, setCategories] = useState<NavCategory[]>(FALLBACK_CATEGORIES);
  const [moreOpen, setMoreOpen] = useState(false);
  // Mega menu stays open while the pointer moves from the trigger into the panel
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openMega = () => { if (closeTimer.current) clearTimeout(closeTimer.current); setMoreOpen(true); };
  const closeMegaSoon = () => { closeTimer.current = setTimeout(() => setMoreOpen(false), 150); };
  useEffect(() => {
    loadNavCategories().then((list) => { if (list.length) setCategories(list); });
  }, []);
  const navLinks = categories.slice(0, MAX_NAV_LINKS);
  const moreLinks = categories.slice(MAX_NAV_LINKS);

  const shippingOffer = useShippingOffer();
  const { items, openCart } = useCart();
  const { settings } = useSettings();
  const shopType = useShopType();
  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => { setMounted(true); }, []);

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSuggestionsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearchInput = (value: string) => {
    setSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.length < 2) { setSuggestions([]); setSuggestionsOpen(false); return; }
    setSuggestLoading(true);
    debounceRef.current = setTimeout(async () => {
      const res = await fetch(`/api/products/search?q=${encodeURIComponent(value)}&limit=5`);
      const data = await res.json();
      setSuggestions(data.products || []);
      setSuggestionsOpen(true);
      setSuggestLoading(false);
    }, 300);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSuggestionsOpen(false);
    setSearchOpen(false);
    router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  const handleSuggestionClick = (slug: string) => {
    setSuggestionsOpen(false);
    setSearchOpen(false);
    setSearchQuery('');
    router.push(`/products/${slug}`);
  };

  return (
    // -top-8: the 32px announcement bar scrolls away; only the 64px main row stays pinned
    <header className="sticky -top-8 z-50 bg-white/95 backdrop-blur-sm border-b border-cream-200">
      {/* Top bar */}
      <div className="bg-bg-secondary text-text-secondary text-xs leading-4 py-2 h-8">
        <div className="content-container flex items-center justify-center gap-3 tracking-wide">
          <span className="min-w-0 flex-1 truncate text-center">{mounted ? shippingOffer.long : ''}&nbsp;</span>
          <CurrencySwitcher className="shrink-0" />
        </div>
      </div>

      {/* Main header */}
      <div className="content-container">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            {settings.logo ? (
              <Image src={settings.logo} alt={settings.storeName || 'Logo'} width={120} height={40} priority
                className="h-10 w-auto object-contain" unoptimized />
            ) : (
              <>
                <div className="w-9 h-9 bg-gradient-to-br from-primary-400 to-primary-500 rounded-full flex items-center justify-center shadow-sm">
                  <span className="text-white text-base">{shopType.emoji}</span>
                </div>
                <span className="text-xl font-display font-bold text-text-primary">
                  {(settings.storeName || 'My Store').split(' ')[0]}
                  <span className="text-primary-500 ml-0.5">{(settings.storeName || '').split(' ').slice(1).join(' ')}</span>
                </span>
              </>
            )}
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8" aria-label="Categories">
            {navLinks.map(cat => (
              <Link key={cat.href} href={cat.href}
                className="text-text-secondary hover:text-primary-500 transition-colors duration-200 text-sm font-medium">
                {cat.name}
              </Link>
            ))}
            <button
              type="button"
              onMouseEnter={openMega}
              onMouseLeave={closeMegaSoon}
              onClick={() => setMoreOpen((o) => !o)}
              aria-expanded={moreOpen}
              aria-controls="mega-menu"
              className="flex items-center gap-1 text-text-secondary hover:text-primary-500 transition-colors duration-200 text-sm font-medium"
            >
              {moreLinks.length > 0 ? 'More' : 'Shop all'} <ChevronDown className={`w-4 h-4 transition-transform ${moreOpen ? 'rotate-180' : ''}`} />
            </button>
          </nav>

          {/* Icons */}
          <div className="flex items-center gap-1">
            <button onClick={() => { setSearchOpen(!searchOpen); setSearchQuery(''); setSuggestionsOpen(false); }}
              aria-label="Search"
              className="p-2.5 text-text-secondary hover:text-primary-500 hover:bg-cream-100 rounded-full transition-all duration-200">
              <Search className="w-5 h-5" />
            </button>
            <Link href="/account/wishlist" aria-label="Wishlist"
              className="p-2.5 text-text-secondary hover:text-primary-500 hover:bg-cream-100 rounded-full transition-all duration-200 hidden sm:block">
              <Heart className="w-5 h-5" />
            </Link>
            <button type="button" onClick={openCart} aria-label={`Cart${cartCount ? `, ${cartCount} items` : ''}`} className="relative p-2.5 text-text-secondary hover:text-primary-500 hover:bg-cream-100 rounded-full transition-all duration-200">
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute top-1 right-1 bg-primary-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-medium">
                  {cartCount}
                </span>
              )}
            </button>
            <Link href="/account" aria-label="My account"
              className="p-2.5 text-text-secondary hover:text-primary-500 hover:bg-cream-100 rounded-full transition-all duration-200 hidden sm:block">
              <User className="w-5 h-5" />
            </Link>
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'} aria-expanded={mobileMenuOpen}
              className="p-2.5 text-text-secondary hover:text-primary-500 hover:bg-cream-100 rounded-full transition-all duration-200 md:hidden">
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Search Bar with autocomplete */}
        {searchOpen && (
          <div className="py-3 border-t border-cream-200" ref={searchRef}>
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#767676]" />
              <input
                type="search"
                value={searchQuery}
                onChange={e => handleSearchInput(e.target.value)}
                placeholder="Search for products, categories..."
                className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-cream-100 border-0 focus:bg-white focus:ring-2 focus:ring-primary-200 outline-none text-sm transition-all duration-200"
                autoFocus
              />

              {/* Suggestions dropdown */}
              {suggestionsOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-2xl shadow-xl border border-[#EEEEEE] overflow-hidden z-50">
                  {suggestLoading ? (
                    <div className="px-4 py-3 text-sm text-[#767676]">Searching...</div>
                  ) : suggestions.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-[#767676]">No results found</div>
                  ) : (
                    <>
                      {suggestions.map(p => (
                        <button key={p.id} type="button" onClick={() => handleSuggestionClick(p.slug)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#F7F7F5] transition-colors text-left">
                          <div className="w-10 h-10 rounded-lg bg-[#F8F6F2] overflow-hidden flex-shrink-0">
                            {p.images?.[0]?.url
                              ? <img src={p.images[0].url} alt={p.name} className="w-full h-full object-cover" />
                              : <div className="w-full h-full flex items-center justify-center text-lg">{<ShopEmoji />}</div>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[#333333] truncate">{p.name}</p>
                            <p className="text-xs text-[#767676]">{p.category?.name}</p>
                          </div>
                          <span className="text-sm font-semibold text-[#333333] flex-shrink-0">{fmt(Number(p.price))}</span>
                        </button>
                      ))}
                      <button type="submit"
                        className="w-full px-4 py-2.5 text-sm text-[#7FAF8E] font-medium hover:bg-[#F7F7F5] border-t border-[#EEEEEE] text-center">
                        See all results for &quot;{searchQuery}&quot; →
                      </button>
                    </>
                  )}
                </div>
              )}
            </form>
          </div>
        )}
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-cream-200">
          {/* Mobile search */}
          <div className="px-4 pt-3 pb-2">
            <form onSubmit={handleSearchSubmit}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#767676]" />
                <input type="search" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search products..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F7F7F5] border border-[#EEEEEE] text-sm outline-none" />
              </div>
            </form>
          </div>
          <nav className="content-container py-2 space-y-1">
            {categories.map(cat => (
              <Link key={cat.href} href={cat.href}
                className="block py-2.5 px-3 text-text-secondary hover:text-primary-500 hover:bg-cream-100 rounded-lg transition-all duration-200"
                onClick={() => setMobileMenuOpen(false)}>
                {cat.name}
              </Link>
            ))}
            <Link href="/products"
              className="block py-2.5 px-3 font-semibold text-gray-900 hover:bg-cream-100 rounded-lg"
              onClick={() => setMobileMenuOpen(false)}>
              All products
            </Link>
            <div className="pt-2 mt-2 border-t border-cream-200">
              <Link href="/account" className="block py-2.5 px-3 text-text-secondary hover:text-primary-500 hover:bg-cream-100 rounded-lg" onClick={() => setMobileMenuOpen(false)}>My Account</Link>
              <Link href="/account/wishlist" className="block py-2.5 px-3 text-text-secondary hover:text-primary-500 hover:bg-cream-100 rounded-lg" onClick={() => setMobileMenuOpen(false)}>Wishlist</Link>
            </div>
          </nav>
        </div>
      )}
      {/* Mega menu: every category with its picture and sub-categories */}
      {moreOpen && (
        <div id="mega-menu" onMouseEnter={openMega} onMouseLeave={closeMegaSoon}
          className="absolute inset-x-0 top-full hidden border-b border-cream-200 bg-white shadow-xl md:block">
          <div className="content-container grid grid-cols-4 gap-x-6 gap-y-5 py-6 lg:grid-cols-6">
            {categories.map((cat) => (
              <div key={cat.href} className="min-w-0">
                <Link href={cat.href} onClick={() => setMoreOpen(false)} className="group block">
                  <div className="aspect-[4/3] overflow-hidden rounded-xl bg-bg-secondary">
                    <FallbackImage sources={categoryPictures(cat.image, cat.cover)} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      fallback={<div className="flex h-full items-center justify-center text-3xl">{<ShopEmoji />}</div>} />
                  </div>
                  <p className="mt-2 truncate text-sm font-semibold text-text-primary group-hover:text-primary-500">{cat.name}</p>
                  {cat.count ? <p className="text-xs text-text-muted">{cat.count} product{cat.count === 1 ? '' : 's'}</p> : null}
                </Link>
                {cat.children && cat.children.length > 0 && (
                  <ul className="mt-1.5 space-y-1">
                    {cat.children.slice(0, 5).map((k) => (
                      <li key={k.href}><Link href={k.href} onClick={() => setMoreOpen(false)} className="text-xs text-text-secondary hover:text-primary-500">{k.name}</Link></li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
          <div className="content-container flex justify-end pb-5">
            <Link href="/products" onClick={() => setMoreOpen(false)} className="text-sm font-semibold text-primary-500 hover:underline">Browse all products →</Link>
          </div>
        </div>
      )}
    </header>
  );
}
