export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

function buildSku(name: string, suffix: string) {
  const prefix = name
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w.slice(0, 4))
    .join('');
  return `BB-${prefix || 'PROD'}-${suffix}`;
}

function randomSuffix() {
  // 6 alphanumeric chars (uppercase)
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get('name') || '';

  // Try up to 10 times to find a unique SKU
  for (let i = 0; i < 10; i++) {
    const sku = buildSku(name, randomSuffix());
    const existing = await prisma.product.findUnique({ where: { sku } });
    if (!existing) {
      return NextResponse.json({ sku });
    }
  }

  // Fallback: timestamp-based suffix (guaranteed unique)
  const sku = buildSku(name, Date.now().toString(36).toUpperCase().slice(-6));
  return NextResponse.json({ sku });
}
