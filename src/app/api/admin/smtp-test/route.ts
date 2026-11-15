export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { to } = await request.json();

  const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });

  // Return config status (no password)
  const configStatus = {
    smtpHost: settings?.smtpHost || '(not set)',
    smtpPort: settings?.smtpPort || '(not set)',
    smtpUser: settings?.smtpUser || '(not set)',
    smtpPasswordSet: !!(settings?.smtpPassword && settings.smtpPassword.length > 0),
    smtpFromEmail: settings?.smtpFromEmail || '(not set)',
    smtpFromName: settings?.smtpFromName || '(not set)',
  };

  if (!settings?.smtpHost || !settings?.smtpUser || !settings?.smtpPassword) {
    return NextResponse.json({ error: 'SMTP not fully configured', config: configStatus }, { status: 400 });
  }

  try {
    const { createTransporter, sendEmail } = await import('@/lib/email');
    const transporter = createTransporter({
      host: settings.smtpHost,
      port: settings.smtpPort || 587,
      secure: settings.smtpSecure,
      user: settings.smtpUser,
      password: settings.smtpPassword,
      fromName: settings.smtpFromName || settings.storeName,
      fromEmail: settings.smtpFromEmail || settings.storeEmail,
    });

    // Verify connection first
    await transporter.verify();

    const result = await sendEmail(transporter, {
      to: to || settings.storeEmail,
      subject: `${settings.storeName} SMTP Test ✅`,
      html: '<p>SMTP is working correctly!</p>',
      text: 'SMTP is working correctly!',
    }, settings.smtpFromName || settings.storeName, settings.smtpFromEmail || settings.storeEmail);

    return NextResponse.json({ success: result.success, config: configStatus, error: result.error });
  } catch (err: any) {
    return NextResponse.json({ success: false, config: configStatus, error: err.message }, { status: 500 });
  }
}
