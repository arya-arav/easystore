'use client';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Check, Download, Trash2 } from 'lucide-react';
import { Button, Container, SectionHeader, Skeleton, cx } from '@/components/admin/ui';
import { useConfirm } from '@/components/admin/overlays';
import { Toggle } from '@/components/admin/banner-form';
import { SHOP_TYPES, SHOP_TYPE_IDS, type ShopTypeId } from '@/lib/shop-types';

interface State { shopType: ShopTypeId; demo: { products: number; categories: number; reviews: number } }

export default function StoreTypePage() {
  const confirm = useConfirm();
  const [state, setState] = useState<State | null>(null);
  const [picked, setPicked] = useState<ShopTypeId | null>(null);
  const [opts, setOpts] = useState({ applyLook: true, addCategories: true, resetWording: true });
  const [saving, setSaving] = useState(false);
  const [demoBusy, setDemoBusy] = useState<'install' | 'remove' | null>(null);

  const load = useCallback(() => {
    fetch('/api/admin/store-type').then((r) => r.json()).then((d) => { setState(d); setPicked(d.shopType); }).catch(() => toast.error('Could not load'));
  }, []);
  useEffect(load, [load]);

  const changed = state && picked && picked !== state.shopType;
  const current = state ? SHOP_TYPES[state.shopType] : null;
  const next = picked ? SHOP_TYPES[picked] : null;

  const save = async () => {
    if (!picked || !next) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/store-type', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ shopType: picked, ...opts }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(d.error || 'Could not save'); return; }
      toast.success(`Your store is now a ${next.name.toLowerCase()} store`);
      window.dispatchEvent(new Event('settings-updated'));
      load();
    } finally {
      setSaving(false);
    }
  };

  const installDemo = async () => {
    if (!current) return;
    if (!(await confirm({ title: `Add ${current.name.toLowerCase()} demo data?`, description: 'Adds sample products with pictures, any missing categories and a few reviews. You can remove them all with one click.', confirmText: 'Add demo data' }))) return;
    setDemoBusy('install');
    try {
      const res = await fetch('/api/admin/store-type', { method: 'POST' });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(d.error || 'Could not add demo data'); return; }
      toast.success(`Added ${d.products} demo products and ${d.reviews} reviews`);
      setState((s) => s && { ...s, demo: d.demo });
    } finally {
      setDemoBusy(null);
    }
  };

  const removeDemo = async () => {
    if (!(await confirm({ title: 'Remove all demo data?', description: 'Deletes demo products, demo reviews and demo categories that have nothing else in them. Your own products and orders are not touched.', confirmText: 'Remove demo data', danger: true }))) return;
    setDemoBusy('remove');
    try {
      const res = await fetch('/api/admin/store-type', { method: 'DELETE' });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(d.error || 'Could not remove demo data'); return; }
      toast.success(`Removed ${d.products} products, ${d.reviews} reviews and ${d.categories} categories${d.archived ? ` (${d.archived} ordered products were hidden instead)` : ''}`);
      setState((s) => s && { ...s, demo: d.demo });
    } finally {
      setDemoBusy(null);
    }
  };

  if (!state || !current) {
    return <div className="flex flex-col gap-3"><Skeleton className="h-8 w-48" /><Skeleton className="h-80" /><Skeleton className="h-40" /></div>;
  }

  const hasDemo = state.demo.products + state.demo.reviews + state.demo.categories > 0;

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h1 className="text-[18px] font-medium text-ui-fg">Store type</h1>
        <p className="text-ui-subtle">What your shop sells. It sets the categories, product filters, homepage wording and demo data.</p>
      </div>

      <Container>
        <SectionHeader
          title={<span className="flex items-center gap-2"><span className="text-xl">{current.emoji}</span> {current.name}</span>}
          subtitle="Your current store type. Pick another to switch."
          actions={changed ? <Button variant="primary" loading={saving} onClick={save}>Switch to {next?.name}</Button> : undefined}
        />
        <div className="grid grid-cols-2 gap-2 px-6 py-4 sm:grid-cols-3 lg:grid-cols-5">
          {SHOP_TYPE_IDS.map((id) => {
            const t = SHOP_TYPES[id];
            const on = picked === id;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={on}
                onClick={() => setPicked(id)}
                className={cx('relative flex flex-col items-start gap-1 rounded-md bg-ui-base p-3 text-left transition', on ? 'ring-2 ring-primary-500' : 'shadow-ui-field hover:bg-ui-hover')}
              >
                {id === state.shopType && <span className="absolute right-2 top-2 rounded bg-ui-hover px-1.5 text-[11px] text-ui-subtle">Current</span>}
                <span className="text-2xl">{t.emoji}</span>
                <span className="font-medium text-ui-fg">{t.name}</span>
                <span className="text-[12px] leading-4 text-ui-subtle">{t.description}</span>
              </button>
            );
          })}
        </div>
        {changed && next && (
          <div className="flex flex-col gap-3 bg-ui-bg/60 px-6 py-4">
            <p className="font-medium text-ui-fg">When switching to {next.name.toLowerCase()}:</p>
            <Toggle checked={opts.resetWording} onChange={(v) => setOpts({ ...opts, resetWording: v })} label="Use its homepage wording" hint={`Hero text, footer text and benefits change to e.g. “${next.copy.heroTitle}”. Turn off to keep your own wording.`} />
            <Toggle checked={opts.addCategories} onChange={(v) => setOpts({ ...opts, addCategories: v })} label="Add its categories" hint={`${next.categories.map((c) => c.name).join(', ')}. Existing categories are kept.`} />
            <Toggle checked={opts.applyLook} onChange={(v) => setOpts({ ...opts, applyLook: v })} label="Use its colours and font" hint="You can fine-tune them in Store settings → Design." />
            <p className="text-[12px] text-ui-subtle">Products, orders and customers are never changed.</p>
          </div>
        )}
      </Container>

      <Container>
        <SectionHeader
          title="Demo data"
          subtitle="Sample products with pictures and reviews, to see how the store looks before adding your own."
        />
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex flex-wrap gap-6">
            {[['Products', state.demo.products], ['Categories', state.demo.categories], ['Reviews', state.demo.reviews]].map(([label, n]) => (
              <div key={label as string}>
                <p className="text-[20px] font-semibold text-ui-fg">{n}</p>
                <p className="text-[12px] text-ui-subtle">Demo {String(label).toLowerCase()}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={installDemo} loading={demoBusy === 'install'} disabled={!!demoBusy}>
              <Download className="h-3.5 w-3.5" /> {hasDemo ? 'Add more demo data' : `Install ${current.name.toLowerCase()} demo`}
            </Button>
            <Button variant="danger" onClick={removeDemo} loading={demoBusy === 'remove'} disabled={!!demoBusy || !hasDemo}>
              <Trash2 className="h-3.5 w-3.5" /> Remove all demo data
            </Button>
          </div>
        </div>
        {!hasDemo && (
          <p className="flex items-center gap-1.5 px-6 pb-4 text-[12px] text-ui-subtle"><Check className="h-3.5 w-3.5 text-emerald-600" /> No demo data in your store.</p>
        )}
      </Container>
    </div>
  );
}
