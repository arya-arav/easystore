'use client';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Check, Copy, KeyRound, Plus, Trash2 } from 'lucide-react';
import { Badge, Button, Container, EmptyState, Field, IconButton, Input, SectionHeader, Skeleton, cx, shortDate } from '@/components/admin/ui';
import { Drawer, useConfirm } from '@/components/admin/overlays';
import { Toggle } from '@/components/admin/banner-form';

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string;
  isActive: boolean;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

const PERMISSIONS = [
  { scope: 'products:write', name: 'Add and edit products', description: 'Create new products and update existing ones.' },
  { scope: 'upload', name: 'Upload pictures', description: 'Copy pictures from a web address into your store’s image storage.' },
];
const SCOPE_NAME: Record<string, string> = Object.fromEntries(PERMISSIONS.map((p) => [p.scope, p.name]));
// Every key can read the category list, so it isn't a choice.

const ENDPOINTS = [
  { method: 'GET', path: '/api/v1/categories', scope: 'Any key', note: 'List active categories (id, name, slug).' },
  { method: 'POST', path: '/api/v1/products', scope: 'Add and edit products', note: 'Create a product. Needs name, description, price, categoryId. Optional: images (web addresses), sku, compareAtPrice, stock, and more.' },
  { method: 'PUT', path: '/api/v1/products/{id}', scope: 'Add and edit products', note: 'Update a product. Send only the fields to change.' },
  { method: 'POST', path: '/api/v1/upload-from-url', scope: 'Upload pictures', note: 'Body { "url": "https://…" }. Returns the stored picture’s address.' },
];

function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = (text: string, id = text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(id);
      setTimeout(() => setCopied((c) => (c === id ? null : c)), 1800);
    }).catch(() => toast.error('Could not copy'));
  };
  return { copied, copy };
}

function keyStatus(k: ApiKey) {
  if (!k.isActive) return { tone: 'grey' as const, label: 'Turned off' };
  if (k.expiresAt && new Date(k.expiresAt) < new Date()) return { tone: 'orange' as const, label: 'Expired' };
  return { tone: 'green' as const, label: 'Active' };
}

