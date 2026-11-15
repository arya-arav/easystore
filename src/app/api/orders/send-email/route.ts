import { NextResponse } from 'next/server';
import { requireStaff } from '@/lib/admin-auth';
import { sendOrderEmail } from '@/lib/order-emails';

// POST { type, orderId } - (re)send an order email to the customer. Staff only.
export async function POST(request: Request) {
  try {
    if (!(await requireStaff())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { type, orderId } = await request.json();
    if (type !== 'orderConfirmation' && type !== 'orderShipped') return NextResponse.json({ error: 'Invalid email type' }, { status: 400 });
    return NextResponse.json(await sendOrderEmail(type, String(orderId)));
  } catch (error: any) {
    console.error('Send order email error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
