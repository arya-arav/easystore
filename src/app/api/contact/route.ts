export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  // Spam guard: 5 messages per IP per hour
  if (!(await rateLimit(`contact:${getClientIp(request)}`, 5, 60 * 60 * 1000)).allowed) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  try {
    const { name, email, phone, subject, message } = await request.json();

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Name, email and message are required' }, { status: 400 });
    }

    const contact = await prisma.contactMessage.create({
      data: { name, email, phone: phone || null, subject: subject || 'General Inquiry', message },
    });

    // Send admin notification + auto-reply (fire and forget)
    sendContactEmails(contact).catch(err => console.error('Contact email error:', err));

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Contact form error:', err);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}

async function sendContactEmails(contact: { name: string; email: string; subject: string; message: string }) {
  const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
  if (!settings?.smtpHost || !settings?.smtpUser) return;

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

  const storeName = brand.storeName;
  const siteUrl = brand.siteUrl;
  const primaryColor = brand.primaryColor;
  const logoHtml = brand.logoUrl && brand.logoUrl !== '/images/logo.png'
    ? `<img src="${brand.logoUrl}" alt="${storeName}" style="max-height:48px;object-fit:contain;" />`
    : `<h2 style="color:${primaryColor};margin:0;">${storeName}</h2>`;

  // Auto-reply to customer
  await sendEmail(transporter, {
    to: contact.email,
    subject: `We received your message — ${storeName}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:20px;background:#F7F7F5;">
        <div style="text-align:center;padding:20px 0;">${logoHtml}</div>
        <div style="background:#fff;border-radius:16px;padding:32px;">
          <h3 style="color:#333;margin:0 0 12px;">Hi ${contact.name},</h3>
          <p style="color:#666;line-height:1.6;margin:0 0 16px;">
            Thank you for reaching out! We've received your message and will get back to you within 24 hours.
          </p>
          <div style="background:#F7F7F5;border-radius:12px;padding:16px;margin:16px 0;">
            <p style="margin:0;color:#888;font-size:13px;">Your message:</p>
            <p style="margin:8px 0 0;color:#555;font-size:14px;line-height:1.6;">${contact.message}</p>
          </div>
          <p style="color:#999;font-size:13px;margin:16px 0 0;">
            For urgent queries, WhatsApp us at ${settings.whatsappNumber || settings.storePhone || ''}.
          </p>
        </div>
        <p style="text-align:center;color:#aaa;font-size:12px;margin-top:16px;">© ${new Date().getFullYear()} ${storeName} · <a href="${siteUrl}" style="color:${primaryColor};">${siteUrl.replace('https://', '')}</a></p>
      </div>
    `,
    text: `Hi ${contact.name},\n\nWe received your message and will reply within 24 hours.\n\nYour message: ${contact.message}`,
  }, settings.smtpFromName || storeName, settings.smtpFromEmail || settings.storeEmail);

  // Notify admin
  await sendEmail(transporter, {
    to: settings.storeEmail,
    subject: `New contact message: ${contact.subject}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:20px;">
        <h3 style="color:#333;">New Contact Message</h3>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr><td style="padding:8px;color:#888;width:100px;">From</td><td style="padding:8px;color:#333;font-weight:600;">${contact.name} &lt;${contact.email}&gt;</td></tr>
          <tr><td style="padding:8px;color:#888;">Subject</td><td style="padding:8px;color:#333;">${contact.subject}</td></tr>
          <tr><td style="padding:8px;color:#888;vertical-align:top;">Message</td><td style="padding:8px;color:#555;line-height:1.6;">${contact.message}</td></tr>
        </table>
        <a href="${siteUrl}/admin" style="display:inline-block;margin-top:16px;background:${primaryColor};color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:14px;">View in Admin</a>
      </div>
    `,
    text: `New contact from ${contact.name} (${contact.email})\n\nSubject: ${contact.subject}\n\n${contact.message}`,
  }, settings.smtpFromName || storeName, settings.smtpFromEmail || settings.storeEmail);
}
