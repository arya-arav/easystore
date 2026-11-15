import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireStaff } from '@/lib/admin-auth';
import { bannerInput } from '@/lib/banner-input';
import { BANNER_POSITIONS, parseDesign, parsePlacement } from '@/lib/banners';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await requireStaff())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const [rows, placementRows] = await Promise.all([
    prisma.banner.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] }),
    prisma.bannerPlacement.findMany(),
  ]);
  const placements = Object.fromEntries(
    BANNER_POSITIONS.map((p) => [p, parsePlacement(p, placementRows.find((r) => r.position === p)?.settings)])
  );
  return NextResponse.json({ banners: rows.map((b) => ({ ...b, design: parseDesign(b.design) })), placements });
}

export async function POST(request: Request) {
  if (!(await requireStaff(['ADMIN']))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const parsed = bannerInput(await request.json().catch(() => null));
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  // New banners go to the end of their position unless an order was given.
  if (!parsed.data.sortOrder) {
    const last = await prisma.banner.findFirst({ where: { position: parsed.data.position }, orderBy: { sortOrder: 'desc' }, select: { sortOrder: true } });
    parsed.data.sortOrder = (last?.sortOrder ?? -1) + 1;
  }
  const banner = await prisma.banner.create({ data: parsed.data });
  return NextResponse.json(banner);
}

/** Reorder: { ids: [...] } in the new order. */
export async function PATCH(request: Request) {
  if (!(await requireStaff(['ADMIN']))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => null);
  const ids: string[] = Array.isArray(body?.ids) ? body.ids.filter((x: unknown) => typeof x === 'string').slice(0, 200) : [];
  await Promise.all(ids.map((id, i) => prisma.banner.update({ where: { id }, data: { sortOrder: i } })));
  return NextResponse.json({ ok: true });
}
