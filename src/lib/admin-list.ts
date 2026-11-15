import { NextRequest } from 'next/server';

// Query parsing for admin list endpoints (used with components/admin/data-table.tsx).

export function listParams(request: NextRequest, sorts: Record<string, any>, defaultSort: string) {
  const sp = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(sp.get('page') || '1') || 1);
  const limit = Math.min(200, Math.max(1, parseInt(sp.get('limit') || '20') || 20));
  const q = (sp.get('q') || '').trim();
  const sortKey = sp.get('sort') && sorts[sp.get('sort')!] ? sp.get('sort')! : defaultSort;
  return { sp, page, limit, q, skip: (page - 1) * limit, orderBy: sorts[sortKey] };
}

/** Start/end of the day for a yyyy-mm-dd filter (end is exclusive). */
export function dayRange(from?: string | null, to?: string | null) {
  const range: { gte?: Date; lt?: Date } = {};
  if (from && !isNaN(Date.parse(from))) range.gte = new Date(`${from}T00:00:00+05:30`);
  if (to && !isNaN(Date.parse(to))) range.lt = new Date(new Date(`${to}T00:00:00+05:30`).getTime() + 86_400_000);
  return range.gte || range.lt ? range : undefined;
}

const csvCell = (v: unknown) => {
  const s = v === null || v === undefined ? '' : v instanceof Date ? v.toISOString() : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function csvResponse(filename: string, header: string[], rows: unknown[][]) {
  const body = [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');
  return new Response('﻿' + body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
