// Cleans the admin category form into Category fields.
const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export function categoryData(data: any) {
  return {
    name: String(data.name || '').trim(),
    slug: slugify(String(data.slug || data.name || '')),
    description: data.description ? String(data.description) : null,
    image: data.image ? String(data.image) : null,
    parentId: data.parentId || null,
    isActive: data.isActive !== false,
    sortOrder: Number.isFinite(Number(data.sortOrder)) ? Math.round(Number(data.sortOrder)) : 0,
  };
}
