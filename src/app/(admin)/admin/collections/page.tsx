'use client';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ExternalLink, Plus, Search, Trash2, X } from 'lucide-react';
import { Badge, Button, Container, EmptyState, Field, IconButton, Input, SectionHeader, Skeleton, Textarea } from '@/components/admin/ui';
import { Drawer, useConfirm } from '@/components/admin/overlays';

interface Collection { id: string; title: string; handle: string; description: string | null; image: string | null; isActive: boolean; _count: { products: number } }
interface PickedProduct { id: string; name: string; sku: string; images: { url: string }[] }

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const EMPTY = { title: '', handle: '', description: '', image: '', isActive: true };

export default function CollectionsPage() {
  const confirm = useConfirm();
  const [list, setList] = useState<Collection[] | null>(null);
  const [editing, setEditing] = useState<Collection | 'new' | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [picked, setPicked] = useState<PickedProduct[]>([]);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<PickedProduct[]>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    fetch('/api/admin/collections').then((r) => r.json()).then((d) => setList(d.collections || [])).catch(() => setList([]));
  }, []);
  useEffect(load, [load]);

  const open = async (c: Collection | 'new') => {
    setEditing(c);
    setQ('');
    setResults([]);
    if (c === 'new') { setForm(EMPTY); setPicked([]); return; }
    setForm({ title: c.title, handle: c.handle, description: c.description || '', image: c.image || '', isActive: c.isActive });
    const d = await fetch(`/api/admin/collections/${c.id}`).then((r) => r.json()).catch(() => null);
    setPicked(d?.products || []);
  };

  // Product search for adding to the collection
  useEffect(() => {
    if (!editing || q.trim().length < 2) { setResults([]); return; }
    const t = setTimeout(() => {
      fetch(`/api/admin/products?q=${encodeURIComponent(q.trim())}&limit=8`).then((r) => r.json()).then((d) => setResults(d.products || [])).catch(() => {});
    }, 250);
    return () => clearTimeout(t);
  }, [q, editing]);

  const save = async () => {
    setSaving(true);
    try {
      const isNew = editing === 'new';
      const res = await fetch(isNew ? '/api/admin/collections' : `/api/admin/collections/${(editing as Collection).id}`, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, handle: form.handle || slugify(form.title), productIds: picked.map((p) => p.id) }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(d.error || 'Could not save'); return; }
      toast.success('Collection saved');
      setEditing(null);
      load();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (c: Collection) => {
    if (!(await confirm({ title: `Delete "${c.title}"?`, description: 'The products stay in your store; only the collection page goes.', confirmText: 'Delete', danger: true }))) return;
    const res = await fetch(`/api/admin/collections/${c.id}`, { method: 'DELETE' });
    if (res.ok) { toast.success('Collection deleted'); load(); } else toast.error('Could not delete');
  };

  return (
    <>
      <Container className="overflow-hidden">
        <SectionHeader level={1} title="Collections" subtitle="Hand-picked groups of products with their own page, e.g. Gifts under ₹999 or Diwali specials." actions={<Button variant="primary" onClick={() => open('new')}><Plus className="h-3.5 w-3.5" /> Create</Button>} />
        {list === null ? (
          <div className="space-y-2 p-6"><Skeleton className="h-8" /><Skeleton className="h-8" /></div>
        ) : list.length === 0 ? (
          <EmptyState title="No collections yet" action={<Button onClick={() => open('new')}>Create a collection</Button>} />
        ) : (
          <table className="w-full">
            <thead>
              <tr className="h-10 border-b border-ui-border bg-ui-bg text-left text-ui-subtle">
                <th className="pl-6 pr-6 font-medium">Title</th>
                <th className="pr-6 font-medium">Page</th>
                <th className="pr-6 font-medium">Products</th>
                <th className="pr-6 font-medium">Visibility</th>
                <th className="w-[1%] pr-6" />
              </tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.id} onClick={(e) => { if (!(e.target as HTMLElement).closest('button,a')) open(c); }} className="h-12 cursor-pointer border-b border-ui-border last:border-0 hover:bg-ui-hover">
                  <td className="pl-6 pr-6 font-medium">{c.title}</td>
                  <td className="pr-6"><a href={`/collections/${c.handle}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-ui-subtle hover:text-ui-fg">/collections/{c.handle} <ExternalLink className="h-3 w-3" /></a></td>
                  <td className="pr-6">{c._count.products}</td>
                  <td className="pr-6">{c.isActive ? <Badge tone="green">Visible</Badge> : <Badge tone="grey">Hidden</Badge>}</td>
                  <td className="pr-6"><IconButton label="Delete" onClick={() => remove(c)} className="hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></IconButton></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Container>

      <Drawer open={!!editing} onClose={() => setEditing(null)} title={editing === 'new' ? 'Create collection' : 'Edit collection'}
        footer={<><Button onClick={() => setEditing(null)}>Cancel</Button><Button variant="primary" loading={saving} disabled={!form.title.trim()} onClick={save}>Save</Button></>}>
        <div className="space-y-4">
          <Field label="Title">
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value, handle: editing === 'new' && (!form.handle || form.handle === slugify(form.title)) ? slugify(e.target.value) : form.handle })} />
          </Field>
          <Field label="Handle" hint={`${typeof window !== 'undefined' ? window.location.host : ''}/collections/${form.handle || slugify(form.title) || '…'}`}>
            <Input value={form.handle} onChange={(e) => setForm({ ...form, handle: e.target.value })} />
          </Field>
          <Field label="Description"><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <Field label="Share image URL (optional)"><Input value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder="https://m/…" /></Field>
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Visible in the shop</label>

          <div className="space-y-2">
            <span className="font-medium">Products ({picked.length})</span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ui-muted" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products to add" className="!pl-7" />
              {results.length > 0 && (
                <div className="absolute left-0 right-0 top-9 z-10 max-h-64 overflow-y-auto rounded-lg bg-ui-base p-1 shadow-ui-modal">
                  {results.map((p) => {
                    const added = picked.some((x) => x.id === p.id);
                    return (
                      <button key={p.id} type="button" disabled={added} onClick={() => { setPicked([...picked, p]); setQ(''); }}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-ui-hover disabled:opacity-50">
                        <span className="h-7 w-7 shrink-0 overflow-hidden rounded bg-ui-hover">{p.images[0]?.url && <img src={p.images[0].url} alt="" className="h-full w-full object-cover" />}</span>
                        <span className="flex-1 truncate">{p.name}</span>
                        <span className="text-[12px] text-ui-subtle">{added ? 'Added' : p.sku}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="divide-y divide-ui-border rounded-md shadow-ui-field">
              {picked.length === 0 && <p className="px-3 py-3 text-ui-subtle">No products yet.</p>}
              {picked.map((p) => (
                <div key={p.id} className="flex items-center gap-2 px-3 py-2">
                  <span className="h-7 w-7 shrink-0 overflow-hidden rounded bg-ui-hover">{p.images[0]?.url && <img src={p.images[0].url} alt="" className="h-full w-full object-cover" />}</span>
                  <span className="flex-1 truncate">{p.name}</span>
                  <IconButton label={`Remove ${p.name}`} onClick={() => setPicked(picked.filter((x) => x.id !== p.id))}><X className="h-3.5 w-3.5" /></IconButton>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Drawer>
    </>
  );
}
