import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Please log in to write a review' }, { status: 401 });
    }

    const { productId, rating, title, comment, images } = await request.json();

    // Only photos uploaded through /api/reviews/upload (our image storage), at most 3.
    const photoBase = `${(process.env.R2_PUBLIC_URL || '').replace(/\/$/, '')}/reviews/`;
    const photos: string[] = (Array.isArray(images) ? images : [])
      .filter((u: unknown): u is string => typeof u === 'string' && !!process.env.R2_PUBLIC_URL && u.startsWith(photoBase))
      .slice(0, 3);

    if (!productId || !rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Invalid review data' }, { status: 400 });
    }

    // Check if user already reviewed this product
    const existing = await prisma.review.findFirst({
      where: { userId: session.user.id, productId },
    });

    if (existing) {
      return NextResponse.json({ error: 'You have already reviewed this product' }, { status: 409 });
    }

    const review = await prisma.review.create({
      data: {
        userId: session.user.id,
        productId,
        rating,
        title: title?.trim() || null,
        comment: comment?.trim() || null,
        images: photos,
        isApproved: true,
      },
    });

    return NextResponse.json(review, { status: 201 });
  } catch (error: any) {
    console.error('Review POST error:', error);
    return NextResponse.json({ error: 'Failed to submit review' }, { status: 500 });
  }
}
