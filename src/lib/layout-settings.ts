// Storefront design settings: theme, homepage style, section order and product cards.
// Stored as JSON in SiteSettings.layout and edited in Admin → Settings → Design.
// Shared by the server (API routes) and the browser, so nothing here may touch process.env.

/** localStorage key for the last applied theme, read before first paint (app/layout.tsx). */
export const THEME_STORAGE_KEY = 'bb-theme';

// ── Themes ──────────────────────────────────────────────────────────────

export type FontId = 'system' | 'nunito' | 'poppins' | 'quicksand';

export const FONTS: Record<FontId, { label: string; cssVar: string }> = {
  system: { label: 'System default', cssVar: '' },
  nunito: { label: 'Nunito (rounded, friendly)', cssVar: 'var(--font-nunito)' },
  poppins: { label: 'Poppins (clean, modern)', cssVar: 'var(--font-poppins)' },
  quicksand: { label: 'Quicksand (soft, playful)', cssVar: 'var(--font-quicksand)' },
};

export type ThemeId = 'bubblegum' | 'peach' | 'sage' | 'ocean' | 'lavender' | 'sunshine';

export interface ThemePreset {
  name: string;
  description: string;
  primary: string; // Brand colour: buttons, links, highlights
  secondary: string; // Soft background tint
  font: FontId;
}

export const THEMES: Record<ThemeId, ThemePreset> = {
  bubblegum: { name: 'Bubblegum', description: 'Sweet pink with soft blush', primary: '#FF6B9D', secondary: '#FFE3EC', font: 'nunito' },
  peach: { name: 'Peach Sorbet', description: 'Warm coral and cream', primary: '#F28C6A', secondary: '#FFEDE5', font: 'poppins' },
  sage: { name: 'Sage Garden', description: 'Calm natural green', primary: '#7FAF8E', secondary: '#DDEBE7', font: 'nunito' },
  ocean: { name: 'Ocean Breeze', description: 'Fresh sky blue', primary: '#4A90C2', secondary: '#DDEEF8', font: 'poppins' },
  lavender: { name: 'Lavender Dream', description: 'Gentle purple', primary: '#9B7BD4', secondary: '#EEE6FA', font: 'quicksand' },
  sunshine: { name: 'Sunshine', description: 'Cheerful golden yellow', primary: '#E8A33D', secondary: '#FFF3D6', font: 'quicksand' },
};

/** The coral the header, footer and buttons have always used. Kept until a theme is chosen. */
export const DEFAULT_ACCENT = '#F28C6A';

// ── Homepage ────────────────────────────────────────────────────────────

export type HomeLayoutId = 'classic' | 'spotlight' | 'minimal' | 'boutique' | 'playful';

export const HOME_LAYOUTS: Record<HomeLayoutId, { name: string; description: string }> = {
  classic: { name: 'Classic', description: 'Hero with image beside the text, colourful category tiles and benefit cards.' },
  spotlight: { name: 'Spotlight', description: 'Full-width hero image with text on top, large category cards, a benefits strip.' },
  minimal: { name: 'Minimal', description: 'Compact centred hero, category chips and simple icon benefits. Lets products lead.' },
  boutique: { name: 'Boutique', description: 'Elegant and editorial: arch-framed hero image, large photo category cards, refined spacing.' },
  playful: { name: 'Playful', description: 'Bright and fun: colourful shapes, sticker badges, round category bubbles.' },
};

export type SectionId =
  | 'hero'
  | 'trustBar'
  | 'categories'
  | 'ageTiles'
  | 'middleBanner'
  | 'products'
  | 'benefits'
  | 'testimonials'
  | 'newsletter';

/** Sections that already had their own show/hide setting keep using it. */
export type SectionToggleKey =
  | 'showHeroSection'
  | 'showCategoriesSection'
  | 'showAgeShopTiles'
  | 'showFeaturedProducts'
  | 'showBenefitsSection'
  | 'showNewsletterSection';

