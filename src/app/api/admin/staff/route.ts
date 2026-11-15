import { NextRequest, NextResponse } from 'next/server';
import { getSiteUrl } from '@/lib/site-url';
import { prisma } from '@/lib/prisma';
import { requireStaff } from '@/lib/admin-auth';
import { createTransporter, sendEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

const ROLES = ['ADMIN', 'SELLER'] as const;

// GET - everyone who can open the admin
export async function GET() {
  if (!(await requireStaff(['ADMIN']))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const staff = await prisma.user.findMany({
    where: { role: { in: ['ADMIN', 'SELLER'] } },
    select: { id: true, name: true, email: true, role: true, createdAt: true, password: true, resetTokenExpiry: true },
    orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
  });
  return NextResponse.json({
    staff: staff.map(({ password, resetTokenExpiry, ...s }) => ({
      ...s,
      // Invited but hasn't set a password yet
      invitePending: !password && !!resetTokenExpiry && resetTokenExpiry > new Date(),
    })),
  });
}

// POST { email, name, role } - give someone admin access and send a link to set a password
export async function POST(request: NextRequest) {
  const me = await requireStaff(['ADMIN']);
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const email = String(body.email || '').trim().toLowerCase();
  const role = ROLES.includes(body.role) ? body.role : 'SELLER';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: 'Enter a valid email' }, { status: 400 });

  const existing = await prisma.user.findUnique({ where: { email } });
  const resetToken = Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) => b.toString(16).padStart(2, '0')).join('');
  const resetTokenExpiry = new Date(Date.now() + 7 * 86_400_000);
  const user = existing
    ? await prisma.user.update({ where: { id: existing.id }, data: { role, ...(existing.password ? {} : { resetToken, resetTokenExpiry }) } })
    : await prisma.user.create({ data: { email, name: String(body.name || '').trim() || email.split('@')[0], role, emailVerified: new Date(), resetToken, resetTokenExpiry } });

  const base = (await getSiteUrl());
  const link = existing?.password ? `${base}/admin` : `${base}/auth/reset-password?token=${resetToken}`;
  let emailed = false;
  const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
  if (settings?.smtpHost && settings?.smtpUser) {
    const transporter = createTransporter({
      host: settings.smtpHost, port: settings.smtpPort || 587, secure: settings.smtpSecure, user: settings.smtpUser,
      password: settings.smtpPassword || '', fromName: settings.smtpFromName || settings.storeName, fromEmail: settings.smtpFromEmail || settings.storeEmail,
    });
    const store = settings.storeName || 'our store';
    const action = existing?.password ? 'Open the admin' : 'Set your password';
    const result = await sendEmail(transporter, {
      to: email,
      subject: `You've been added to ${store} admin`,
      html: `<p>Hi ${user.name},</p><p>${me.name || 'An admin'} gave you <b>${role === 'ADMIN' ? 'Admin' : 'Seller'}</b> access to the ${store} admin.</p><p><a href="${link}">${action}</a></p>${existing?.password ? '' : '<p>This link works for 7 days.</p>'}`,
      text: `${me.name || 'An admin'} gave you ${role} access to the ${store} admin. ${action}: ${link}`,
    }, settings.smtpFromName || store, settings.smtpFromEmail || settings.storeEmail);
    emailed = result.success;
  }

  // The link is returned so it can be shared another way when email isn't set up
  return NextResponse.json({ id: user.id, emailed, link }, { status: 201 });
}
