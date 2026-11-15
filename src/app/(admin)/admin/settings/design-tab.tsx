'use client';

import { ArrowDown, ArrowUp, Check, ExternalLink, RotateCcw } from 'lucide-react';
import {
  CARD_STYLES,
  DEFAULT_ACCENT,
  DEFAULT_LAYOUT,
  DEFAULT_SECTION_ORDER,
  FONTS,
  HOME_LAYOUTS,
  SECTIONS,
  THEMES,
  parseLayoutConfig,
  type CardStyleId,
  type FontId,
  type GridColumns,
  type HomeLayoutId,
  type ImageShape,
  type LayoutConfig,
  type SectionId,
  type ThemeId,
  GALLERY_STYLES,
  GALLERY_SPLITS,
  DETAILS_STYLES,
  type GalleryStyle,
  type GallerySplit,
  type DetailsStyle,
  type ProductPageLayout,
} from '@/lib/layout-settings';

interface DesignTabProps {
  formData: Record<string, any>;
  setFormData: React.Dispatch<React.SetStateAction<Record<string, any>>>;
}

const FONT_FAMILY: Record<FontId, string> = {
  system: 'system-ui, sans-serif',
  nunito: 'var(--font-nunito), system-ui',
  poppins: 'var(--font-poppins), system-ui',
  quicksand: 'var(--font-quicksand), system-ui',
};

function Card({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 space-y-5">
      <div>
        <h2 className="text-lg font-bold text-gray-800">{title}</h2>
        <p className="text-sm text-gray-500 mt-1">{description}</p>
      </div>
      {children}
    </div>
  );
}

/** Tiny sketch of each product-page gallery style. */
function GalleryPreview({ id, color }: { id: GalleryStyle; color: string }) {
  const box = 'rounded bg-gray-200';
  const text = (
    <div className="flex-1 space-y-1.5 pt-1">
      <div className="h-2 w-3/4 rounded bg-gray-300" />
      <div className="h-2 w-1/2 rounded bg-gray-200" />
      <div className="mt-2 h-3 w-full rounded" style={{ background: color }} />
    </div>
  );
  return (
    <div className="flex h-24 gap-2 rounded-xl bg-gray-50 p-2.5">
      {id === 'thumbs-below' && <div className="flex w-1/2 flex-col gap-1"><div className={`${box} flex-1`} /><div className="flex gap-1">{[0, 1, 2].map((i) => <div key={i} className={`${box} h-3 flex-1`} />)}</div></div>}
      {id === 'thumbs-side' && <div className="flex w-1/2 gap-1"><div className="flex w-3 flex-col gap-1">{[0, 1, 2].map((i) => <div key={i} className={`${box} flex-1`} />)}</div><div className={`${box} flex-1`} /></div>}
      {id === 'grid' && <div className="grid w-1/2 grid-cols-2 gap-1">{[0, 1, 2, 3].map((i) => <div key={i} className={box} />)}</div>}
      {id === 'stacked' && <div className="flex w-1/2 flex-col gap-1">{[0, 1].map((i) => <div key={i} className={`${box} flex-1`} />)}</div>}
      {text}
    </div>
  );
}

function Choice({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`relative w-full text-left rounded-2xl border-2 p-3 transition-all ${
        selected ? 'border-primary-500 bg-primary-50/50 shadow-sm' : 'border-gray-100 hover:border-gray-300 bg-white'
      }`}
    >
      {selected && (
        <span className="absolute top-2.5 right-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary-500 text-white">
          <Check className="w-3 h-3" strokeWidth={3} />
        </span>
      )}
      {children}
    </button>
  );
}

function Segmented<T extends string | number>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex rounded-xl bg-gray-100 p-1">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          onClick={() => onChange(o.value)}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
            value === o.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Switch({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onToggle}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${on ? 'bg-primary-500' : 'bg-gray-300'}`}
    >
      <span className={`absolute left-0 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
    </button>
  );
}

