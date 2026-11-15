import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getServerCart, normalizeVariant } from '@/lib/server-cart';
import { hasOptions } from '@/lib/product-options';
import { availableStock } from '@/lib/variant-stock';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// The signed-in shopper's cart. Guests keep their cart in the browser
// (src/lib/cart-context.tsx) until they sign in; see /api/cart/sync.

const MAX_QUANTITY = 99;

async function requireUser() {
  const session = await getServerSession(authOptions);
  return session?.user?.id || null;
}

// GET - the cart, with current product details
export async function GET() {
  try {
    const userId = await requireUser();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ cartItems: await getServerCart(userId) });
  } catch (error) {
    console.error('Cart GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch cart' }, { status: 500 });
  }
}

// POST - add a product (with chosen options) to the cart
export async function POST(request: NextRequest) {
  try {
    const userId = await requireUser();
    if (!userId) return NextResponse.json({ error: 'Unauthorized - please login' }, { status: 401 });

    const { productId, quantity = 1, variant } = await request.json();
    if (!productId) return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });

    const product = await prisma.product.findUnique({ where: { id: productId }, select: { status: true, stock: true, colors: true, sizes: true } });
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    if (product.status !== 'ACTIVE') return NextResponse.json({ error: 'Product not available' }, { status: 400 });

    const key = { userId, productId, variant: normalizeVariant(variant) };
    if (!key.variant && hasOptions(product)) {
      return NextResponse.json({ error: 'Please choose a size or colour first', needsOptions: true }, { status: 400 });
    }
    const qty = Math.max(1, Math.min(MAX_QUANTITY, Number(quantity) || 1));
    const existing = await prisma.cartItem.findUnique({ where: { userId_productId_variant: key } });

    const available = await availableStock(productId, key.variant);
    const wanted = (existing?.quantity ?? 0) + qty;
    if (wanted > available) {
      const error = available <= 0 ? 'Sorry, this is sold out' : `Only ${available} left${existing ? ` (you have ${existing.quantity} in your cart)` : ''}`;
      return NextResponse.json({ error, available }, { status: 400 });
    }

    const item = existing
      ? await prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: Math.min(MAX_QUANTITY, existing.quantity + qty) } })
      : await prisma.cartItem.create({ data: { ...key, quantity: qty } });

    return NextResponse.json(item, { status: existing ? 200 : 201 });
  } catch (error: any) {
    console.error('Cart POST error:', error);
    return NextResponse.json({ error: error.message || 'Failed to add to cart' }, { status: 500 });
  }
}

// PUT - set a line's quantity (0 removes it)
export async function PUT(request: NextRequest) {
  try {
    const userId = await requireUser();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { productId, quantity, variant } = await request.json();
    const where = { userId, productId, variant: normalizeVariant(variant) };

    if (!quantity || quantity < 1) {
      await prisma.cartItem.deleteMany({ where });
      return NextResponse.json({ deleted: true });
    }
    const available = await availableStock(productId, where.variant);
    if (quantity > available) {
      return NextResponse.json({ error: available <= 0 ? 'Sorry, this is sold out' : `Only ${available} left`, available }, { status: 400 });
    }
    const result = await prisma.cartItem.updateMany({ where, data: { quantity: Math.min(MAX_QUANTITY, quantity) } });
    return NextResponse.json({ updated: result.count });
  } catch (error) {
    console.error('Cart PUT error:', error);
    return NextResponse.json({ error: 'Failed to update cart' }, { status: 500 });
  }
}

// DELETE - remove a line
export async function DELETE(request: NextRequest) {
  try {
    const userId = await requireUser();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { productId, variant } = await request.json();
    await prisma.cartItem.deleteMany({ where: { userId, productId, variant: normalizeVariant(variant) } });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error('Cart DELETE error:', error);
    return NextResponse.json({ error: 'Failed to remove from cart' }, { status: 500 });
  }
}
