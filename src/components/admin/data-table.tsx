'use client';

// Server-driven list table (Medusa's DataTable): search, filters, sort and paging live in
// the URL so a view can be bookmarked or shared; columns can be hidden (remembered per
// browser); rows are links; selected rows get a command bar for bulk actions.

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Download, Search, SlidersHorizontal, X } from 'lucide-react';
import { Button, Container, EmptyState, Input, Select, Skeleton, cx } from './ui';

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
  /** Hidden until switched on in the column menu. */
  defaultHidden?: boolean;
  /** Always shown (not in the column menu). */
  fixed?: boolean;
}

export interface Filter {
  key: string;
  label: string;
  type?: 'select' | 'date';
  options?: { value: string; label: string }[];
}

export interface BulkAction<T> {
  label: string;
  danger?: boolean;
  run: (rows: T[]) => Promise<void> | void;
}

interface DataTableProps<T> {
  id: string;
  endpoint: string;
  /** Key of the array in the JSON response (the total is read from `total`). */
  dataKey: string;
  columns: Column<T>[];
  rowKey?: (row: T) => string;
  rowHref?: (row: T) => string;
  filters?: Filter[];
  sorts?: { value: string; label: string }[];
  searchPlaceholder?: string;
  bulkActions?: BulkAction<T>[];
  exportHref?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  pageSize?: number;
  /** Bump to refetch (after a change made outside the table). */
  reloadKey?: number;
  header?: React.ReactNode;
}

export function DataTable<T>(props: DataTableProps<T>) {
  return (
    <Suspense fallback={<Container><div className="p-6"><Skeleton className="h-40" /></div></Container>}>
      <DataTableInner {...props} />
    </Suspense>
  );
}