export const SECTIONS: Record<SectionId, { label: string; note?: string; toggleKey?: SectionToggleKey }> = {
  hero: { label: 'Hero', note: 'Replaced by the Homepage Hero banners when you have any', toggleKey: 'showHeroSection' },
  trustBar: { label: 'Trust bar', note: 'Shipping, safety and returns strip' },
  categories: { label: 'Shop by category', toggleKey: 'showCategoriesSection' },
  ageTiles: { label: 'Shop by tiles (age, style or budget)', toggleKey: 'showAgeShopTiles' },
  middleBanner: { label: 'Middle banner', note: 'Shows when you have Homepage Middle banners' },
  products: { label: 'Products (Featured / New / Bestsellers)', toggleKey: 'showFeaturedProducts' },
  benefits: { label: 'Why choose us', toggleKey: 'showBenefitsSection' },
  testimonials: { label: 'Testimonials' },
  newsletter: { label: 'Newsletter signup', toggleKey: 'showNewsletterSection' },
};

export const DEFAULT_SECTION_ORDER: SectionId[] = [
  'hero',
  'trustBar',
  'categories',
  'ageTiles',
  'middleBanner',
  'products',
  'benefits',
  'testimonials',
  'newsletter',
];

// ── Product cards ───────────────────────────────────────────────────────

export type CardStyleId = 'classic' | 'soft' | 'minimal';
export type ImageShape = 'square' | 'portrait';
export type GridColumns = 3 | 4 | 5;

export const CARD_STYLES: Record<CardStyleId, { name: string; description: string }> = {
  classic: { name: 'Classic', description: 'Bordered card with a round cart button beside the price.' },
  soft: { name: 'Soft', description: 'Borderless card on a tinted image, full-width Add to Cart button.' },
  minimal: { name: 'Minimal', description: 'Image and text only. Add to Cart appears over the image.' },
};

// ── Product page ────────────────────────────────────────────────────────

export type GalleryStyle = 'thumbs-below' | 'thumbs-side' | 'grid' | 'stacked';
export type GallerySplit = 'wide' | 'even' | 'narrow';
export type DetailsStyle = 'tabs' | 'accordion' | 'expanded';

export const GALLERY_STYLES: Record<GalleryStyle, { name: string; description: string }> = {
  'thumbs-below': { name: 'Thumbnails below', description: 'One big photo with a row of thumbnails under it.' },
  'thumbs-side': { name: 'Thumbnails beside', description: 'Thumbnails in a column on the left of the big photo.' },
  grid: { name: 'Photo grid', description: 'All photos in a two-column grid (great with many photos).' },
  stacked: { name: 'Stacked', description: 'Photos one under another, full width, as on Medusa’s store.' },
};
export const GALLERY_SPLITS: Record<GallerySplit, { name: string; className: string }> = {
  wide: { name: 'Photos wider', className: 'lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]' },
  even: { name: 'Half and half', className: 'lg:grid-cols-2' },
  narrow: { name: 'Details wider', className: 'lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]' },
};
export const DETAILS_STYLES: Record<DetailsStyle, { name: string; description: string }> = {
  tabs: { name: 'Tabs', description: 'Description, size guide, shipping and reviews as tabs (accordion on phones).' },
  accordion: { name: 'Accordion', description: 'Sections that open and close, on every screen size.' },
  expanded: { name: 'All open', description: 'Every section shown one after another.' },
};

export interface ProductPageLayout {
  gallery: GalleryStyle;
  split: GallerySplit;
  details: DetailsStyle;
  imageShape: ImageShape; // photo shape on the product page
  zoom: boolean; // hover zoom on desktop
  stickyGallery: boolean; // photos stay in view while details scroll
  mobileBar: boolean; // add-to-cart bar on phones
  showTrustIcons: boolean;
  showDeliveryEstimate: boolean;
  showBuyNow: boolean;
}

export const DEFAULT_PRODUCT_PAGE: ProductPageLayout = {
  gallery: 'thumbs-below', split: 'even', details: 'tabs', imageShape: 'square',
  zoom: true, stickyGallery: true, mobileBar: true, showTrustIcons: true, showDeliveryEstimate: true, showBuyNow: true,
};

function parseProductPage(raw: any): ProductPageLayout {
  const v = raw && typeof raw === 'object' ? raw : {};
  const bool = (k: keyof ProductPageLayout) => (typeof v[k] === 'boolean' ? v[k] : DEFAULT_PRODUCT_PAGE[k]) as boolean;
  return {
    gallery: pick(v.gallery, Object.keys(GALLERY_STYLES) as GalleryStyle[], DEFAULT_PRODUCT_PAGE.gallery),
    split: pick(v.split, Object.keys(GALLERY_SPLITS) as GallerySplit[], DEFAULT_PRODUCT_PAGE.split),
    details: pick(v.details, Object.keys(DETAILS_STYLES) as DetailsStyle[], DEFAULT_PRODUCT_PAGE.details),
    imageShape: pick(v.imageShape, ['square', 'portrait'] as const, DEFAULT_PRODUCT_PAGE.imageShape),
    zoom: bool('zoom'), stickyGallery: bool('stickyGallery'), mobileBar: bool('mobileBar'),
    showTrustIcons: bool('showTrustIcons'), showDeliveryEstimate: bool('showDeliveryEstimate'), showBuyNow: bool('showBuyNow'),
  };
}

