'use client';

// "Return items" on a delivered order (within the return window). Staff then receive
// the items into stock and refund from the admin order page.

import { useEffect, useState } from 'react';
import { Undo2, Loader2 } from 'lucide-react';


export function ReturnRequest({ orderId }: { orderId: string }) {
  const [items, setItems] = useState<{ id: string; productName: string; variant: string | null; returnable: number }[] | null>(null);
  const [blocked, setBlocked] = useState('');
  const [open, setOpen] = useState(false);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [reasons, setReasons] = useState<string[]>(['Other']);
  const [windowDays, setWindowDays] = useState(7);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  useEffect(() => {
    fetch(`/api/orders/${orderId}/return`).then(async (r) => {
      const data = await r.json().catch(() => ({}));
      if (r.ok) {
        setItems(data.items || []);
        if (data.reasons?.length) { setReasons(data.reasons); setReason((cur) => cur || data.reasons[0]); }
        if (data.windowDays) setWindowDays(data.windowDays);
      }
      else setBlocked(data.error || '');
    }).catch(() => {});
  }, [orderId, sent]);

  if (sent) {
    return (
      <div className="bg-white rounded-2xl border border-[#E5E5E5] px-6 py-5 no-print">
        <p className="text-sm font-semibold text-[#333333]">Return requested</p>
        <p className="text-sm text-[#777777] mt-1">We&apos;ll be in touch about pickup. Your refund is sent once the items reach us.</p>
      </div>
    );
  }
  if (!items || items.length === 0) {
    return blocked.includes('days') ? <p className="text-xs text-[#767676] px-1 no-print">{blocked}.</p> : null;
  }

  const submit = async () => {
    const lines = Object.entries(qty).filter(([, q]) => q > 0).map(([itemId, quantity]) => ({ itemId, quantity }));
    if (!lines.length) { setError('Choose what you want to return'); return; }
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/orders/${orderId}/return`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: lines, reason, note }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(data.error || 'Could not send the request');
      else { setSent(true); setOpen(false); }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E5E5E5] px-6 py-5 no-print">
      {!open ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[#333333]">Need to return something?</p>
            <p className="text-xs text-[#777777]">Returns are free within {windowDays} days of delivery.</p>
          </div>
          <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 rounded-full border border-[#7FAF8E] px-4 py-2 text-sm font-semibold text-[#7FAF8E] hover:bg-[#F7F7F5]">
            <Undo2 className="h-4 w-4" /> Return items
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm font-semibold text-[#333333]">Which items are you returning?</p>
          <div className="divide-y divide-[#EEEEEE] rounded-xl border border-[#EEEEEE]">
            {items.map((i) => (
              <label key={i.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="min-w-0 text-sm">
                  <span className="block truncate text-[#333333]">{i.productName}</span>
                  {i.variant && <span className="text-xs text-[#777777]">{i.variant}</span>}
                </span>
                <select value={qty[i.id] ?? 0} onChange={(e) => setQty({ ...qty, [i.id]: Number(e.target.value) })} className="rounded-lg border border-[#E5E5E5] px-2 py-1.5 text-sm" aria-label={`How many ${i.productName}`}>
                  {Array.from({ length: i.returnable + 1 }, (_, n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
            ))}
          </div>
          <div>
            <label htmlFor="return-reason" className="block text-sm font-medium text-[#333333] mb-1.5">Reason</label>
            <select id="return-reason" value={reason} onChange={(e) => setReason(e.target.value)} className="w-full rounded-xl border border-[#E5E5E5] px-3 py-2.5 text-sm">
              {reasons.map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={500} placeholder="Anything we should know? (optional)" className="w-full rounded-xl border border-[#E5E5E5] px-3 py-2 text-sm" aria-label="Note" />
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <button onClick={() => setOpen(false)} className="rounded-full px-4 py-2 text-sm text-[#777777] hover:text-[#333333]">Cancel</button>
            <button onClick={submit} disabled={busy} className="flex items-center gap-1.5 rounded-full bg-[#7FAF8E] px-5 py-2 text-sm font-semibold text-white hover:bg-[#6A9B7D] disabled:opacity-50">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Send request
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
