import { beforeEach, describe, expect, it } from 'vitest';
import { POST as placeOrder } from '@/app/api/orders/route';
import { prisma } from '@/lib/prisma';
import { addToCart, createProduct, createUser, jsonRequest, setupStore, shippingAddress, signIn } from './fixtures';

const checkout = (extra: Record<string, unknown> = {}) =>
  placeOrder(jsonRequest('/api/orders', { ...shippingAddress, paymentMethod: 'COD', currency: 'INR', ...extra }));

let store: Awaited<ReturnType<typeof setupStore>>;
beforeEach(async () => {
  store = await setupStore();
});

describe('placing an order', () => {
  it('works out every amount on the server and ignores amounts sent by the browser', async () => {
    const user = await createUser();
    const teddy = await createProduct(store.category.id, { price: 400 });
    await addToCart(user.id, teddy.id, 2);
    signIn(user);

    const res = await checkout({ total: 0.01, subtotal: 0.01, discount: 999, shippingCharge: 0 });
    expect(res.status).toBe(201);
    const order = await res.json();
    // ₹800 goods + ₹99 Standard delivery (under ₹999). GST is inside the price: 800 × 18/118 = ₹122.03
    expect(Number(order.subtotal)).toBe(800);
    expect(Number(order.shippingCharge)).toBe(99);
    expect(Number(order.gstAmount)).toBe(122.03);
    expect(Number(order.discount)).toBe(0);
    expect(Number(order.total)).toBe(899);
    expect(order.status).toBe('PENDING');
    expect(order.paymentStatus).toBe('PENDING');
  });

  it('gives free Standard delivery from ₹999 and charges the chosen delivery option', async () => {
    const user = await createUser();
    const teddy = await createProduct(store.category.id, { price: 400 });
    await addToCart(user.id, teddy.id, 3);
    signIn(user);

    const free = await (await checkout()).json();
    expect(Number(free.shippingCharge)).toBe(0);
    expect(Number(free.total)).toBe(1200);

    await addToCart(user.id, teddy.id, 3);
    const express = await (await checkout({ shippingOptionId: store.express.id })).json();
    expect(Number(express.shippingCharge)).toBe(199);
    expect(express.shippingMethod).toBe('Express');
  });

  it('records the GST inside the price without adding it on top', async () => {
    const user = await createUser();
    await addToCart(user.id, (await createProduct(store.category.id, { price: 400 })).id, 1);
    signIn(user);
    const order = await (await checkout()).json();
    expect(Number(order.gstAmount)).toBe(61.02); // 400 × 18/118
    expect(Number(order.total)).toBe(499);
    const [item] = await prisma.orderItem.findMany({ where: { orderId: order.id } });
    expect(Number(item.gstRate)).toBe(18);
  });

  it('takes the items out of stock, saves them on the order and empties the cart', async () => {
    const user = await createUser();
    const teddy = await createProduct(store.category.id, { price: 20, stock: 5 });
    await addToCart(user.id, teddy.id, 2);
    signIn(user);

    const order = await (await checkout()).json();
    expect((await prisma.product.findUnique({ where: { id: teddy.id } }))!.stock).toBe(3);
    const items = await prisma.orderItem.findMany({ where: { orderId: order.id } });
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ productId: teddy.id, quantity: 2, productSku: teddy.sku });
    expect(await prisma.cartItem.count({ where: { userId: user.id } })).toBe(0);
  });

  it('refuses more than is in stock and leaves stock and cart untouched', async () => {
    const user = await createUser();
    const teddy = await createProduct(store.category.id, { stock: 1, name: 'Last Teddy' });
    await addToCart(user.id, teddy.id, 2);
    signIn(user);

    const res = await checkout();
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Only 1 left of Last Teddy');
    expect(await prisma.order.count()).toBe(0);
    expect((await prisma.product.findUnique({ where: { id: teddy.id } }))!.stock).toBe(1);
    expect(await prisma.cartItem.count({ where: { userId: user.id } })).toBe(1);
  });

  it('sells the last item only once when two shoppers check out at the same moment', async () => {
    const teddy = await createProduct(store.category.id, { stock: 1 });
    const [a, b] = [await createUser(), await createUser()];
    await addToCart(a.id, teddy.id, 1);
    await addToCart(b.id, teddy.id, 1);

    // The route reads the signed-in user once, at the start, so interleave the two requests
    signIn(a);
    const first = checkout();
    signIn(b);
    const second = checkout();
    const statuses = (await Promise.all([first, second])).map((r) => r.status).sort();

    expect(statuses).toEqual([201, 400]);
    expect(await prisma.order.count()).toBe(1);
    expect((await prisma.product.findUnique({ where: { id: teddy.id } }))!.stock).toBe(0);
  });

  it('applies a coupon once and refuses it after its usage limit', async () => {
    await prisma.coupon.create({
      data: { code: 'SAVE10', discountType: 'PERCENTAGE', discountValue: 10, usageLimit: 1, validFrom: new Date(Date.now() - 86_400_000), validTo: new Date(Date.now() + 86_400_000) },
    });
    const teddy = await createProduct(store.category.id, { price: 400 });
    const [a, b] = [await createUser(), await createUser()];
    await addToCart(a.id, teddy.id, 2);
    await addToCart(b.id, teddy.id, 2);

    signIn(a);
    const used = await (await checkout({ couponCode: 'save10' })).json();
    expect(Number(used.discount)).toBe(80);
    expect(used.couponCode).toBe('SAVE10');
    // ₹800 − ₹80 + ₹99 delivery; the GST inside shrinks with the discount (122.03 × 720/800)
    expect(Number(used.total)).toBe(819);
    expect(Number(used.gstAmount)).toBe(109.83);

    signIn(b);
    const refused = await checkout({ couponCode: 'SAVE10' });
    expect(refused.status).toBe(400);
    expect((await refused.json()).error).toBe('This coupon has reached its usage limit');
    expect((await prisma.product.findUnique({ where: { id: teddy.id } }))!.stock).toBe(8);
  });

  it('refuses countries the store does not deliver to, and payment methods not offered', async () => {
    const user = await createUser();
    await addToCart(user.id, (await createProduct(store.category.id)).id, 1);
    signIn(user);

    expect((await checkout({ shippingCountry: 'GB' })).status).toBe(400);
    const card = await checkout({ paymentMethod: 'STRIPE' });
    expect(card.status).toBe(400);
    expect((await card.json()).error).toMatch(/payment method is not available/);
    expect(await prisma.order.count()).toBe(0);
  });

  it('needs a signed-in shopper with something in the cart', async () => {
    expect((await checkout()).status).toBe(401);
    signIn(await createUser());
    const empty = await checkout();
    expect(empty.status).toBe(400);
    expect((await empty.json()).error).toBe('Cart is empty');
  });
});
