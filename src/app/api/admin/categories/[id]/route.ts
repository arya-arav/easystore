import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireStaff } from '@/lib/admin-auth';
import { categoryData } from '@/lib/category-data';

export const dynamic = 'force-dynamic';

// PUT - update a category
export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  if (!(await requireStaff())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const data = categoryData(await request.json());
  if (!data.name || !data.slug) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  if (data.parentId === id) data.parentId = null;
  const clash = await prisma.category.findUnique({ where: { slug: data.slug } });
  if (clash && clash.id !== id) return NextResponse.json({ error: 'Another category already uses this slug' }, { status: 400 });
  const category = await prisma.category.update({ where: { id }, data });
  return NextResponse.json(category);
}

// DELETE - only when no products or sub-categories use it
export async function DELETE(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  if (!(await requireStaff())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const category = await prisma.category.findUnique({ where: { id }, include: { _count: { select: { products: true, children: true } } } });
  if (!category) return NextResponse.json({ error: 'Category not found' }, { status: 404 });
  if (category._count.products > 0) {
    return NextResponse.json({ error: `Move its ${category._count.products} product(s) to another category first, or hide it instead` }, { status: 400 });
  }
  if (category._count.children > 0) return NextResponse.json({ error: 'Move or delete its sub-categories first' }, { status: 400 });
  await prisma.category.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