export default function ApiKeysPage() {
  const confirm = useConfirm();
  const { copied, copy } = useCopy();
  const [keys, setKeys] = useState<ApiKey[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState<string[]>(PERMISSIONS.map((p) => p.scope));
  const [expires, setExpires] = useState('');
  const [newKey, setNewKey] = useState<{ name: string; key: string } | null>(null);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  const load = useCallback(() => {
    fetch('/api/admin/api-keys').then((r) => r.json()).then((d) => setKeys(d.keys || [])).catch(() => setKeys([]));
  }, []);
  useEffect(load, [load]);

  const create = async () => {
    setCreating(true);
    try {
      const res = await fetch('/api/admin/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, scopes: ['categories:read', ...scopes], expiresAt: expires ? new Date(`${expires}T23:59:59`).toISOString() : null }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.key) { toast.error(d.error || 'Could not create the key'); return; }
      setNewKey({ name: d.name, key: d.key });
      setOpen(false);
      setName('');
      setExpires('');
      setScopes(PERMISSIONS.map((p) => p.scope));
      load();
    } finally {
      setCreating(false);
    }
  };

  const toggle = async (k: ApiKey) => {
    setKeys((list) => list && list.map((x) => (x.id === k.id ? { ...x, isActive: !k.isActive } : x)));
    const res = await fetch(`/api/admin/api-keys/${k.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: !k.isActive }) });
    if (!res.ok) { toast.error('Could not update'); load(); return; }
    toast.success(k.isActive ? 'Key turned off' : 'Key turned on');
  };

  const revoke = async (k: ApiKey) => {
    if (!(await confirm({ title: `Delete the key “${k.name}”?`, description: 'Anything using this key stops working straight away. This can’t be undone.', confirmText: 'Delete key', danger: true }))) return;
    const res = await fetch(`/api/admin/api-keys/${k.id}`, { method: 'DELETE' });
    if (!res.ok) { toast.error('Could not delete'); return; }
    toast.success('Key deleted');
    load();
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[18px] font-medium text-ui-fg">API keys</h1>
          <p className="text-ui-subtle">Let other apps, scripts or services add and update products in your store.</p>
        </div>
        <Button variant="primary" onClick={() => setOpen(true)}><Plus className="h-3.5 w-3.5" /> Create key</Button>
      </div>

      {newKey && (
        <Container className="ring-2 ring-emerald-500/40">
          <div className="flex flex-col gap-3 px-6 py-4">
            <div>
              <p className="font-medium text-ui-fg">Your new key “{newKey.name}”</p>
              <p className="text-ui-subtle">Copy it now and keep it somewhere safe. For your security it won’t be shown again.</p>
            </div>
            <div className="flex items-center gap-2 rounded-md bg-ui-hover px-3 py-2">
              <code className="min-w-0 flex-1 break-all font-mono text-[13px] text-ui-fg">{newKey.key}</code>
              <Button size="small" variant="primary" onClick={() => copy(newKey.key, 'new')}>
                {copied === 'new' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {copied === 'new' ? 'Copied' : 'Copy'}
              </Button>
            </div>
            <Button size="small" variant="transparent" className="self-start" onClick={() => setNewKey(null)}>I’ve saved it</Button>
          </div>
        </Container>
      )}

      <Container>
        <SectionHeader title="Keys" subtitle="Each app or person should get its own key, so you can turn one off without affecting the others." />
        {!keys ? (
          <div className="flex flex-col gap-2 px-6 py-4">{[0, 1].map((i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : keys.length === 0 ? (
          <EmptyState
            title="No API keys yet"
            description="Create a key when you want to connect another app or script to your store."
            action={<Button size="small" onClick={() => setOpen(true)}><Plus className="h-3.5 w-3.5" /> Create key</Button>}
          />
        ) : (
          <ul className="divide-y divide-ui-border">
            {keys.map((k) => {
              const s = keyStatus(k);
              return (
                <li key={k.id} className={cx('flex flex-wrap items-center gap-x-4 gap-y-2 px-6 py-3 sm:flex-nowrap', !k.isActive && 'opacity-70')}>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-ui-hover text-ui-subtle"><KeyRound className="h-4 w-4" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-ui-fg">{k.name}</p>
                    <p className="truncate text-[12px] text-ui-subtle">
                      <code className="font-mono">{k.keyPrefix}…</code>
                      {' · '}Created {shortDate(k.createdAt)}
                      {' · '}{k.lastUsedAt ? `Last used ${shortDate(k.lastUsedAt)}` : 'Never used'}
                      {k.expiresAt && <>{' · '}{new Date(k.expiresAt) < new Date() ? 'Expired' : 'Expires'} {shortDate(k.expiresAt)}</>}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {k.scopes.split(',').map((x) => x.trim()).filter((x) => x && x !== 'categories:read').map((x) => (
                        <span key={x} className="rounded bg-ui-hover px-1.5 py-0.5 text-[11px] text-ui-subtle">{SCOPE_NAME[x] || x}</span>
                      ))}
                    </div>
                  </div>
                  <Badge tone={s.tone}>{s.label}</Badge>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={k.isActive}
                      aria-label={k.isActive ? 'Turn key off' : 'Turn key on'}
                      onClick={() => toggle(k)}
                      className={cx('relative mr-1 h-5 w-9 shrink-0 rounded-full transition-colors', k.isActive ? 'bg-primary-500' : 'bg-ui-border')}
                    >
                      <span className={cx('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all', k.isActive ? 'left-[18px]' : 'left-0.5')} />
                    </button>
                    <IconButton label="Delete key" onClick={() => revoke(k)} className="hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></IconButton>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Container>

      <Container>
        <SectionHeader title="How to use a key" subtitle="For developers. Send the key with every request." />
        <div className="flex flex-col gap-4 px-6 py-4">
          <div className="flex flex-col gap-1.5">
            <span className="font-medium text-ui-fg">Add this header</span>
            <div className="flex items-center gap-2 rounded-md bg-ui-hover px-3 py-2">
              <code className="min-w-0 flex-1 font-mono text-[12px] text-ui-fg">Authorization: Bearer bb_live_your_key</code>
              <IconButton label="Copy header" onClick={() => copy('Authorization: Bearer bb_live_your_key', 'h')}>{copied === 'h' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}</IconButton>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="font-medium text-ui-fg">Endpoints</span>
            <ul className="divide-y divide-ui-border rounded-md shadow-ui-field">
              {ENDPOINTS.map((e) => (
                <li key={e.method + e.path} className="flex flex-col gap-1 px-3 py-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cx('rounded px-1.5 py-0.5 font-mono text-[11px] font-semibold', e.method === 'GET' ? 'bg-blue-500/10 text-blue-700' : e.method === 'POST' ? 'bg-emerald-500/10 text-emerald-700' : 'bg-amber-500/10 text-amber-700')}>{e.method}</span>
                    <code className="font-mono text-[12px] text-ui-fg">{origin}{e.path}</code>
                    <span className="ml-auto text-[11px] text-ui-muted">{e.scope}</span>
                  </div>
                  <p className="text-[12px] text-ui-subtle">{e.note}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="font-medium text-ui-fg">Example: add a product</span>
            {(() => {
              const example = `curl -X POST ${origin}/api/v1/products \\\n  -H "Authorization: Bearer bb_live_your_key" \\\n  -H "Content-Type: application/json" \\\n  -d '{"name":"Soft Bunny Plush","description":"Super soft toy","price":499,"categoryId":"CATEGORY_ID","images":["https://example.com/bunny.jpg"]}'`;
              return (
                <div className="relative rounded-md bg-zinc-900 p-3 pr-12">
                  <pre className="overflow-x-auto whitespace-pre font-mono text-[12px] leading-5 text-zinc-100">{example}</pre>
                  <button type="button" onClick={() => copy(example, 'ex')} aria-label="Copy example" className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 hover:bg-white/10 hover:text-white">
                    {copied === 'ex' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              );
            })()}
            <p className="text-[12px] text-ui-subtle">Products made through the API are saved as drafts unless you send <code className="font-mono">&quot;status&quot;:&quot;ACTIVE&quot;</code>. Get category ids from <code className="font-mono">/api/v1/categories</code>.</p>
          </div>
        </div>
      </Container>

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title="Create API key"
        description="You’ll see the key once, right after creating it."
        footer={<><Button onClick={() => setOpen(false)}>Cancel</Button><Button variant="primary" loading={creating} disabled={!name.trim() || scopes.length === 0} onClick={create}>Create key</Button></>}
      >
        <div className="flex flex-col gap-5">
          <Field label="Name" hint="Something to recognise it by, like the app or person using it.">
            <Input autoFocus value={name} maxLength={80} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && name.trim() && create()} placeholder="Product import script" />
          </Field>

          <div className="flex flex-col gap-3">
            <span className="font-medium text-ui-fg">What it can do</span>
            <span className="-mt-2 text-[12px] text-ui-subtle">Every key can read your category list.</span>
            {PERMISSIONS.map((p) => (
              <Toggle
                key={p.scope}
                checked={scopes.includes(p.scope)}
                onChange={(on) => setScopes((s) => (on ? [...s, p.scope] : s.filter((x) => x !== p.scope)))}
                label={p.name}
                hint={p.description}
              />
            ))}
            {scopes.length === 0 && <p className="text-[12px] text-red-600">Choose at least one.</p>}
          </div>

          <Field label="Expires" hint="Optional. The key stops working after this day.">
            <Input type="date" value={expires} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setExpires(e.target.value)} />
          </Field>
        </div>
      </Drawer>
    </div>
  );
}
