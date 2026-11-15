export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireStaff } from '@/lib/admin-auth';
import { testimonialInput } from '@/lib/testimonial-input';

export async function GET() {
  if (!(await requireStaff(['ADMIN']))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const testimonials = await prisma.testimonial.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] });
  return NextResponse.json({ testimonials });
}

export async function POST(request: NextRequest) {
  if (!(await requireStaff(['ADMIN']))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const parsed = testimonialInput(await request.json().catch(() => null));
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  if (!parsed.data.sortOrder) {
    const last = await prisma.testimonial.findFirst({ orderBy: { sortOrder: 'desc' }, select: { sortOrder: true } });
    parsed.data.sortOrder = (last?.sortOrder ?? -1) + 1;
  }
  const t = await prisma.testimonial.create({ data: parsed.data });
  return NextResponse.json(t, { status: 201 });
}

/** Reorder: { ids: [...] } in the new order. */
export async function PATCH(request: NextRequest) {
  if (!(await requireStaff(['ADMIN']))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => null);
  const ids: string[] = Array.isArray(body?.ids) ? body.ids.filter((x: unknown) => typeof x === 'string').slice(0, 500) : [];
  await Promise.all(ids.map((id, i) => prisma.testimonial.update({ where: { id }, data: { sortOrder: i } })));
  return NextResponse.json({ ok: true });
}
