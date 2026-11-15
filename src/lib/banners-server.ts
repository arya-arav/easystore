import { prisma } from '@/lib/prisma';
import { parsePlacement, liveBannerWhere, toStoreBanner, type BannerPosition, type PlacementSettings, type StoreBanner } from '@/lib/banners';

export async function getPlacement(position: BannerPosition): Promise<PlacementSettings> {
  const row = await prisma.bannerPlacement.findUnique({ where: { position } }).catch(() => null);
  return parsePlacement(position, row?.settings);
}

/** Live banners for a position plus that position's layout. */
export async function getLiveBanners(position: BannerPosition): Promise<{ banners: StoreBanner[]; placement: PlacementSettings }> {
  const [rows, placement] = await Promise.all([
    prisma.banner.findMany({ where: liveBannerWhere(position), orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] }),
    getPlacement(position),
  ]);
  return { banners: rows.map(toStoreBanner), placement };
}
