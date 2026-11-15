'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { ArrowDown, ArrowUp, CalendarClock, ExternalLink, LayoutTemplate, Pencil, Plus, Trash2 } from 'lucide-react';
import { Badge, Button, Container, EmptyState, IconButton, LinkButton, SectionHeader, Skeleton, cx, shortDate } from '@/components/admin/ui';
import { Drawer, useConfirm } from '@/components/admin/overlays';
import { Segmented, Toggle } from '@/components/admin/banner-form';
import { BannerView } from '@/components/home/banner-slider';
import {
  AUTOPLAY_CHOICES, BANNER_POSITIONS, DISPLAYS, HEIGHTS, PLACEMENTS, bannerStatus,
  type BannerDesign, type BannerDisplay, type BannerHeight, type BannerPosition, type PlacementSettings,
} from '@/lib/banners';

interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  image: string;
  link: string | null;
  position: BannerPosition;
  isActive: boolean;
  sortOrder: number;
  showFrom: string | null;
  showTo: string | null;
  design: BannerDesign;
}

const STATUS = {
  live: { tone: 'green', label: 'Live' },
  scheduled: { tone: 'blue', label: 'Scheduled' },
  ended: { tone: 'grey', label: 'Ended' },
  hidden: { tone: 'grey', label: 'Hidden' },
} as const;

function layoutSummary(p: PlacementSettings) {
  const parts = [DISPLAYS[p.display].name, HEIGHTS[p.height].name, p.width === 'full' ? 'Full width' : 'Page width'];
  if (p.display === 'grid') parts.push(`${p.columns} per row`);
  else parts.push(p.autoplay ? `Auto ${p.autoplay}s` : 'No autoplay');
  return parts.join(' · ');
}

