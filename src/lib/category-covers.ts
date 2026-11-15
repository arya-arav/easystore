import { prisma } from '@/lib/prisma';

/**
 * A photo for each category from one of its own active products, used when the
 * category has no picture (or its picture link is broken).
 */
export async function categoryCovers(categoryIds: string[]): Promise<Record<string, string>> {
  if (!categoryIds.length) return {};
  const products = await prisma.product.findMany({
    where: { categoryId: { in: categoryIds }, status: 'ACTIVE', images: { some: {} } },
    select: { categoryId: true, isFeatured: true, images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 1, select: { url: true } } },
    orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
  });
  const covers: Record<string, string> = {};
  for (const p of products) {
    if (p.categoryId && !covers[p.categoryId] && p.images[0]?.url) covers[p.categoryId] = p.images[0].url;
  }
  return covers;
}
