export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const testimonials = await prisma.testimonial.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    take: 12,
  });
  return NextResponse.json({ testimonials });
}
