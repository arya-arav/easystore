import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isR2Configured, uploadBufferToR2, STORAGE_HELP } from '@/lib/r2-upload';

export const dynamic = 'force-dynamic';

async function uploadToR2(file: File): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg';
  return uploadBufferToR2(await file.arrayBuffer(), 'products', file.type, ext);
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'SELLER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    if (!file.type.startsWith('image/')) return NextResponse.json({ error: 'Only image files allowed' }, { status: 400 });
    if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: 'Max file size is 5MB' }, { status: 400 });

    const useR2 = isR2Configured();
    if (!useR2) {
      return NextResponse.json({ error: STORAGE_HELP }, { status: 500 });
    }

    const url = await uploadToR2(file);
    return NextResponse.json({ url });

  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 });
  }
}
