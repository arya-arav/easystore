import { NextRequest, NextResponse } from 'next/server';
import { requireStaff } from '@/lib/admin-auth';
import { updateOrder } from '@/lib/admin-orders';

export const dynamic = 'force-dynamic';

// POST { ids: string[], status } - change several orders at once
export async function POST(request: NextRequest) {
  if (!(await requireStaff())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { ids, status } = await request.json().catch(() => ({}));
  if (!Array.isArray(ids) || ids.length === 0 || typeof status !== 'string') {
    return NextResponse.json({ error: 'Choose orders and a status' }, { status: 400 });
  }
  let updated = 0;
  for (const id of ids.slice(0, 200)) {
    const result = await updateOrder(String(id), { status });
    if (!('error' in result)) updated++;
  }
  return NextResponse.json({ updated });
}
