'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Download, FileUp } from 'lucide-react';
import { Badge, Button, Container, SectionHeader, cx } from '@/components/admin/ui';

type Result = { row: number; sku: string; action: 'create' | 'update' | 'error'; message?: string };

/** Minimal RFC 4180 CSV reader (quoted fields, "" escapes, CRLF). */
function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  const src = text.replace(/^﻿/, '');
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += ch;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const [header, ...body] = rows.filter((r) => r.some((c) => c.trim() !== ''));
  if (!header) return [];
  return body.map((r) => Object.fromEntries(header.map((h, i) => [h.trim(), (r[i] ?? '').trim()])));
}

const TEMPLATE = 'Name,SKU,Category,Price,Compare at price,Stock,Status,Short description,Description,Images\r\n' +
  '"Cute Teddy Bear (30cm)",BB-TEDDY-30,Toys,499,699,50,ACTIVE,"Soft plush teddy","A soft, cuddly 30cm teddy bear.",https://example.com/teddy.jpg\r\n';

export default function ImportProductsPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [check, setCheck] = useState<{ results: Result[]; created: number; updated: number; failed: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ created: number; updated: number; failed: number } | null>(null);

  const send = (dryRun: boolean, list = rows) =>
    fetch('/api/admin/products/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rows: list, dryRun }) })
      .then(async (r) => ({ ok: r.ok, data: await r.json().catch(() => ({})) }));

  const pick = async (file: File) => {
    setFileName(file.name);
    setDone(null);
    const parsed = parseCsv(await file.text());
    setRows(parsed);
    if (!parsed.length) { toast.error('No rows found in that file'); setCheck(null); return; }
    setBusy(true);
    const { ok, data } = await send(true, parsed);
    setBusy(false);
    if (!ok) { toast.error(data.error || 'Could not read the file'); setCheck(null); return; }
    setCheck(data);
  };

  const runImport = async () => {
    setBusy(true);
    const { ok, data } = await send(false);
    setBusy(false);
    if (!ok) { toast.error(data.error || 'Import failed'); return; }
    setDone(data);
    setCheck(data);
    toast.success(`${data.created} created, ${data.updated} updated`);
  };

  return (
    <div className="flex flex-col gap-2">
      <Container>
        <SectionHeader level={1} title="Import products" subtitle="Add or update many products at once from a CSV file (Excel or Google Sheets: File → Download → CSV)." />
        <div className="space-y-3 px-6 py-4 text-ui-subtle">
          <p>Use the same columns as <Link href="/api/admin/products?format=csv" className="font-medium text-ui-fg underline">the product export</Link>. A row whose <b className="text-ui-fg">SKU</b> already exists updates that product (only the columns you include); any other row creates a new product as a draft unless Status says ACTIVE.</p>
          <p>New products need <b className="text-ui-fg">Name, SKU, Category, Price</b>. Category must match an existing category name. Images: one or more image links separated by spaces; the first is the main image. Colours, sizes and per-size stock are edited on each product.</p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button variant="primary" onClick={() => fileRef.current?.click()} loading={busy && !check}><FileUp className="h-3.5 w-3.5" /> Choose CSV file</Button>
            <a href={`data:text/csv;charset=utf-8,${encodeURIComponent(TEMPLATE)}`} download="products-template.csv" className="inline-flex h-8 items-center gap-1.5 rounded-md bg-ui-base px-3 font-medium text-ui-fg shadow-ui-field hover:bg-ui-hover">
              <Download className="h-3.5 w-3.5" /> Template
            </a>
            <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) pick(f); e.target.value = ''; }} />
          </div>
        </div>
      </Container>

      {check && (
        <Container className="overflow-hidden">
          <SectionHeader
            title={done ? 'Import finished' : `Check ${fileName}`}
            subtitle={done ? `${done.created} created · ${done.updated} updated · ${done.failed} skipped` : `${check.created} new · ${check.updated} updates · ${check.failed} with problems`}
            actions={!done ? (
              <Button variant="primary" loading={busy} disabled={check.created + check.updated === 0} onClick={runImport}>
                Import {check.created + check.updated} product{check.created + check.updated === 1 ? '' : 's'}
              </Button>
            ) : <Link href="/admin/products" className="font-medium text-ui-subtle hover:text-ui-fg">Back to products</Link>}
          />
          <div className="max-h-[480px] overflow-y-auto">
            <table className="w-full">
              <thead>
                <tr className="h-10 border-b border-ui-border bg-ui-bg text-left text-ui-subtle">
                  <th className="pl-6 pr-6 font-medium">Row</th>
                  <th className="pr-6 font-medium">SKU</th>
                  <th className="pr-6 font-medium">Name</th>
                  <th className="pr-6 font-medium">Result</th>
                </tr>
              </thead>
              <tbody>
                {check.results.map((r) => (
                  <tr key={r.row} className={cx('h-12 border-b border-ui-border last:border-0', r.action === 'error' && 'bg-red-500/5')}>
                    <td className="pl-6 pr-6 text-ui-subtle">{r.row}</td>
                    <td className="pr-6">{r.sku || '-'}</td>
                    <td className="max-w-[280px] truncate pr-6">{rows[r.row - 2]?.Name || '-'}</td>
                    <td className="pr-6">
                      {r.action === 'error' ? <span className="text-red-600">{r.message}</span>
                        : <Badge tone={r.action === 'create' ? 'green' : 'blue'}>{r.action === 'create' ? 'New' : 'Update'}</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Container>
      )}
    </div>
  );
}
