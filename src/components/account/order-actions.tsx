'use client';

// Order page actions for customers: PDF invoice, buy the same items again, cancel early.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { FileDown, Loader2, RotateCcw, XCircle } from 'lucide-react';
import { useShopActions } from '@/lib/shop-actions';

interface Item { productName: string; variant?: string | null; price: number; quantity: number; product?: { id: string; slug: string; images: { url: string }[] } }

export function OrderActions({ orderId, status, items, onCancelled }: { orderId: string; status: string; items: Item[]; onCancelled: () => void }) {
  const router = useRouter();
  const { addToCart } = useShopActions();
  const [busy, setBusy] = useState<'reorder' | 'cancel' | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState('Ordered by mistake');

  const reorder = async () => {
    setBusy('reorder');
    let added = 0;
    try {
      for (const item of items) {
        if (!item.product) continue;
        const ok = await addToCart(
          { productId: item.product.id, name: item.productName, slug: item.product.slug, price: Number(item.price), image: item.product.images?.[0]?.url || '', variant: item.variant || '' },
          item.quantity,
          { silent: true }
        );
        if (ok) added++;
      }
    } finally {
      setBusy(null);
    }
    if (added === 0) toast.error('These items are no longer available');
    else {
      if (added < items.length) toast(`${items.length - added} item(s) are no longer available`, { icon: 'ℹ️' });
      router.push('/cart');
    }
  };

  const cancel = async () => {
    setBusy('cancel');
    try {
      const res = await fetch(`/api/orders/${orderId}/cancel`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error || 'Could not cancel'); return; }
      toast.success('Order cancelled');
      setCancelOpen(false);
      onCancelled();
    } finally {
      setBusy(null);
    }
  };

  const btn = 'flex items-center gap-1.5 px-3 py-2 text-sm border border-[#E5E5E5] rounded-xl text-[#555555] hover:bg-[#F7F7F5] disabled:opacity-50';
  return (
    <>
      <a href={`/api/orders/${orderId}/invoice?format=pdf`} className={btn}><FileDown className="w-4 h-4" /> Invoice PDF</a>
      <button onClick={reorder} disabled={!!busy} className={btn}>
        {busy === 'reorder' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />} Buy again
      </button>
      {['PENDING', 'CONFIRMED'].includes(status) && (
        <button onClick={() => setCancelOpen(true)} className={`${btn} text-red-600 hover:bg-red-50`}><XCircle className="w-4 h-4" /> Cancel</button>
      )}

      {cancelOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={() => setCancelOpen(false)}>
          <div role="dialog" aria-modal="true" className="w-full max-w-sm rounded-2xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-[#333333]">Cancel this order?</h2>
            <p className="mt-1 text-sm text-[#777777]">If you paid online, we&apos;ll refund you to the same payment method.</p>
            <label htmlFor="cancel-reason" className="mt-4 block text-sm font-medium text-[#333333]">Reason</label>
            <select id="cancel-reason" value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[#E5E5E5] px-3 py-2.5 text-sm">
              {['Ordered by mistake', 'Found a better price', 'Delivery is too slow', 'Want to change the items', 'Other'].map((r) => <option key={r}>{r}</option>)}
            </select>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setCancelOpen(false)} className="rounded-full px-4 py-2 text-sm text-[#777777] hover:text-[#333333]">Keep order</button>
              <button onClick={cancel} disabled={busy === 'cancel'} className="flex items-center gap-1.5 rounded-full bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
                {busy === 'cancel' && <Loader2 className="h-4 w-4 animate-spin" />} Cancel order
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
