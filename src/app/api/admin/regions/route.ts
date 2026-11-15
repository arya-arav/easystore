import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireStaff } from '@/lib/admin-auth';
import { legacyRegions } from '@/lib/regions';
import { overlapError, regionData } from '@/lib/region-data';

export const dynamic = 'force-dynamic';

// GET - saved regions; while none are saved, the old settings shown as regions (legacy: true)
export async function GET() {
  if (!(await requireStaff(['ADMIN']))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const regions = await prisma.region.findMany({
    include: { shippingOptions: { orderBy: { sortOrder: 'asc' } } },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });
  if (regions.length) return NextResponse.json({ regions, legacy: false });
  return NextResponse.json({ regions: await legacyRegions(), legacy: true });
}

// POST - create a region with its delivery options
export async function POST(request: NextRequest) {
  if (!(await requireStaff(['ADMIN']))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const data = regionData(await request.json().catch(() => ({})));
  if ('error' in data) return NextResponse.json({ error: data.error }, { status: 400 });
  const clash = await overlapError(data.countries);
  if (clash) return NextResponse.json({ error: clash }, { status: 400 });
  const { shippingOptions, ...region } = data;
  const created = await prisma.region.create({ data: { ...region, shippingOptions: { create: shippingOptions } }, include: { shippingOptions: true } });
  return NextResponse.json(created, { status: 201 });
}
