import { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { ProductForm } from './form';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Add Product',
};

async function getCategories() {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, slug: true },
    });
    return categories;
  } catch {
    return [];
  }
}

export default async function NewProductPage() {
  const categories = await getCategories();
  
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Add New Product</h1>
        <p className="text-gray-500">Create a new product listing</p>
      </div>
      <ProductForm categories={categories} />
    </div>
  );
}
