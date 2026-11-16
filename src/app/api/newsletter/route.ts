export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  // Spam guard: 5 sign-ups per IP per hour
  if (!(await rateLimit(`newsletter:${getClientIp(request)}`, 5, 60 * 60 * 1000)).allowed) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  try {
    const { email } = await request.json();
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
    }

    const existing = await prisma.newsletterSubscriber.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existing) {
      if (existing.isActive) {
        return NextResponse.json({ success: true, alreadySubscribed: true });
      }
      // Re-subscribe
      await prisma.newsletterSubscriber.update({
        where: { email: email.toLowerCase() },
        data: { isActive: true, unsubscribedAt: null },
      });
      return NextResponse.json({ success: true });
    }

    await prisma.newsletterSubscriber.create({
      data: { email: email.toLowerCase() },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Newsletter subscribe error:', error);
    return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 });
  }
}

// Unsubscribe via GET (from email link)
export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get('email');
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

  await prisma.newsletterSubscriber.updateMany({
    where: { email: email.toLowerCase() },
    data: { isActive: false, unsubscribedAt: new Date() },
  });

  return NextResponse.json({ success: true, message: 'Unsubscribed successfully' });
}
