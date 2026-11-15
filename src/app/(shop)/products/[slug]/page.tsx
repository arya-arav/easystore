import { cache } from 'react';
import { getSiteUrl } from '@/lib/site-url';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import ProductDetailClient from './client';
import { ProductJsonLd, BreadcrumbJsonLd } from '@/components/json-ld';
import { getBundleMembers } from '@/lib/bundles';

// Shared by generateMetadata and the page within one request (one database round trip).
const getProduct = cache(async (slug: string) => {
  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      category: {
        include: { parent: true },
      },
      images: { orderBy: { sortOrder: 'asc' } },
      variants: { select: { color: true, size: true, stock: true } },
      reviews: {
        where: { isApproved: true },
        // Only what the page shows (no user ids in the page source)
        select: { id: true, rating: true, title: true, comment: true, images: true, isVerified: true, helpfulCount: true, createdAt: true, user: { select: { name: true } } },
        take: 10,
        orderBy: { createdAt: 'desc' },
      },
      _count: { select: { reviews: true } },
    },
  });
  return product;
});

async function getRelatedProducts(categoryId: string, currentProductId: string) {
  return prisma.product.findMany({
    where: {
      categoryId,
      status: 'ACTIVE',
      id: { not: currentProductId },
    },
    include: {
      category: true,
      images: { take: 1, orderBy: { sortOrder: 'asc' } },
      reviews: { select: { rating: true } },
    },
    take: 8,
  });
}

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const params = await props.params;
  const product = await getProduct(params.slug);
  if (!product) return { title: 'Product Not Found' };
  const SITE_URL = await getSiteUrl();
  return {
    title: product.metaTitle || product.name,
    description: product.metaDescription || product.shortDescription || product.description.slice(0, 160),
    alternates: { canonical: `${SITE_URL}/products/${product.slug}` },
    openGraph: {
      title: product.name,
      description: product.shortDescription || product.description.slice(0, 160),
      url: `${SITE_URL}/products/${product.slug}`,
      type: 'website',
      images: product.images[0] ? [product.images[0].url] : [],
    },
    twitter: { card: 'summary_large_image', title: product.name, images: product.images[0] ? [product.images[0].url] : [] },
  };
}

export default async function ProductPage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const product = await getProduct(params.slug);
  if (!product || product.status !== 'ACTIVE') {
    notFound();
  }
  const SITE_URL = await getSiteUrl();

  // Calculate rating stats
  const avgRating =
    product.reviews.length > 0
      ? product.reviews.reduce((sum, r) => sum + r.rating, 0) / product.reviews.length
      : 0;

  // Get related products
  const relatedProducts = await getRelatedProducts(product.categoryId, product.id);
  const bundleProducts = await getBundleMembers(product.id, product.categoryId);

  return (
    <>
      <ProductJsonLd
        name={product.name}
        description={product.metaDescription || product.shortDescription || product.description.slice(0, 200)}
        image={product.images[0]?.url || ''}
        price={Number(product.price)}
        sku={product.sku}
        inStock={product.stock > 0}
        rating={avgRating > 0 ? avgRating : undefined}
        reviewCount={product._count.reviews > 0 ? product._count.reviews : undefined}
        url={`${SITE_URL}/products/${product.slug}`}
      />
      <BreadcrumbJsonLd items={[
        { name: 'Home', url: SITE_URL },
        { name: product.category.name, url: `${SITE_URL}/category/${product.category.slug}` },
        { name: product.name, url: `${SITE_URL}/products/${product.slug}` },
      ]} />
      <ProductDetailClient
        product={{ ...product, avgRating, reviewCount: product._count.reviews }}
        bundleProducts={JSON.parse(JSON.stringify(bundleProducts.map(p => ({ ...p, avgRating: 0, reviews: [] }))))}
        relatedProducts={relatedProducts.map(p => ({
          ...p,
          avgRating: p.reviews.length > 0 ? p.reviews.reduce((sum, r) => sum + r.rating, 0) / p.reviews.length : 0,
        }))}
      />
    </>
  );
}
