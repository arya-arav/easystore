export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { validateApiKey } from '@/lib/api-key-auth';
import { fetchOptimizeUpload } from '@/lib/r2-upload';

export async function POST(request: NextRequest) {
  const { valid, scopes } = await validateApiKey(request);
  if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!scopes.includes('upload')) return NextResponse.json({ error: 'Forbidden: missing upload scope' }, { status: 403 });

  const { url, maxWidth } = await request.json();
  if (!url) return NextResponse.json({ error: 'url is required' }, { status: 400 });

  try {
    const result = await fetchOptimizeUpload(url, maxWidth || 1200);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
