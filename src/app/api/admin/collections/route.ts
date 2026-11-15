import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireStaff } from '@/lib/admin-auth';
import { collectionData } from '@/lib/collection-data';

export const dynamic = 'force-dynamic';

// GET - collections with product counts
export async function GET() {
  if (!(await requireStaff())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const collections = await prisma.collection.findMany({ include: { _count: { select: { products: true } } }, orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }] });
  return NextResponse.json({ collections });
}

// POST { title, handle, description, image, isActive, productIds }
export async function POST(request: NextRequest) {
  if (!(await requireStaff())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const data = collectionData(body);
  if (!data.title || !data.handle) return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  if (await prisma.collection.findUnique({ where: { handle: data.handle } })) return NextResponse.json({ error: 'Another collection uses this handle' }, { status: 400 });
  const ids: string[] = Array.isArray(body.productIds) ? body.productIds.map(String) : [];
  const collection = await prisma.collection.create({ data: { ...data, products: { connect: ids.map((id) => ({ id })) } } });
  return NextResponse.json(collection, { status: 201 });
}
