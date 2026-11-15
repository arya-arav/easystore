// Banner options shared by the admin editor, the API and the storefront.
// Per-banner look lives in Banner.design (JSON); per-placement layout lives in
// BannerPlacement.settings (JSON). Both are parsed here so bad or missing values
// always fall back to sensible defaults.

export type BannerPosition = 'HOMEPAGE_HERO' | 'HOMEPAGE_MIDDLE' | 'CATEGORY_TOP' | 'PRODUCT_PAGE';
export const BANNER_POSITIONS: BannerPosition[] = ['HOMEPAGE_HERO', 'HOMEPAGE_MIDDLE', 'CATEGORY_TOP', 'PRODUCT_PAGE'];
export const isBannerPosition = (v: unknown): v is BannerPosition => BANNER_POSITIONS.includes(v as BannerPosition);

export const PLACEMENTS: Record<BannerPosition, { name: string; where: string; size: string }> = {
  HOMEPAGE_HERO: { name: 'Homepage hero', where: 'Top of the homepage. Replaces the hero section while any banner here is live.', size: '1920 × 600 px (phone: 1080 × 1080 px)' },
  HOMEPAGE_MIDDLE: { name: 'Homepage strip', where: 'Between homepage sections (move it in Settings → Design → Homepage sections).', size: '1920 × 360 px (phone: 1080 × 540 px)' },
  CATEGORY_TOP: { name: 'Category pages', where: 'Top of category pages. Can be limited to chosen categories.', size: '1920 × 480 px (phone: 1080 × 540 px)' },
  PRODUCT_PAGE: { name: 'Product pages', where: 'Under the product details, above “You may also like”.', size: '1920 × 360 px (phone: 1080 × 540 px)' },
};

/* ── Placement layout ────────────────────────────────────────── */

export type BannerDisplay = 'carousel' | 'fade' | 'peek' | 'grid';
export type BannerHeight = 'slim' | 'short' | 'medium' | 'tall' | 'fit';
export type BannerWidth = 'full' | 'contained';

export const DISPLAYS: Record<BannerDisplay, { name: string; description: string }> = {
  carousel: { name: 'Slider', description: 'One banner at a time, slides sideways' },
  fade: { name: 'Fade', description: 'One banner at a time, cross-fades' },
  peek: { name: 'Peek carousel', description: 'Next banner peeks in at the edge; swipeable' },
  grid: { name: 'Side by side', description: 'All banners shown together as tiles' },
};

// Full class names written out so Tailwind generates them (wide = desktop shape without md:, for previews).
export const HEIGHTS: Record<BannerHeight, { name: string; desktop: string; wide: string; mobile: string; tile: string }> = {
  slim: { name: 'Slim', desktop: 'md:aspect-[16/3]', wide: 'aspect-[16/3]', mobile: 'aspect-[5/2]', tile: 'aspect-[5/2]' },
  short: { name: 'Short', desktop: 'md:aspect-[4/1]', wide: 'aspect-[4/1]', mobile: 'aspect-[2/1]', tile: 'aspect-[2/1]' },
  medium: { name: 'Medium', desktop: 'md:aspect-[16/5]', wide: 'aspect-[16/5]', mobile: 'aspect-[4/3]', tile: 'aspect-[4/3]' },
  tall: { name: 'Tall', desktop: 'md:aspect-[2/1]', wide: 'aspect-[2/1]', mobile: 'aspect-square', tile: 'aspect-[4/5]' },
  fit: { name: 'Fit image', desktop: '', wide: '', mobile: '', tile: '' },
};

export interface PlacementSettings {
  display: BannerDisplay;
  height: BannerHeight;
  width: BannerWidth;
  rounded: boolean;
  columns: 2 | 3; // side-by-side tiles per row on desktop
  autoplay: number; // seconds; 0 = off
  arrows: boolean;
  dots: boolean;
}

export const DEFAULT_PLACEMENTS: Record<BannerPosition, PlacementSettings> = {
  HOMEPAGE_HERO: { display: 'carousel', height: 'medium', width: 'full', rounded: false, columns: 2, autoplay: 5, arrows: true, dots: true },
  HOMEPAGE_MIDDLE: { display: 'carousel', height: 'slim', width: 'contained', rounded: true, columns: 2, autoplay: 5, arrows: true, dots: true },
  CATEGORY_TOP: { display: 'carousel', height: 'short', width: 'contained', rounded: true, columns: 2, autoplay: 5, arrows: true, dots: true },
  PRODUCT_PAGE: { display: 'grid', height: 'slim', width: 'contained', rounded: true, columns: 2, autoplay: 0, arrows: false, dots: false },
};

