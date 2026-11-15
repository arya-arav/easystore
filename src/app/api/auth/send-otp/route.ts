export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendEmailOtp(email: string, otp: string, purpose: string) {
  const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
  if (!settings?.smtpHost || !settings?.smtpUser) throw new Error('SMTP not configured');

  const { createTransporter, sendEmail } = await import('@/lib/email');
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

  const logoHtml = brand.logoUrl && brand.logoUrl !== '/images/logo.png'
    ? `<img src="${brand.logoUrl}" alt="${brand.storeName}" style="max-height:48px;object-fit:contain;" />`
    : `<h2 style="color:${brand.primaryColor};margin:0;">${brand.storeName}</h2>`;

  const action = purpose === 'login' ? 'sign in to' : 'create your account on';
  await sendEmail(transporter, {
    to: email,
    subject: `${otp} is your ${brand.storeName} OTP`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:20px;background:#F7F7F5;">
        <div style="text-align:center;padding:20px 0;">${logoHtml}</div>
        <div style="background:#fff;border-radius:16px;padding:32px;">
          <p style="color:#555;margin:0 0 24px">Your one-time password to ${action} ${brand.storeName}:</p>
          <div style="background:#F7F7F5;border-radius:12px;padding:24px;text-align:center;margin:0 0 24px">
            <span style="font-size:36px;font-weight:700;letter-spacing:8px;color:#333">${otp}</span>
          </div>
          <p style="color:#999;font-size:13px;margin:0">This OTP expires in 10 minutes. Do not share it with anyone.</p>
        </div>
        <p style="text-align:center;color:#aaa;font-size:12px;margin-top:16px;">© ${new Date().getFullYear()} ${brand.storeName}</p>
      </div>
    `,
    text: `Your ${brand.storeName} OTP is: ${otp}\n\nExpires in 10 minutes.`,
  }, settings.smtpFromName || brand.storeName, settings.smtpFromEmail || settings.storeEmail);
}

async function sendWhatsAppOtp(phone: string, otp: string, purpose: string) {
  // WhatsApp via Interakt API (free tier available)
  // Configure WHATSAPP_API_KEY and WHATSAPP_SENDER in .env
  const apiKey = process.env.WHATSAPP_API_KEY;
  const action = purpose === 'login' ? 'sign in' : 'register';

  if (!apiKey) throw new Error('WhatsApp not configured');

  // Interakt API format
  const res = await fetch('https://api.interakt.ai/v1/public/message/', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      countryCode: '+91',
      phoneNumber: phone.replace(/^\+91/, '').replace(/\D/g, ''),
      callbackData: 'otp',
      type: 'Template',
      template: {
        name: 'otp_login',
        languageCode: 'en',
        bodyValues: [otp, '10'],
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`WhatsApp send failed: ${err}`);
  }
}

export async function POST(request: NextRequest) {
  // Rate limit: 3 OTPs per IP per 10 minutes
  const ip = getClientIp(request);
  const { allowed, resetIn } = rateLimit(`send-otp:${ip}`, 3, 10 * 60 * 1000);
  if (!allowed) {
    const secs = Math.ceil(resetIn / 1000);
    return NextResponse.json({ error: `Too many OTP requests. Try again in ${secs} seconds.` }, { status: 429 });
  }
  try {
    const { target, type, purpose } = await request.json();
    // target = email or phone, type = "email" | "whatsapp", purpose = "login" | "register"

    if (!target || !type || !purpose) {
      return NextResponse.json({ error: 'target, type and purpose are required' }, { status: 400 });
    }

    // Rate limit: max 3 OTPs per target per 10 minutes
    const recentCount = await prisma.otpCode.count({
      where: {
        target: target.toLowerCase(),
        createdAt: { gte: new Date(Date.now() - 10 * 60 * 1000) },
      },
    });
    if (recentCount >= 3) {
      return NextResponse.json({ error: 'Too many OTP requests. Please wait 10 minutes.' }, { status: 429 });
    }

    // Invalidate previous unused OTPs for this target
    await prisma.otpCode.updateMany({
      where: { target: target.toLowerCase(), used: false },
      data: { used: true },
    });

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.otpCode.create({
      data: { target: target.toLowerCase(), code: otp, type, purpose, expiresAt },
    });

    if (type === 'email') {
      await sendEmailOtp(target, otp, purpose);
    } else if (type === 'whatsapp') {
      await sendWhatsAppOtp(target, otp, purpose);
    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: `OTP sent via ${type}` });
  } catch (err: any) {
    console.error('Send OTP error:', err);
    // Return detailed error in non-production for debugging
    const isDev = process.env.NODE_ENV !== 'production';
    return NextResponse.json({
      error: err.message || 'Failed to send OTP',
      detail: isDev ? err.stack : undefined,
    }, { status: 500 });
  }
}
