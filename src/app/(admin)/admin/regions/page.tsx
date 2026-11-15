'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Globe2, Plus, Search, Trash2, X } from 'lucide-react';
import { Badge, Button, Container, EmptyState, Field, IconButton, Input, SectionHeader, Select, Skeleton, inr } from '@/components/admin/ui';
import { Drawer, useConfirm } from '@/components/admin/overlays';
import { COUNTRIES, CURRENCIES } from '@/lib/markets';

interface Option { id?: string; name: string; price: number | string; freeAbove: number | string | null; minDays: number | string; maxDays: number | string }
interface Region {
  id: string;
  name: string;
  countries: string[];
  currency: string;
  paymentMethods: string[];
  taxRate: string | number | null;
  isActive?: boolean;
  shippingOptions: Option[];
  legacy?: boolean;
}

const METHODS = [
  { id: 'RAZORPAY', label: 'Razorpay (cards, UPI, netbanking - India)' },
  { id: 'UPI', label: 'UPI transfer (India)' },
  { id: 'COD', label: 'Cash on delivery' },
  { id: 'STRIPE', label: 'Stripe (international cards)' },
];
const countryName = (code: string) => (code === '*' ? 'Rest of the world' : COUNTRIES.find((c) => c.code === code)?.name || code);
const blank = (): Region => ({
  id: '', name: '', countries: [], currency: 'INR', paymentMethods: ['COD'], taxRate: null,
  shippingOptions: [{ name: 'Standard delivery', price: 49, freeAbove: 499, minDays: 3, maxDays: 7 }],
});

