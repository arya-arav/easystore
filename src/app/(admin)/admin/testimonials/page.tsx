'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { ArrowDown, ArrowUp, ImagePlus, Loader2, Pencil, Plus, Star, Trash2 } from 'lucide-react';
import { Button, Container, EmptyState, Field, IconButton, Input, SectionHeader, Skeleton, Textarea, cx } from '@/components/admin/ui';
import { Drawer, useConfirm } from '@/components/admin/overlays';
import { Segmented, Toggle } from '@/components/admin/banner-form';
import { TestimonialsSection } from '@/components/home/testimonials';
import { useSettings, useShopType } from '@/lib/settings-context';
import {
  DEFAULT_TESTIMONIALS, TESTIMONIAL_LIMITS, TESTIMONIAL_STYLES,
  type TestimonialStyle, type TestimonialsDesign,
} from '@/lib/layout-settings';

interface Testimonial {
  id: string;
  name: string;
  location: string | null;
  avatar: string | null;
  rating: number;
  text: string;
  product: string | null;
  isActive: boolean;
  sortOrder: number;
}

type Form = { name: string; location: string; avatar: string; rating: number; text: string; product: string; isActive: boolean };
const EMPTY: Form = { name: '', location: '', avatar: '', rating: 5, text: '', product: '', isActive: true };
const EMOJIS = ['👩', '👨', '👩‍👧', '👨‍👦', '👩‍👦', '👨‍👧', '🧕', '👵', '👴', '🤱'];

function Avatar({ value, name, className = 'h-10 w-10 text-xl' }: { value: string | null; name: string; className?: string }) {
  const [broken, setBroken] = useState(false);
  const url = value?.startsWith('http') && !broken;
  return (
    <span className={cx('flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-ui-hover font-medium text-ui-subtle', className)}>
      {url ? <img src={value!} alt="" className="h-full w-full object-cover" onError={() => setBroken(true)} /> : value && !value.startsWith('http') ? value : (name || '?').charAt(0).toUpperCase()}
    </span>
  );
}

function Stars({ value, onChange, size = 'h-3.5 w-3.5' }: { value: number; onChange?: (n: number) => void; size?: string }) {
  return (
    <span className="flex">
      {[1, 2, 3, 4, 5].map((n) => {
        const star = <Star className={cx(size, n <= value ? 'fill-yellow-400 text-yellow-400' : 'text-ui-border')} />;
        return onChange ? (
          <button key={n} type="button" onClick={() => onChange(n)} aria-label={`${n} star${n > 1 ? 's' : ''}`} className="p-0.5">{star}</button>
        ) : <span key={n}>{star}</span>;
      })}
    </span>
  );
}

const STYLE_SKETCH: Record<TestimonialStyle, React.ReactNode> = {
  cards: <div className="grid grid-cols-3 gap-1">{[0, 1, 2].map((i) => <div key={i} className="h-7 rounded-sm bg-current opacity-70" />)}</div>,
  carousel: <div className="flex gap-1">{[0.7, 0.7, 0.3].map((o, i) => <div key={i} className="h-7 w-6 shrink-0 rounded-sm bg-current" style={{ opacity: o }} />)}</div>,
  spotlight: <div className="mx-auto flex w-14 flex-col items-center gap-1"><div className="h-1 w-12 rounded bg-current opacity-70" /><div className="h-1 w-10 rounded bg-current opacity-70" /><div className="mt-1 flex gap-0.5">{[0, 1, 2].map((i) => <div key={i} className="h-2 w-2 rounded-full bg-current opacity-50" />)}</div></div>,
  wall: <div className="grid grid-cols-3 items-start gap-1">{[8, 5, 7].map((h, i) => <div key={i} className="rounded-sm bg-current opacity-70" style={{ height: h * 4 }} />)}</div>,
  quotes: <div className="grid grid-cols-3 gap-1">{[0, 1, 2].map((i) => <div key={i} className="flex flex-col gap-0.5"><div className="text-[10px] leading-none opacity-70">“</div><div className="h-0.5 rounded bg-current opacity-60" /><div className="h-0.5 w-3/4 rounded bg-current opacity-60" /></div>)}</div>,
};

