export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireStaff } from '@/lib/admin-auth';

// PUT { name, phone } - edit a customer's details
export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  if (!(await requireStaff(['ADMIN']))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  const phone = String(body.phone || '').trim() || null;
  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  if (phone) {
    const clash = await prisma.user.findUnique({ where: { phone }, select: { id: true } });
    if (clash && clash.id !== id) return NextResponse.json({ error: 'Another account already uses this phone number' }, { status: 400 });
  }
  const customerGroupId = body.customerGroupId === undefined ? undefined : (String(body.customerGroupId || '') || null);
  const user = await prisma.user.update({ where: { id }, data: { name, phone, customerGroupId }, select: { id: true, name: true, phone: true, customerGroupId: true } });
  return NextResponse.json(user);
}
