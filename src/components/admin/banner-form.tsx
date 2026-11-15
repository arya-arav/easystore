'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { AlignCenter, AlignLeft, AlignRight, ImagePlus, Loader2, Monitor, Smartphone, Trash2, X } from 'lucide-react';
import { Badge, Button, Container, Field, Input, LinkButton, SectionHeader, Select, cx } from '@/components/admin/ui';
import { useConfirm } from '@/components/admin/overlays';
import { BannerView } from '@/components/home/banner-slider';
import {
  BANNER_POSITIONS, DEFAULT_DESIGN, DEFAULT_PLACEMENTS, PLACEMENTS, bannerStatus,
  type BannerDesign, type BannerPosition, type PlacementSettings,
} from '@/lib/banners';

export interface BannerFormValue {
  title: string;
  subtitle: string;
  image: string;
  link: string;
  position: BannerPosition;
  isActive: boolean;
  sortOrder: number;
  showFrom: string; // yyyy-mm-ddThh:mm (local) or ''
  showTo: string;
  design: BannerDesign;
}

export const EMPTY_BANNER: BannerFormValue = {
  title: '', subtitle: '', image: '', link: '', position: 'HOMEPAGE_HERO', isActive: true, sortOrder: 0, showFrom: '', showTo: '', design: DEFAULT_DESIGN,
};

