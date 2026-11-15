export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { isOwnImage } from '@/lib/image-hosts';
import { validateApiKey } from '@/lib/api-key-auth';
import { prisma } from '@/lib/prisma';
import { fetchOptimizeUpload } from '@/lib/r2-upload';
import { ProductStatus, AgeGroup, Gender } from '@prisma/client';

export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { valid, scopes } = await validateApiKey(request);
  if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!scopes.includes('products:write')) return NextResponse.json({ error: 'Forbidden: missing products:write scope' }, { status: 403 });

  const existing = await prisma.product.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

  let data: any;
  try { data = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Process new images if provided
  let imageUrls: string[] | null = null;
  if (Array.isArray(data.images) && data.images.length > 0) {
    const results = await Promise.allSettled(
      data.images.slice(0, 10).map((url: string) =>
        isOwnImage(url)
          ? Promise.resolve({ url }) // already uploaded, skip re-upload
          : fetchOptimizeUpload(url)
      )
    );
    imageUrls = results.filter(r => r.status === 'fulfilled').map((r: any) => r.value.url);
  }

  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.shortDescription !== undefined) updateData.shortDescription = data.shortDescription;
  if (data.price !== undefined) updateData.price = parseFloat(data.price);
  if (data.compareAtPrice !== undefined) updateData.compareAtPrice = data.compareAtPrice ? parseFloat(data.compareAtPrice) : null;
  if (data.stock !== undefined) updateData.stock = parseInt(data.stock);
  if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
  if (data.ageGroup !== undefined) updateData.ageGroup = data.ageGroup as AgeGroup;
  if (data.gender !== undefined) updateData.gender = data.gender as Gender;
  if (data.status !== undefined) updateData.status = data.status as ProductStatus;
  if (data.isFeatured !== undefined) updateData.isFeatured = data.isFeatured;
  if (data.isBestseller !== undefined) updateData.isBestseller = data.isBestseller;
  if (data.isNewArrival !== undefined) updateData.isNewArrival = data.isNewArrival;
  if (data.metaTitle !== undefined) updateData.metaTitle = data.metaTitle;
  if (data.metaDescription !== undefined) updateData.metaDescription = data.metaDescription;
  if (data.colors !== undefined) updateData.colors = JSON.stringify(data.colors);
  if (data.sizes !== undefined) updateData.sizes = JSON.stringify(data.sizes);

  if (imageUrls) {
    updateData.images = {
      deleteMany: {},
      create: imageUrls.map((url, i) => ({ url, alt: data.name || existing.name, sortOrder: i, isPrimary: i === 0 })),
    };
  }

  const product = await prisma.product.update({
    where: { id: params.id },
    data: updateData,
    include: { images: true },
  });

  return NextResponse.json({ success: true, product });
}
