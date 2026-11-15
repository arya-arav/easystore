import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { categoryCovers } from '@/lib/category-covers';




// GET - List all categories with product counts
export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      include: {
        _count: { select: { products: { where: { status: 'ACTIVE' } } } },
        parent: true,
      },
      orderBy: { sortOrder: 'asc' },
    });

    // A product photo per category, for when the category's own picture is missing or broken
    const covers = await categoryCovers(categories.map((c) => c.id));
    return NextResponse.json(categories.map((c) => ({ ...c, cover: covers[c.id] || null })));
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}
