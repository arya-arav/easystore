// Force dynamic rendering
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getPublicSettings } from '@/lib/public-settings';

export async function GET() {
  return NextResponse.json(await getPublicSettings(), {
    headers: { 'Cache-Control': 'public, max-age=10, stale-while-revalidate=30' },
  });
}
