import { NextRequest, NextResponse } from 'next/server';
import { requireStaff } from '@/lib/admin-auth';
import { createReturn, returnableItems } from '@/lib/order-returns';

export const dynamic = 'force-dynamic';

// GET - items and how many of each can still be returned
export async function GET(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  if (!(await requireStaff())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ items: await returnableItems(id) });
}

// POST { items: [{ itemId, quantity }], reason, note } - start a return
export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  if (!(await requireStaff())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const result = await createReturn(id, { items: body.items, reason: String(body.reason || ''), note: body.note, by: 'ADMIN' });
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result.ret, { status: 201 });
}
