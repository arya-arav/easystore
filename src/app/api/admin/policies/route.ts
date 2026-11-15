import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireStaff } from '@/lib/admin-auth';
import { parsePolicies } from '@/lib/policies';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await requireStaff(['ADMIN']))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const s = await prisma.siteSettings.findUnique({ where: { id: 'default' }, select: { policies: true } });
  return NextResponse.json(parsePolicies(s?.policies));
}

export async function PUT(request: NextRequest) {
  if (!(await requireStaff(['ADMIN']))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const policies = parsePolicies(await request.json().catch(() => ({})));
  await prisma.siteSettings.upsert({ where: { id: 'default' }, update: { policies: JSON.stringify(policies) }, create: { id: 'default', policies: JSON.stringify(policies) } });
  return NextResponse.json(policies);
}
