import { cache } from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { queryProducts } from '@/lib/product-query';
import { CATEGORY_PAGE_SIZE } from '@/lib/layout-settings';
import { CategoryClient } from './client';
import { categoryCovers } from '@/lib/category-covers';

import { getSiteUrl } from '@/lib/site-url';

type SearchParams = Record<string, string | string[] | undefined>;

const getCategory = cache(async (slug: string) => {
  return prisma.category.findUnique({
    where: { slug },
    include: {
      parent: { select: { id: true, name: true, slug: true } },
      children: {
        where: { isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        select: { id: true, name: true, slug: true, image: true, _count: { select: { products: { where: { status: 'ACTIVE' } } } } },
      },
    },
  });
});

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await props.params;
  const category = await getCategory(slug);
  if (!category) return { title: 'Category Not Found' };
  const SITE_URL = await getSiteUrl();
  const description = category.description || `Shop ${category.name} online.`;
  const url = `${SITE_URL}/category/${category.slug}`;
  return {
    title: category.name,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: category.name,
      description,
      url,
      type: 'website',
      images: category.image ? [{ url: category.image }] : undefined,
    },
  };
}

export default async function CategoryPage(props: { params: Promise<{ slug: string }>; searchParams: Promise<SearchParams> }) {
  const { slug } = await props.params;
  const searchParams = await props.searchParams;
  const category = await getCategory(slug);
  if (!category || !category.isActive) notFound();
  const SITE_URL = await getSiteUrl();

  const param = (key: string) => {
    const v = searchParams[key];
    return (Array.isArray(v) ? v[0] : v) ?? null;
  };

  // Other categories to explore: top-level categories that have products
  const [related, initial] = await Promise.all([
    prisma.category.findMany({
      where: { isActive: true, parentId: null },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, slug: true, image: true, _count: { select: { products: { where: { status: 'ACTIVE' } } } } },
    }),
    queryProducts({
      category: category.slug,
      ageGroup: param('ageGroup'),
      gender: param('gender'),
      price: param('price'),
      sort: param('sort'),
      page: parseInt(param('page') || '1') || 1,
      limit: CATEGORY_PAGE_SIZE,
    }),
  ]);

  const url = `${SITE_URL}/category/${category.slug}`;
  const breadcrumb = [
    { name: 'Home', url: SITE_URL },
    { name: 'Products', url: `${SITE_URL}/products` },
    ...(category.parent ? [{ name: category.parent.name, url: `${SITE_URL}/category/${category.parent.slug}` }] : []),
    { name: category.name, url },
  ];
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: category.name,
      description: category.description || undefined,
      url,
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: initial.pagination.total,
        itemListElement: initial.products.map((p, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: `${SITE_URL}/products/${p.slug}`,
          name: p.name,
        })),
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumb.map((b, i) => ({ '@type': 'ListItem', position: i + 1, name: b.name, item: b.url })),
    },
  ];

  // Product photos stand in for missing or broken category pictures
  const covers = await categoryCovers([category.id, ...category.children.map((c) => c.id), ...related.map((c) => c.id)]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <CategoryClient
        category={{
          id: category.id,
          name: category.name,
          slug: category.slug,
          description: category.description,
          image: category.image,
          cover: covers[category.id] || null,
          parent: category.parent,
          children: category.children.map((c) => ({ id: c.id, name: c.name, slug: c.slug, image: c.image, cover: covers[c.id] || null, count: c._count.products })),
        }}
        related={related
          .filter((c) => c._count.products > 0 || c.id === category.id)
          .map((c) => ({ id: c.id, name: c.name, slug: c.slug, image: c.image, cover: covers[c.id] || null, count: c._count.products }))}
        products={JSON.parse(JSON.stringify(initial.products))}
        total={initial.pagination.total}
        totalPages={initial.pagination.totalPages}
        filters={{
          ageGroup: param('ageGroup') || '',
          gender: param('gender') || '',
          price: param('price') || '',
          sort: param('sort') || 'newest',
          page: initial.pagination.page,
        }}
      />
    </>
  );
}
