export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, phone: true, image: true, password: true },
  });
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  // Only whether a password is set (accounts made with a one-time code have none)
  const { password, ...rest } = user;
  return NextResponse.json({ ...rest, hasPassword: !!password });
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name, phone } = await request.json();
  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

  const cleanPhone = typeof phone === 'string' && phone.trim() ? phone.trim() : null;
  if (cleanPhone) {
    const clash = await prisma.user.findUnique({ where: { phone: cleanPhone }, select: { id: true } });
    if (clash && clash.id !== session.user.id) return NextResponse.json({ error: 'This phone number is already used by another account' }, { status: 400 });
  }
  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: { name: name.trim(), phone: cleanPhone },
    select: { id: true, name: true, email: true, phone: true },
  });
  return NextResponse.json({ success: true, user });
}
