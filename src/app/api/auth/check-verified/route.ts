export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Used by login page to detect unverified accounts (doesn't expose password info)
export async function POST(request: NextRequest) {
  const { email } = await request.json();
  if (!email) return NextResponse.json({ unverified: false });

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { emailVerified: true, emailVerifyToken: true },
  });

  if (!user) return NextResponse.json({ unverified: false });

  return NextResponse.json({ unverified: !user.emailVerified && !!user.emailVerifyToken });
}
