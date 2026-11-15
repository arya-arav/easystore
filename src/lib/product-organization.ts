import { prisma } from '@/lib/prisma';

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

/** Sets a product's tags (by name, created as needed) and collections, when the form sends them. */
export async function setProductOrganization(productId: string, data: { tags?: unknown; collectionIds?: unknown }) {
  if (Array.isArray(data.tags)) {
    const names = Array.from(new Set(data.tags.map((t) => String(t).trim()).filter(Boolean))).slice(0, 30);
    const tags = [];
    for (const name of names) {
      const slug = slugify(name);
      if (!slug) continue;
      tags.push(await prisma.productTag.upsert({ where: { slug }, create: { name, slug }, update: {} }));
    }
    await prisma.product.update({ where: { id: productId }, data: { tags: { set: tags.map((t) => ({ id: t.id })) } } });
  }
  if (Array.isArray(data.collectionIds)) {
    await prisma.product.update({ where: { id: productId }, data: { collections: { set: data.collectionIds.map((id) => ({ id: String(id) })) } } });
  }
}
