import { createHmac } from 'node:crypto';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from './state';

let seq = 0;
const next = () => ++seq;

export function signIn(user: { id: string; email?: string | null } | null) {
  auth.session = user ? { user: { id: user.id, email: user.email ?? undefined } } : null;
}

export function jsonRequest(url: string, body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest(`http://localhost${url}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

/**
 * An Indian store (EasyStore's default market): cash on delivery on, one India region with
 * Standard (₹99, free from ₹999) and Express (₹199) delivery. Prices include 18% GST.
 */
export async function setupStore() {
  await prisma.siteSettings.create({
    data: { id: 'default', paymentMethods: JSON.stringify({ online: false, upi: false, cod: true, stripe: false }) },
  });
  const region = await prisma.region.create({
    data: {
      name: 'India',
      countries: ['IN'],
      currency: 'INR',
      paymentMethods: ['COD'],
      shippingOptions: {
        create: [
          { name: 'Standard', price: 99, freeAbove: 999, minDays: 3, maxDays: 7, sortOrder: 0 },
          { name: 'Express', price: 199, minDays: 1, maxDays: 2, sortOrder: 1 },
        ],
      },
    },
    include: { shippingOptions: true },
  });
  const category = await prisma.category.create({ data: { name: 'Toys', slug: 'toys' } });
  return { region, category, express: region.shippingOptions.find((o) => o.name === 'Express')! };
}

export async function createUser(overrides: Partial<{ email: string; loyaltyBalance: number }> = {}) {
  const n = next();
  return prisma.user.create({
    data: { email: overrides.email ?? `shopper${n}@test.com`, name: `Shopper ${n}`, emailVerified: new Date(), loyaltyBalance: overrides.loyaltyBalance ?? 0 },
  });
}

export async function createProduct(categoryId: string, overrides: Partial<{ price: number; stock: number; name: string }> = {}) {
  const n = next();
  return prisma.product.create({
    data: {
      name: overrides.name ?? `Teddy ${n}`,
      slug: `teddy-${n}`,
      sku: `BB-T${n}`,
      description: 'Soft toy',
      price: overrides.price ?? 400,
      stock: overrides.stock ?? 10,
      categoryId,
      status: 'ACTIVE',
    },
  });
}

export async function addToCart(userId: string, productId: string, quantity: number) {
  return prisma.cartItem.create({ data: { userId, productId, quantity, variant: '' } });
}

export const shippingAddress = {
  shippingName: 'Asha Rao',
  shippingPhone: '+919800000000',
  shippingAddressLine1: '12 MG Road',
  shippingCity: 'Mumbai',
  shippingState: 'Maharashtra',
  shippingPincode: '400001',
  shippingCountry: 'IN',
};

/** A pending card order owned by `userId`, as /api/orders would leave it. */
export async function createPendingOrder(userId: string, overrides: Partial<{ paymentMethod: 'STRIPE' | 'RAZORPAY'; orderId: string; total: number }> = {}) {
  const n = next();
  return prisma.order.create({
    data: {
      userId,
      orderNumber: `BBTEST${n}`,
      ...shippingAddress,
      shippingCountry: 'India',
      subtotal: overrides.total ?? 40,
      gstAmount: 0,
      total: overrides.total ?? 40,
      paymentMethod: overrides.paymentMethod ?? 'STRIPE',
      paymentStatus: 'PENDING',
      status: 'PENDING',
      currency: 'INR',
      orderId: overrides.orderId ?? null,
    },
  });
}

export function stripeSigned(event: unknown, secret = process.env.STRIPE_WEBHOOK_SECRET!) {
  const body = JSON.stringify(event);
  const t = Math.floor(Date.now() / 1000);
  const sig = createHmac('sha256', secret).update(`${t}.${body}`).digest('hex');
  return { body, headers: { 'stripe-signature': `t=${t},v1=${sig}` } };
}

export const hmacHex = (secret: string, body: string) => createHmac('sha256', secret).update(body).digest('hex');
