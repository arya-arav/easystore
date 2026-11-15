export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { validateApiKey } from '@/lib/api-key-auth';
import { defaultGstRate, hasValue } from '@/lib/store-defaults';
import { prisma } from '@/lib/prisma';
import { fetchOptimizeUpload } from '@/lib/r2-upload';
import { ProductStatus, AgeGroup, Gender } from '@prisma/client';
import { createHash } from 'crypto';

// Auto-generate unique SKU
async function generateSku(name: string): Promise<string> {
  const prefix = name.toUpperCase().replace(/[^A-Z0-9\s]/g, '').trim()
    .split(/\s+/).slice(0, 2).map(w => w.slice(0, 4)).join('');
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  for (let i = 0; i < 10; i++) {
    const rand = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const sku = `BB-${prefix || 'PROD'}-${rand}`;
    const exists = await prisma.product.findUnique({ where: { sku } });
    if (!exists) return sku;
  }
  return `BB-${prefix || 'PROD'}-${Date.now().toString(36).toUpperCase().slice(-6)}`;
}

// Auto-generate unique slug
async function generateSlug(name: string): Promise<string> {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  let slug = base;
  let i = 1;
  while (await prisma.product.findUnique({ where: { slug } })) {
    slug = `${base}-${i++}`;
  }
  return slug;
}

export async function POST(request: NextRequest) {
  const { valid, scopes } = await validateApiKey(request);
  if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!scopes.includes('products:write')) return NextResponse.json({ error: 'Forbidden: missing products:write scope' }, { status: 403 });

  let data: any;
  try { data = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Validate required fields
  const missing = ['name', 'description', 'price', 'categoryId'].filter(f => !data[f]);
  if (missing.length) return NextResponse.json({ error: `Missing required fields: ${missing.join(', ')}` }, { status: 400 });

  // Validate category exists
  const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
  if (!category) return NextResponse.json({ error: `Category not found: ${data.categoryId}` }, { status: 400 });

  // Process images — fetch, optimize, upload
  const imageUrls: string[] = [];
  if (Array.isArray(data.images) && data.images.length > 0) {
    const results = await Promise.allSettled(
      data.images.slice(0, 10).map((url: string) => fetchOptimizeUpload(url))
    );
    for (const r of results) {
      if (r.status === 'fulfilled') imageUrls.push(r.value.url);
      else console.warn('Image fetch failed:', r.reason?.message);
    }
  }

  if (imageUrls.length === 0 && Array.isArray(data.images) && data.images.length > 0) {
    return NextResponse.json({ error: 'All image URLs failed to download' }, { status: 400 });
  }

  const sku = data.sku || await generateSku(data.name);
  const slug = await generateSlug(data.name);

  const product = await prisma.product.create({
    data: {
      name: data.name,
      slug,
      sku,
      description: data.description,
      shortDescription: data.shortDescription || null,
      price: parseFloat(data.price),
      compareAtPrice: data.compareAtPrice ? parseFloat(data.compareAtPrice) : null,
      gstRate: hasValue(data.gstRate) ? parseFloat(data.gstRate) : await defaultGstRate(),
      stock: parseInt(data.stock ?? 0),
      categoryId: data.categoryId,
      ageGroup: data.ageGroup as AgeGroup || null,
      gender: (data.gender as Gender) || Gender.UNISEX,
      status: (data.status as ProductStatus) || ProductStatus.DRAFT,
      isFeatured: data.isFeatured || false,
      isBestseller: data.isBestseller || false,
      isNewArrival: data.isNewArrival || false,
      weight: data.weight ? parseFloat(data.weight) : null,
      metaTitle: data.metaTitle || null,
      metaDescription: data.metaDescription || null,
      colors: data.colors ? JSON.stringify(data.colors) : null,
      sizes: data.sizes ? JSON.stringify(data.sizes) : null,
      images: imageUrls.length > 0 ? {
        create: imageUrls.map((url, i) => ({
          url,
          alt: data.name,
          sortOrder: i,
          isPrimary: i === 0,
        })),
      } : undefined,
    },
    include: { images: true },
  });

  return NextResponse.json({ success: true, product }, { status: 201 });
}
