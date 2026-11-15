export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET — list abandoned carts (items not updated in 1+ hour, user hasn't ordered recently)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const carts = await prisma.cartItem.groupBy({
    by: ['userId'],
    where: { updatedAt: { lt: oneHourAgo } },
    _count: { id: true },
    _sum: {},
  });

  return NextResponse.json({ count: carts.length, carts });
}

// POST — trigger recovery emails for abandoned carts
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Find users with cart items older than 1 hour but not yet emailed today
  const abandonedUsers = await prisma.user.findMany({
    where: {
      cart: {
        some: { updatedAt: { lt: oneHourAgo } },
      },
    },
    include: {
      cart: {
        include: {
          product: { include: { images: { where: { isPrimary: true }, take: 1 } } },
        },
      },
    },
    take: 50,
  });

  const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
  if (!settings?.smtpHost || !settings?.smtpUser) {
    return NextResponse.json({ error: 'SMTP not configured' }, { status: 400 });
  }

  const { createTransporter, sendEmail } = await import('@/lib/email');
  const { getBrand } = await import('@/lib/email-brand');
  const brand = await getBrand();

  const transporter = createTransporter({
    host: settings.smtpHost, port: settings.smtpPort || 587, secure: settings.smtpSecure,
    user: settings.smtpUser, password: settings.smtpPassword || '',
    fromName: settings.smtpFromName || brand.storeName,
    fromEmail: settings.smtpFromEmail || settings.storeEmail,
  });

  let sent = 0;
  for (const user of abandonedUsers) {
    if (!user.email || user.cart.length === 0) continue;

    const itemsHtml = user.cart.slice(0, 3).map(item => `
      <tr>
        <td style="padding:8px;"><img src="${item.product.images[0]?.url || ''}" width="50" style="border-radius:8px;" /></td>
        <td style="padding:8px;font-size:14px;color:#333;">${item.product.name}</td>
        <td style="padding:8px;font-size:14px;color:#7FAF8E;font-weight:600;">₹${Number(item.product.price).toLocaleString('en-IN')}</td>
      </tr>`).join('');

    const logoHtml = brand.logoUrl && brand.logoUrl !== '/images/logo.png'
      ? `<img src="${brand.logoUrl}" alt="${brand.storeName}" style="max-height:48px;" />`
      : `<h2 style="color:${brand.primaryColor};margin:0;">${brand.storeName}</h2>`;

    await sendEmail(transporter, {
      to: user.email,
      subject: `You left something behind! 🛒 — ${brand.storeName}`,
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:20px;background:#F7F7F5;">
          <div style="text-align:center;padding:20px 0;">${logoHtml}</div>
          <div style="background:#fff;border-radius:16px;padding:32px;">
            <h3 style="color:#333;margin:0 0 8px;">Hi ${user.name || 'there'},</h3>
            <p style="color:#666;margin:0 0 20px;">You left some items in your cart. They're still waiting for you!</p>
            <table width="100%" cellpadding="0" cellspacing="0">${itemsHtml}</table>
            <div style="text-align:center;margin-top:24px;">
              <a href="${brand.siteUrl}/cart" style="display:inline-block;background:${brand.primaryColor};color:#fff;padding:13px 28px;border-radius:12px;text-decoration:none;font-weight:600;">
                Complete Your Order →
              </a>
            </div>
          </div>
          <p style="text-align:center;color:#aaa;font-size:12px;margin-top:16px;">© ${new Date().getFullYear()} ${brand.storeName}</p>
        </div>
      `,
      text: `Hi ${user.name || 'there'},\n\nYou left items in your cart. Complete your order at ${brand.siteUrl}/cart`,
    }, settings.smtpFromName || brand.storeName, settings.smtpFromEmail || settings.storeEmail);

    sent++;
  }

  return NextResponse.json({ success: true, sent });
}
