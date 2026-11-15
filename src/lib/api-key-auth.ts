import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createHash } from 'crypto';

export async function validateApiKey(request: NextRequest): Promise<{ valid: boolean; scopes: string[] }> {
  const auth = request.headers.get('authorization') || '';
  const key = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';

  if (!key || !key.startsWith('bb_live_')) {
    return { valid: false, scopes: [] };
  }

  const keyHash = createHash('sha256').update(key).digest('hex');

  const apiKey = await prisma.apiKey.findUnique({ where: { keyHash } });

  if (!apiKey || !apiKey.isActive) return { valid: false, scopes: [] };
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return { valid: false, scopes: [] };

  // Update lastUsedAt (fire and forget)
  prisma.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } }).catch(() => {});

  return { valid: true, scopes: apiKey.scopes.split(',').map(s => s.trim()) };
}
