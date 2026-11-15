export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { status, reply } = await request.json();

  const data: any = {};
  if (status) data.status = status;
  if (reply) {
    data.reply = reply;
    data.repliedAt = new Date();
    data.status = 'REPLIED';
  }

  const message = await prisma.contactMessage.update({ where: { id: params.id }, data });

  // Send reply email if reply provided
  if (reply) {
    sendReplyEmail(message).catch(() => {});
  }

  return NextResponse.json({ success: true, message });
}

async function sendReplyEmail(msg: any) {
  const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
  if (!settings?.smtpHost || !settings?.smtpUser) return;

  const { createTransporter, sendEmail } = await import('@/lib/email');
  const { getBrand } = await import('@/lib/email-brand');
  const brand = await getBrand();

  const transporter = createTransporter({
    host: settings.smtpHost, port: settings.smtpPort || 587, secure: settings.smtpSecure,
    user: settings.smtpUser, password: settings.smtpPassword || '',
    fromName: settings.smtpFromName || brand.storeName,
    fromEmail: settings.smtpFromEmail || settings.storeEmail,
  });

  await sendEmail(transporter, {
    to: msg.email,
    subject: `Re: ${msg.subject} — ${brand.storeName}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:20px;background:#F7F7F5;">
        <div style="background:#fff;border-radius:16px;padding:32px;">
          <h3 style="color:#333;margin:0 0 12px;">Hi ${msg.name},</h3>
          <p style="color:#666;line-height:1.6;margin:0 0 20px;">${msg.reply.replace(/\n/g, '<br>')}</p>
          <hr style="border:none;border-top:1px solid #eee;margin:20px 0;" />
          <p style="color:#aaa;font-size:12px;">Your original message: ${msg.message}</p>
        </div>
        <p style="text-align:center;color:#aaa;font-size:12px;margin-top:16px;">© ${new Date().getFullYear()} ${brand.storeName}</p>
      </div>
    `,
    text: `Hi ${msg.name},\n\n${msg.reply}\n\n---\nYour message: ${msg.message}`,
  }, settings.smtpFromName || brand.storeName, settings.smtpFromEmail || settings.storeEmail);
}
