import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireStaff } from '@/lib/admin-auth';
import { isBannerPosition, parsePlacement } from '@/lib/banners';

/** Save the layout for one banner position: { position, settings }. */
export async function PUT(request: Request) {
  if (!(await requireStaff(['ADMIN']))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!isBannerPosition(body?.position)) return NextResponse.json({ error: 'Unknown position' }, { status: 400 });
  const settings = parsePlacement(body.position, body.settings);
  await prisma.bannerPlacement.upsert({
    where: { position: body.position },
    create: { position: body.position, settings: settings as any },
    update: { settings: settings as any },
  });
  return NextResponse.json({ settings });
}
