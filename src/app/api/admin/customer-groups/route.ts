import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireStaff } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

function groupData(body: any) {
  const percent = Math.min(90, Math.max(0, Number(body.discountPercent) || 0));
  return { name: String(body.name || '').trim(), description: String(body.description || '').trim() || null, discountPercent: Math.round(percent * 100) / 100 };
}

// GET - groups with member counts
export async function GET() {
  if (!(await requireStaff(['ADMIN']))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const groups = await prisma.customerGroup.findMany({ include: { _count: { select: { customers: true } } }, orderBy: { name: 'asc' } });
  return NextResponse.json({ groups });
}

// POST - create a group
export async function POST(request: NextRequest) {
  if (!(await requireStaff(['ADMIN']))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const data = groupData(await request.json().catch(() => ({})));
  if (!data.name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  if (await prisma.customerGroup.findUnique({ where: { name: data.name } })) return NextResponse.json({ error: 'A group with this name already exists' }, { status: 400 });
  return NextResponse.json(await prisma.customerGroup.create({ data }), { status: 201 });
}
