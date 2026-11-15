// Cleans the admin collection form into Collection fields.
const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export function collectionData(body: any) {
  return {
    title: String(body.title || '').trim(),
    handle: slugify(String(body.handle || body.title || '')),
    description: String(body.description || '').trim() || null,
    image: String(body.image || '').trim() || null,
    isActive: body.isActive !== false,
    sortOrder: Number.isFinite(Number(body.sortOrder)) ? Math.round(Number(body.sortOrder)) : 0,
  };
}
