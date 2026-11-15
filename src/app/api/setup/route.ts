export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { needsSetup, markSetupDone } from '@/lib/setup';
import { isShopType, getShopType } from '@/lib/shop-types';
import { THEMES, parseLayoutConfig, serializeLayoutConfig } from '@/lib/layout-settings';
import { ensureCategories, installDemo } from '@/lib/demo-data';

/** Whether this install still needs the setup wizard. */
export async function GET() {
  return NextResponse.json({ needsSetup: await needsSetup() });
}

/** Runs the wizard: store details, shop type, first admin, optional demo data. Only works before an admin exists. */
export async function POST(request: Request) {
  if (!(await needsSetup())) return NextResponse.json({ error: 'This store is already set up. Sign in instead.' }, { status: 409 });

  const body = await request.json().catch(() => null);
  const shopType = body?.shopType;
  const storeName = typeof body?.storeName === 'string' ? body.storeName.trim().slice(0, 60) : '';
  const storeEmail = typeof body?.storeEmail === 'string' ? body.storeEmail.trim().toLowerCase().slice(0, 120) : '';
  const storePhone = typeof body?.storePhone === 'string' ? body.storePhone.trim().slice(0, 30) : '';
  const adminName = typeof body?.adminName === 'string' ? body.adminName.trim().slice(0, 80) : '';
  const adminEmail = typeof body?.adminEmail === 'string' ? body.adminEmail.trim().toLowerCase() : '';
  const password = typeof body?.password === 'string' ? body.password : '';

  if (!isShopType(shopType)) return NextResponse.json({ error: 'Choose what kind of shop this is' }, { status: 400 });
  if (!storeName) return NextResponse.json({ error: 'Give your store a name' }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) return NextResponse.json({ error: 'Enter a valid admin email' }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: 'Use a password with at least 8 characters' }, { status: 400 });

  const type = getShopType(shopType);

  // 1. Admin account (or promote an existing account with that email)
  const hashed = await bcrypt.hash(password, 12);
  await prisma.user.upsert({
    where: { email: adminEmail },
    create: { email: adminEmail, name: adminName || 'Admin', password: hashed, role: 'ADMIN', emailVerified: new Date() },
    update: { password: hashed, role: 'ADMIN', emailVerified: new Date(), ...(adminName ? { name: adminName } : {}) },
  });
  markSetupDone();

  // 2. Store settings: name, contact, type, and the type's look
  const existing = await prisma.siteSettings.findUnique({ where: { id: 'default' }, select: { layout: true } });
  const layout = parseLayoutConfig(existing?.layout);
  const nextLayout = serializeLayoutConfig({ ...layout, theme: type.theme, accentColor: THEMES[type.theme].primary, font: type.font, homeLayout: 'spotlight' });
  const settings = {
    shopType: type.id,
    storeName,
    storeEmail: storeEmail || adminEmail,
    storePhone: storePhone || null,
    whatsappNumber: storePhone || null,
    smtpFromName: storeName,
    primaryColor: THEMES[type.theme].primary,
    secondaryColor: THEMES[type.theme].secondary,
    layout: nextLayout,
  };
  await prisma.siteSettings.upsert({ where: { id: 'default' }, create: { id: 'default', ...settings }, update: settings });

  // 3. Categories for the type, and demo products if asked
  let demo = null;
  if (body?.demo) demo = await installDemo(type.id);
  else await ensureCategories(type.id, { demo: false });

  return NextResponse.json({ ok: true, demo });
}
