'use client';

// ⌘K / Ctrl+K search across pages, orders, products and customers, plus "G then key"
// navigation shortcuts (as in the Medusa dashboard). "?" lists the shortcuts.

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CornerDownLeft, FileText, Loader2, Package, Search, ShoppingCart, User } from 'lucide-react';
import { cx, Heading, inr, Kbd } from '@/components/admin/ui';
import type { NavItem } from './admin-layout';

const typing = (el: EventTarget | null) => {
  const t = el as HTMLElement | null;
  return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
};

export function useAdminShortcuts({ items, onPalette, onHelp, onLogout }: { items: NavItem[]; onPalette: () => void; onHelp: () => void; onLogout: () => void }) {
  const router = useRouter();
  const seq = useRef<{ keys: string; at: number }>({ keys: '', at: 0 });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onPalette();
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey || typing(e.target)) return;
      if (e.key === '?') { onHelp(); return; }
      const now = Date.now();
      const keys = (now - seq.current.at < 1000 ? seq.current.keys : '') + e.key.toLowerCase();
      seq.current = { keys: keys.slice(-3), at: now };
      if (keys.endsWith('bye')) { onLogout(); return; }
      if (keys.length >= 2 && keys[keys.length - 2] === 'g') {
        const item = items.find((i) => i.key === keys[keys.length - 1]);
        if (item) {
          seq.current = { keys: '', at: 0 };
          router.push(item.href);
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [items, onPalette, onHelp, onLogout, router]);
}

interface Hit {
  type: 'page' | 'order' | 'product' | 'customer';
  label: string;
  sub?: string;
  meta?: string; // right-hand detail, e.g. status
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
  image?: string;
  shortcut?: string;
}

const GROUPS: { type: Hit['type']; title: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { type: 'page', title: 'Pages', icon: FileText },
  { type: 'order', title: 'Orders', icon: ShoppingCart },
  { type: 'product', title: 'Products', icon: Package },
  { type: 'customer', title: 'Customers', icon: User },
];

const humanStatus = (s?: string) => (s ? s.toLowerCase().replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()) : undefined);

