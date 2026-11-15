import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireStaff } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

async function guard(id: string, nextRole: string) {
  const me = await requireStaff(['ADMIN']);
  if (!me) return { error: 'Unauthorized', status: 401 };
  if (me.id === id) return { error: "You can't change your own access", status: 400 };
  const target = await prisma.user.findUnique({ where: { id }, select: { role: true } });
  if (!target || target.role === 'CUSTOMER') return { error: 'Not a staff member', status: 404 };
  if (target.role === 'ADMIN' && nextRole !== 'ADMIN' && (await prisma.user.count({ where: { role: 'ADMIN' } })) <= 1) {
    return { error: 'Keep at least one admin', status: 400 };
  }
  return null;
}

// PATCH { role: 'ADMIN' | 'SELLER' }
export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const { role } = await request.json().catch(() => ({}));
  if (role !== 'ADMIN' && role !== 'SELLER') return NextResponse.json({ error: 'Choose Admin or Seller' }, { status: 400 });
  const problem = await guard(id, role);
  if (problem) return NextResponse.json({ error: problem.error }, { status: problem.status });
  await prisma.user.update({ where: { id }, data: { role } });
  return NextResponse.json({ success: true });
}

// DELETE - removes admin access (the account stays, as a customer)
export async function DELETE(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const problem = await guard(id, 'CUSTOMER');
  if (problem) return NextResponse.json({ error: problem.error }, { status: problem.status });
  await prisma.user.update({ where: { id }, data: { role: 'CUSTOMER' } });
  await prisma.session.deleteMany({ where: { userId: id } }).catch(() => {});
  return NextResponse.json({ success: true });
}
