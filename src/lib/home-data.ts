import { prisma } from '@/lib/prisma';
import { categoryCovers } from '@/lib/category-covers';
import { getPublicSettings, type PublicSettings } from '@/lib/public-settings';
import { queryProducts } from '@/lib/product-query';
import { getLiveBanners } from '@/lib/banners-server';
import { DEFAULT_PLACEMENTS, type PlacementSettings, type StoreBanner } from '@/lib/banners';

// Everything the homepage shows, fetched in parallel on the server so the page arrives
// fully rendered (instead of the browser making ~8 requests after it loads).

export interface HomeCategory {
  name: string;
  slug: string;
  image: string | null;
  cover?: string | null; // a product photo, used when image is missing or broken
  count: number;
}

export interface HomeData {
  settings: PublicSettings;
  heroBanners: StoreBanner[];
  middleBanners: StoreBanner[];
  heroPlacement: PlacementSettings;
  middlePlacement: PlacementSettings;
  categories: HomeCategory[];
  products: { featured: any[]; new: any[]; bestseller: any[] };
  testimonials: any[];
}

/** Top-level categories that have products (all of them if none do yet), in admin order. */
async function homeCategories(): Promise<HomeCategory[]> {
  const rows = await prisma.category.findMany({
    where: { isActive: true, parentId: null },
    orderBy: { sortOrder: 'asc' },
    select: { id: true, name: true, slug: true, image: true, _count: { select: { products: { where: { status: 'ACTIVE' } } } } },
  });
  const covers = await categoryCovers(rows.map((c) => c.id));
  const list = rows.map((c) => ({ name: c.name, slug: c.slug, image: c.image, cover: covers[c.id] || null, count: c._count.products }));
  const stocked = list.filter((c) => c.count > 0);
  return stocked.length > 0 ? stocked : list;
}

export async function getHomeData(): Promise<HomeData> {
  const [settings, hero, middle, categories, featured, newArrivals, bestsellers, latest, testimonials] = await Promise.all([
    getPublicSettings(),
    getLiveBanners('HOMEPAGE_HERO').catch(() => ({ banners: [], placement: DEFAULT_PLACEMENTS.HOMEPAGE_HERO })),
    getLiveBanners('HOMEPAGE_MIDDLE').catch(() => ({ banners: [], placement: DEFAULT_PLACEMENTS.HOMEPAGE_MIDDLE })),
    homeCategories().catch(() => []),
    queryProducts({ featured: true, limit: 8 }).catch(() => null),
    queryProducts({ newArrival: true, limit: 8 }).catch(() => null),
    queryProducts({ bestseller: true, limit: 8 }).catch(() => null),
    queryProducts({ limit: 8 }).catch(() => null),
    prisma.testimonial.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' }, take: 12 }).catch(() => []),
  ]);

  // Plain JSON for the client components (dates, decimals).
  return JSON.parse(
    JSON.stringify({
      settings,
      heroBanners: hero.banners,
      middleBanners: middle.banners,
      heroPlacement: hero.placement,
      middlePlacement: middle.placement,
      categories,
      products: {
        // With nothing marked Featured, the first tab shows the newest products.
        featured: featured?.products.length ? featured.products : latest?.products || [],
        new: newArrivals?.products || [],
        bestseller: bestsellers?.products || [],
      },
      testimonials,
    })
  );
}
