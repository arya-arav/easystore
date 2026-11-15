import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest, props: { params: Promise<{ code: string }> }) {
  const params = await props.params;
  const code = params.code?.toUpperCase();

  // Verify code exists
  const referrer = await prisma.user.findUnique({ where: { referralCode: code } });

  const redirectUrl = new URL('/', request.url);

  if (referrer) {
    // Store referral code in cookie (30 days)
    const response = NextResponse.redirect(redirectUrl);
    response.cookies.set('ref_code', code, {
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
      httpOnly: false, // needs to be readable by JS for registration
    });
    return response;
  }

  return NextResponse.redirect(redirectUrl);
}
