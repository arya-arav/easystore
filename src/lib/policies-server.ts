import { prisma } from '@/lib/prisma';
import { parsePolicies, type StorePolicies } from '@/lib/policies';

export async function getPolicies(): Promise<StorePolicies> {
  const s = await prisma.siteSettings.findUnique({ where: { id: 'default' }, select: { policies: true } });
  return parsePolicies(s?.policies);
}
