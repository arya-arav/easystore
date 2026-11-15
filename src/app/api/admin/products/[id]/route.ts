import { prisma } from '@/lib/prisma';
// Force dynamic rendering
export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import { setVariantStock } from '@/lib/variant-stock';
import { defaultGstRate, hasValue } from '@/lib/store-defaults';
import { setProductOrganization } from '@/lib/product-organization';



// GET - Get single product
export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'SELLER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: {
        category: true,
        images: { orderBy: { sortOrder: 'asc' } },
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error('Product GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 });
  }
}

// PUT - Update product
export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'SELLER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();

    // Update product
    const product = await prisma.product.update({
      where: { id: params.id },
      data: {
        name: data.name,
        slug: data.slug,
        sku: data.sku,
        description: data.description,
        shortDescription: data.shortDescription || null,
        price: parseFloat(data.price),
        compareAtPrice: data.compareAtPrice ? parseFloat(data.compareAtPrice) : null,
        gstRate: hasValue(data.gstRate) ? parseFloat(data.gstRate) : await defaultGstRate(),
        stock: parseInt(data.stock || '0'),
        lowStockThreshold: parseInt(data.lowStockThreshold || '5'),
        weight: data.weight ? parseFloat(data.weight) : null,
        dimensions: data.dimensions || null,
        categoryId: data.categoryId || null,
        ageGroup: data.ageGroup || null,
        gender: data.gender || 'UNISEX',
        status: data.status || 'DRAFT',
        isFeatured: data.isFeatured || false,
        isBestseller: data.isBestseller || false,
        isNewArrival: data.isNewArrival || false,
        metaTitle: data.metaTitle || null,
        metaDescription: data.metaDescription || null,
        colors: data.colors || null,
        sizes: data.sizes || null,
        sizeGuideType: data.sizeGuideType || null,
      },
    });

    // Update images if provided
    if (data.images && Array.isArray(data.images)) {
      // Delete existing images
      await prisma.productImage.deleteMany({
        where: { productId: params.id },
      });

      // Create new images
      if (data.images.length > 0) {
        const hasPrimary = data.images.some((img: any) => img.isPrimary);
        await prisma.productImage.createMany({
          data: data.images.map((img: any, index: number) => ({
            productId: params.id,
            url: img.url,
            alt: img.alt || data.name,
            sortOrder: index,
            isPrimary: hasPrimary ? !!img.isPrimary : index === 0,
          })),
        });
      }
    }

    // Stock per colour/size, when the form sends it (sets Product.stock to the total)
    if (Array.isArray(data.variantStock)) await setVariantStock(product.id, data.variantStock);
    await setProductOrganization(product.id, { tags: data.tags, collectionIds: data.collectionIds });

    return NextResponse.json(product);
  } catch (error: any) {
    console.error('Product PUT error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update product' }, { status: 500 });
  }
}

// DELETE - Delete product
export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'SELLER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // onDelete: SetNull handles OrderItem/Review references automatically
    await prisma.product.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Product DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