export const AUTOPLAY_CHOICES = [0, 3, 4, 5, 7, 10];

const pick = <T,>(v: unknown, allowed: readonly T[], fallback: T): T => (allowed.includes(v as T) ? (v as T) : fallback);

export function parsePlacement(position: BannerPosition, raw: unknown): PlacementSettings {
  const d = DEFAULT_PLACEMENTS[position];
  const v = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const bool = (k: 'rounded' | 'arrows' | 'dots') => (typeof v[k] === 'boolean' ? (v[k] as boolean) : d[k]);
  return {
    display: pick(v.display, Object.keys(DISPLAYS) as BannerDisplay[], d.display),
    height: pick(v.height, Object.keys(HEIGHTS) as BannerHeight[], d.height),
    width: pick(v.width, ['full', 'contained'] as const, d.width),
    rounded: bool('rounded'),
    columns: pick(v.columns, [2, 3] as const, d.columns),
    autoplay: pick(v.autoplay, AUTOPLAY_CHOICES, d.autoplay),
    arrows: bool('arrows'),
    dots: bool('dots'),
  };
}

/* ── Per-banner design ───────────────────────────────────────── */

export type TextX = 'left' | 'center' | 'right';
export type TextY = 'top' | 'middle' | 'bottom';
export type TextTone = 'light' | 'dark';
export type Overlay = 'none' | 'soft' | 'strong';

export interface BannerDesign {
  mobileImage: string; // optional separate picture for phones
  badge: string; // small label above the title
  buttonText: string; // shows a button when set
  showText: boolean; // off when the picture already has text on it
  textX: TextX;
  textY: TextY;
  textTone: TextTone;
  overlay: Overlay;
  newTab: boolean;
  categories: string[]; // CATEGORY_TOP only: category slugs; empty = every category
}

export const DEFAULT_DESIGN: BannerDesign = {
  mobileImage: '', badge: '', buttonText: '', showText: true,
  textX: 'left', textY: 'middle', textTone: 'light', overlay: 'soft', newTab: false, categories: [],
};

const str = (v: unknown, max = 300) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export function parseDesign(raw: unknown): BannerDesign {
  const v = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    mobileImage: str(v.mobileImage, 1000),
    badge: str(v.badge, 40),
    buttonText: str(v.buttonText, 40),
    showText: typeof v.showText === 'boolean' ? v.showText : true,
    textX: pick(v.textX, ['left', 'center', 'right'] as const, 'left'),
    textY: pick(v.textY, ['top', 'middle', 'bottom'] as const, 'middle'),
    textTone: pick(v.textTone, ['light', 'dark'] as const, 'light'),
    overlay: pick(v.overlay, ['none', 'soft', 'strong'] as const, 'soft'),
    newTab: v.newTab === true,
    categories: Array.isArray(v.categories) ? v.categories.filter((c): c is string => typeof c === 'string').slice(0, 100) : [],
  };
}

/* ── Status ──────────────────────────────────────────────────── */

export type BannerStatus = 'live' | 'scheduled' | 'ended' | 'hidden';

export function bannerStatus(b: { isActive: boolean; showFrom?: string | Date | null; showTo?: string | Date | null }, now = new Date()): BannerStatus {
  if (!b.isActive) return 'hidden';
  if (b.showFrom && new Date(b.showFrom) > now) return 'scheduled';
  if (b.showTo && new Date(b.showTo) < now) return 'ended';
  return 'live';
}

/** Prisma filter for banners that are switched on and inside their date window. */
export function liveBannerWhere(position: BannerPosition, now = new Date()) {
  return {
    isActive: true,
    position,
    OR: [
      { showFrom: null, showTo: null },
      { showFrom: { lte: now }, showTo: null },
      { showFrom: null, showTo: { gte: now } },
      { showFrom: { lte: now }, showTo: { gte: now } },
    ],
  };
}

/** What the storefront needs for one banner. */
export interface StoreBanner {
  id: string;
  title: string;
  subtitle?: string | null;
  image: string;
  link?: string | null;
  design: BannerDesign;
}

export const toStoreBanner = (b: { id: string; title: string; subtitle: string | null; image: string; link: string | null; design?: unknown }): StoreBanner => ({
  id: b.id, title: b.title, subtitle: b.subtitle, image: b.image, link: b.link, design: parseDesign(b.design),
});
