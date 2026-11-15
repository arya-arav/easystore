import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireStaff } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

// PUT - rename / change discount; { addEmails: string[] } adds customers by email
export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  if (!(await requireStaff(['ADMIN']))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => ({}));

  if (Array.isArray(body.addEmails)) {
    const emails = body.addEmails.map((e: unknown) => String(e).trim().toLowerCase()).filter(Boolean).slice(0, 500);
    const res = await prisma.user.updateMany({ where: { email: { in: emails }, role: 'CUSTOMER' }, data: { customerGroupId: id } });
    return NextResponse.json({ added: res.count, notFound: emails.length - res.count });
  }

  const name = String(body.name || '').trim();
  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  const clash = await prisma.customerGroup.findUnique({ where: { name } });
  if (clash && clash.id !== id) return NextResponse.json({ error: 'A group with this name already exists' }, { status: 400 });
  const percent = Math.min(90, Math.max(0, Number(body.discountPercent) || 0));
  const group = await prisma.customerGroup.update({
    where: { id },
    data: { name, description: String(body.description || '').trim() || null, discountPercent: Math.round(percent * 100) / 100 },
  });
  return NextResponse.json(group);
}

// DELETE - remove the group (its customers simply leave it)
export async function DELETE(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  if (!(await requireStaff(['ADMIN']))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await prisma.customerGroup.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
