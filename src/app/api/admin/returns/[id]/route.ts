import { NextRequest, NextResponse } from 'next/server';
import { requireStaff } from '@/lib/admin-auth';
import { settleReturn } from '@/lib/order-returns';

export const dynamic = 'force-dynamic';

// PATCH { action: 'receive' | 'reject', note }
export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  if (!(await requireStaff())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  if (body.action !== 'receive' && body.action !== 'reject') return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  const result = await settleReturn(id, body.action, body.note);
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result.ret);
}