export default function RegionsPage() {
  const confirm = useConfirm();
  const [regions, setRegions] = useState<Region[] | null>(null);
  const [legacy, setLegacy] = useState(false);
  const [editing, setEditing] = useState<Region | null>(null);
  const [saving, setSaving] = useState(false);
  const [countryQuery, setCountryQuery] = useState('');

  const load = useCallback(() => {
    fetch('/api/admin/regions').then((r) => r.json()).then((d) => { setRegions(d.regions || []); setLegacy(!!d.legacy); }).catch(() => setRegions([]));
  }, []);
  useEffect(load, [load]);

  const taken = useMemo(() => new Set((regions || []).filter((r) => r.id !== editing?.id && !legacy).flatMap((r) => r.countries)), [regions, editing, legacy]);

  const save = async (region: Region) => {
    setSaving(true);
    try {
      const isNew = !region.id || region.legacy;
      const res = await fetch(isNew ? '/api/admin/regions' : `/api/admin/regions/${region.id}`, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(region),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(d.error || 'Could not save'); return false; }
      return true;
    } finally {
      setSaving(false);
    }
  };

  // First save: turn the old settings into real regions in one go
  const adoptLegacy = async () => {
    for (const r of regions || []) if (!(await save({ ...r, legacy: true }))) return;
    toast.success('Regions created from your current settings');
    load();
  };

  const remove = async (r: Region) => {
    if (!(await confirm({ title: `Delete ${r.name}?`, description: 'Shoppers in its countries won’t be able to check out until another region covers them.', confirmText: 'Delete', danger: true }))) return;
    const res = await fetch(`/api/admin/regions/${r.id}`, { method: 'DELETE' });
    if (res.ok) { toast.success('Region deleted'); load(); } else toast.error('Could not delete');
  };

  const set = (patch: Partial<Region>) => setEditing((e) => (e ? { ...e, ...patch } : e));
  const setOption = (i: number, patch: Partial<Option>) => setEditing((e) => (e ? { ...e, shippingOptions: e.shippingOptions.map((o, j) => (j === i ? { ...o, ...patch } : o)) } : e));
  const matches = COUNTRIES.filter((c) => !editing?.countries.includes(c.code) && (!countryQuery || c.name.toLowerCase().includes(countryQuery.toLowerCase()) || c.code.toLowerCase() === countryQuery.toLowerCase()));

  return (
    <>
      <Container className="overflow-hidden">
        <SectionHeader
          level={1}
          title="Regions"
          subtitle="Where you sell: each region has its countries, the currency shown, payment methods, tax and delivery options."
          actions={!legacy && <Button variant="primary" onClick={() => setEditing(blank())}><Plus className="h-3.5 w-3.5" /> Create</Button>}
        />
        {legacy && regions && (
          <div className="flex flex-wrap items-center justify-between gap-3 bg-amber-500/10 px-6 py-3">
            <p className="text-ui-fg">These come from your current Shipping, Payment and International settings. Save them as regions to edit them here.</p>
            <Button variant="primary" loading={saving} onClick={adoptLegacy}>Set up regions</Button>
          </div>
        )}
        {regions === null ? (
          <div className="space-y-2 p-6"><Skeleton className="h-10" /><Skeleton className="h-10" /></div>
        ) : regions.length === 0 ? (
          <EmptyState title="No regions" description="Without a region, shoppers can't check out." action={<Button onClick={() => setEditing(blank())}>Create a region</Button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="h-10 border-b border-ui-border bg-ui-bg text-left text-ui-subtle">
                  <th className="pl-6 pr-6 font-medium">Region</th>
                  <th className="pr-6 font-medium">Countries</th>
                  <th className="pr-6 font-medium">Currency</th>
                  <th className="pr-6 font-medium">Payments</th>
                  <th className="pr-6 font-medium">Delivery</th>
                  <th className="w-[1%] pr-6" />
                </tr>
              </thead>
              <tbody>
                {regions.map((r) => (
                  <tr key={r.id} onClick={(e) => { if (!legacy && !(e.target as HTMLElement).closest('button')) setEditing(r); }} className={`h-12 border-b border-ui-border last:border-0 ${legacy ? '' : 'cursor-pointer hover:bg-ui-hover'}`}>
                    <td className="pl-6 pr-6 font-medium">
                      <span className="flex items-center gap-2"><Globe2 className="h-4 w-4 text-ui-muted" />{r.name}{r.isActive === false && <Badge tone="grey">Off</Badge>}</span>
                    </td>
                    <td className="max-w-[260px] truncate pr-6 text-ui-subtle">{r.countries.map(countryName).join(', ')}</td>
                    <td className="pr-6">{r.currency}</td>
                    <td className="pr-6 text-ui-subtle">{r.paymentMethods.length ? r.paymentMethods.join(', ') : <span className="text-red-600">None</span>}</td>
                    <td className="pr-6 text-ui-subtle">
                      {r.shippingOptions.map((o) => `${o.name} ${Number(o.price) === 0 ? 'free' : inr(o.price)}${o.freeAbove != null && o.freeAbove !== '' ? ` (free ${inr(o.freeAbove)}+)` : ''}`).join(' · ')}
                    </td>
                    <td className="pr-6">{!legacy && <IconButton label="Delete" onClick={() => remove(r)} className="hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></IconButton>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="px-6 py-4 text-ui-subtle">
          Prices are kept in INR and shown converted to the region’s currency (exchange rates update automatically). Card payments abroad are charged in that currency.
          A shopper whose country isn’t in any region can’t check out, unless a region includes “Rest of the world”.
        </p>
      </Container>

      <Drawer
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.id ? `Edit ${editing.name}` : 'Create region'}
        footer={<><Button onClick={() => setEditing(null)}>Cancel</Button><Button variant="primary" loading={saving} onClick={async () => { if (editing && (await save(editing))) { toast.success('Region saved'); setEditing(null); load(); } }}>Save</Button></>}
      >
        {editing && (
          <div className="space-y-5">
            <Field label="Name"><Input value={editing.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. India, Gulf, Europe" /></Field>

            <div className="space-y-2">
              <span className="font-medium">Countries</span>
              <div className="flex flex-wrap gap-1.5">
                {editing.countries.map((c) => (
                  <span key={c} className="inline-flex items-center gap-1 rounded-md bg-ui-hover px-2 py-1">
                    {countryName(c)}
                    <button type="button" aria-label={`Remove ${countryName(c)}`} onClick={() => set({ countries: editing.countries.filter((x) => x !== c) })} className="text-ui-muted hover:text-ui-fg"><X className="h-3 w-3" /></button>
                  </span>
                ))}
              </div>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ui-muted" />
                <Input value={countryQuery} onChange={(e) => setCountryQuery(e.target.value)} placeholder="Add a country" className="!pl-7" />
                {countryQuery && (
                  <div className="absolute inset-x-0 top-9 z-10 max-h-56 overflow-y-auto rounded-lg bg-ui-base p-1 shadow-ui-modal">
                    {matches.slice(0, 30).map((c) => (
                      <button key={c.code} type="button" disabled={taken.has(c.code)} onClick={() => { set({ countries: [...editing.countries, c.code] }); setCountryQuery(''); }}
                        className="flex w-full justify-between rounded-md px-2 py-1.5 text-left hover:bg-ui-hover disabled:opacity-40">
                        <span>{c.name}</span><span className="text-ui-subtle">{taken.has(c.code) ? 'in another region' : c.code}</span>
                      </button>
                    ))}
                    {matches.length === 0 && <p className="px-2 py-1.5 text-ui-subtle">No match</p>}
                  </div>
                )}
              </div>
              {!editing.countries.includes('*') && !taken.has('*') && (
                <Button size="small" variant="transparent" onClick={() => set({ countries: [...editing.countries, '*'] })}>+ Rest of the world (every country not in another region)</Button>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Currency shown" hint="Shoppers can still switch currency.">
                <Select value={editing.currency} onChange={(e) => set({ currency: e.target.value })}>
                  {Object.values(CURRENCIES).map((c) => <option key={c.code} value={c.code}>{c.code} - {c.name}</option>)}
                </Select>
              </Field>
              <Field label="Tax rate (%)" hint="Blank = each product's GST. 0 for exports.">
                <Input type="number" min={0} max={100} step="0.01" value={editing.taxRate ?? ''} onChange={(e) => set({ taxRate: e.target.value })} placeholder="Product GST" />
              </Field>
            </div>

            <div className="space-y-1.5">
              <span className="font-medium">Payment methods</span>
              {METHODS.map((m) => (
                <label key={m.id} className="flex items-center gap-2">
                  <input type="checkbox" checked={editing.paymentMethods.includes(m.id)} onChange={(e) => set({ paymentMethods: e.target.checked ? [...editing.paymentMethods, m.id] : editing.paymentMethods.filter((x) => x !== m.id) })} />
                  {m.label}
                </label>
              ))}
              <p className="text-[12px] text-ui-subtle">A method only shows at checkout when it’s also switched on (and its keys added) in Store settings → Payment.</p>
            </div>

            <div className="space-y-2">
              <span className="font-medium">Delivery options</span>
              {editing.shippingOptions.map((o, i) => (
                <div key={i} className="space-y-2 rounded-md p-3 shadow-ui-field">
                  <div className="flex gap-2">
                    <Input value={o.name} onChange={(e) => setOption(i, { name: e.target.value })} placeholder="e.g. Standard, Express" aria-label="Option name" />
                    <IconButton label="Remove option" onClick={() => set({ shippingOptions: editing.shippingOptions.filter((_, j) => j !== i) })} className="h-8 w-8 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></IconButton>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <Field label="Price (₹)"><Input type="number" min={0} value={o.price} onChange={(e) => setOption(i, { price: e.target.value })} /></Field>
                    <Field label="Free above (₹)"><Input type="number" min={0} value={o.freeAbove ?? ''} onChange={(e) => setOption(i, { freeAbove: e.target.value })} placeholder="never" /></Field>
                    <Field label="Min days"><Input type="number" min={0} value={o.minDays} onChange={(e) => setOption(i, { minDays: e.target.value })} /></Field>
                    <Field label="Max days"><Input type="number" min={0} value={o.maxDays} onChange={(e) => setOption(i, { maxDays: e.target.value })} /></Field>
                  </div>
                </div>
              ))}
              <Button size="small" onClick={() => set({ shippingOptions: [...editing.shippingOptions, { name: 'Express', price: 99, freeAbove: null, minDays: 1, maxDays: 3 }] })}><Plus className="h-3.5 w-3.5" /> Add delivery option</Button>
            </div>

            <label className="flex items-center gap-2"><input type="checkbox" checked={editing.isActive !== false} onChange={(e) => set({ isActive: e.target.checked })} /> Selling in this region</label>
          </div>
        )}
      </Drawer>
    </>
  );
}
