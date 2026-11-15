export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createHash, randomBytes } from 'crypto';

function hashKey(key: string) {
  return createHash('sha256').update(key).digest('hex');
}

// GET - list all API keys (no secrets shown)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const keys = await prisma.apiKey.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, keyPrefix: true, scopes: true, isActive: true, lastUsedAt: true, expiresAt: true, createdAt: true },
  });

  return NextResponse.json({ keys });
}

// POST - create new API key
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 80) : '';
  if (!name) return NextResponse.json({ error: 'Give the key a name' }, { status: 400 });
  const ALLOWED = ['products:write', 'categories:read', 'upload'];
  const picked: string[] = Array.isArray(body.scopes) ? body.scopes.filter((s: unknown) => ALLOWED.includes(s as string)) : [];
  if (Array.isArray(body.scopes) && picked.length === 0) return NextResponse.json({ error: 'Choose at least one permission' }, { status: 400 });
  const scopes = picked.length ? picked.join(',') : null;
  const expires = body.expiresAt ? new Date(body.expiresAt) : null;
  if (expires && (Number.isNaN(expires.getTime()) || expires < new Date())) return NextResponse.json({ error: 'Pick an expiry date in the future' }, { status: 400 });
  const expiresAt = expires;

  // Generate: bb_live_<32 random hex chars>
  const rawKey = `bb_live_${randomBytes(16).toString('hex')}`;
  const keyHash = hashKey(rawKey);
  const keyPrefix = rawKey.slice(0, 12); // "bb_live_XXXX"

  const apiKey = await prisma.apiKey.create({
    data: {
      name,
      keyHash,
      keyPrefix,
      scopes: scopes || 'products:write,categories:read,upload',
      expiresAt,
    },
  });

  // Return the raw key ONCE — never stored again
  return NextResponse.json({ id: apiKey.id, name: apiKey.name, key: rawKey, keyPrefix });
}
