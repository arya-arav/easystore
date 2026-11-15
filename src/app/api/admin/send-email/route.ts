import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createTransporter, sendEmail, emailTemplates } from '@/lib/email';
import { getBrand } from '@/lib/email-brand';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'SELLER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type, data } = await request.json();

    // Get SMTP settings
    const settings = await prisma.siteSettings.findUnique({
      where: { id: 'default' },
    });

    if (!settings?.smtpHost || !settings?.smtpUser) {
      return NextResponse.json({ error: 'SMTP not configured' }, { status: 400 });
    }

    // Create transporter
    const transporter = createTransporter({
      host: settings.smtpHost,
      port: settings.smtpPort || 587,
      secure: settings.smtpSecure,
      user: settings.smtpUser,
      password: settings.smtpPassword || '',
      fromName: settings.smtpFromName || settings.storeName,
      fromEmail: settings.smtpFromEmail || settings.storeEmail,
    });

    const brand = await getBrand();

    // Get template
    const templates: Record<string, any> = {
      registration: (d: any) => emailTemplates.registration(d, brand),
      orderConfirmation: (d: any) => emailTemplates.orderConfirmation(d, brand),
      orderShipped: (d: any) => emailTemplates.orderShipped(d, brand),
      passwordReset: (d: any) => emailTemplates.passwordReset(d, brand),
    };

    const template = templates[type];
    if (!template) {
      return NextResponse.json({ error: 'Invalid email type' }, { status: 400 });
    }

    const emailContent = template(data);

    // Send email
    const result = await sendEmail(
      transporter,
      {
        to: data.email,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      },
      settings.smtpFromName || settings.storeName,
      settings.smtpFromEmail || settings.storeEmail
    );

    if (result.success) {
      return NextResponse.json({ success: true, messageId: result.messageId });
    } else {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Send email error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
