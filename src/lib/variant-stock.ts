import { prisma } from '@/lib/prisma';

// Stock per colour/size combination (ProductVariant rows). When a product has rows,
// they decide what can be sold and Product.stock is kept as their total; otherwise
// Product.stock is used as before. Cart lines and order items name the combination
// with a label like "Colour: Blue / Size: 3-6 months" (size *label*), built on the
// product page; parseVariantLabel maps it back to the row's colour name and size value.

interface ProductOptions {
  colors?: string | null;
  sizes?: string | null;
}

const parseJson = <T,>(raw?: string | null): T[] => {
  try {
    const v = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
};

export function parseVariantLabel(label: string, product: ProductOptions): { color: string; size: string } {
  const sizes = parseJson<{ label: string; value: string }>(product.sizes);
  let color = '';
  let size = '';
  for (const part of (label || '').split(' / ')) {
    const [key, ...rest] = part.split(': ');
    const value = rest.join(': ').trim();
    if (key === 'Colour') color = value;
    if (key === 'Size') size = sizes.find((s) => s.label === value || s.value === value)?.value ?? value;
  }
  return { color, size };
}

/** How many of this product (and combination) can be sold right now. */
export async function availableStock(productId: string, variantLabel: string): Promise<number> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { stock: true, colors: true, sizes: true, _count: { select: { variants: true } } },
  });
  if (!product) return 0;
  if (product._count.variants === 0) return product.stock;
  const key = parseVariantLabel(variantLabel, product);
  const row = await prisma.productVariant.findUnique({
    where: { productId_color_size: { productId, color: key.color, size: key.size } },
    select: { stock: true },
  });
  return row?.stock ?? 0;
}

export interface StockLine {
  productId: string;
  variant: string;
  quantity: number;
  name: string;
}

type Reserved = { productId: string; quantity: number; variantKey?: { color: string; size: string } };

async function returnReserved(reserved: Reserved[]) {
  for (const r of reserved) {
    if (r.variantKey) {
      await prisma.productVariant.updateMany({ where: { productId: r.productId, ...r.variantKey }, data: { stock: { increment: r.quantity } } });
    }
    await prisma.product.update({ where: { id: r.productId }, data: { stock: { increment: r.quantity } } });
  }
}

/**
 * Takes the lines out of stock, all or nothing. Each decrement only succeeds while enough
 * is left, so two orders can't both buy the last one. Returns a release function to undo.
 */
export async function reserveStock(lines: StockLine[]): Promise<{ ok: true; release: () => Promise<void> } | { ok: false; error: string }> {
  const reserved: Reserved[] = [];
  for (const line of lines) {
    const product = await prisma.product.findUnique({
      where: { id: line.productId },
      select: { colors: true, sizes: true, _count: { select: { variants: true } } },
    });
    if (!product) {
      await returnReserved(reserved);
      return { ok: false, error: `${line.name} is no longer available` };
    }

    if (product._count.variants > 0) {
      const key = parseVariantLabel(line.variant, product);
      const taken = await prisma.productVariant.updateMany({
        where: { productId: line.productId, color: key.color, size: key.size, stock: { gte: line.quantity } },
        data: { stock: { decrement: line.quantity } },
      });
      if (taken.count !== 1) {
        await returnReserved(reserved);
        const left = await availableStock(line.productId, line.variant);
        return { ok: false, error: left > 0 ? `Only ${left} left of ${line.name} (${line.variant})` : `${line.name} (${line.variant}) is sold out` };
      }
      // Keep the product total in step (it's the sum of its combinations).
      await prisma.product.update({ where: { id: line.productId }, data: { stock: { decrement: line.quantity } } });
      reserved.push({ productId: line.productId, quantity: line.quantity, variantKey: key });
    } else {
      const taken = await prisma.product.updateMany({
        where: { id: line.productId, stock: { gte: line.quantity } },
        data: { stock: { decrement: line.quantity } },
      });
      if (taken.count !== 1) {
        await returnReserved(reserved);
        const left = await availableStock(line.productId, '');
        return { ok: false, error: left > 0 ? `Only ${left} left of ${line.name}` : `${line.name} is sold out` };
      }
      reserved.push({ productId: line.productId, quantity: line.quantity });
    }
  }
  return { ok: true, release: () => returnReserved(reserved) };
}

const RESTOCK_NOTE = 'Items returned to stock';

/** Puts an ended order's items back in stock, once. */
export async function restockOrder(orderId: string) {
  const already = await prisma.orderStatusHistory.count({ where: { orderId, note: RESTOCK_NOTE } });
  if (already > 0) return;

  const items = await prisma.orderItem.findMany({
    where: { orderId, productId: { not: null } },
    select: { productId: true, quantity: true, variant: true, product: { select: { colors: true, sizes: true, _count: { select: { variants: true } } } } },
  });
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { status: true } });
  if (!order) return;

  for (const item of items) {
    if (!item.productId || !item.product) continue;
    if (item.product._count.variants > 0) {
      const key = parseVariantLabel(item.variant || '', item.product);
      await prisma.productVariant.updateMany({ where: { productId: item.productId, ...key }, data: { stock: { increment: item.quantity } } });
    }
    await prisma.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
  }
  await prisma.orderStatusHistory.create({ data: { orderId, status: order.status, note: RESTOCK_NOTE } });
}

export interface VariantStockInput {
  color: string;
  size: string;
  stock: number;
  sku?: string | null;
}

/**
 * Replaces a product's combination stock (admin). An empty list switches back to a single
 * stock number. Returns the new product total, or null when variants aren't used.
 */
export async function setVariantStock(productId: string, rows: VariantStockInput[]): Promise<number | null> {
  const clean = rows
    .filter((r) => typeof r.color === 'string' && typeof r.size === 'string' && (r.color || r.size))
    .map((r) => ({ color: r.color.trim(), size: r.size.trim(), stock: Math.max(0, Math.floor(Number(r.stock) || 0)), sku: r.sku?.trim() || null }));

  if (clean.length === 0) {
    await prisma.productVariant.deleteMany({ where: { productId } });
    return null;
  }

  await prisma.productVariant.deleteMany({
    where: { productId, NOT: { OR: clean.map((r) => ({ color: r.color, size: r.size })) } },
  });
  for (const r of clean) {
    await prisma.productVariant.upsert({
      where: { productId_color_size: { productId, color: r.color, size: r.size } },
      create: { productId, ...r },
      update: { stock: r.stock, sku: r.sku },
    });
  }
  const total = clean.reduce((sum, r) => sum + r.stock, 0);
  await prisma.product.update({ where: { id: productId }, data: { stock: total } });
  return total;
}

/** Puts specific order items back in stock (a received return). */
export async function restockItems(items: { productId: string | null; variant: string | null; quantity: number }[]) {
  for (const item of items) {
    if (!item.productId || item.quantity <= 0) continue;
    const product = await prisma.product.findUnique({
      where: { id: item.productId },
      select: { colors: true, sizes: true, _count: { select: { variants: true } } },
    });
    if (!product) continue;
    if (product._count.variants > 0) {
      const key = parseVariantLabel(item.variant || '', product);
      await prisma.productVariant.updateMany({ where: { productId: item.productId, ...key }, data: { stock: { increment: item.quantity } } });
    }
    await prisma.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
  }
}
