import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireStaff } from '@/lib/admin-auth';
import { bannerInput } from '@/lib/banner-input';
import { parseDesign } from '@/lib/banners';

export const dynamic = 'force-dynamic';
type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, props: Ctx) {
  if (!(await requireStaff())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await props.params;
  const banner = await prisma.banner.findUnique({ where: { id } });
  if (!banner) return NextResponse.json({ error: 'Banner not found' }, { status: 404 });
  return NextResponse.json({ ...banner, design: parseDesign(banner.design) });
}

/** Quick changes from the list: show/hide. */
export async function PATCH(request: Request, props: Ctx) {
  if (!(await requireStaff(['ADMIN']))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await props.params;
  const body = await request.json().catch(() => ({}));
  if (typeof body.isActive !== 'boolean') return NextResponse.json({ error: 'Nothing to change' }, { status: 400 });
  const banner = await prisma.banner.update({ where: { id }, data: { isActive: body.isActive } });
  return NextResponse.json(banner);
}

export async function PUT(request: Request, props: Ctx) {
  if (!(await requireStaff(['ADMIN']))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await props.params;
  const parsed = bannerInput(await request.json().catch(() => null));
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const banner = await prisma.banner.update({ where: { id }, data: parsed.data });
  return NextResponse.json(banner);
}

export async function DELETE(_req: Request, props: Ctx) {
  if (!(await requireStaff(['ADMIN']))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await props.params;
  await prisma.banner.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
