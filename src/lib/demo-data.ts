import { prisma } from '@/lib/prisma';
import { getShopType, type ShopTypeId } from '@/lib/shop-types';

// One-click demo data for a shop type, and one-click removal. Everything created is
// recorded in DemoItem so removal deletes exactly that (plus any product whose SKU starts
// with DEMO-, e.g. from a demo CSV import). Real products and orders are never touched.

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

/** Makes sure the shop type's categories exist. Returns slug → id. Records new ones as demo when asked. */
export async function ensureCategories(typeId: ShopTypeId, opts: { demo: boolean }): Promise<Record<string, string>> {
  const type = getShopType(typeId);
  const ids: Record<string, string> = {};
  const existing = await prisma.category.findMany({ where: { slug: { in: type.categories.map((c) => c.slug) } }, select: { id: true, slug: true } });
  for (const c of existing) ids[c.slug] = c.id;
  let order = await prisma.category.count();
  for (const c of type.categories) {
    if (ids[c.slug]) continue;
    const row = await prisma.category.create({
      data: { name: c.name, slug: c.slug, description: c.description, isActive: true, sortOrder: order++ },
    });
    ids[c.slug] = row.id;
    if (opts.demo) await prisma.demoItem.create({ data: { model: 'category', recordId: row.id } }).catch(() => {});
  }
  return ids;
}

export async function installDemo(typeId: ShopTypeId) {
  const type = getShopType(typeId);
  const categoryIds = await ensureCategories(typeId, { demo: true });
  const created: { id: string; name: string }[] = [];
  let i = 0;

  for (const [slug, products] of Object.entries(type.demo)) {
    const categoryId = categoryIds[slug];
    if (!categoryId) continue;
    for (const [n, [name, price, compareAt]] of products.entries()) {
      i++;
      const base = slugify(name);
      const productSlug = (await prisma.product.findUnique({ where: { slug: base }, select: { id: true } })) ? `${base}-demo-${Date.now().toString(36)}${i}` : base;
      const sku = `DEMO-${slug.slice(0, 6).toUpperCase()}-${Date.now().toString(36).toUpperCase()}${i}`;
      const image = `/demo-images/${type.id}.${slug}-${n + 1}.svg`;
      const category = type.categories.find((c) => c.slug === slug);
      const product = await prisma.product.create({
        data: {
          name,
          slug: productSlug,
          sku,
          description: `${name}. ${category?.description || ''}. This is a demo product: edit or delete it, or remove all demo data in Settings → Store type.`.replace('. .', '.'),
          shortDescription: category?.description || null,
          price,
          compareAtPrice: compareAt || null,
          stock: 25 + ((i * 7) % 40),
          categoryId,
          status: 'ACTIVE',
          isFeatured: n === 0,
          isNewArrival: n === 1,
          isBestseller: n === 2,
          primaryImage: image,
          ...(type.ages ? { ageGroup: type.ages[i % type.ages.length].value as never } : {}),
          ...(type.audience ? { gender: type.audience.options[i % type.audience.options.length].value } : {}),
          images: { create: [{ url: image, alt: name, isPrimary: true, sortOrder: 0 }] },
        },
        select: { id: true, name: true },
      });
      created.push(product);
      await prisma.demoItem.create({ data: { model: 'product', recordId: product.id } });
    }
  }

  const lastOrder = (await prisma.testimonial.findFirst({ orderBy: { sortOrder: 'desc' }, select: { sortOrder: true } }))?.sortOrder ?? -1;
  for (const [k, [name, location, rating, text]] of type.reviews.entries()) {
    const t = await prisma.testimonial.create({
      data: { name, location, rating, text, product: created[k * 4]?.name || null, avatar: null, isActive: true, sortOrder: lastOrder + 1 + k },
    });
    await prisma.demoItem.create({ data: { model: 'testimonial', recordId: t.id } });
  }

  return { products: created.length, reviews: type.reviews.length };
}

export async function demoCounts() {
  const [tracked, skuDemo] = await Promise.all([
    prisma.demoItem.groupBy({ by: ['model'], _count: true }),
    prisma.product.count({ where: { sku: { startsWith: 'DEMO' } } }),
  ]);
  const by = Object.fromEntries(tracked.map((t) => [t.model, t._count])) as Record<string, number>;
  return { products: Math.max(by.product || 0, skuDemo), categories: by.category || 0, reviews: by.testimonial || 0 };
}

export async function removeDemo() {
  const items = await prisma.demoItem.findMany();
  const ids = (model: string) => items.filter((d) => d.model === model).map((d) => d.recordId);
  const productIds = [
    ...new Set([...ids('product'), ...(await prisma.product.findMany({ where: { sku: { startsWith: 'DEMO' } }, select: { id: true } })).map((p) => p.id)]),
  ];

  let removed = 0;
  let archived = 0;
  for (const id of productIds) {
    // Products that were ordered can't be deleted (the order keeps its line); hide them instead.
    const ordered = await prisma.orderItem.count({ where: { productId: id } });
    if (ordered) {
      await prisma.product.update({ where: { id }, data: { status: 'ARCHIVED' } }).catch(() => {});
      archived++;
      continue;
    }
    await prisma.cartItem.deleteMany({ where: { productId: id } }).catch(() => {});
    await prisma.wishlistItem.deleteMany({ where: { productId: id } }).catch(() => {});
    await prisma.review.deleteMany({ where: { productId: id } }).catch(() => {});
    await prisma.product.delete({ where: { id } }).then(() => removed++).catch(() => {});
  }

  const reviews = await prisma.testimonial.deleteMany({ where: { id: { in: ids('testimonial') } } });

  // Demo categories go only if nothing real was put in them.
  let categories = 0;
  for (const id of ids('category')) {
    const [products, children] = await Promise.all([
      prisma.product.count({ where: { categoryId: id } }),
      prisma.category.count({ where: { parentId: id } }),
    ]);
    if (!products && !children) await prisma.category.delete({ where: { id } }).then(() => categories++).catch(() => {});
  }

  await prisma.demoItem.deleteMany();
  return { products: removed, archived, reviews: reviews.count, categories };
}
