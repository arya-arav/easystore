import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createReturn, returnableItems } from '@/lib/order-returns';
import { getPolicies } from '@/lib/policies-server';

export const dynamic = 'force-dynamic';

async function ownDeliveredOrder(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: 'Please sign in', status: 401 };
  const order = await prisma.order.findFirst({ where: { id, userId: session.user.id }, select: { id: true, status: true, deliveredAt: true, updatedAt: true } });
  if (!order) return { error: 'Order not found', status: 404 };
  if (order.status !== 'DELIVERED') return { error: 'Returns open once the order is delivered', status: 400 };
  const { returnWindowDays, returnReasons } = await getPolicies();
  if (returnWindowDays <= 0) return { error: 'Returns aren’t accepted on this store', status: 400 };
  const delivered = (order.deliveredAt || order.updatedAt).getTime();
  if (Date.now() - delivered > returnWindowDays * 86_400_000) return { error: `Returns are accepted within ${returnWindowDays} days of delivery`, status: 400 };
  return { order, returnWindowDays, returnReasons };
}

// GET - what the customer can still return
export async function GET(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const check = await ownDeliveredOrder(id);
  if ('error' in check) return NextResponse.json({ error: check.error, items: [] }, { status: check.status });
  return NextResponse.json({ items: (await returnableItems(id)).filter((i) => i.returnable > 0), reasons: check.returnReasons, windowDays: check.returnWindowDays });
}

// POST { items: [{ itemId, quantity }], reason, note } - customer asks to return items
export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const check = await ownDeliveredOrder(id);
  if ('error' in check) return NextResponse.json({ error: check.error }, { status: check.status });
  const body = await request.json().catch(() => ({}));
  const result = await createReturn(id, { items: body.items, reason: String(body.reason || ''), note: typeof body.note === 'string' ? body.note.slice(0, 500) : undefined, by: 'CUSTOMER' });
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ success: true }, { status: 201 });
}
