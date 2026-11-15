import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { ProductForm } from '../new/form';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Edit Product',
};

async function getProduct(id: string) {
  try {
    return await prisma.product.findUnique({
      where: { id },
      include: { images: { orderBy: { sortOrder: 'asc' } }, variants: { select: { color: true, size: true, stock: true } }, tags: { select: { name: true } }, collections: { select: { id: true } } },
    });
  } catch {
    return null;
  }
}

async function getCategories() {
  try {
    return await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, slug: true },
    });
  } catch {
    return [];
  }
}

export default async function EditProductPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const [product, categories] = await Promise.all([
    getProduct(params.id),
    getCategories(),
  ]);

  if (!product) {
    notFound();
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Edit Product</h1>
        <p className="text-gray-500">Update product information</p>
      </div>
      <ProductForm product={product} categories={categories} />
    </div>
  );
}
