import { NextResponse } from 'next/server';
import { getLiveBanners } from '@/lib/banners-server';
import { isBannerPosition } from '@/lib/banners';

/** Live banners for one position, with that position's layout. */
export async function GET(request: Request) {
  const position = new URL(request.url).searchParams.get('position');
  if (!isBannerPosition(position)) return NextResponse.json({ error: 'Unknown position' }, { status: 400 });
  return NextResponse.json(await getLiveBanners(position));
}
