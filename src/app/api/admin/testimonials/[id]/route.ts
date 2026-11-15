export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireStaff } from '@/lib/admin-auth';
import { testimonialInput } from '@/lib/testimonial-input';

type Ctx = { params: Promise<{ id: string }> };

/** Full edit, or { isActive } alone to show/hide. */
export async function PATCH(request: NextRequest, props: Ctx) {
  if (!(await requireStaff(['ADMIN']))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await props.params;
  const body = await request.json().catch(() => null);
  if (body && Object.keys(body).length === 1 && typeof body.isActive === 'boolean') {
    return NextResponse.json(await prisma.testimonial.update({ where: { id }, data: { isActive: body.isActive } }));
  }
  const parsed = testimonialInput(body);
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  return NextResponse.json(await prisma.testimonial.update({ where: { id }, data: parsed.data }));
}

export async function DELETE(_: NextRequest, props: Ctx) {
  if (!(await requireStaff(['ADMIN']))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await props.params;
  await prisma.testimonial.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
