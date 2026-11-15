import { prisma } from '@/lib/prisma';

/** GST % for a product when none is chosen (Admin → Settings → Tax). */
export async function defaultGstRate(): Promise<number> {
  const s = await prisma.siteSettings.findUnique({ where: { id: 'default' }, select: { defaultGstRate: true } });
  return s?.defaultGstRate != null ? Number(s.defaultGstRate) : 18;
}

export const hasValue = (v: unknown) => v !== undefined && v !== null && v !== '';
