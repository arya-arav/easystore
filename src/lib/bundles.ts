import { prisma } from '@/lib/prisma';
import { hasOptions } from '@/lib/product-options';

// "Frequently bought together": a product plus the two newest other active products
// in its category. The product page shows this bundle and the order total applies its
// discount (SiteSettings.bundleDiscount %) when every member is in the cart.

export const BUNDLE_EXTRA_ITEMS = 2;

/** The other products in a product's bundle, newest first. Empty when the category is too small. */
export async function getBundleMembers(productId: string, categoryId: string) {
  const others = await prisma.product.findMany({
    where: { categoryId, status: 'ACTIVE', id: { not: productId }, stock: { gt: 0 } },
    orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    take: 12,
    include: { images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 1 }, category: true },
  });
  // Members are added in one click, so they can't be products that need a size/colour choice.
  const members = others.filter((p) => !hasOptions(p)).slice(0, BUNDLE_EXTRA_ITEMS);
  return members.length === BUNDLE_EXTRA_ITEMS ? members : [];
}

export interface PricedLine {
  productId: string;
  categoryId: string | null;
  price: number; // INR per unit
  quantity: number;
}

export interface AppliedBundle {
  anchorId: string;
  productIds: string[];
  saving: number;
}

/**
 * Finds complete bundles in the cart. Each unit counts towards at most one bundle,
 * and each product anchors at most one bundle. Saving = percent of the members' prices.
 */
export async function findBundles(lines: PricedLine[], percent: number): Promise<AppliedBundle[]> {
  if (percent <= 0 || lines.length < BUNDLE_EXTRA_ITEMS + 1) return [];

  const remaining = new Map<string, number>();
  const price = new Map<string, number>();
  for (const l of lines) {
    remaining.set(l.productId, (remaining.get(l.productId) || 0) + l.quantity);
    price.set(l.productId, l.price);
  }

  const bundles: AppliedBundle[] = [];
  const anchors = Array.from(new Map(lines.filter((l) => l.categoryId).map((l) => [l.productId, l])).values());
  for (const anchor of anchors) {
    const members = await getBundleMembers(anchor.productId, anchor.categoryId!);
    const ids = [anchor.productId, ...members.map((m) => m.id)];
    if (members.length === 0 || !ids.every((id) => (remaining.get(id) || 0) > 0)) continue;

    ids.forEach((id) => remaining.set(id, (remaining.get(id) || 0) - 1));
    const total = ids.reduce((sum, id) => sum + (price.get(id) || 0), 0);
    bundles.push({ anchorId: anchor.productId, productIds: ids, saving: Math.round((total * percent) / 100) });
  }
  return bundles;
}
