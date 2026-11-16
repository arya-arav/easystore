export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { getSiteUrl } from '@/lib/site-url';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(request: Request) {
  // Rate limit: 3 password reset requests per IP per 15 minutes
  const ip = getClientIp(request);
  const { allowed } = await rateLimit(`forgot-pw:${ip}`, 3, 15 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      // Don't reveal if user exists or not
      return NextResponse.json({ success: true });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Save token to user
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: resetToken,
        resetTokenExpiry: resetTokenExpiry,
      },
    });

    // Get SMTP settings
    const settings = await prisma.siteSettings.findUnique({
      where: { id: 'default' },
    });

    if (settings?.smtpHost && settings?.smtpUser) {
      // Send reset email
      const resetLink = `${(await getSiteUrl())}/auth/reset-password?token=${resetToken}`;

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

      const emailContent = emailTemplates.passwordReset({
        name: user.name || 'Customer',
        resetLink: resetLink,
      }, brand);

      await sendEmail(
        transporter,
        {
          to: user.email,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
        },
        settings.smtpFromName || settings.storeName,
        settings.smtpFromEmail || settings.storeEmail
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
