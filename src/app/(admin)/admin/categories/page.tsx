'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2, Upload } from 'lucide-react';
import { Badge, Button, Container, EmptyState, Field, IconButton, Input, SectionHeader, Select, Skeleton, Textarea, cx } from '@/components/admin/ui';
import { Drawer, useConfirm } from '@/components/admin/overlays';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  parentId: string | null;
  isActive: boolean;
  sortOrder: number;
  _count: { products: number };
}

const EMPTY = { name: '', slug: '', description: '', image: '', parentId: '', isActive: true, sortOrder: 0 };
const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

/** Parents first, each followed by its children (one level of nesting, as the shop shows). */
function ordered(list: Category[]) {
  const roots = list.filter((c) => !c.parentId || !list.some((p) => p.id === c.parentId));
  return roots.flatMap((r) => [{ c: r, depth: 0 }, ...list.filter((c) => c.parentId === r.id).map((c) => ({ c, depth: 1 }))]);
}

export default function AdminCategoriesPage() {
  return <Suspense><Categories /></Suspense>;
}

function Categories() {
  const confirm = useConfirm();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Category | 'new' | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/categories');
    const data = await res.json().catch(() => ({}));
    setCategories(data.categories || []);
    setLoading(false);
    return (data.categories || []) as Category[];
  }, []);

  const open = (c: Category | 'new') => {
    setEditing(c);
    setForm(c === 'new' ? EMPTY : { name: c.name, slug: c.slug, description: c.description || '', image: c.image || '', parentId: c.parentId || '', isActive: c.isActive, sortOrder: c.sortOrder });
  };

  // ?edit=<id> or ?edit=new opens the drawer (old /categories/new and /categories/<id> links land here)
  useEffect(() => {
    load().then((list) => {
      const edit = params.get('edit');
      if (edit === 'new') open('new');
      else if (edit) {
        const c = list.find((x) => x.id === edit);
        if (c) open(c);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  const close = () => {
    setEditing(null);
    if (params.get('edit')) router.replace(pathname);
  };

  const save = async () => {
    setSaving(true);
    try {
      const isNew = editing === 'new';
      const res = await fetch(isNew ? '/api/admin/categories' : `/api/admin/categories/${(editing as Category).id}`, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, slug: form.slug || slugify(form.name) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error || 'Could not save'); return; }
      toast.success(isNew ? 'Category created' : 'Category saved');
      close();
      load();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (c: Category) => {
    const ok = await confirm({ title: `Delete "${c.name}"?`, description: c._count.products ? `It has ${c._count.products} product(s), so it can't be deleted until they're moved. You can hide it instead.` : 'This cannot be undone.', confirmText: 'Delete', danger: true });
    if (!ok) return;
    const res = await fetch(`/api/admin/categories/${c.id}`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) toast.error(data.error || 'Could not delete');
    else { toast.success('Category deleted'); load(); }
  };

  // Move up/down among siblings by swapping their order numbers
  const move = async (c: Category, dir: -1 | 1) => {
    const siblings = categories.filter((x) => (x.parentId || '') === (c.parentId || '')).sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
    const i = siblings.findIndex((x) => x.id === c.id);
    const other = siblings[i + dir];
    if (!other) return;
    const renumbered = siblings.map((x, idx) => ({ ...x, sortOrder: idx * 10 }));
    renumbered[i].sortOrder = (i + dir) * 10;
    renumbered[i + dir].sortOrder = i * 10;
    const put = (x: Category) => fetch(`/api/admin/categories/${x.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...x, parentId: x.parentId || null }) });
    await Promise.all(renumbered.filter((x) => x.sortOrder !== siblings.find((s) => s.id === x.id)!.sortOrder).map(put));
    load();
  };

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const body = new FormData();
      body.append('file', file);
      body.append('folder', 'categories');
      const res = await fetch('/api/upload', { method: 'POST', body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) toast.error(data.error || 'Upload failed');
      else setForm((f) => ({ ...f, image: data.url }));
    } finally {
      setUploading(false);
    }
  };

  const rows = ordered(categories);
  const parents = categories.filter((c) => !c.parentId && (editing === 'new' || c.id !== (editing as Category | null)?.id));

  return (
    <>
      <Container className="overflow-hidden">
        <SectionHeader level={1} title="Categories" subtitle="Order, nest and hide the categories shown in the shop." actions={<Button variant="primary" onClick={() => open('new')}><Plus className="h-3.5 w-3.5" /> Create</Button>} />
        {loading ? (
          <div className="space-y-2 p-6">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8" />)}</div>
        ) : rows.length === 0 ? (
          <EmptyState title="No categories yet" action={<Button onClick={() => open('new')}>Create a category</Button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="h-10 border-b border-ui-border bg-ui-bg text-left text-ui-subtle">
                  <th className="pl-6 pr-6 font-medium">Name</th>
                  <th className="pr-6 font-medium">Handle</th>
                  <th className="pr-6 font-medium">Products</th>
                  <th className="pr-6 font-medium">Visibility</th>
                  <th className="w-[1%] pr-6" />
                </tr>
              </thead>
              <tbody>
                {rows.map(({ c, depth }) => (
                  <tr key={c.id} onClick={(e) => { if (!(e.target as HTMLElement).closest('button')) open(c); }} className="h-12 cursor-pointer border-b border-ui-border last:border-0 hover:bg-ui-hover">
                    <td className="pl-6 pr-6">
                      <div className={cx('flex items-center gap-3', depth && 'pl-6')}>
                        {depth > 0 && <span className="-ml-4 text-ui-muted">↳</span>}
                        <div className="h-7 w-7 shrink-0 overflow-hidden rounded bg-ui-hover">
                          {c.image && <img src={c.image} alt="" className="h-full w-full object-cover" />}
                        </div>
                        <span className="font-medium">{c.name}</span>
                      </div>
                    </td>
                    <td className="pr-6 text-ui-subtle">/{c.slug}</td>
                    <td className="pr-6">{c._count.products}</td>
                    <td className="pr-6">{c.isActive ? <Badge tone="green">Visible</Badge> : <Badge tone="grey">Hidden</Badge>}</td>
                    <td className="pr-6">
                      <div className="flex items-center gap-0.5">
                        <IconButton label="Move up" onClick={() => move(c, -1)}><ArrowUp className="h-3.5 w-3.5" /></IconButton>
                        <IconButton label="Move down" onClick={() => move(c, 1)}><ArrowDown className="h-3.5 w-3.5" /></IconButton>
                        <IconButton label="Edit" onClick={() => open(c)}><Pencil className="h-3.5 w-3.5" /></IconButton>
                        <IconButton label="Delete" onClick={() => remove(c)} className="hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></IconButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Container>

      <Drawer
        open={!!editing}
        onClose={close}
        title={editing === 'new' ? 'Create category' : 'Edit category'}
        footer={<><Button onClick={close}>Cancel</Button><Button variant="primary" loading={saving} disabled={!form.name.trim()} onClick={save}>Save</Button></>}
      >
        <div className="space-y-4">
          <Field label="Name">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: editing === 'new' && (!form.slug || form.slug === slugify(form.name)) ? slugify(e.target.value) : form.slug })} />
          </Field>
          <Field label="Handle" hint={`Shown in the address: ${typeof window !== 'undefined' ? window.location.host : ''}/category/${form.slug || slugify(form.name) || '…'}`}>
            <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
          </Field>
          <Field label="Description"><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <Field label="Parent category">
            <Select value={form.parentId} onChange={(e) => setForm({ ...form, parentId: e.target.value })}>
              <option value="">None (top level)</option>
              {parents.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </Field>
          <div className="space-y-1.5">
            <span className="font-medium">Image</span>
            <div className="flex items-center gap-3">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-ui-hover">
                {form.image && <img src={form.image} alt="" className="h-full w-full object-cover" />}
              </div>
              <div className="flex flex-col gap-1.5">
                <Button size="small" loading={uploading} onClick={() => fileRef.current?.click()}><Upload className="h-3.5 w-3.5" /> Upload</Button>
                {form.image && <Button size="small" variant="transparent" onClick={() => setForm({ ...form, image: '' })}>Remove</Button>}
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ''; }} />
            </div>
            <Input value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder="or paste an image URL" />
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
            Visible in the shop
          </label>
        </div>
      </Drawer>
    </>
  );
}