/** Date from the API → value for <input type="datetime-local">. */
export const toLocalInput = (d: string | null | undefined) => {
  if (!d) return '';
  const date = new Date(d);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

const STATUS_TONE = { live: 'green', scheduled: 'blue', ended: 'grey', hidden: 'grey' } as const;
const STATUS_LABEL = { live: 'Live', scheduled: 'Scheduled', ended: 'Ended', hidden: 'Hidden' };

/* ── Small controls ──────────────────────────────────────────── */

export function Segmented<T extends string | number>({ value, onChange, options, label }: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: React.ReactNode; title?: string }[];
  label?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap gap-0.5 rounded-md bg-ui-hover p-0.5">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          title={o.title}
          onClick={() => onChange(o.value)}
          className={cx(
            'inline-flex h-7 items-center gap-1.5 rounded px-2.5 text-[13px] font-medium transition-colors',
            value === o.value ? 'bg-ui-base text-ui-fg shadow-ui-field' : 'text-ui-subtle hover:text-ui-fg'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4">
      <span>
        <span className="block font-medium text-ui-fg">{label}</span>
        {hint && <span className="block text-[12px] text-ui-subtle">{hint}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cx('relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors', checked ? 'bg-primary-500' : 'bg-ui-border')}
      >
        <span className={cx('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all', checked ? 'left-[18px]' : 'left-0.5')} />
      </button>
    </label>
  );
}

function ImagePicker({ label, hint, value, onChange, optional }: { label: string; hint: string; value: string; onChange: (url: string) => void; optional?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [value]);
  const upload = async (file?: File) => {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { toast.error('Please use a picture under 8 MB'); return; }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.url) throw new Error(d.error || 'Upload failed');
      onChange(d.url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-medium text-ui-fg">{label}{optional && <span className="ml-1 font-normal text-ui-subtle">(optional)</span>}</span>
      {value && broken ? (
        <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed border-red-300 bg-red-500/5 px-4 py-7 text-center hover:bg-red-500/10">
          {busy ? <Loader2 className="h-5 w-5 animate-spin text-ui-subtle" /> : <ImagePlus className="h-5 w-5 text-red-500" />}
          <span className="font-medium text-ui-fg">{busy ? 'Uploading…' : 'This picture can’t be loaded'}</span>
          <span className="max-w-full truncate text-[12px] text-ui-subtle">The link no longer works. Upload a new picture to replace it.</span>
          <input type="file" accept="image/*" className="hidden" disabled={busy} onChange={(e) => upload(e.target.files?.[0])} />
        </label>
      ) : value ? (
        <div className="group relative overflow-hidden rounded-md bg-ui-hover shadow-ui-field">
          <img src={value} alt="" className="max-h-44 w-full object-contain" onError={() => setBroken(true)} ref={(el) => { if (el && el.complete && el.naturalWidth === 0) setBroken(true); }} />
          <div className="absolute right-2 top-2 flex gap-1.5">
            <label className="inline-flex h-7 cursor-pointer items-center rounded-md bg-white/95 px-2.5 text-[12px] font-medium text-gray-800 shadow">
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Replace'}
              <input type="file" accept="image/*" className="hidden" disabled={busy} onChange={(e) => upload(e.target.files?.[0])} />
            </label>
            <button type="button" onClick={() => onChange('')} aria-label={`Remove ${label}`} className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-white/95 text-gray-700 shadow hover:text-red-600">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <label
          className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed border-ui-border px-4 py-7 text-center hover:bg-ui-hover"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); upload(e.dataTransfer.files?.[0]); }}
        >
          {busy ? <Loader2 className="h-5 w-5 animate-spin text-ui-subtle" /> : <ImagePlus className="h-5 w-5 text-ui-subtle" />}
          <span className="font-medium text-ui-fg">{busy ? 'Uploading…' : 'Upload or drop a picture'}</span>
          <span className="text-[12px] text-ui-subtle">{hint}</span>
          <input type="file" accept="image/*" className="hidden" disabled={busy} onChange={(e) => upload(e.target.files?.[0])} />
        </label>
      )}
    </div>
  );
}

/* ── Preview ─────────────────────────────────────────────────── */

export function BannerPreview({ value, placement, extra = [] }: { value: BannerFormValue; placement: PlacementSettings; extra?: BannerFormValue[] }) {
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const banners = [value, ...extra].map((b, i) => ({ id: `p${i}`, title: b.title, subtitle: b.subtitle, image: b.image, link: null, design: b.design }));
  const ready = banners[0].image;

  return (
    <Container>
      <SectionHeader
        title="Preview"
        subtitle={`${PLACEMENTS[value.position].name} · ${placement.width === 'full' ? 'full width' : 'page width'}`}
        actions={
          <Segmented<'desktop' | 'mobile'> label="Preview size" value={device} onChange={setDevice} options={[
            { value: 'desktop', label: <><Monitor className="h-3.5 w-3.5" /> Desktop</> },
            { value: 'mobile', label: <><Smartphone className="h-3.5 w-3.5" /> Phone</> },
          ]} />
        }
      />
      <div className="bg-[repeating-conic-gradient(#f4f4f5_0%_25%,#fff_0%_50%)] bg-[length:16px_16px] p-4">
        {!ready ? (
          <div className="flex h-40 items-center justify-center rounded-md border border-dashed border-ui-border bg-ui-base text-ui-subtle">Upload a picture to see the banner</div>
        ) : (
          <div className={cx('mx-auto overflow-hidden bg-white shadow-sm', device === 'mobile' ? 'w-[375px] max-w-full rounded-[28px] border-[6px] border-gray-900 py-3' : 'w-full rounded-md py-1')}>
            <div className={device === 'mobile' ? 'px-3' : 'px-0'}>
              {/* Rendered with the real storefront component, so this is exactly what shoppers see. */}
              <BannerView banners={banners} placement={placement} device={device} nested />
            </div>
          </div>
        )}
      </div>
    </Container>
  );
}

/* ── Form ────────────────────────────────────────────────────── */

export function BannerForm({ id, initial, placements }: { id?: string; initial: BannerFormValue; placements?: Record<BannerPosition, PlacementSettings> }) {
  const router = useRouter();
  const confirm = useConfirm();
  const [v, setV] = useState<BannerFormValue>(initial);
  const [saving, setSaving] = useState(false);
  const [layouts, setLayouts] = useState(placements);
  const [categories, setCategories] = useState<{ name: string; slug: string; parentId: string | null }[]>([]);

  useEffect(() => {
    if (!layouts) fetch('/api/admin/banners').then((r) => r.json()).then((d) => setLayouts(d.placements)).catch(() => {});
    fetch('/api/admin/categories').then((r) => r.json()).then((d) => setCategories(d.categories || [])).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = <K extends keyof BannerFormValue>(k: K, val: BannerFormValue[K]) => setV((p) => ({ ...p, [k]: val }));
  const setD = <K extends keyof BannerDesign>(k: K, val: BannerDesign[K]) => setV((p) => ({ ...p, design: { ...p.design, [k]: val } }));
  const placement = layouts?.[v.position] || DEFAULT_PLACEMENTS[v.position];
  const status = bannerStatus({ isActive: v.isActive, showFrom: v.showFrom || null, showTo: v.showTo || null });
  const dirty = useMemo(() => JSON.stringify(v) !== JSON.stringify(initial), [v, initial]);
  const targeted = v.position === 'CATEGORY_TOP' || v.position === 'PRODUCT_PAGE';

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(id ? `/api/admin/banners/${id}` : '/api/admin/banners', {
        method: id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...v,
          showFrom: v.showFrom ? new Date(v.showFrom).toISOString() : null,
          showTo: v.showTo ? new Date(v.showTo).toISOString() : null,
          design: { ...v.design, categories: targeted ? v.design.categories : [] },
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(d.error || 'Could not save the banner'); return; }
      toast.success(id ? 'Banner saved' : 'Banner created');
      router.push('/admin/banners');
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!id || !(await confirm({ title: 'Delete this banner?', description: 'It disappears from the store straight away.', confirmText: 'Delete', danger: true }))) return;
    const res = await fetch(`/api/admin/banners/${id}`, { method: 'DELETE' });
    if (!res.ok) { toast.error('Could not delete'); return; }
    toast.success('Banner deleted');
    router.push('/admin/banners');
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <h1 className="truncate text-[18px] font-medium text-ui-fg">{id ? v.title || 'Edit banner' : 'New banner'}</h1>
          <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>
        </div>
        <div className="flex gap-2">
          {id && <Button variant="transparent" onClick={remove}><Trash2 className="h-3.5 w-3.5" /> Delete</Button>}
          <LinkButton href="/admin/banners">Cancel</LinkButton>
          <Button variant="primary" loading={saving} disabled={!dirty && !!id} onClick={save}>{id ? 'Save' : 'Create banner'}</Button>
        </div>
      </div>

      <BannerPreview value={v} placement={placement} />

      <div className="flex flex-col gap-3 xl:grid xl:grid-cols-[minmax(0,1fr)_400px] xl:items-start xl:gap-x-4">
        {/* Main */}
        <div className="flex min-w-0 flex-col gap-3">
          <Container>
            <SectionHeader title="Content" subtitle="The words on the banner and where it takes shoppers." />
            <div className="grid gap-4 px-6 py-4 sm:grid-cols-2">
              <Field label="Title" hint="Also used as the picture’s description for screen readers." className="sm:col-span-2">
                <Input value={v.title} maxLength={120} onChange={(e) => set('title', e.target.value)} placeholder="Summer sale: up to 40% off" />
              </Field>
              <Field label="Subtitle" className="sm:col-span-2">
                <Input value={v.subtitle} maxLength={200} onChange={(e) => set('subtitle', e.target.value)} placeholder="Soft toys, clothing and more" />
              </Field>
              <Field label="Small label" hint="Shown above the title, e.g. NEW or LIMITED TIME.">
                <Input value={v.design.badge} maxLength={40} onChange={(e) => setD('badge', e.target.value)} placeholder="New in" />
              </Field>
              <Field label="Button text" hint="Leave empty for no button. The whole banner is clickable either way.">
                <Input value={v.design.buttonText} maxLength={40} onChange={(e) => setD('buttonText', e.target.value)} placeholder="Shop now" />
              </Field>
              <Field label="Link" hint="A page on your store like /category/toys, or a full web address." className="sm:col-span-2">
                <Input value={v.link} onChange={(e) => set('link', e.target.value)} placeholder="/category/toys" />
              </Field>
              <div className="sm:col-span-2">
                <Toggle checked={v.design.newTab} onChange={(x) => setD('newTab', x)} label="Open link in a new tab" />
              </div>
            </div>
          </Container>

          <Container>
            <SectionHeader title="Pictures" subtitle={`Best size for ${PLACEMENTS[v.position].name.toLowerCase()}: ${PLACEMENTS[v.position].size}.`} />
            <div className="grid gap-4 px-6 py-4 sm:grid-cols-2">
              <ImagePicker label="Desktop picture" hint="JPG, PNG or WebP, up to 8 MB" value={v.image} onChange={(url) => set('image', url)} />
              <ImagePicker label="Phone picture" optional hint="A taller crop for phones. Uses the desktop picture if empty." value={v.design.mobileImage} onChange={(url) => setD('mobileImage', url)} />
            </div>
          </Container>

          <Container>
            <SectionHeader title="Text style" subtitle="How the words sit on the picture." />
            <div className="flex flex-col gap-4 px-6 py-4">
              <Toggle
                checked={v.design.showText}
                onChange={(x) => setD('showText', x)}
                label="Show text on the banner"
                hint="Turn off if your picture already has the words in it."
              />
              {v.design.showText && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <span className="font-medium text-ui-fg">Across</span>
                    <Segmented label="Text across" value={v.design.textX} onChange={(x) => setD('textX', x)} options={[
                      { value: 'left', label: <><AlignLeft className="h-3.5 w-3.5" /> Left</> },
                      { value: 'center', label: <><AlignCenter className="h-3.5 w-3.5" /> Centre</> },
                      { value: 'right', label: <><AlignRight className="h-3.5 w-3.5" /> Right</> },
                    ]} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="font-medium text-ui-fg">Up and down</span>
                    <Segmented label="Text up and down" value={v.design.textY} onChange={(x) => setD('textY', x)} options={[
                      { value: 'top', label: 'Top' }, { value: 'middle', label: 'Middle' }, { value: 'bottom', label: 'Bottom' },
                    ]} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="font-medium text-ui-fg">Text colour</span>
                    <Segmented label="Text colour" value={v.design.textTone} onChange={(x) => setD('textTone', x)} options={[
                      { value: 'light', label: <><span className="h-3 w-3 rounded-full bg-white ring-1 ring-gray-300" /> White</> },
                      { value: 'dark', label: <><span className="h-3 w-3 rounded-full bg-gray-900" /> Dark</> },
                    ]} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="font-medium text-ui-fg">Shade behind text</span>
                    <Segmented label="Shade behind text" value={v.design.overlay} onChange={(x) => setD('overlay', x)} options={[
                      { value: 'none', label: 'None' }, { value: 'soft', label: 'Soft' }, { value: 'strong', label: 'Strong' },
                    ]} />
                  </div>
                </div>
              )}
            </div>
          </Container>
        </div>

        {/* Side */}
        <div className="flex min-w-0 flex-col gap-3">
          <Container>
            <SectionHeader title="Where it shows" />
            <div className="flex flex-col gap-4 px-6 py-4">
              <Field label="Position" hint={PLACEMENTS[v.position].where}>
                <Select value={v.position} onChange={(e) => set('position', e.target.value as BannerPosition)}>
                  {BANNER_POSITIONS.map((p) => <option key={p} value={p}>{PLACEMENTS[p].name}</option>)}
                </Select>
              </Field>
              {targeted && (
                <div className="flex flex-col gap-1.5">
                  <span className="font-medium text-ui-fg">Only for these categories</span>
                  <span className="text-[12px] text-ui-subtle">
                    {v.position === 'CATEGORY_TOP' ? 'Shows on these category pages (and their sub-categories).' : 'Shows on products in these categories.'} Leave empty to show everywhere.
                  </span>
                  <div className="mt-1 flex max-h-48 flex-wrap gap-1.5 overflow-y-auto">
                    {categories.filter((c) => !c.parentId).map((c) => {
                      const on = v.design.categories.includes(c.slug);
                      return (
                        <button
                          key={c.slug}
                          type="button"
                          aria-pressed={on}
                          onClick={() => setD('categories', on ? v.design.categories.filter((s) => s !== c.slug) : [...v.design.categories, c.slug])}
                          className={cx('h-7 rounded-full px-3 text-[12px] font-medium ring-1 ring-inset transition-colors', on ? 'bg-ui-inverted text-ui-inverted-fg ring-transparent' : 'text-ui-subtle ring-ui-border hover:text-ui-fg')}
                        >
                          {c.name}
                        </button>
                      );
                    })}
                    {categories.length === 0 && <span className="text-ui-subtle">Loading categories…</span>}
                  </div>
                </div>
              )}
              <p className="rounded-md bg-ui-hover px-3 py-2 text-[12px] text-ui-subtle">
                Slider, fade, tiles and height are set per position on the <Link href="/admin/banners" className="font-medium text-ui-fg underline">Banners page</Link> (“Layout”).
              </p>
            </div>
          </Container>

          <Container>
            <SectionHeader title="Visibility" />
            <div className="flex flex-col gap-4 px-6 py-4">
              <Toggle checked={v.isActive} onChange={(x) => set('isActive', x)} label="Show on the store" hint="Turn off to hide it without deleting." />
              <Field label="Start showing" hint="Optional. Leave empty to start now.">
                <Input type="datetime-local" value={v.showFrom} onChange={(e) => set('showFrom', e.target.value)} />
              </Field>
              <Field label="Stop showing" hint="Optional. Great for sales that end on a date.">
                <Input type="datetime-local" value={v.showTo} onChange={(e) => set('showTo', e.target.value)} />
              </Field>
              {(v.showFrom || v.showTo) && (
                <Button size="small" variant="transparent" className="self-start" onClick={() => setV((p) => ({ ...p, showFrom: '', showTo: '' }))}>Clear dates</Button>
              )}
            </div>
          </Container>
        </div>
      </div>
    </div>
  );
}