// ── Testimonials section ──

export type TestimonialStyle = 'cards' | 'carousel' | 'spotlight' | 'wall' | 'quotes';
export type SectionBackground = 'soft' | 'white' | 'brand' | 'dark';
export type TestimonialCard = 'shadow' | 'border' | 'flat';

export const TESTIMONIAL_STYLES: Record<TestimonialStyle, { name: string; description: string }> = {
  cards: { name: 'Card grid', description: 'Neat rows of review cards' },
  carousel: { name: 'Sliding cards', description: 'A row of cards that scrolls sideways' },
  spotlight: { name: 'Big quote', description: 'One large review at a time' },
  wall: { name: 'Wall of love', description: 'Staggered cards of different heights' },
  quotes: { name: 'Simple quotes', description: 'Quotes only, no boxes' },
};

export interface TestimonialsDesign {
  style: TestimonialStyle;
  columns: 2 | 3 | 4;
  limit: number; // how many reviews to show
  background: SectionBackground;
  card: TestimonialCard;
  align: 'center' | 'left';
  eyebrow: string;
  title: string;
  subtitle: string;
  showSummary: boolean; // average rating under the heading
  showRating: boolean;
  showAvatar: boolean;
  showLocation: boolean;
  showProduct: boolean;
  clamp: boolean; // shorten long reviews
  autoplay: number; // seconds for sliding styles; 0 = off
}

export const TESTIMONIAL_LIMITS = [3, 4, 6, 8, 12];

export const DEFAULT_TESTIMONIALS: TestimonialsDesign = {
  style: 'cards', columns: 4, limit: 4, background: 'soft', card: 'shadow', align: 'center',
  eyebrow: 'Reviews', title: '', subtitle: '', // empty title = the shop type's (e.g. “What Parents Are Saying”)
  showSummary: true, showRating: true, showAvatar: true, showLocation: true, showProduct: true, clamp: false, autoplay: 6,
};

function parseTestimonials(raw: any): TestimonialsDesign {
  const v = raw && typeof raw === 'object' ? raw : {};
  const d = DEFAULT_TESTIMONIALS;
  const bool = (k: keyof TestimonialsDesign) => (typeof v[k] === 'boolean' ? v[k] : d[k]) as boolean;
  const text = (k: 'eyebrow' | 'title' | 'subtitle', max: number) => (typeof v[k] === 'string' ? v[k].slice(0, max) : d[k]);
  return {
    style: pick(v.style, Object.keys(TESTIMONIAL_STYLES) as TestimonialStyle[], d.style),
    columns: ([2, 3, 4] as const).includes(v.columns) ? v.columns : d.columns,
    limit: TESTIMONIAL_LIMITS.includes(v.limit) ? v.limit : d.limit,
    background: pick(v.background, ['soft', 'white', 'brand', 'dark'] as const, d.background),
    card: pick(v.card, ['shadow', 'border', 'flat'] as const, d.card),
    align: pick(v.align, ['center', 'left'] as const, d.align),
    eyebrow: text('eyebrow', 40), title: text('title', 80), subtitle: text('subtitle', 160),
    showSummary: bool('showSummary'), showRating: bool('showRating'), showAvatar: bool('showAvatar'),
    showLocation: bool('showLocation'), showProduct: bool('showProduct'), clamp: bool('clamp'),
    autoplay: [0, 4, 6, 8, 10].includes(v.autoplay) ? v.autoplay : d.autoplay,
  };
}

// ── Config ──────────────────────────────────────────────────────────────

export interface LayoutConfig {
  theme: ThemeId | null; // null = keep the original look
  accentColor: string; // Header, footer and button colour (the Tailwind "primary" scale)
  font: FontId;
  homeLayout: HomeLayoutId;
  sectionOrder: SectionId[];
  hiddenSections: SectionId[]; // Only for sections without their own toggleKey
  cardStyle: CardStyleId;
  imageShape: ImageShape;
  gridColumns: GridColumns;
  productPage: ProductPageLayout;
  testimonials: TestimonialsDesign;
}

