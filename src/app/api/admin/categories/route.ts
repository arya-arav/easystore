import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireStaff } from '@/lib/admin-auth';
import { categoryData } from '@/lib/category-data';

export const dynamic = 'force-dynamic';

// GET - every category, including hidden ones, with product counts
export async function GET() {
  if (!(await requireStaff())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const categories = await prisma.category.findMany({
    include: { _count: { select: { products: true } }, parent: { select: { id: true, name: true } } },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });
  return NextResponse.json({ categories });
}

// POST - create a category
export async function POST(request: NextRequest) {
  if (!(await requireStaff())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const data = categoryData(await request.json());
  if (!data.name || !data.slug) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  if (await prisma.category.findUnique({ where: { slug: data.slug } })) {
    return NextResponse.json({ error: 'Another category already uses this slug' }, { status: 400 });
  }
  const category = await prisma.category.create({ data });
  return NextResponse.json(category, { status: 201 });
}
