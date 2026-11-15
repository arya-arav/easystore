'use client';

import { useEffect, useState } from 'react';
import { Plus, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { DataTable, type Column } from '@/components/admin/data-table';
import { useConfirm } from '@/components/admin/overlays';
import { LinkButton, PRODUCT_STATUS_TONE, SectionHeader, StatusBadge, cx, inr } from '@/components/admin/ui';

interface ProductRow {
  id: string;
  name: string;
  slug: string;
  sku: string;
  price: string;
  compareAtPrice: string | null;
  stock: number;
  lowStockThreshold: number;
  status: string;
  updatedAt: string;
  category: { name: string } | null;
  images: { url: string }[];
  _count: { variants: number };
}

const columns: Column<ProductRow>[] = [
  {
    key: 'product', header: 'Product', fixed: true, cell: (p) => (
      <div className="flex min-w-[220px] items-center gap-3">
        <div className="h-8 w-8 shrink-0 overflow-hidden rounded bg-ui-hover">
          {p.images[0]?.url && <img src={p.images[0].url} alt="" className="h-full w-full object-cover" />}
        </div>
        <span className="truncate font-medium">{p.name}</span>
      </div>
    ),
  },
  { key: 'sku', header: 'SKU', cell: (p) => <span className="text-ui-subtle">{p.sku}</span> },
  { key: 'category', header: 'Category', cell: (p) => <span className="text-ui-subtle">{p.category?.name || '-'}</span> },
  {
    key: 'stock', header: 'Inventory', cell: (p) => (
      <span className={cx('whitespace-nowrap', p.stock <= 0 ? 'text-red-600' : p.stock <= p.lowStockThreshold ? 'text-amber-600' : 'text-ui-subtle')}>
        {p.stock <= 0 ? 'Out of stock' : `${p.stock} in stock`}{p._count.variants > 0 && <span className="text-ui-muted"> · {p._count.variants} variants</span>}
      </span>
    ),
  },
  {
    key: 'price', header: 'Price', className: 'text-right', cell: (p) => (
      <span className="whitespace-nowrap">{inr(p.price)}{p.compareAtPrice && Number(p.compareAtPrice) > Number(p.price) && <span className="ml-1 text-[12px] text-ui-muted line-through">{inr(p.compareAtPrice)}</span>}</span>
    ),
  },
  { key: 'status', header: 'Status', cell: (p) => <StatusBadge status={p.status} tones={PRODUCT_STATUS_TONE} /> },
  { key: 'updated', header: 'Updated', defaultHidden: true, cell: (p) => <span className="text-ui-subtle">{new Date(p.updatedAt).toLocaleDateString('en-IN')}</span> },
];

export default function AdminProductsPage() {
  const confirm = useConfirm();
  const [categories, setCategories] = useState<{ value: string; label: string }[]>([]);
  useEffect(() => {
    fetch('/api/admin/categories').then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (d?.categories) setCategories(d.categories.map((c: any) => ({ value: c.id, label: c.name })));
    }).catch(() => {});
  }, []);

  const bulk = (action: 'active' | 'draft' | 'archived' | 'delete') => async (rows: ProductRow[]) => {
    if (action === 'delete') {
      const ok = await confirm({ title: `Delete ${rows.length} product${rows.length > 1 ? 's' : ''}?`, description: 'This cannot be undone. Past orders keep their details. Archiving hides a product without deleting it.', confirmText: 'Delete', danger: true });
      if (!ok) return;
    }
    const res = await fetch('/api/admin/products/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: rows.map((r) => r.id), action }) });
    const data = await res.json().catch(() => ({}));
    if (res.ok) toast.success(action === 'delete' ? 'Products deleted' : 'Products updated');
    else toast.error(data.error || 'Could not update the products');
  };

  return (
    <DataTable<ProductRow>
      id="products"
      endpoint="/api/admin/products"
      dataKey="products"
      header={
        <SectionHeader
          level={1}
          title="Products"
          actions={
            <>
              <LinkButton href="/admin/products/import"><Upload className="h-3.5 w-3.5" /> Import</LinkButton>
              <LinkButton href="/admin/products/new" variant="primary"><Plus className="h-3.5 w-3.5" /> Create</LinkButton>
            </>
          }
        />
      }
      columns={columns}
      rowHref={(p) => `/admin/products/${p.id}`}
      searchPlaceholder="Name, SKU or slug"
      filters={[
        { key: 'status', label: 'Status', options: [{ value: 'ACTIVE', label: 'Active' }, { value: 'DRAFT', label: 'Draft' }, { value: 'ARCHIVED', label: 'Archived' }] },
        { key: 'category', label: 'Category', options: categories },
        { key: 'stock', label: 'Stock', options: [{ value: 'low', label: 'Running low' }, { value: 'out', label: 'Out of stock' }, { value: 'in', label: 'In stock' }] },
      ]}
      sorts={[
        { value: 'updated_desc', label: 'Recently updated' },
        { value: 'created_desc', label: 'Newest' },
        { value: 'name_asc', label: 'Name A–Z' },
        { value: 'price_desc', label: 'Price: high to low' },
        { value: 'price_asc', label: 'Price: low to high' },
        { value: 'stock_asc', label: 'Stock: lowest first' },
      ]}
      bulkActions={[
        { label: 'Publish', run: bulk('active') },
        { label: 'Draft', run: bulk('draft') },
        { label: 'Archive', run: bulk('archived') },
        { label: 'Delete', danger: true, run: bulk('delete') },
      ]}
      exportHref="/api/admin/products?format=csv"
      emptyTitle="No products yet"
      emptyDescription="Create your first product, or import many at once from a CSV file."
    />
  );
}
