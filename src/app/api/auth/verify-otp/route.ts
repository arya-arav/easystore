export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createLoginToken } from '@/lib/login-token';

export async function POST(request: NextRequest) {
  try {
    const { target, code, purpose, name } = await request.json();
    // name only needed for purpose=register

    if (!target || !code || !purpose) {
      return NextResponse.json({ error: 'target, code and purpose are required' }, { status: 400 });
    }

    // Find valid OTP
    const otpRecord = await prisma.otpCode.findFirst({
      where: {
        target: target.toLowerCase(),
        code,
        purpose,
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      // Each wrong guess takes a minute off the live code (10 minutes = 10 guesses), so it can't be brute-forced
      const live = await prisma.otpCode.findMany({
        where: { target: String(target).toLowerCase(), purpose, used: false, expiresAt: { gt: new Date() } },
        select: { id: true, expiresAt: true },
      });
      for (const o of live) {
        await prisma.otpCode.update({ where: { id: o.id }, data: { expiresAt: new Date(o.expiresAt.getTime() - 60_000) } });
      }
      return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 400 });
    }

    // Mark OTP as used
    await prisma.otpCode.update({ where: { id: otpRecord.id }, data: { used: true } });

    const isEmail = target.includes('@');
    const field = isEmail ? { email: target.toLowerCase() } : { phone: target };

    // Find or create user
    let user = await prisma.user.findFirst({ where: field });

    if (!user) {
      if (purpose === 'login') {
        return NextResponse.json({ error: 'No account found. Please register first.' }, { status: 404 });
      }
      // Register new user
      user = await prisma.user.create({
        data: {
          name: name || (isEmail ? target.split('@')[0] : 'Customer'),
          email: isEmail ? target.toLowerCase() : `${target.replace(/\D/g, '')}@phone.invalid`,
          phone: isEmail ? null : target,
          role: 'CUSTOMER',
          emailVerified: new Date(), // OTP = verified
        },
      });
    } else {
      // Mark as verified if not already
      if (!user.emailVerified) {
        await prisma.user.update({ where: { id: user.id }, data: { emailVerified: new Date() } });
      }
    }

    // Return user data for NextAuth to create session
    return NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      loginToken: await createLoginToken(user.id),
    });
  } catch (err: any) {
    console.error('Verify OTP error:', err);
    return NextResponse.json({ error: err.message || 'Verification failed' }, { status: 500 });
  }
}
