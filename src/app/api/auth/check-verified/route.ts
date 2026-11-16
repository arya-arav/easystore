export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

// Used by login page to detect unverified accounts (doesn't expose password info)
export async function POST(request: NextRequest) {
  // Stops bulk lookups of which emails have accounts: 20 per IP per 10 minutes
  if (!(await rateLimit(`check-verified:${getClientIp(request)}`, 20, 10 * 60 * 1000)).allowed) return NextResponse.json({ unverified: false });
  const { email } = await request.json();
  if (!email) return NextResponse.json({ unverified: false });

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { emailVerified: true, emailVerifyToken: true },
  });

  if (!user) return NextResponse.json({ unverified: false });

  return NextResponse.json({ unverified: !user.emailVerified && !!user.emailVerifyToken });
}