/** Tiny wireframes so each homepage style can be recognised at a glance. */
function HomeLayoutPreview({ id, color }: { id: HomeLayoutId; color: string }) {
  const bar = 'rounded-sm bg-gray-300';
  if (id === 'spotlight') {
    return (
      <div className="space-y-1.5">
        <div className="h-14 rounded-md p-2 flex flex-col justify-center gap-1" style={{ background: `linear-gradient(90deg, #333, ${color})` }}>
          <div className="h-1.5 w-1/2 rounded-sm bg-white/90" />
          <div className="h-1.5 w-1/3 rounded-sm bg-white/60" />
        </div>
        <div className="grid grid-cols-3 gap-1">{[0, 1, 2].map((i) => <div key={i} className="h-4 rounded bg-gray-100" />)}</div>
        <div className="h-3 rounded" style={{ background: `${color}22` }} />
      </div>
    );
  }
  if (id === 'boutique') {
    return (
      <div className="space-y-1.5">
        <div className="h-14 rounded-md bg-[#FAF8F4] px-2 grid grid-cols-2 gap-2 items-center">
          <div className="space-y-1">
            <div className="h-0.5 w-6 rounded-sm" style={{ background: color }} />
            <div className="h-2 w-full rounded-sm bg-gray-700" />
            <div className="h-1.5 w-2/3 rounded-sm bg-gray-300" />
          </div>
          <div className="h-11 rounded-t-full bg-gray-200 justify-self-center w-8" />
        </div>
        <div className="grid grid-cols-4 gap-1">{[0, 1, 2, 3].map((i) => <div key={i} className="h-6 rounded bg-gray-300" />)}</div>
      </div>
    );
  }
  if (id === 'playful') {
    return (
      <div className="space-y-1.5">
        <div className="relative h-14 rounded-md overflow-hidden px-2 grid grid-cols-2 gap-2 items-center" style={{ background: `${color}33` }}>
          <div className="absolute -left-2 -top-2 h-6 w-6 rounded-full bg-amber-200" />
          <div className="relative space-y-1">
            <div className="h-2 w-full rounded-sm bg-gray-700" />
            <div className="h-2 w-1/2 rounded-md" style={{ background: color }} />
          </div>
          <div className="relative h-10 w-10 rounded-full bg-white justify-self-center ring-2" style={{ ['--tw-ring-color' as string]: color }} />
        </div>
        <div className="flex justify-center gap-1.5">{['bg-pink-200', 'bg-amber-200', 'bg-sky-200', 'bg-emerald-200'].map((c) => <div key={c} className={`h-5 w-5 rounded-full ${c}`} />)}</div>
      </div>
    );
  }
  if (id === 'minimal') {
    return (
      <div className="space-y-1.5">
        <div className="h-14 rounded-md bg-white border border-gray-100 flex flex-col items-center justify-center gap-1">
          <div className={`h-1.5 w-1/2 ${bar}`} />
          <div className="h-1.5 w-6 rounded-full" style={{ background: color }} />
        </div>
        <div className="flex gap-1 justify-center">{[0, 1, 2, 3].map((i) => <div key={i} className="h-2.5 w-7 rounded-full border border-gray-200" />)}</div>
        <div className="grid grid-cols-4 gap-1">{[0, 1, 2, 3].map((i) => <div key={i} className="h-4 rounded bg-gray-100" />)}</div>
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      <div className="h-14 rounded-md p-2 grid grid-cols-2 gap-2 items-center" style={{ background: `${color}1A` }}>
        <div className="space-y-1">
          <div className={`h-1.5 w-full ${bar}`} />
          <div className="h-1.5 w-2/3 rounded-sm" style={{ background: color }} />
        </div>
        <div className="h-10 rounded bg-white/80" />
      </div>
      <div className="grid grid-cols-6 gap-1">{[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="h-4 rounded bg-gray-100" />)}</div>
      <div className="grid grid-cols-4 gap-1">{[0, 1, 2, 3].map((i) => <div key={i} className="h-3 rounded bg-gray-100" />)}</div>
    </div>
  );
}

function CardStylePreview({ id, color, shape }: { id: CardStyleId; color: string; shape: ImageShape }) {
  const img = shape === 'portrait' ? 'h-16' : 'h-12';
  if (id === 'soft') {
    return (
      <div className="rounded-xl bg-white shadow-sm p-1.5 w-20 mx-auto">
        <div className={`${img} rounded-lg`} style={{ background: `${color}33` }} />
        <div className="mt-1.5 h-1.5 w-3/4 rounded-sm bg-gray-300" />
        <div className="mt-1.5 h-2.5 rounded-full" style={{ background: color }} />
      </div>
    );
  }
  if (id === 'minimal') {
    return (
      <div className="w-20 mx-auto">
        <div className={`${img} rounded-lg bg-gray-100 relative`}>
          <div className="absolute inset-x-1 bottom-1 h-2 rounded-full bg-white" />
        </div>
        <div className="mt-1.5 h-1.5 w-3/4 rounded-sm bg-gray-300" />
        <div className="mt-1 h-1.5 w-1/3 rounded-sm bg-gray-400" />
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-gray-200 bg-white w-20 mx-auto overflow-hidden">
      <div className={`${img} bg-gray-100`} />
      <div className="p-1.5">
        <div className="h-1.5 w-3/4 rounded-sm bg-gray-300" />
        <div className="mt-1.5 flex items-center justify-between">
          <div className="h-1.5 w-1/3 rounded-sm bg-gray-400" />
          <div className="h-3 w-3 rounded-full" style={{ background: color }} />
        </div>
      </div>
    </div>
  );
}

export function DesignTab({ formData, setFormData }: DesignTabProps) {
  const layout: LayoutConfig = parseLayoutConfig(formData.layout);
  const previewColor = formData.primaryColor || layout.accentColor;

  const pp = layout.productPage;
  const setPP = (patch: Partial<ProductPageLayout>) => setLayout({ productPage: { ...layout.productPage, ...patch } });
  const setLayout = (patch: Partial<LayoutConfig>) =>
    setFormData((prev) => ({ ...prev, layout: { ...parseLayoutConfig(prev.layout), ...patch } }));

  const applyTheme = (id: ThemeId) => {
    const t = THEMES[id];
    setFormData((prev) => ({
      ...prev,
      primaryColor: t.primary,
      secondaryColor: t.secondary,
      layout: { ...parseLayoutConfig(prev.layout), theme: id, accentColor: t.primary, font: t.font },
    }));
  };

  const resetTheme = () => setLayout({ theme: null, accentColor: DEFAULT_ACCENT, font: DEFAULT_LAYOUT.font });

  const isVisible = (id: SectionId) => {
    const key = SECTIONS[id].toggleKey;
    return key ? !!formData[key] : !layout.hiddenSections.includes(id);
  };

  const toggleSection = (id: SectionId) => {
    const key = SECTIONS[id].toggleKey;
    if (key) {
      setFormData((prev) => ({ ...prev, [key]: !prev[key] }));
    } else {
      const hidden = layout.hiddenSections.includes(id)
        ? layout.hiddenSections.filter((s) => s !== id)
        : [...layout.hiddenSections, id];
      setLayout({ hiddenSections: hidden });
    }
  };

  const moveSection = (index: number, direction: -1 | 1) => {
    const order = [...layout.sectionOrder];
    const target = index + direction;
    if (target < 0 || target >= order.length) return;
    [order[index], order[target]] = [order[target], order[index]];
    setLayout({ sectionOrder: order });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-primary-50 px-5 py-4 text-sm">
        <p className="text-gray-700">
          Changes show on your store after you click <span className="font-semibold">Save Settings</span>.
        </p>
        <a href="/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-semibold text-primary-600 hover:text-primary-700">
          Open store <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      {/* Theme */}
      <Card title="Theme" description="Colours and font for the whole shop: header, buttons, links and highlights.">
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {(Object.keys(THEMES) as ThemeId[]).map((id) => {
            const t = THEMES[id];
            return (
              <Choice key={id} selected={layout.theme === id} onClick={() => applyTheme(id)}>
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    <span className="h-9 w-9 rounded-full ring-2 ring-white" style={{ background: t.primary }} />
                    <span className="h-9 w-9 rounded-full ring-2 ring-white" style={{ background: t.secondary }} />
                  </div>
                  <div className="min-w-0 pr-5">
                    <p className="font-semibold text-gray-800" style={{ fontFamily: FONT_FAMILY[t.font] }}>{t.name}</p>
                    <p className="text-xs text-gray-500 truncate">{t.description}</p>
                  </div>
                </div>
              </Choice>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-4 border-t border-gray-100 pt-5">
          <label className="text-sm font-medium text-gray-700" htmlFor="theme-font">Font</label>
          <select
            id="theme-font"
            value={layout.font}
            onChange={(e) => setLayout({ font: e.target.value as FontId })}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
            style={{ fontFamily: FONT_FAMILY[layout.font] }}
          >
            {(Object.keys(FONTS) as FontId[]).map((f) => (
              <option key={f} value={f}>{FONTS[f].label}</option>
            ))}
          </select>
          {layout.theme && (
            <button type="button" onClick={resetTheme} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800">
              <RotateCcw className="w-3.5 h-3.5" /> Back to original look
            </button>
          )}
          <p className="w-full text-xs text-gray-400">
            Picking a theme also fills in the colours on the Branding tab, where you can fine-tune them.
          </p>
        </div>
      </Card>

      {/* Homepage style */}
      <Card title="Homepage style" description="How the hero, categories and benefits sections look.">
        <div className="grid md:grid-cols-3 gap-3">
          {(Object.keys(HOME_LAYOUTS) as HomeLayoutId[]).map((id) => (
            <Choice key={id} selected={layout.homeLayout === id} onClick={() => setLayout({ homeLayout: id })}>
              <HomeLayoutPreview id={id} color={previewColor} />
              <p className="mt-3 font-semibold text-gray-800">{HOME_LAYOUTS[id].name}</p>
              <p className="text-xs text-gray-500 mt-0.5">{HOME_LAYOUTS[id].description}</p>
            </Choice>
          ))}
        </div>
      </Card>

      {/* Sections */}
      <Card title="Homepage sections" description="Turn sections on or off and use the arrows to change their order.">
        <ol className="divide-y divide-gray-100 rounded-2xl border border-gray-100">
          {layout.sectionOrder.map((id, index) => {
            const visible = isVisible(id);
            return (
              <li key={id} className={`flex items-center gap-3 px-4 py-3 ${visible ? '' : 'bg-gray-50'}`}>
                <span className="w-6 text-center text-xs font-semibold text-gray-400">{index + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className={`font-medium ${visible ? 'text-gray-800' : 'text-gray-400'}`}>{SECTIONS[id].label}</p>
                  {SECTIONS[id].note && <p className="text-xs text-gray-400">{SECTIONS[id].note}</p>}
                </div>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => moveSection(index, -1)} disabled={index === 0} aria-label="Move up"
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30 disabled:hover:bg-transparent">
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button type="button" onClick={() => moveSection(index, 1)} disabled={index === layout.sectionOrder.length - 1} aria-label="Move down"
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30 disabled:hover:bg-transparent">
                    <ArrowDown className="w-4 h-4" />
                  </button>
                </div>
                <Switch on={visible} onToggle={() => toggleSection(id)} label={`Show ${SECTIONS[id].label}`} />
              </li>
            );
          })}
        </ol>
        <button type="button" onClick={() => setLayout({ sectionOrder: DEFAULT_SECTION_ORDER })}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800">
          <RotateCcw className="w-3.5 h-3.5" /> Reset order
        </button>
      </Card>

      {/* Product cards */}
      <Card title="Product cards" description="How products look on the homepage, Products, Category and Search pages.">
        <div className="grid md:grid-cols-3 gap-3">
          {(Object.keys(CARD_STYLES) as CardStyleId[]).map((id) => (
            <Choice key={id} selected={layout.cardStyle === id} onClick={() => setLayout({ cardStyle: id })}>
              <div className="rounded-xl bg-gray-50 py-4">
                <CardStylePreview id={id} color={previewColor} shape={layout.imageShape} />
              </div>
              <p className="mt-3 font-semibold text-gray-800">{CARD_STYLES[id].name}</p>
              <p className="text-xs text-gray-500 mt-0.5">{CARD_STYLES[id].description}</p>
            </Choice>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 gap-5 border-t border-gray-100 pt-5">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Image shape</p>
            <Segmented<ImageShape>
              value={layout.imageShape}
              options={[{ value: 'square', label: 'Square' }, { value: 'portrait', label: 'Portrait (3:4)' }]}
              onChange={(v) => setLayout({ imageShape: v })}
            />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Products per row on desktop</p>
            <Segmented<GridColumns>
              value={layout.gridColumns}
              options={[{ value: 3, label: '3' }, { value: 4, label: '4' }, { value: 5, label: '5' }]}
              onChange={(v) => setLayout({ gridColumns: v })}
            />
            <p className="text-xs text-gray-400 mt-2">Pages with a filter sidebar show one fewer. Phones always show 2.</p>
          </div>
        </div>
      </Card>

      {/* Product page */}
      <Card title="Product page" description="How each product's page is laid out.">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {(Object.keys(GALLERY_STYLES) as GalleryStyle[]).map((id) => (
            <Choice key={id} selected={pp.gallery === id} onClick={() => setPP({ gallery: id })}>
              <GalleryPreview id={id} color={previewColor} />
              <p className="mt-3 font-semibold text-gray-800">{GALLERY_STYLES[id].name}</p>
              <p className="text-xs text-gray-500 mt-0.5">{GALLERY_STYLES[id].description}</p>
            </Choice>
          ))}
        </div>
        <div className="grid sm:grid-cols-2 gap-5 border-t border-gray-100 pt-5">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Photos and details</p>
            <Segmented<GallerySplit>
              value={pp.split}
              options={(Object.keys(GALLERY_SPLITS) as GallerySplit[]).map((v) => ({ value: v, label: GALLERY_SPLITS[v].name }))}
              onChange={(v) => setPP({ split: v })}
            />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Photo shape</p>
            <Segmented<ImageShape>
              value={pp.imageShape}
              options={[{ value: 'square', label: 'Square' }, { value: 'portrait', label: 'Portrait (3:4)' }]}
              onChange={(v) => setPP({ imageShape: v })}
            />
          </div>
          <div className="sm:col-span-2">
            <p className="text-sm font-medium text-gray-700 mb-2">Description, size guide, shipping and reviews</p>
            <Segmented<DetailsStyle>
              value={pp.details}
              options={(Object.keys(DETAILS_STYLES) as DetailsStyle[]).map((v) => ({ value: v, label: DETAILS_STYLES[v].name }))}
              onChange={(v) => setPP({ details: v })}
            />
            <p className="text-xs text-gray-400 mt-2">{DETAILS_STYLES[pp.details].description}</p>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3 border-t border-gray-100 pt-5">
          {([
            ['zoom', 'Zoom photos on hover (desktop)'],
            ['stickyGallery', 'Keep photos (or details beside a photo grid) in view while scrolling'],
            ['mobileBar', 'Add-to-cart bar on phones when the buttons scroll away'],
            ['showBuyNow', 'Show the Buy Now button'],
            ['showDeliveryEstimate', 'Show the delivery date estimate'],
            ['showTrustIcons', 'Show trust icons (free shipping, returns, COD)'],
          ] as [keyof ProductPageLayout, string][]).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={!!pp[key]} onChange={(e) => setPP({ [key]: e.target.checked } as Partial<ProductPageLayout>)} className="rounded border-gray-300 text-primary-500" />
              {label}
            </label>
          ))}
        </div>
      </Card>
    </div>
  );
}