export default function TestimonialsPage() {
  const confirm = useConfirm();
  const { settings } = useSettings();
  const type = useShopType();
  const [items, setItems] = useState<Testimonial[] | null>(null);
  const [saved, setSaved] = useState<TestimonialsDesign | null>(null);
  const [design, setDesign] = useState<TestimonialsDesign>(DEFAULT_TESTIMONIALS);
  const [savingDesign, setSavingDesign] = useState(false);
  const [editing, setEditing] = useState<Testimonial | 'new' | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(() => {
    fetch('/api/admin/testimonials').then((r) => r.json()).then((d) => setItems(d.testimonials || [])).catch(() => setItems([]));
  }, []);
  useEffect(load, [load]);

  // Saved design comes from the store settings.
  useEffect(() => {
    if (saved || !settings.layout?.testimonials) return;
    setSaved(settings.layout.testimonials);
    setDesign(settings.layout.testimonials);
  }, [settings.layout, saved]);

  const dirty = useMemo(() => saved && JSON.stringify(saved) !== JSON.stringify(design), [saved, design]);
  const setD = <K extends keyof TestimonialsDesign>(k: K, v: TestimonialsDesign[K]) => setDesign((p) => ({ ...p, [k]: v }));
  const active = (items || []).filter((t) => t.isActive);

  const saveDesign = async () => {
    setSavingDesign(true);
    try {
      const res = await fetch('/api/admin/testimonials/design', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ design }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(d.error || 'Could not save'); return; }
      setSaved(d.design);
      setDesign(d.design);
      toast.success('Design saved. It’s live on the homepage.');
    } finally {
      setSavingDesign(false);
    }
  };

  const open = (t: Testimonial | 'new') => {
    setEditing(t);
    setForm(t === 'new' ? EMPTY : { name: t.name, location: t.location || '', avatar: t.avatar || '', rating: t.rating, text: t.text, product: t.product || '', isActive: t.isActive });
  };

  const save = async () => {
    setSaving(true);
    try {
      const isNew = editing === 'new';
      const res = await fetch(isNew ? '/api/admin/testimonials' : `/api/admin/testimonials/${(editing as Testimonial).id}`, {
        method: isNew ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, sortOrder: isNew ? 0 : (editing as Testimonial).sortOrder }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(d.error || 'Could not save'); return; }
      toast.success(isNew ? 'Review added' : 'Review saved');
      setEditing(null);
      load();
    } finally {
      setSaving(false);
    }
  };

  const upload = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.url) throw new Error(d.error || 'Upload failed');
      setForm((f) => ({ ...f, avatar: d.url }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const toggle = async (t: Testimonial) => {
    setItems((list) => list && list.map((x) => (x.id === t.id ? { ...x, isActive: !t.isActive } : x)));
    const res = await fetch(`/api/admin/testimonials/${t.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: !t.isActive }) });
    if (!res.ok) { toast.error('Could not update'); load(); }
  };

  const remove = async (t: Testimonial) => {
    if (!(await confirm({ title: `Delete the review from ${t.name}?`, confirmText: 'Delete', danger: true }))) return;
    const res = await fetch(`/api/admin/testimonials/${t.id}`, { method: 'DELETE' });
    if (!res.ok) { toast.error('Could not delete'); return; }
    toast.success('Review deleted');
    load();
  };

  const move = async (i: number, dir: -1 | 1) => {
    if (!items) return;
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    setItems(next);
    const res = await fetch('/api/admin/testimonials', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: next.map((t) => t.id) }) });
    if (!res.ok) { toast.error('Could not reorder'); load(); }
  };

  const sliding = design.style === 'carousel' || design.style === 'spotlight';

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[18px] font-medium text-ui-fg">Testimonials</h1>
          <p className="text-ui-subtle">Customer reviews shown on your homepage.{items && ` ${active.length} showing of ${items.length}.`}</p>
        </div>
        <Button variant="primary" onClick={() => open('new')}><Plus className="h-3.5 w-3.5" /> Add review</Button>
      </div>

      {/* Design */}
      <Container>
        <SectionHeader
          title="Section design"
          subtitle="How the reviews look on the homepage. The preview updates as you change things."
          actions={
            <>
              {dirty && <Button variant="transparent" onClick={() => saved && setDesign(saved)}>Undo changes</Button>}
              <Button variant="primary" loading={savingDesign} disabled={!dirty} onClick={saveDesign}>Save design</Button>
            </>
          }
        />
        <div className="flex flex-col gap-5 px-6 py-4">
          <div className="flex flex-col gap-2">
            <span className="font-medium text-ui-fg">Style</span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {(Object.keys(TESTIMONIAL_STYLES) as TestimonialStyle[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={design.style === s}
                  onClick={() => setD('style', s)}
                  className={cx('flex flex-col gap-1 rounded-md bg-ui-base p-3 text-left transition', design.style === s ? 'ring-2 ring-primary-500' : 'shadow-ui-field hover:bg-ui-hover')}
                >
                  <div className="mb-1 flex h-10 items-center px-1 text-ui-subtle">{<div className="w-full">{STYLE_SKETCH[s]}</div>}</div>
                  <span className="font-medium text-ui-fg">{TESTIMONIAL_STYLES[s].name}</span>
                  <span className="text-[12px] leading-4 text-ui-subtle">{TESTIMONIAL_STYLES[s].description}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <div className="flex flex-col gap-1.5">
              <span className="font-medium text-ui-fg">Background</span>
              <Segmented label="Background" value={design.background} onChange={(v) => setD('background', v)} options={[
                { value: 'soft', label: 'Soft grey' }, { value: 'white', label: 'White' }, { value: 'brand', label: 'Brand tint' }, { value: 'dark', label: 'Dark' },
              ]} />
            </div>
            {design.style !== 'quotes' && (
              <div className="flex flex-col gap-1.5">
                <span className="font-medium text-ui-fg">Card look</span>
                <Segmented label="Card look" value={design.card} onChange={(v) => setD('card', v)} options={[
                  { value: 'shadow', label: 'Shadow' }, { value: 'border', label: 'Outline' }, { value: 'flat', label: 'Flat' },
                ]} />
              </div>
            )}
            {design.style !== 'spotlight' && (
              <div className="flex flex-col gap-1.5">
                <span className="font-medium text-ui-fg">Per row (desktop)</span>
                <Segmented label="Per row" value={design.columns} onChange={(v) => setD('columns', v)} options={[{ value: 2, label: '2' }, { value: 3, label: '3' }, { value: 4, label: '4' }]} />
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <span className="font-medium text-ui-fg">Reviews to show</span>
              <Segmented label="Reviews to show" value={design.limit} onChange={(v) => setD('limit', v)} options={TESTIMONIAL_LIMITS.map((n) => ({ value: n, label: String(n) }))} />
            </div>
            {sliding && (
              <div className="flex flex-col gap-1.5">
                <span className="font-medium text-ui-fg">Move on every</span>
                <Segmented label="Autoplay" value={design.autoplay} onChange={(v) => setD('autoplay', v)} options={[0, 4, 6, 8, 10].map((n) => ({ value: n, label: n ? `${n}s` : 'Off' }))} />
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <span className="font-medium text-ui-fg">Heading</span>
              <Segmented label="Heading alignment" value={design.align} onChange={(v) => setD('align', v)} options={[{ value: 'center', label: 'Centred' }, { value: 'left', label: 'Left' }]} />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Small label"><Input value={design.eyebrow} maxLength={40} onChange={(e) => setD('eyebrow', e.target.value)} placeholder="Reviews" /></Field>
            <Field label="Title" hint="Leave empty for your shop type’s default"><Input value={design.title} maxLength={80} onChange={(e) => setD('title', e.target.value)} placeholder={type.copy.reviewsTitle} /></Field>
            <Field label="Subtitle" hint="Optional"><Input value={design.subtitle} maxLength={160} onChange={(e) => setD('subtitle', e.target.value)} placeholder="Real reviews from real families" /></Field>
          </div>

          <div className="grid gap-x-8 gap-y-3 rounded-md bg-ui-bg/60 p-4 md:grid-cols-2 xl:grid-cols-3">
            <Toggle checked={design.showSummary} onChange={(v) => setD('showSummary', v)} label="Average rating" hint="Stars and score under the title, worked out from your reviews." />
            <Toggle checked={design.showRating} onChange={(v) => setD('showRating', v)} label="Stars on each review" />
            <Toggle checked={design.showAvatar} onChange={(v) => setD('showAvatar', v)} label="Photos / emoji" />
            <Toggle checked={design.showLocation} onChange={(v) => setD('showLocation', v)} label="City" />
            <Toggle checked={design.showProduct} onChange={(v) => setD('showProduct', v)} label="“Purchased” product" />
            {design.style !== 'wall' && design.style !== 'spotlight' && <Toggle checked={design.clamp} onChange={(v) => setD('clamp', v)} label="Shorten long reviews" hint="Keeps cards the same height." />}
          </div>
        </div>
      </Container>

      <Container>
        <SectionHeader title="Preview" subtitle={active.length === 0 ? 'Shows sample reviews until you add your own.' : 'Desktop view, scaled to fit.'} />
        <div className="overflow-hidden bg-ui-hover p-3">
          <div className="pointer-events-auto overflow-hidden rounded-md shadow-sm" style={{ zoom: 0.7 } as React.CSSProperties}>
            <TestimonialsSection design={design} initial={active.length ? active : undefined} />
          </div>
        </div>
      </Container>

      {/* Reviews */}
      <Container>
        <SectionHeader title="Reviews" subtitle="Shown in this order. Hidden reviews stay saved." actions={<Button size="small" onClick={() => open('new')}><Plus className="h-3.5 w-3.5" /> Add</Button>} />
        {!items ? (
          <div className="flex flex-col gap-2 px-6 py-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14" />)}</div>
        ) : items.length === 0 ? (
          <EmptyState title="No reviews yet" description={type.id === 'baby' ? 'Until you add some, the homepage shows four sample reviews.' : 'The reviews section stays hidden on the homepage until you add some.'} action={<Button size="small" onClick={() => open('new')}><Plus className="h-3.5 w-3.5" /> Add review</Button>} />
        ) : (
          <ul className="divide-y divide-ui-border">
            {items.map((t, i) => (
              <li key={t.id} className={cx('flex items-start gap-4 px-6 py-3', !t.isActive && 'opacity-60')}>
                <div className="flex flex-col">
                  <IconButton label="Move up" disabled={i === 0} onClick={() => move(i, -1)} className="h-5 disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5" /></IconButton>
                  <IconButton label="Move down" disabled={i === items.length - 1} onClick={() => move(i, 1)} className="h-5 disabled:opacity-30"><ArrowDown className="h-3.5 w-3.5" /></IconButton>
                </div>
                <Avatar value={t.avatar} name={t.name} />
                <button type="button" onClick={() => open(t)} className="min-w-0 flex-1 text-left">
                  <span className="flex flex-wrap items-center gap-x-2">
                    <span className="font-medium text-ui-fg">{t.name}</span>
                    {t.location && <span className="text-[12px] text-ui-subtle">{t.location}</span>}
                    <Stars value={t.rating} size="h-3 w-3" />
                    {i >= design.limit && t.isActive && <span className="rounded bg-ui-hover px-1.5 text-[11px] text-ui-subtle">Not shown (over the limit of {design.limit})</span>}
                  </span>
                  <span className="mt-0.5 line-clamp-2 block text-ui-subtle">{t.text}</span>
                  {t.product && <span className="mt-0.5 block text-[12px] text-ui-muted">Purchased: {t.product}</span>}
                </button>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={t.isActive}
                    aria-label={t.isActive ? 'Hide review' : 'Show review'}
                    onClick={() => toggle(t)}
                    className={cx('relative mr-1 h-5 w-9 shrink-0 rounded-full transition-colors', t.isActive ? 'bg-primary-500' : 'bg-ui-border')}
                  >
                    <span className={cx('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all', t.isActive ? 'left-[18px]' : 'left-0.5')} />
                  </button>
                  <IconButton label="Edit" onClick={() => open(t)}><Pencil className="h-3.5 w-3.5" /></IconButton>
                  <IconButton label="Delete" onClick={() => remove(t)} className="hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></IconButton>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Container>

      <Drawer
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'Add review' : 'Edit review'}
        footer={<><Button onClick={() => setEditing(null)}>Cancel</Button><Button variant="primary" loading={saving} onClick={save}>Save</Button></>}
      >
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name"><Input value={form.name} maxLength={80} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Priya M." /></Field>
            <Field label="City" hint="Optional"><Input value={form.location} maxLength={80} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Mumbai" /></Field>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="font-medium text-ui-fg">Rating</span>
            <Stars value={form.rating} onChange={(n) => setForm({ ...form, rating: n })} size="h-6 w-6" />
          </div>

          <Field label="What they said" hint={`${form.text.length}/1000`}>
            <Textarea rows={5} maxLength={1000} value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} placeholder="Ordered a soft toy for my baby and it arrived in 2 days…" />
          </Field>

          <Field label="Product they bought" hint="Optional. Shown as “Purchased: …”">
            <Input value={form.product} maxLength={120} onChange={(e) => setForm({ ...form, product: e.target.value })} placeholder="Soft Bunny Plush" />
          </Field>

          <div className="flex flex-col gap-2">
            <span className="font-medium text-ui-fg">Photo</span>
            <div className="flex items-center gap-3">
              <Avatar value={form.avatar || null} name={form.name} className="h-14 w-14 text-3xl" />
              <div className="flex flex-wrap gap-2">
                <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md bg-ui-base px-3 text-[13px] font-medium shadow-ui-field hover:bg-ui-hover">
                  {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />} Upload photo
                  <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={(e) => upload(e.target.files?.[0])} />
                </label>
                {form.avatar && <Button variant="transparent" onClick={() => setForm({ ...form, avatar: '' })}>Use first letter</Button>}
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {EMOJIS.map((e) => (
                <button key={e} type="button" onClick={() => setForm({ ...form, avatar: e })} aria-label={`Use ${e}`} className={cx('flex h-9 w-9 items-center justify-center rounded-md text-xl hover:bg-ui-hover', form.avatar === e && 'bg-ui-hover ring-2 ring-primary-500')}>{e}</button>
              ))}
            </div>
          </div>

          <Toggle checked={form.isActive} onChange={(v) => setForm({ ...form, isActive: v })} label="Show on the homepage" />
        </div>
      </Drawer>
    </div>
  );
}