function DataTableInner<T>({
  id, endpoint, dataKey, columns, rowKey = (r: any) => r.id, rowHref, filters = [], sorts = [], searchPlaceholder = 'Search',
  bulkActions = [], exportHref, emptyTitle = 'No results', emptyDescription, pageSize = 20, reloadKey = 0, header,
}: DataTableProps<T>) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const page = Math.max(1, Number(params.get('page')) || 1);
  const q = params.get('q') || '';
  const sort = params.get('sort') || sorts[0]?.value || '';

  const setParams = useCallback((patch: Record<string, string | null>, resetPage = true) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) (v ? next.set(k, v) : next.delete(k));
    if (resetPage) next.delete('page');
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [params, pathname, router]);

  // Debounced search box
  const [search, setSearch] = useState(q);
  useEffect(() => setSearch(q), [q]);
  useEffect(() => {
    if (search === q) return;
    const t = setTimeout(() => setParams({ q: search.trim() || null }), 300);
    return () => clearTimeout(t);
  }, [search, q, setParams]);

  // Column visibility, remembered per browser
  const storageKey = `admin-cols:${id}`;
  const [hidden, setHidden] = useState<string[]>(() => columns.filter((c) => c.defaultHidden).map((c) => c.key));
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) setHidden(JSON.parse(saved));
    } catch {}
  }, [storageKey]);
  const toggleColumn = (key: string) => {
    const next = hidden.includes(key) ? hidden.filter((k) => k !== key) : [...hidden, key];
    setHidden(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
  };
  const visible = columns.filter((c) => c.fixed || !hidden.includes(c.key));
  const [columnsOpen, setColumnsOpen] = useState(false);

  // Data
  const query = useMemo(() => {
    const qs = new URLSearchParams(params.toString());
    qs.set('page', String(page));
    qs.set('limit', String(pageSize));
    if (sort) qs.set('sort', sort);
    return qs.toString();
  }, [params, page, pageSize, sort]);
  const [rows, setRows] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    fetch(`${endpoint}?${query}`, { signal: controller.signal })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data.error || 'Could not load');
        setRows(data[dataKey] || []);
        setTotal(Number(data.total) || 0);
      })
      .catch((e) => { if (e.name !== 'AbortError') setError(e.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [endpoint, query, dataKey, reloadKey, refresh]);

  useEffect(() => setSelected(new Set()), [query, reloadKey]);

  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const selectable = bulkActions.length > 0;
  const allOnPage = rows.length > 0 && rows.every((r) => selected.has(rowKey(r)));
  const activeFilters = filters.filter((f) => params.get(f.key));

  const runBulk = async (action: BulkAction<T>) => {
    setBusy(true);
    try {
      await action.run(rows.filter((r) => selected.has(rowKey(r))));
      setSelected(new Set());
      setRefresh((n) => n + 1);
    } finally {
      setBusy(false);
    }
  };

  const columnsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!columnsOpen) return;
    const close = (e: MouseEvent) => { if (!columnsRef.current?.contains(e.target as Node)) setColumnsOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [columnsOpen]);

  return (
    <Container className="overflow-hidden">
      {header}

      {/* Toolbar */}
      <div className="flex flex-col gap-2 px-6 py-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {filters.map((f) =>
            f.type === 'date' ? (
              <label key={f.key} className="flex items-center gap-1.5 text-ui-subtle">
                {f.label}
                <Input type="date" value={params.get(f.key) || ''} onChange={(e) => setParams({ [f.key]: e.target.value || null })} className="w-[140px]" />
              </label>
            ) : (
              <Select key={f.key} aria-label={f.label} value={params.get(f.key) || ''} onChange={(e) => setParams({ [f.key]: e.target.value || null })} className={cx('w-auto max-w-[220px]', params.get(f.key) && 'ring-2 ring-primary-200')}>
                <option value="">{f.label}: All</option>
                {f.options?.map((o) => <option key={o.value} value={o.value}>{f.label}: {o.label}</option>)}
              </Select>
            )
          )}
          {activeFilters.length > 0 && (
            <Button variant="transparent" size="small" onClick={() => setParams(Object.fromEntries(activeFilters.map((f) => [f.key, null])))}>
              Clear filters
            </Button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full md:w-auto">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ui-muted" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={searchPlaceholder} className="w-full !pl-7 md:w-[240px]" aria-label="Search" />
            {search && (
              <button type="button" aria-label="Clear search" onClick={() => setSearch('')} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-ui-muted hover:text-ui-fg">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {sorts.length > 1 && (
            <Select aria-label="Sort" value={sort} onChange={(e) => setParams({ sort: e.target.value })} className="w-auto">
              {sorts.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </Select>
          )}
          <div className="relative" ref={columnsRef}>
            <Button size="base" onClick={() => setColumnsOpen((o) => !o)} aria-label="Columns" title="Columns" className="w-8 px-0">
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
            {columnsOpen && (
              <div className="absolute right-0 top-9 z-20 w-48 rounded-lg bg-ui-base p-1 shadow-ui-modal">
                {columns.filter((c) => !c.fixed).map((c) => (
                  <label key={c.key} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-ui-hover">
                    <input type="checkbox" checked={!hidden.includes(c.key)} onChange={() => toggleColumn(c.key)} />
                    {c.header}
                  </label>
                ))}
              </div>
            )}
          </div>
          {exportHref && (
            <a href={`${exportHref}${exportHref.includes('?') ? '&' : '?'}${params.toString()}`} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-ui-base px-3 font-medium text-ui-fg shadow-ui-field hover:bg-ui-hover">
              <Download className="h-3.5 w-3.5" /> Export
            </a>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="h-10 border-y border-ui-border bg-ui-bg text-left text-ui-subtle">
              {selectable && (
                <th className="w-[1%] pl-6 pr-3">
                  <input type="checkbox" aria-label="Select all on this page" checked={allOnPage} onChange={() => setSelected(allOnPage ? new Set() : new Set(rows.map(rowKey)))} />
                </th>
              )}
              {visible.map((c, i) => (
                <th key={c.key} className={cx('whitespace-nowrap pr-6 font-medium', i === 0 && !selectable && 'pl-6', c.className)}>{c.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="h-12 border-b border-ui-border">
                    <td colSpan={visible.length + (selectable ? 1 : 0)} className="px-6"><Skeleton className="h-4 w-full" /></td>
                  </tr>
                ))
              : rows.map((row) => {
                  const key = rowKey(row);
                  const href = rowHref?.(row);
                  return (
                    <tr
                      key={key}
                      onClick={(e) => {
                        if (!href || (e.target as HTMLElement).closest('a,button,input,select,label')) return;
                        if (e.metaKey || e.ctrlKey) window.open(href, '_blank');
                        else router.push(href);
                      }}
                      className={cx('h-12 border-b border-ui-border transition-colors hover:bg-ui-hover', href && 'cursor-pointer', selected.has(key) && 'bg-ui-hover', loading && 'opacity-60')}
                    >
                      {selectable && (
                        <td className="w-[1%] pl-6 pr-3">
                          <input type="checkbox" aria-label="Select row" checked={selected.has(key)} onChange={() => {
                            const next = new Set(selected);
                            if (next.has(key)) next.delete(key);
                            else next.add(key);
                            setSelected(next);
                          }} />
                        </td>
                      )}
                      {visible.map((c, i) => (
                        <td key={c.key} className={cx('pr-6 text-ui-fg', i === 0 && !selectable && 'pl-6', c.className)}>{c.cell(row)}</td>
                      ))}
                    </tr>
                  );
                })}
          </tbody>
        </table>
        {!loading && error && <EmptyState title="Could not load this list" description={error} action={<Button onClick={() => setRefresh((n) => n + 1)}>Try again</Button>} />}
        {!loading && !error && rows.length === 0 && (
          <EmptyState title={q || activeFilters.length ? 'No results match' : emptyTitle} description={q || activeFilters.length ? 'Try a different search or clear the filters.' : emptyDescription} />
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-6 py-3 text-ui-subtle">
        <span>{total > 0 ? `${from} – ${to} of ${total} results` : '0 results'}</span>
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline">{page} of {pages} pages</span>
          <Button size="small" disabled={page <= 1} onClick={() => setParams({ page: String(page - 1) }, false)}>Prev</Button>
          <Button size="small" disabled={page >= pages} onClick={() => setParams({ page: String(page + 1) }, false)}>Next</Button>
        </div>
      </div>

      {/* Bulk command bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-1 rounded-lg bg-ui-inverted p-1 pl-3 text-ui-inverted-fg shadow-ui-modal">
          <span className="mr-2 whitespace-nowrap">{selected.size} selected</span>
          {bulkActions.map((a) => (
            <button key={a.label} type="button" disabled={busy} onClick={() => runBulk(a)}
              className={cx('h-7 whitespace-nowrap rounded-md px-2 font-medium hover:bg-white/10 disabled:opacity-50', a.danger && 'text-red-400')}>
              {a.label}
            </button>
          ))}
          <button type="button" aria-label="Clear selection" onClick={() => setSelected(new Set())} className="ml-1 rounded-md p-1.5 hover:bg-white/10"><X className="h-3.5 w-3.5" /></button>
        </div>
      )}
    </Container>
  );
}
