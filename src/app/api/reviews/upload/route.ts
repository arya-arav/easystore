import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isR2Configured, uploadBufferToR2 } from '@/lib/r2-upload';

export const dynamic = 'force-dynamic';

const ALLOWED = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
]);
const MAX_BYTES = 5 * 1024 * 1024;

// A signed-in shopper uploads a photo to attach to their review.
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Please log in to add photos' }, { status: 401 });
    if (!isR2Configured()) return NextResponse.json({ error: 'Photo uploads are not available' }, { status: 503 });

    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return NextResponse.json({ error: 'No photo provided' }, { status: 400 });
    const ext = ALLOWED.get(file.type);
    if (!ext) return NextResponse.json({ error: 'Photos must be JPG, PNG or WebP' }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: 'Photos must be under 5 MB' }, { status: 400 });

    const url = await uploadBufferToR2(await file.arrayBuffer(), 'reviews', file.type, ext);
    return NextResponse.json({ url });
  } catch (error: any) {
    console.error('Review photo upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
