import { prisma } from '@/lib/prisma';
import { getSiteUrl } from '@/lib/site-url';
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  // Rate limit: 5 registrations per IP per hour
  const ip = getClientIp(request);
  const { allowed } = rateLimit(`register:${ip}`, 5, 60 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json({ error: 'Too many registration attempts. Please try again later.' }, { status: 429 });
  }
  try {
    const { name, email, phone, password } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email and password are required' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const emailVerifyToken = crypto.randomBytes(32).toString('hex');

    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        phone: phone || null,
        password: hashedPassword,
        role: 'CUSTOMER',
        emailVerifyToken,
        // emailVerified stays null until they click the link
      },
    });

    // Track referral if ref_code cookie present
    const refCode = request.cookies.get('ref_code')?.value;
    if (refCode) {
      const { trackReferralVisit } = await import('@/lib/referral');
      await trackReferralVisit(refCode, email.toLowerCase()).catch(() => {});
    }

    // Send verification email (fire and forget)
    sendVerificationEmail(user.name, user.email, emailVerifyToken).catch(err =>
      console.error('Verification email failed:', err)
    );

    return NextResponse.json({ id: user.id, email: user.email, name: user.name }, { status: 201 });
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}

async function sendVerificationEmail(name: string, email: string, token: string) {
  const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
  if (!settings?.smtpHost || !settings?.smtpUser) return;

  const { createTransporter, sendEmail, emailTemplates } = await import('@/lib/email');
  const { getBrand } = await import('@/lib/email-brand');
  const brand = await getBrand();

  const transporter = createTransporter({
    host: settings.smtpHost,
    port: settings.smtpPort || 587,
    secure: settings.smtpSecure,
    user: settings.smtpUser,
    password: settings.smtpPassword || '',
    fromName: settings.smtpFromName || settings.storeName,
    fromEmail: settings.smtpFromEmail || settings.storeEmail,
  });

  const baseUrl = (await getSiteUrl());
  const verifyLink = `${baseUrl}/api/auth/verify-email?token=${token}`;

  const emailContent = emailTemplates.emailVerification({ name, verifyLink }, brand);

  await sendEmail(
    transporter,
    { to: email, subject: emailContent.subject, html: emailContent.html, text: emailContent.text },
    settings.smtpFromName || settings.storeName,
    settings.smtpFromEmail || settings.storeEmail
  );
}
