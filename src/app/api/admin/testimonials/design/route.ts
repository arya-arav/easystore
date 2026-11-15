export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireStaff } from '@/lib/admin-auth';
import { parseLayoutConfig, serializeLayoutConfig } from '@/lib/layout-settings';

/** Saves the testimonials section design into the store layout (other layout settings untouched). */
export async function PUT(request: NextRequest) {
  if (!(await requireStaff(['ADMIN']))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => null);
  const row = await prisma.siteSettings.findUnique({ where: { id: 'default' }, select: { layout: true } });
  const layout = parseLayoutConfig(row?.layout);
  const next = serializeLayoutConfig({ ...layout, testimonials: body?.design });
  await prisma.siteSettings.upsert({ where: { id: 'default' }, create: { id: 'default', layout: next }, update: { layout: next } });
  return NextResponse.json({ design: parseLayoutConfig(next).testimonials });
}
