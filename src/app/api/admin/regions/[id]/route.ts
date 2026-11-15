import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireStaff } from '@/lib/admin-auth';
import { overlapError, regionData } from '@/lib/region-data';

export const dynamic = 'force-dynamic';

// PUT - edit a region; its delivery options are replaced by the ones sent
export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  if (!(await requireStaff(['ADMIN']))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const data = regionData(await request.json().catch(() => ({})));
  if ('error' in data) return NextResponse.json({ error: data.error }, { status: 400 });
  const clash = data.isActive ? await overlapError(data.countries, id) : null;
  if (clash) return NextResponse.json({ error: clash }, { status: 400 });
  const { shippingOptions, ...region } = data;
  // Replace the options in one nested write (no interactive transaction on the serverless driver)
  const updated = await prisma.region.update({
    where: { id },
    data: { ...region, shippingOptions: { deleteMany: {}, create: shippingOptions } },
    include: { shippingOptions: true },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  if (!(await requireStaff(['ADMIN']))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await prisma.region.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
