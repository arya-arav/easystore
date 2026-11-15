import { prisma } from '@/lib/prisma';
import { fuzzyProductIds } from '@/lib/fuzzy-search';

// Storefront product listing, shared by GET /api/products and server-rendered pages.

export interface ProductQuery {
  q?: string | null; // search text
  category?: string | null;
  collection?: string | null; // collection handle
  tag?: string | null; // tag slug
  ageGroup?: string | null;
  gender?: string | null;
  price?: string | null; // "min-max", either side optional
  rating?: string | null;
  sort?: string | null;
  page?: number;
  limit?: number;
  featured?: boolean;
  newArrival?: boolean;
  bestseller?: boolean;
}

const MAX_LIMIT = 60;

/** Reads a ProductQuery from URL search params (API route or page searchParams). */
export function productQueryFromParams(get: (key: string) => string | null | undefined): ProductQuery {
  return {
    q: get('q'),
    category: get('category'),
    collection: get('collection'),
    tag: get('tag'),
    ageGroup: get('ageGroup'),
    gender: get('gender'),
    price: get('price'),
    rating: get('rating'),
    sort: get('sort'),
    page: parseInt(get('page') || '1') || 1,
    limit: parseInt(get('limit') || '20') || 20,
    featured: get('featured') === 'true',
    newArrival: get('newArrival') === 'true',
    bestseller: get('bestseller') === 'true',
  };
}

export async function queryProducts(q: ProductQuery) {
  const page = Math.max(1, q.page || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, q.limit || 20));
  const where: any = { status: 'ACTIVE' };

  if (q.featured) where.isFeatured = true;
  if (q.newArrival) where.isNewArrival = true;
  if (q.bestseller) where.isBestseller = true;

  // Category, including its direct subcategories
  if (q.category) {
    const cat = await prisma.category.findUnique({
      where: { slug: q.category },
      include: { children: { select: { id: true } } },
    });
    where.categoryId = cat ? { in: [cat.id, ...cat.children.map((c) => c.id)] } : '__none__';
  }

  // Search: name, description, SKU, category and tags; typos are forgiven when nothing matches
  let fuzzyIds: string[] | null = null;
  const text = q.q?.trim();
  if (text) {
    const has = { contains: text, mode: 'insensitive' as const };
    const textWhere = { OR: [{ name: has }, { shortDescription: has }, { sku: has }, { category: { name: has } }, { tags: { some: { name: has } } }] };
    const exact = await prisma.product.count({ where: { status: 'ACTIVE', ...textWhere } });
    if (exact > 0) where.AND = [...(where.AND || []), textWhere];
    else {
      fuzzyIds = await fuzzyProductIds(text);
      where.id = { in: fuzzyIds };
    }
  }
  if (q.collection) where.collections = { some: { handle: q.collection, isActive: true } };
  if (q.tag) where.tags = { some: { slug: q.tag } };
  if (q.ageGroup) where.ageGroup = q.ageGroup;
  if (q.gender) where.gender = q.gender;

  if (q.price) {
    const [minStr, maxStr] = q.price.split('-');
    where.price = {};
    if (minStr) where.price.gte = parseFloat(minStr);
    if (maxStr) where.price.lte = parseFloat(maxStr);
  }

  let orderBy: any[];
  switch (q.sort) {
    case 'price-low':
      orderBy = [{ price: 'asc' }];
      break;
    case 'price-high':
      orderBy = [{ price: 'desc' }];
      break;
    case 'bestselling':
      orderBy = [{ isBestseller: 'desc' }, { createdAt: 'desc' }];
      break;
    default:
      orderBy = [{ createdAt: 'desc' }];
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        category: { select: { id: true, name: true, slug: true } },
        images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 2 },
        reviews: { where: { isApproved: true }, select: { rating: true } },
      },
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.product.count({ where }),
  ]);

  let withRating = products.map(({ reviews, ...product }) => {
    const avg = reviews.length ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;
    return {
      ...product,
      price: Number(product.price),
      compareAtPrice: product.compareAtPrice != null ? Number(product.compareAtPrice) : null,
      rating: Math.round(avg * 10) / 10,
      reviewCount: reviews.length,
    };
  });

  // Ratings aren't stored on products, so this filters the current page only.
  if (q.rating) {
    const minRating = parseFloat(q.rating);
    withRating = withRating.filter((p) => p.rating >= minRating);
  }

  return {
    products: withRating,
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
}

export type ListedProduct = Awaited<ReturnType<typeof queryProducts>>['products'][number];
