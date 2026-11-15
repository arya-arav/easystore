export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(new URL('/auth/verify-email?error=missing', request.url));
  }

  const user = await prisma.user.findFirst({
    where: { emailVerifyToken: token },
  });

  if (!user) {
    return NextResponse.redirect(new URL('/auth/verify-email?error=invalid', request.url));
  }

  // Activate account
  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: new Date(),
      emailVerifyToken: null,
    },
  });

  return NextResponse.redirect(new URL('/auth/login?verified=true', request.url));
}
