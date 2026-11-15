import { prisma } from '@/lib/prisma';
// Force dynamic rendering
export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import { setVariantStock } from '@/lib/variant-stock';
import { defaultGstRate, hasValue } from '@/lib/store-defaults';
import { setProductOrganization } from '@/lib/product-organization';
import { requireStaff } from '@/lib/admin-auth';
import { csvResponse, listParams } from '@/lib/admin-list';



const SORTS = {
  updated_desc: { updatedAt: 'desc' },
  created_desc: { createdAt: 'desc' },
  name_asc: { name: 'asc' },
  price_desc: { price: 'desc' },
  price_asc: { price: 'asc' },
  stock_asc: { stock: 'asc' },
} as const;

// GET - products for admin: ?q=&status=&category=&stock=low|out|in&sort=&page=&limit= (&format=csv)
export async function GET(request: NextRequest) {
  try {
    if (!(await requireStaff())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { sp, q, skip, limit, orderBy } = listParams(request, SORTS, 'updated_desc');

    const where: any = {};
    if (sp.get('status')) where.status = sp.get('status');
    if (sp.get('category')) where.categoryId = sp.get('category');
    const stock = sp.get('stock') || (sp.get('lowStock') === 'true' ? 'low' : '');
    if (stock === 'out') where.stock = { lte: 0 };
    if (stock === 'in') where.stock = { gt: 0 };
    if (stock === 'low') where.AND = [{ stock: { gt: 0 } }, { stock: { lte: prisma.product.fields.lowStockThreshold } }];
    if (q) {
      const has = { contains: q, mode: 'insensitive' };
      where.OR = [{ name: has }, { sku: has }, { slug: has }];
    }

    if (sp.get('format') === 'csv') {
      const products = await prisma.product.findMany({
        where,
        include: { category: { select: { name: true } }, images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] }, variants: true },
        orderBy,
        take: 5000,
      });
      return csvResponse(
        `products-${new Date().toISOString().slice(0, 10)}.csv`,
        ['Name', 'Slug', 'SKU', 'Status', 'Category', 'Price', 'Compare at price', 'GST %', 'Stock', 'Low stock alert', 'Weight (kg)', 'Age group', 'Gender', 'Colours', 'Sizes', 'Variant stock', 'Featured', 'Bestseller', 'New arrival', 'Short description', 'Description', 'SEO title', 'SEO description', 'Images'],
        products.map((p) => [
          p.name, p.slug, p.sku, p.status, p.category?.name, p.price, p.compareAtPrice, p.gstRate, p.stock, p.lowStockThreshold, p.weight, p.ageGroup, p.gender,
          parseNames(p.colors, 'name'), parseNames(p.sizes, 'label'),
          p.variants.map((v) => `${[v.color, v.size].filter(Boolean).join('/')}=${v.stock}`).join('; '),
          p.isFeatured ? 'yes' : '', p.isBestseller ? 'yes' : '', p.isNewArrival ? 'yes' : '',
          p.shortDescription, p.description, p.metaTitle, p.metaDescription, p.images.map((i) => i.url).join(' '),
        ])
      );
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: { select: { name: true } },
          images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 1 },
          _count: { select: { variants: true } },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    return NextResponse.json({ products, total });
  } catch (error) {
    console.error('Products GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

function parseNames(raw: string | null, key: string) {
  try {
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.map((x: any) => x?.[key]).filter(Boolean).join('; ') : '';
  } catch {
    return '';
  }
}

// POST - Create new product
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'SELLER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();

    const product = await prisma.product.create({
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
        categoryId: data.categoryId,
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

    // Create images if provided
    if (data.images && Array.isArray(data.images) && data.images.length > 0) {
      // Ensure exactly one primary — use the one marked, or fall back to first
      const hasPrimary = data.images.some((img: any) => img.isPrimary);
      await prisma.productImage.createMany({
        data: data.images.map((img: any, index: number) => ({
          productId: product.id,
          url: img.url,
          alt: img.alt || product.name,
          sortOrder: index,
          isPrimary: hasPrimary ? !!img.isPrimary : index === 0,
        })),
      });
    }

    // Stock per colour/size, when the form sends it (sets Product.stock to the total)
    if (Array.isArray(data.variantStock)) await setVariantStock(product.id, data.variantStock);
    await setProductOrganization(product.id, { tags: data.tags, collectionIds: data.collectionIds });

    return NextResponse.json(product, { status: 201 });
  } catch (error: any) {
    console.error('Product POST error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create product' },
      { status: 500 }
    );
  }
}
