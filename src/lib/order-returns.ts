import { prisma } from '@/lib/prisma';
import { restockItems } from '@/lib/variant-stock';
import { getPolicies } from '@/lib/policies-server';

// Refunds (money back, can be partial) and returns (items back) for an order. Each step
// is written to the order's timeline.

// Return window and reason lists come from Settings → Policies.

const inr = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

async function timeline(orderId: string, note: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { status: true } });
  if (order) await prisma.orderStatusHistory.create({ data: { orderId, status: order.status, note } });
}

export async function refundedSoFar(orderId: string) {
  const sum = await prisma.orderRefund.aggregate({ where: { orderId }, _sum: { amount: true } });
  return Number(sum._sum.amount || 0);
}

export async function recordRefund(orderId: string, input: { amount: number; reason: string; note?: string; by?: string }) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { total: true } });
  if (!order) return { error: 'Order not found' };
  const amount = Math.round(Number(input.amount) * 100) / 100;
  const already = await refundedSoFar(orderId);
  const left = Math.round((Number(order.total) - already) * 100) / 100;
  if (!(amount > 0)) return { error: 'Enter an amount above zero' };
  if (amount > left) return { error: `Only ${inr(left)} is left to refund on this order` };
  const reason = (await getPolicies()).refundReasons.includes(input.reason) ? input.reason : 'Other';

  const refund = await prisma.orderRefund.create({
    data: { orderId, amount, reason, note: input.note?.trim() || null, createdBy: input.by || null },
  });
  const fully = amount >= left;
  if (fully) await prisma.order.update({ where: { id: orderId }, data: { paymentStatus: 'REFUNDED' } });
  await timeline(orderId, `Refunded ${inr(amount)} · ${reason}${fully ? ' (fully refunded)' : ''}`);
  return { refund };
}

type ReturnLine = { itemId: string; quantity: number };

/** How many of each order item can still be returned (bought minus open/received returns). */
export async function returnableItems(orderId: string) {
  const [items, returns] = await Promise.all([
    prisma.orderItem.findMany({ where: { orderId }, select: { id: true, productName: true, variant: true, quantity: true, price: true } }),
    prisma.orderReturn.findMany({ where: { orderId, status: { not: 'REJECTED' } }, select: { items: true } }),
  ]);
  const used = new Map<string, number>();
  for (const r of returns) {
    for (const l of JSON.parse(r.items || '[]') as ReturnLine[]) used.set(l.itemId, (used.get(l.itemId) || 0) + l.quantity);
  }
  return items.map((i) => ({ ...i, price: Number(i.price), returnable: Math.max(0, i.quantity - (used.get(i.id) || 0)) }));
}

export async function createReturn(orderId: string, input: { items: ReturnLine[]; reason: string; note?: string; by: 'ADMIN' | 'CUSTOMER' }) {
  const available = await returnableItems(orderId);
  const lines = (Array.isArray(input.items) ? input.items : [])
    .map((l) => ({ itemId: String(l.itemId), quantity: Math.floor(Number(l.quantity) || 0) }))
    .filter((l) => l.quantity > 0);
  if (lines.length === 0) return { error: 'Choose at least one item to return' };
  for (const l of lines) {
    const item = available.find((i) => i.id === l.itemId);
    if (!item) return { error: 'That item is not on this order' };
    if (l.quantity > item.returnable) return { error: `Only ${item.returnable} of ${item.productName} can be returned` };
  }
  const reason = (await getPolicies()).returnReasons.includes(input.reason) ? input.reason : 'Other';
  const ret = await prisma.orderReturn.create({
    data: {
      orderId, reason, items: JSON.stringify(lines), requestedBy: input.by,
      customerNote: input.by === 'CUSTOMER' ? input.note?.trim() || null : null,
      adminNote: input.by === 'ADMIN' ? input.note?.trim() || null : null,
    },
  });
  const count = lines.reduce((n, l) => n + l.quantity, 0);
  await timeline(orderId, `Return ${input.by === 'CUSTOMER' ? 'requested by customer' : 'created'} · ${count} item${count === 1 ? '' : 's'} · ${reason}`);
  return { ret };
}

/** RECEIVED puts the items back in stock; REJECTED closes the request. */
export async function settleReturn(returnId: string, action: 'receive' | 'reject', note?: string) {
  const ret = await prisma.orderReturn.findUnique({ where: { id: returnId } });
  if (!ret) return { error: 'Return not found' };
  if (ret.status !== 'REQUESTED') return { error: 'This return is already closed' };
  const lines = JSON.parse(ret.items || '[]') as ReturnLine[];

  if (action === 'receive') {
    const items = await prisma.orderItem.findMany({ where: { id: { in: lines.map((l) => l.itemId) } }, select: { id: true, productId: true, variant: true } });
    await restockItems(lines.map((l) => {
      const item = items.find((i) => i.id === l.itemId);
      return { productId: item?.productId ?? null, variant: item?.variant ?? null, quantity: l.quantity };
    }));
  }
  const updated = await prisma.orderReturn.update({
    where: { id: returnId },
    data: action === 'receive'
      ? { status: 'RECEIVED', receivedAt: new Date(), adminNote: note?.trim() || ret.adminNote }
      : { status: 'REJECTED', adminNote: note?.trim() || ret.adminNote },
  });
  const count = lines.reduce((n, l) => n + l.quantity, 0);
  await timeline(ret.orderId, action === 'receive' ? `Return received · ${count} item${count === 1 ? '' : 's'} back in stock` : `Return rejected${note?.trim() ? ` · ${note.trim()}` : ''}`);
  return { ret: updated };
}
