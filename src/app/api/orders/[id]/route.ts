import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const order = await prisma.order.findFirst({
      where: { id: params.id, userId: session.user.id },
      include: {
        items: {
          include: {
            product: { select: { id: true, slug: true, images: { take: 1 } } },
          },
        },
        statusHistory: { where: { OR: [{ note: null }, { NOT: { note: { startsWith: 'Note: ' } } }] }, orderBy: { createdAt: 'asc' } }, // staff notes stay private
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json(order);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 });
  }
}