export const DEFAULT_LAYOUT: LayoutConfig = {
  theme: null,
  accentColor: DEFAULT_ACCENT,
  font: 'system',
  homeLayout: 'classic',
  sectionOrder: DEFAULT_SECTION_ORDER,
  hiddenSections: [],
  cardStyle: 'classic',
  imageShape: 'square',
  gridColumns: 4,
  productPage: DEFAULT_PRODUCT_PAGE,
  testimonials: DEFAULT_TESTIMONIALS,
};

const isHexColor = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v);
const pick = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T =>
  allowed.includes(v as T) ? (v as T) : fallback;

/** Parses stored JSON into a complete, valid config. Unknown or missing values fall back to defaults. */
export function parseLayoutConfig(raw: string | null | undefined | Partial<LayoutConfig>): LayoutConfig {
  let stored: Record<string, any> = {};
  if (typeof raw === 'string') {
    try {
      stored = JSON.parse(raw) || {};
    } catch {
      stored = {};
    }
  } else if (raw && typeof raw === 'object') {
    stored = raw;
  }

  const allSections = Object.keys(SECTIONS) as SectionId[];
  const savedOrder: SectionId[] = Array.isArray(stored.sectionOrder)
    ? stored.sectionOrder.filter((id: unknown, i: number, arr: unknown[]) => allSections.includes(id as SectionId) && arr.indexOf(id) === i)
    : [];
  // Sections missing from a saved order (e.g. added in a later version) go in their default position.
  const sectionOrder = [...savedOrder];
  for (const id of DEFAULT_SECTION_ORDER) {
    if (!sectionOrder.includes(id)) {
      const before = DEFAULT_SECTION_ORDER.slice(0, DEFAULT_SECTION_ORDER.indexOf(id)).reverse().find((s) => sectionOrder.includes(s));
      sectionOrder.splice(before ? sectionOrder.indexOf(before) + 1 : 0, 0, id);
    }
  }

  const hiddenSections: SectionId[] = Array.isArray(stored.hiddenSections)
    ? stored.hiddenSections.filter((id: unknown) => allSections.includes(id as SectionId) && !SECTIONS[id as SectionId].toggleKey)
    : [];

  return {
    theme: stored.theme && stored.theme in THEMES ? stored.theme : null,
    accentColor: isHexColor(stored.accentColor) ? stored.accentColor : DEFAULT_ACCENT,
    font: pick(stored.font, Object.keys(FONTS) as FontId[], DEFAULT_LAYOUT.font),
    homeLayout: pick(stored.homeLayout, Object.keys(HOME_LAYOUTS) as HomeLayoutId[], DEFAULT_LAYOUT.homeLayout),
    sectionOrder,
    hiddenSections,
    cardStyle: pick(stored.cardStyle, Object.keys(CARD_STYLES) as CardStyleId[], DEFAULT_LAYOUT.cardStyle),
    imageShape: pick(stored.imageShape, ['square', 'portrait'] as const, DEFAULT_LAYOUT.imageShape),
    gridColumns: ([3, 4, 5] as const).includes(stored.gridColumns) ? stored.gridColumns : DEFAULT_LAYOUT.gridColumns,
    productPage: parseProductPage(stored.productPage),
    testimonials: parseTestimonials(stored.testimonials),
  };
}

export function serializeLayoutConfig(input: unknown): string {
  return JSON.stringify(parseLayoutConfig(input as Partial<LayoutConfig>));
}

/** Products per page on category pages. */
export const CATEGORY_PAGE_SIZE = 24;

/**
 * Product grid classes for the chosen number of columns. Pages with a filter
 * sidebar get one column fewer so cards don't get too narrow.
 */
export function productGridClass(columns: GridColumns, hasSidebar = false): string {
  // With the filter sidebar, wide screens still fit the chosen count (cards ~270px at 1440px)
  const desktop = hasSidebar ? Math.max(3, columns) : columns;
  // 2 columns on phones, 3 from 1024px, the chosen count from 1280px (Medusa storefront)
  const xl: Record<number, string> = { 3: 'xl:grid-cols-3', 4: 'xl:grid-cols-4', 5: 'xl:grid-cols-5' };
  return `grid grid-cols-2 lg:grid-cols-3 ${xl[desktop]} gap-x-4 gap-y-6 sm:gap-x-6 sm:gap-y-8`;
}
