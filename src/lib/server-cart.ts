import { prisma } from '@/lib/prisma';

/** Variant labels are free text from the product page; keep them short and tidy. */
export function normalizeVariant(variant: unknown): string {
  return typeof variant === 'string' ? variant.trim().slice(0, 120) : '';
}

/** The signed-in user's cart lines with current product details and prices (INR). */
export async function getServerCart(userId: string) {
  const cartItems = await prisma.cartItem.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    include: {
      product: {
        include: {
          images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 1 },
          category: { select: { name: true } },
        },
      },
    },
  });

  return cartItems
    .filter((item) => item.product.status === 'ACTIVE')
    .map((item) => ({
      id: item.id,
      quantity: item.quantity,
      variant: item.variant,
      product: {
        id: item.product.id,
        name: item.product.name,
        slug: item.product.slug,
        price: Number(item.product.price),
        compareAtPrice: item.product.compareAtPrice != null ? Number(item.product.compareAtPrice) : null,
        gstRate: Number(item.product.gstRate),
        categoryId: item.product.categoryId,
        stock: item.product.stock,
        images: item.product.images,
        category: item.product.category,
      },
    }));
}

/** The cart as coupon lines (INR prices with categories), for discount checks. */
export async function cartCouponLines(userId: string) {
  const lines = await getServerCart(userId);
  return lines.map((l) => ({ productId: l.product.id, categoryId: l.product.categoryId, price: l.product.price, quantity: l.quantity }));
}
