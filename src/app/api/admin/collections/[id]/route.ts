import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireStaff } from '@/lib/admin-auth';
import { collectionData } from '@/lib/collection-data';

export const dynamic = 'force-dynamic';

// GET - one collection with its products
export async function GET(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  if (!(await requireStaff())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const collection = await prisma.collection.findUnique({
    where: { id },
    include: { products: { select: { id: true, name: true, sku: true, images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 1, select: { url: true } } } } },
  });
  if (!collection) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(collection);
}

// PUT - edit; productIds (when sent) replaces the product list
export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  if (!(await requireStaff())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const data = collectionData(body);
  if (!data.title || !data.handle) return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  const clash = await prisma.collection.findUnique({ where: { handle: data.handle } });
  if (clash && clash.id !== id) return NextResponse.json({ error: 'Another collection uses this handle' }, { status: 400 });
  const ids: string[] | null = Array.isArray(body.productIds) ? body.productIds.map(String) : null;
  const collection = await prisma.collection.update({
    where: { id },
    data: { ...data, ...(ids ? { products: { set: ids.map((pid) => ({ id: pid })) } } : {}) },
  });
  return NextResponse.json(collection);
}

export async function DELETE(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  if (!(await requireStaff())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await prisma.collection.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