export default function BannersPage() {
  const confirm = useConfirm();
  const [banners, setBanners] = useState<Banner[] | null>(null);
  const [placements, setPlacements] = useState<Record<BannerPosition, PlacementSettings> | null>(null);
  const [editing, setEditing] = useState<BannerPosition | null>(null);

  const load = useCallback(() => {
    fetch('/api/admin/banners')
      .then((r) => r.json())
      .then((d) => { setBanners(d.banners || []); setPlacements(d.placements); })
      .catch(() => { setBanners([]); toast.error('Could not load banners'); });
  }, []);
  useEffect(load, [load]);

  const toggle = async (b: Banner) => {
    setBanners((list) => list && list.map((x) => (x.id === b.id ? { ...x, isActive: !b.isActive } : x)));
    const res = await fetch(`/api/admin/banners/${b.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: !b.isActive }) });
    if (!res.ok) { toast.error('Could not update'); load(); return; }
    toast.success(!b.isActive ? 'Banner is showing' : 'Banner hidden');
  };

  const remove = async (b: Banner) => {
    if (!(await confirm({ title: `Delete “${b.title}”?`, description: 'It disappears from the store straight away.', confirmText: 'Delete', danger: true }))) return;
    const res = await fetch(`/api/admin/banners/${b.id}`, { method: 'DELETE' });
    if (!res.ok) { toast.error('Could not delete'); return; }
    toast.success('Banner deleted');
    load();
  };

  const move = async (position: BannerPosition, index: number, dir: -1 | 1) => {
    if (!banners) return;
    const group = banners.filter((b) => b.position === position);
    const j = index + dir;
    if (j < 0 || j >= group.length) return;
    [group[index], group[j]] = [group[j], group[index]];
    const ordered = group.map((b, i) => ({ ...b, sortOrder: i }));
    setBanners([...banners.filter((b) => b.position !== position), ...ordered]);
    const res = await fetch('/api/admin/banners', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: ordered.map((b) => b.id) }) });
    if (!res.ok) { toast.error('Could not reorder'); load(); }
  };

  const live = banners?.filter((b) => bannerStatus(b) === 'live').length ?? 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[18px] font-medium text-ui-fg">Banners</h1>
          <p className="text-ui-subtle">
            Promotions for your homepage, category pages and product pages.
            {banners && ` ${live} live of ${banners.length}.`}
          </p>
        </div>
        <LinkButton href="/admin/banners/new" variant="primary"><Plus className="h-3.5 w-3.5" /> Add banner</LinkButton>
      </div>

      {!banners || !placements ? (
        [0, 1].map((i) => <Skeleton key={i} className="h-48" />)
      ) : (
        BANNER_POSITIONS.map((position) => {
          const group = banners.filter((b) => b.position === position).sort((a, b) => a.sortOrder - b.sortOrder);
          const p = placements[position];
          return (
            <Container key={position}>
              <SectionHeader
                title={<span className="flex items-center gap-2">{PLACEMENTS[position].name} <span className="rounded-md bg-ui-hover px-1.5 text-[12px] font-medium text-ui-subtle">{group.length}</span></span>}
                subtitle={PLACEMENTS[position].where}
                actions={
                  <>
                    <Button size="small" onClick={() => setEditing(position)}><LayoutTemplate className="h-3.5 w-3.5" /> Layout</Button>
                    <LinkButton size="small" href={`/admin/banners/new?position=${position}`}><Plus className="h-3.5 w-3.5" /> Add</LinkButton>
                  </>
                }
              />
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 bg-ui-bg/50 px-6 py-2 text-[12px] text-ui-subtle">
                <span>Layout: <button type="button" onClick={() => setEditing(position)} className="font-medium text-ui-fg hover:underline">{layoutSummary(p)}</button></span>
                <span>Best picture size: {PLACEMENTS[position].size}</span>
              </div>

              {group.length === 0 ? (
                <EmptyState
                  title="No banners here yet"
                  description={position === 'HOMEPAGE_HERO' ? 'The homepage shows its normal hero section until you add one.' : 'Nothing shows in this spot until you add a banner.'}
                  action={<LinkButton size="small" href={`/admin/banners/new?position=${position}`}><Plus className="h-3.5 w-3.5" /> Add banner</LinkButton>}
                />
              ) : (
                <ul className="divide-y divide-ui-border">
                  {group.map((b, i) => {
                    const s = STATUS[bannerStatus(b)];
                    return (
                      <li key={b.id} className={cx('flex flex-wrap items-center gap-x-4 gap-y-2 px-6 py-3 sm:flex-nowrap', !b.isActive && 'opacity-70')}>
                        <div className="flex flex-col">
                          <IconButton label="Move up" disabled={i === 0} onClick={() => move(position, i, -1)} className="h-5 disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5" /></IconButton>
                          <IconButton label="Move down" disabled={i === group.length - 1} onClick={() => move(position, i, 1)} className="h-5 disabled:opacity-30"><ArrowDown className="h-3.5 w-3.5" /></IconButton>
                        </div>
                        <Link href={`/admin/banners/${b.id}`} className="relative h-14 w-36 shrink-0 overflow-hidden rounded-md bg-ui-hover shadow-ui-field">
                          {b.image && <Thumb src={b.image} />}
                          {b.design.mobileImage && <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1 text-[10px] text-white">+ phone</span>}
                        </Link>
                        <div className="min-w-0 flex-1">
                          <Link href={`/admin/banners/${b.id}`} className="block truncate font-medium text-ui-fg hover:underline">{b.title}</Link>
                          <p className="truncate text-[12px] text-ui-subtle">
                            {b.subtitle || (b.design.showText ? 'No subtitle' : 'Picture only (no text)')}
                            {b.link && <> · <span className="inline-flex items-center gap-0.5">{b.link}<ExternalLink className="h-3 w-3" /></span></>}
                          </p>
                          {(b.showFrom || b.showTo || b.design.categories.length > 0) && (
                            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12px] text-ui-subtle">
                              {(b.showFrom || b.showTo) && (
                                <span className="inline-flex items-center gap-1"><CalendarClock className="h-3 w-3" />{b.showFrom ? shortDate(b.showFrom) : 'Now'} → {b.showTo ? shortDate(b.showTo) : 'no end'}</span>
                              )}
                              {b.design.categories.length > 0 && <span>Only: {b.design.categories.join(', ')}</span>}
                            </p>
                          )}
                        </div>
                        <Badge tone={s.tone}>{s.label}</Badge>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={b.isActive}
                            aria-label={b.isActive ? 'Hide banner' : 'Show banner'}
                            title={b.isActive ? 'Showing. Click to hide' : 'Hidden. Click to show'}
                            onClick={() => toggle(b)}
                            className={cx('relative mr-1 h-5 w-9 shrink-0 rounded-full transition-colors', b.isActive ? 'bg-primary-500' : 'bg-ui-border')}
                          >
                            <span className={cx('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all', b.isActive ? 'left-[18px]' : 'left-0.5')} />
                          </button>
                          <Link href={`/admin/banners/${b.id}`} aria-label="Edit" title="Edit" className="inline-flex h-7 w-7 items-center justify-center rounded-md text-ui-subtle hover:bg-ui-hover hover:text-ui-fg"><Pencil className="h-3.5 w-3.5" /></Link>
                          <IconButton label="Delete" onClick={() => remove(b)} className="hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></IconButton>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Container>
          );
        })
      )}

      {editing && placements && banners && (
        <LayoutDrawer
          position={editing}
          initial={placements[editing]}
          banners={banners.filter((b) => b.position === editing && b.isActive)}
          onClose={() => setEditing(null)}
          onSaved={(s) => { setPlacements({ ...placements, [editing]: s }); setEditing(null); }}
        />
      )}
    </div>
  );
}

/** List thumbnail that says so when the picture link is dead. */
function Thumb({ src }: { src: string }) {
  const [broken, setBroken] = useState(false);
  if (broken) return <span className="flex h-full w-full items-center justify-center bg-red-500/5 px-2 text-center text-[11px] font-medium leading-tight text-red-600">Picture missing</span>;
  return <img src={src} alt="" className="h-full w-full object-cover" onError={() => setBroken(true)} ref={(el) => { if (el && el.complete && el.naturalWidth === 0) setBroken(true); }} />;
}

/* ── Layout drawer ───────────────────────────────────────────── */

function DisplayIcon({ display }: { display: BannerDisplay }) {
  const box = 'rounded-sm bg-current';
  return (
    <div className="flex h-10 w-full items-center justify-center gap-1 text-ui-subtle">
      {display === 'carousel' && <><div className={`${box} h-7 w-14 opacity-80`} /><div className={`${box} h-7 w-2 opacity-30`} /></>}
      {display === 'fade' && <div className="relative h-7 w-16"><div className={`${box} absolute inset-0 opacity-30`} /><div className={`${box} absolute inset-1 opacity-80`} /></div>}
      {display === 'peek' && <><div className={`${box} h-7 w-12 opacity-80`} /><div className={`${box} h-7 w-5 opacity-40`} /></>}
      {display === 'grid' && <><div className={`${box} h-7 w-7 opacity-80`} /><div className={`${box} h-7 w-7 opacity-80`} /></>}
    </div>
  );
}

function LayoutDrawer({ position, initial, banners, onClose, onSaved }: {
  position: BannerPosition;
  initial: PlacementSettings;
  banners: Banner[];
  onClose: () => void;
  onSaved: (s: PlacementSettings) => void;
}) {
  const [s, setS] = useState(initial);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof PlacementSettings>(k: K, v: PlacementSettings[K]) => setS((p) => ({ ...p, [k]: v }));
  const rotating = s.display !== 'grid';

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/banners/placements', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ position, settings: s }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(d.error || 'Could not save'); return; }
      toast.success('Layout saved');
      onSaved(d.settings);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      open
      onClose={onClose}
      title={`${PLACEMENTS[position].name} layout`}
      description="Applies to every banner in this spot."
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={saving} onClick={save}>Save layout</Button></>}
    >
      <div className="flex flex-col gap-5">
        {/* Live preview, drawn at desktop size and scaled down */}
        <div className="overflow-hidden rounded-md bg-ui-hover p-2 shadow-ui-field">
          {banners.length > 0 ? (
            <div style={{ zoom: 0.4 } as React.CSSProperties} className="w-[1200px] bg-white">
              <BannerView banners={banners.map((b) => ({ id: b.id, title: b.title, subtitle: b.subtitle, image: b.image, link: null, design: b.design }))} placement={s} device="desktop" />
            </div>
          ) : (
            <p className="px-2 py-6 text-center text-ui-subtle">Add a banner here to see a preview.</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <span className="font-medium text-ui-fg">Style</span>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(DISPLAYS) as BannerDisplay[]).map((d) => (
              <button
                key={d}
                type="button"
                aria-pressed={s.display === d}
                onClick={() => set('display', d)}
                className={cx('flex flex-col gap-1 rounded-md p-3 text-left transition', s.display === d ? 'bg-ui-base ring-2 ring-primary-500' : 'bg-ui-base shadow-ui-field hover:bg-ui-hover')}
              >
                <DisplayIcon display={d} />
                <span className="font-medium text-ui-fg">{DISPLAYS[d].name}</span>
                <span className="text-[12px] leading-4 text-ui-subtle">{DISPLAYS[d].description}</span>
              </button>
            ))}
          </div>
          {banners.length <= 1 && <p className="text-[12px] text-ui-subtle">With one banner, every style shows it on its own.</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="font-medium text-ui-fg">Height</span>
          <Segmented label="Height" value={s.height} onChange={(v) => set('height', v as BannerHeight)} options={(Object.keys(HEIGHTS) as BannerHeight[]).map((h) => ({ value: h, label: HEIGHTS[h].name }))} />
          <span className="text-[12px] text-ui-subtle">“Fit image” shows the whole picture at its own shape, with no cropping.</span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="font-medium text-ui-fg">Width</span>
            <Segmented label="Width" value={s.width} onChange={(v) => set('width', v)} options={[{ value: 'full', label: 'Full width' }, { value: 'contained', label: 'Page width' }]} />
          </div>
          {s.display === 'grid' && (
            <div className="flex flex-col gap-1.5">
              <span className="font-medium text-ui-fg">Per row (desktop)</span>
              <Segmented label="Per row" value={s.columns} onChange={(v) => set('columns', v)} options={[{ value: 2, label: '2' }, { value: 3, label: '3' }]} />
            </div>
          )}
        </div>

        {rotating && (
          <div className="flex flex-col gap-1.5">
            <span className="font-medium text-ui-fg">Change banner every</span>
            <Segmented label="Autoplay" value={s.autoplay} onChange={(v) => set('autoplay', v)} options={AUTOPLAY_CHOICES.map((n) => ({ value: n, label: n ? `${n}s` : 'Off' }))} />
            <span className="text-[12px] text-ui-subtle">Pauses while a shopper hovers over it.</span>
          </div>
        )}

        <div className="flex flex-col gap-3 rounded-md bg-ui-bg/60 p-3">
          <Toggle checked={s.rounded} onChange={(v) => set('rounded', v)} label="Rounded corners" />
          {rotating && <Toggle checked={s.arrows} onChange={(v) => set('arrows', v)} label="Arrows" hint="Previous / next buttons (on hover on desktop)." />}
          {rotating && <Toggle checked={s.dots} onChange={(v) => set('dots', v)} label="Dots" hint="Shows how many banners there are." />}
        </div>
      </div>
    </Drawer>
  );
}