export function CommandPalette({ open, onClose, items }: { open: boolean; onClose: () => void; items: NavItem[] }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [found, setFound] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  const [brokenImages, setBrokenImages] = useState<Set<string>>(new Set());
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setQ('');
    setFound([]);
    setActive(0);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  const term = q.trim().toLowerCase();
  const pages: Hit[] = items
    .filter((i) => !term || i.label.toLowerCase().includes(term))
    .slice(0, term ? 6 : items.length)
    .map((i) => ({ type: 'page', label: i.label, href: i.href, icon: i.icon, shortcut: i.key }));

  useEffect(() => {
    if (!open) return;
    setActive(0);
    if (term.length < 2) { setFound([]); setLoading(false); return; }
    setLoading(true);
    const controller = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/admin/search?q=${encodeURIComponent(term)}`, { signal: controller.signal })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (!d) return;
          setFound([
            ...(d.orders || []).map((o: any) => ({ type: 'order', label: `#${o.orderNumber}`, sub: `${o.shippingName} · ${inr(o.total)}`, meta: humanStatus(o.status), href: `/admin/orders/${o.id}` })),
            ...(d.products || []).map((p: any) => ({ type: 'product', label: p.name, sub: p.sku, meta: humanStatus(p.status), image: p.images?.[0]?.url, href: `/admin/products/${p.id}` })),
            ...(d.customers || []).map((c: any) => ({ type: 'customer', label: c.name || c.email, sub: c.name ? c.email : undefined, href: `/admin/customers/${c.id}` })),
          ]);
          setLoading(false);
        })
        .catch(() => {});
    }, 180);
    return () => { clearTimeout(t); controller.abort(); };
  }, [term, open]);

  // Records first when searching, so the thing you typed for is at the top.
  const hits = term.length >= 2 ? [...found, ...pages] : pages;

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  if (!open) return null;

  const go = (hit?: Hit) => {
    if (!hit) return;
    onClose();
    router.push(hit.href);
  };

  let index = -1;
  const order: Hit['type'][] = term.length >= 2 ? ['order', 'product', 'customer', 'page'] : ['page'];

  return (
    <>
      <div className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label="Search" className="fixed left-1/2 top-[10vh] z-[81] flex max-h-[75vh] w-[calc(100%-32px)] max-w-[620px] -translate-x-1/2 flex-col overflow-hidden rounded-xl bg-ui-base text-ui-fg shadow-ui-modal ring-1 ring-ui-border">
        <div className="flex items-center gap-3 border-b border-ui-border px-4">
          {loading ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-ui-muted" /> : <Search className="h-4 w-4 shrink-0 text-ui-muted" />}
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose();
              else if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, hits.length - 1)); }
              else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
              else if (e.key === 'Enter') { e.preventDefault(); go(hits[active]); }
            }}
            placeholder="Search orders, products, customers or pages"
            aria-label="Search"
            role="combobox"
            aria-expanded="true"
            aria-controls="admin-search-results"
            // Inline so the store's global keyboard-focus outline doesn't draw a box inside the bar.
            style={{ outline: 'none', boxShadow: 'none' }}
            className="h-14 min-w-0 flex-1 border-0 bg-transparent text-[15px] text-ui-fg placeholder:text-ui-muted"
          />
          {q && (
            <button type="button" onClick={() => { setQ(''); inputRef.current?.focus(); }} className="rounded px-1.5 text-[12px] text-ui-subtle hover:text-ui-fg">Clear</button>
          )}
          <button type="button" onClick={onClose} aria-label="Close search"><Kbd>Esc</Kbd></button>
        </div>

        <div ref={listRef} id="admin-search-results" role="listbox" className="admin-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
          {hits.length === 0 && !loading && (
            <div className="px-3 py-10 text-center">
              <p className="font-medium text-ui-fg">No results for “{q.trim()}”</p>
              <p className="mt-1 text-ui-subtle">Try an order number, product name, SKU, email or phone.</p>
            </div>
          )}
          {order.map((type) => {
            const group = hits.filter((h) => h.type === type);
            if (group.length === 0) return null;
            const g = GROUPS.find((x) => x.type === type)!;
            return (
              <div key={type} className="mb-1 last:mb-0">
                <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-ui-muted">{term.length >= 2 || type !== 'page' ? g.title : 'Go to'}</p>
                {group.map((h) => {
                  index += 1;
                  const i = index;
                  const Icon = h.icon || g.icon;
                  const on = i === active;
                  return (
                    <button
                      key={`${h.type}-${h.href}`}
                      type="button"
                      role="option"
                      aria-selected={on}
                      data-index={i}
                      onMouseMove={() => setActive(i)}
                      onClick={() => go(h)}
                      className={cx('flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors', on ? 'bg-ui-hover' : 'hover:bg-ui-hover/60')}
                    >
                      {h.image && !brokenImages.has(h.image) ? (
                        <img src={h.image} alt="" onError={() => setBrokenImages((b) => new Set(b).add(h.image!))} className="h-8 w-8 shrink-0 rounded-md object-cover ring-1 ring-ui-border" />
                      ) : (
                        <span className={cx('flex h-8 w-8 shrink-0 items-center justify-center rounded-md ring-1 ring-ui-border', on ? 'bg-ui-base text-ui-fg' : 'text-ui-subtle')}>
                          <Icon className="h-4 w-4" />
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-ui-fg">{h.label}</span>
                        {h.sub && <span className="block truncate text-[12px] text-ui-subtle">{h.sub}</span>}
                      </span>
                      {h.meta && <span className="shrink-0 rounded-md bg-ui-hover px-1.5 py-0.5 text-[11px] text-ui-subtle">{h.meta}</span>}
                      {h.shortcut && !on && <span className="hidden shrink-0 gap-1 sm:flex"><Kbd>G</Kbd><Kbd>{h.shortcut.toUpperCase()}</Kbd></span>}
                      {on && <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-ui-muted" />}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-4 border-t border-ui-border px-4 py-2 text-[12px] text-ui-subtle">
          <span className="flex items-center gap-1"><Kbd>↑</Kbd><Kbd>↓</Kbd> Move</span>
          <span className="flex items-center gap-1"><Kbd>↵</Kbd> Open</span>
          <span className="flex items-center gap-1"><Kbd>Esc</Kbd> Close</span>
          {term.length < 2 && <span className="ml-auto hidden sm:inline">Type 2+ letters to search records</span>}
        </div>
      </div>
    </>
  );
}

export function ShortcutsHelp({ open, onClose, items }: { open: boolean; onClose: () => void; items: NavItem[] }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  const rows: [React.ReactNode, string][] = [
    [<><Kbd>⌘</Kbd><Kbd>K</Kbd></>, 'Search'],
    ...items.filter((i) => i.key).map((i) => [<><Kbd>G</Kbd><Kbd>{i.key!.toUpperCase()}</Kbd></>, `Go to ${i.label}`] as [React.ReactNode, string]),
    [<><Kbd>B</Kbd><Kbd>Y</Kbd><Kbd>E</Kbd></>, 'Sign out'],
    [<Kbd key="q">?</Kbd>, 'Show shortcuts'],
  ];
  return (
    <>
      <div className="fixed inset-0 z-[80] bg-black/30" onClick={onClose} />
      <div role="dialog" aria-modal="true" className="fixed left-1/2 top-1/2 z-[81] w-[calc(100%-32px)] max-w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-lg bg-ui-base p-6 text-ui-fg shadow-ui-modal">
        <Heading level={2}>Keyboard shortcuts</Heading>
        <ul className="mt-4 space-y-2">
          {rows.map(([keys, label]) => (
            <li key={label} className="flex items-center justify-between">
              <span className="text-ui-subtle">{label}</span>
              <span className="flex gap-1">{keys}</span>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
