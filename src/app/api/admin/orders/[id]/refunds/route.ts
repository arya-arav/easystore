import { NextRequest, NextResponse } from 'next/server';
import { requireStaff } from '@/lib/admin-auth';
import { recordRefund } from '@/lib/order-returns';

export const dynamic = 'force-dynamic';

// POST { amount, reason, note } - record money returned to the customer
export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const result = await recordRefund(id, { amount: Number(body.amount), reason: String(body.reason || ''), note: body.note, by: staff.email || staff.id });
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result.refund, { status: 201 });
}
