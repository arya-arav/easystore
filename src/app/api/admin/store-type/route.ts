export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireStaff } from '@/lib/admin-auth';
import { getShopType, isShopType } from '@/lib/shop-types';
import { THEMES, parseLayoutConfig, serializeLayoutConfig } from '@/lib/layout-settings';
import { demoCounts, ensureCategories, installDemo, removeDemo } from '@/lib/demo-data';

const deny = () => NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

export async function GET() {
  if (!(await requireStaff(['ADMIN']))) return deny();
  const s = await prisma.siteSettings.findUnique({ where: { id: 'default' }, select: { shopType: true } });
  return NextResponse.json({ shopType: getShopType(s?.shopType).id, demo: await demoCounts() });
}

/** Change the store type: { shopType, applyLook, addCategories, resetWording }. */
export async function PUT(request: Request) {
  if (!(await requireStaff(['ADMIN']))) return deny();
  const body = await request.json().catch(() => null);
  if (!isShopType(body?.shopType)) return NextResponse.json({ error: 'Unknown store type' }, { status: 400 });
  const type = getShopType(body.shopType);

  const row = await prisma.siteSettings.findUnique({ where: { id: 'default' }, select: { layout: true } });
  const data: Record<string, unknown> = { shopType: type.id };
  if (body.applyLook) {
    const layout = parseLayoutConfig(row?.layout);
    data.layout = serializeLayoutConfig({ ...layout, theme: type.theme, accentColor: THEMES[type.theme].primary, font: type.font });
    data.primaryColor = THEMES[type.theme].primary;
    data.secondaryColor = THEMES[type.theme].secondary;
  }
  if (body.resetWording) {
    // Empty = the new type's wording (see formatSettings)
    Object.assign(data, {
      heroTitle: null, heroSubtitle: null, heroBadgeText: null, heroCtaText: null, heroCtaLink: null,
      footerAboutText: null, newsletterSubtitle: null,
      benefit1Icon: null, benefit1Title: null, benefit1Desc: null, benefit2Icon: null, benefit2Title: null, benefit2Desc: null,
      benefit3Icon: null, benefit3Title: null, benefit3Desc: null, benefit4Icon: null, benefit4Title: null, benefit4Desc: null,
    });
  }
  await prisma.siteSettings.upsert({ where: { id: 'default' }, create: { id: 'default', ...data }, update: data });
  if (body.addCategories) await ensureCategories(type.id, { demo: false });
  return NextResponse.json({ ok: true });
}

/** Install demo data for the current store type. */
export async function POST() {
  if (!(await requireStaff(['ADMIN']))) return deny();
  const s = await prisma.siteSettings.findUnique({ where: { id: 'default' }, select: { shopType: true } });
  const result = await installDemo(getShopType(s?.shopType).id);
  return NextResponse.json({ ...result, demo: await demoCounts() });
}

/** Remove all demo data. */
export async function DELETE() {
  if (!(await requireStaff(['ADMIN']))) return deny();
  const result = await removeDemo();
  return NextResponse.json({ ...result, demo: await demoCounts() });
}
