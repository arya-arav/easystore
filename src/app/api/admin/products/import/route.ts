import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireStaff } from '@/lib/admin-auth';
import { defaultGstRate } from '@/lib/store-defaults';

export const dynamic = 'force-dynamic';

// Rows use the same column names as the products CSV export. A row whose SKU already
// exists updates that product; any other row creates one. Colours, sizes and variant
// stock are left as they are (edit them on the product page).

const AGE = ['NEWBORN', 'INFANT', 'TODDLER', 'PRESCHOOL', 'KIDS', 'PRETEEN'];
const GENDER = ['UNISEX', 'BOYS', 'GIRLS'];
const STATUS = ['DRAFT', 'ACTIVE', 'ARCHIVED'];
const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const yes = (v: unknown) => /^(yes|true|1|y)$/i.test(String(v ?? '').trim());
const num = (v: unknown) => {
  const n = Number(String(v ?? '').replace(/[₹,\s]/g, ''));
  return Number.isFinite(n) ? n : NaN;
};

export async function POST(request: NextRequest) {
  if (!(await requireStaff())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { rows, dryRun } = await request.json().catch(() => ({}));
  if (!Array.isArray(rows) || rows.length === 0) return NextResponse.json({ error: 'The file has no rows' }, { status: 400 });
  if (rows.length > 1000) return NextResponse.json({ error: 'Import up to 1000 products at a time' }, { status: 400 });

  const categories = await prisma.category.findMany({ select: { id: true, name: true, slug: true } });
  const categoryId = (name: string) => {
    const n = name.trim().toLowerCase();
    return categories.find((c) => c.name.toLowerCase() === n || c.slug === n)?.id;
  };
  const existing = new Map((await prisma.product.findMany({ where: { sku: { in: rows.map((r: any) => String(r.SKU || '').trim()).filter(Boolean) } }, select: { id: true, sku: true } })).map((p) => [p.sku, p.id]));

  const results: { row: number; sku: string; action: 'create' | 'update' | 'error'; message?: string }[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i] || {};
    const line = i + 2; // row 1 is the header
    const sku = String(r.SKU || '').trim();
    const name = String(r.Name || '').trim();
    const price = num(r.Price);
    const errors: string[] = [];
    if (!sku) errors.push('SKU is missing');
    if (sku && seen.has(sku)) errors.push('SKU appears twice in the file');
    const isUpdate = existing.has(sku);
    if (!isUpdate && !name) errors.push('Name is missing');
    if (!isUpdate && !r.Price) errors.push('Price is missing');
    if (r.Price && !(price > 0)) errors.push('Price is not a number');
    const catId = r.Category ? categoryId(String(r.Category)) : undefined;
    if (r.Category && !catId) errors.push(`No category called "${r.Category}"`);
    if (!isUpdate && !r.Category) errors.push('Category is missing');
    if (r.Status && !STATUS.includes(String(r.Status).toUpperCase())) errors.push(`Status must be one of ${STATUS.join(', ')}`);
    seen.add(sku);
    if (errors.length) { results.push({ row: line, sku, action: 'error', message: errors.join('; ') }); continue; }

    const data: any = {};
    if (name) data.name = name;
    if (r.Slug || (!isUpdate && name)) data.slug = slugify(String(r.Slug || name));
    if (r.Description || !isUpdate) data.description = String(r.Description || r['Short description'] || name);
    if (r['Short description'] !== undefined) data.shortDescription = String(r['Short description']) || null;
    if (r.Price) data.price = price;
    if (r['Compare at price'] !== undefined) data.compareAtPrice = num(r['Compare at price']) > 0 ? num(r['Compare at price']) : null;
    if (r['GST %']) data.gstRate = num(r['GST %']);
    if (r.Stock !== undefined && r.Stock !== '') data.stock = Math.max(0, Math.floor(num(r.Stock) || 0));
    if (r['Low stock alert']) data.lowStockThreshold = Math.max(0, Math.floor(num(r['Low stock alert']) || 0));
    if (r['Weight (kg)'] !== undefined) data.weight = num(r['Weight (kg)']) > 0 ? num(r['Weight (kg)']) : null;
    if (r['Age group'] !== undefined) data.ageGroup = AGE.includes(String(r['Age group']).toUpperCase()) ? String(r['Age group']).toUpperCase() : null;
    if (r.Gender && GENDER.includes(String(r.Gender).toUpperCase())) data.gender = String(r.Gender).toUpperCase();
    if (r.Status) data.status = String(r.Status).toUpperCase();
    if (catId) data.categoryId = catId;
    if (r.Featured !== undefined) data.isFeatured = yes(r.Featured);
    if (r.Bestseller !== undefined) data.isBestseller = yes(r.Bestseller);
    if (r['New arrival'] !== undefined) data.isNewArrival = yes(r['New arrival']);
    if (r['SEO title'] !== undefined) data.metaTitle = String(r['SEO title']) || null;
    if (r['SEO description'] !== undefined) data.metaDescription = String(r['SEO description']) || null;
    const images = String(r.Images || '').split(/\s+/).filter((u) => /^https?:\/\//.test(u));

    if (data.slug) {
      const clash = await prisma.product.findUnique({ where: { slug: data.slug }, select: { sku: true } });
      if (clash && clash.sku !== sku) { results.push({ row: line, sku, action: 'error', message: `Slug "${data.slug}" is used by another product` }); continue; }
    }

    if (!dryRun) {
      try {
        const product = isUpdate
          ? await prisma.product.update({ where: { sku }, data })
          : await prisma.product.create({ data: { gstRate: await defaultGstRate(), ...data, sku, status: data.status || 'DRAFT' } });
        if (images.length) {
          await prisma.productImage.deleteMany({ where: { productId: product.id } });
          await prisma.productImage.createMany({ data: images.map((url, idx) => ({ productId: product.id, url, alt: product.name, sortOrder: idx, isPrimary: idx === 0 })) });
        }
      } catch (error: any) {
        results.push({ row: line, sku, action: 'error', message: error?.message?.split('\n').pop() || 'Could not save' });
        continue;
      }
    }
    results.push({ row: line, sku, action: isUpdate ? 'update' : 'create' });
  }

  return NextResponse.json({
    results,
    created: results.filter((r) => r.action === 'create').length,
    updated: results.filter((r) => r.action === 'update').length,
    failed: results.filter((r) => r.action === 'error').length,
  });
}
