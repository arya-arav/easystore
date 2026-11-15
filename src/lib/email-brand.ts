import { prisma } from '@/lib/prisma';
import { getSiteUrl } from '@/lib/site-url';

export async function getBrand() {
  const s = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
  return {
    storeName: s?.storeName || 'My Store',
    logoUrl: s?.logo || '',
    primaryColor: s?.primaryColor || '#7FAF8E',
    siteUrl: (await getSiteUrl()),
  };
}
