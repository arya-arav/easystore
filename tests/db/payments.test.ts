import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { POST as stripeWebhook } from '@/app/api/webhooks/stripe/route';
import { POST as razorpayWebhook } from '@/app/api/webhooks/razorpay/route';
import { POST as verifyRazorpayPayment } from '@/app/api/verify-payment/route';
import { prisma } from '@/lib/prisma';
import { createPendingOrder, createUser, hmacHex, jsonRequest, signIn, stripeSigned } from './fixtures';

const completed = (orderId: string, payment_status = 'paid', type = 'checkout.session.completed') => ({
  type,
  data: { object: { id: 'cs_test_1', payment_intent: 'pi_test_1', payment_status, metadata: { order_id: orderId } } },
});

const sendStripe = (event: unknown) => {
  const { body, headers } = stripeSigned(event);
  return stripeWebhook(jsonRequest('/api/webhooks/stripe', body, headers));
};

describe('Stripe webhook', () => {
  it('marks a paid order paid and confirmed', async () => {
    const order = await createPendingOrder((await createUser()).id);
    const res = await sendStripe(completed(order.id));
    expect(res.status).toBe(200);

    const saved = await prisma.order.findUnique({ where: { id: order.id } });
    expect(saved).toMatchObject({ paymentStatus: 'COMPLETED', status: 'CONFIRMED', paymentId: 'pi_test_1' });
    expect(await prisma.orderStatusHistory.count({ where: { orderId: order.id } })).toBe(1);
  });

  it('handles the same event delivered twice, or at once, as one payment', async () => {
    const order = await createPendingOrder((await createUser()).id);
    await Promise.all([sendStripe(completed(order.id)), sendStripe(completed(order.id))]);
    await sendStripe(completed(order.id)); // Stripe retry

    expect(await prisma.orderStatusHistory.count({ where: { orderId: order.id } })).toBe(1);
    expect(await prisma.orderStatusHistory.count({ where: { orderId: order.id } })).toBe(1);
  });

  it('does not confirm a checkout that is not paid yet (e.g. bank transfer pending)', async () => {
    const order = await createPendingOrder((await createUser()).id);
    await sendStripe(completed(order.id, 'unpaid'));
    expect((await prisma.order.findUnique({ where: { id: order.id } }))!.paymentStatus).toBe('PENDING');
    expect(await prisma.orderStatusHistory.count()).toBe(0);
  });

  it('marks expired checkouts failed, but never undoes a completed payment', async () => {
    const user = await createUser();
    const [unpaid, paid] = [await createPendingOrder(user.id), await createPendingOrder(user.id)];
    await sendStripe(completed(paid.id));

    await sendStripe(completed(unpaid.id, 'unpaid', 'checkout.session.expired'));
    await sendStripe(completed(paid.id, 'unpaid', 'checkout.session.expired'));

    expect((await prisma.order.findUnique({ where: { id: unpaid.id } }))!.paymentStatus).toBe('FAILED');
    expect((await prisma.order.findUnique({ where: { id: paid.id } }))!.paymentStatus).toBe('COMPLETED');
  });

  it('rejects events that are not signed with the webhook secret', async () => {
    const order = await createPendingOrder((await createUser()).id);
    const { body, headers } = stripeSigned(completed(order.id), 'whsec_attacker');
    const res = await stripeWebhook(jsonRequest('/api/webhooks/stripe', body, headers));

    expect(res.status).toBe(400);
    expect((await prisma.order.findUnique({ where: { id: order.id } }))!.paymentStatus).toBe('PENDING');
  });
});

describe('Razorpay payments', () => {
  const saved = { key: process.env.RAZORPAY_KEY_SECRET, webhook: process.env.RAZORPAY_WEBHOOK_SECRET };
  beforeEach(() => {
    delete process.env.RAZORPAY_KEY_SECRET;
    delete process.env.RAZORPAY_WEBHOOK_SECRET;
  });
  afterEach(() => {
    process.env.RAZORPAY_KEY_SECRET = saved.key;
    process.env.RAZORPAY_WEBHOOK_SECRET = saved.webhook;
  });

  const captured = (orderId: string) => JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_1', notes: { order_id: orderId } } } } });

  it('without a webhook secret, refuses a "payment captured" event signed with an empty key', async () => {
    const order = await createPendingOrder((await createUser()).id);
    const body = captured(order.id);
    const res = await razorpayWebhook(jsonRequest('/api/webhooks/razorpay', body, { 'x-razorpay-signature': hmacHex('', body) }));

    expect(res.status).toBe(500);
    expect((await prisma.order.findUnique({ where: { id: order.id } }))!.paymentStatus).toBe('PENDING');
    expect(await prisma.orderStatusHistory.count()).toBe(0);
  });

  it('with a webhook secret, records a captured payment once however often it arrives', async () => {
    process.env.RAZORPAY_WEBHOOK_SECRET = 'rzp_whsec';
    const order = await createPendingOrder((await createUser()).id, { paymentMethod: 'RAZORPAY' });
    const body = captured(order.id);
    const send = () => razorpayWebhook(jsonRequest('/api/webhooks/razorpay', body, { 'x-razorpay-signature': hmacHex('rzp_whsec', body) }));

    expect((await send()).status).toBe(200);
    await send();
    expect((await prisma.order.findUnique({ where: { id: order.id } }))!.paymentStatus).toBe('COMPLETED');
    expect(await prisma.orderStatusHistory.count({ where: { orderId: order.id } })).toBe(1);
    expect(await prisma.orderStatusHistory.count({ where: { orderId: order.id } })).toBe(1);
  });

  it('a card (Stripe) order cannot be marked paid through the Razorpay check with an empty-key signature', async () => {
    // A card order stores Stripe's checkout id, which the shopper sees in their return URL
    const user = await createUser();
    const order = await createPendingOrder(user.id, { paymentMethod: 'STRIPE', orderId: 'cs_test_visible' });
    signIn(user);

    const res = await verifyRazorpayPayment(jsonRequest('/api/verify-payment', {
      razorpay_order_id: 'cs_test_visible',
      razorpay_payment_id: 'pay_fake',
      razorpay_signature: hmacHex('', 'cs_test_visible|pay_fake'),
    }));

    expect(res.status).toBe(400);
    expect((await prisma.order.findUnique({ where: { id: order.id } }))!.paymentStatus).toBe('PENDING');
    expect(await prisma.orderStatusHistory.count()).toBe(0);
  });

  it('a card order cannot be marked paid through the Razorpay check even with a real key signature', async () => {
    process.env.RAZORPAY_KEY_SECRET = 'rzp_key';
    const user = await createUser();
    const order = await createPendingOrder(user.id, { paymentMethod: 'STRIPE', orderId: 'cs_test_visible' });
    signIn(user);

    const res = await verifyRazorpayPayment(jsonRequest('/api/verify-payment', {
      razorpay_order_id: 'cs_test_visible',
      razorpay_payment_id: 'pay_1',
      razorpay_signature: hmacHex('rzp_key', 'cs_test_visible|pay_1'),
    }));

    expect(res.status).toBe(404);
    expect((await prisma.order.findUnique({ where: { id: order.id } }))!.paymentStatus).toBe('PENDING');
  });

  it('confirms a Razorpay order with a valid signature, once', async () => {
    process.env.RAZORPAY_KEY_SECRET = 'rzp_key';
    const user = await createUser();
    const order = await createPendingOrder(user.id, { paymentMethod: 'RAZORPAY', orderId: 'order_rzp_1' });
    signIn(user);
    const verify = () => verifyRazorpayPayment(jsonRequest('/api/verify-payment', {
      razorpay_order_id: 'order_rzp_1',
      razorpay_payment_id: 'pay_1',
      razorpay_signature: hmacHex('rzp_key', 'order_rzp_1|pay_1'),
    }));

    expect((await verify()).status).toBe(200);
    expect((await verify()).status).toBe(200);
    expect((await prisma.order.findUnique({ where: { id: order.id } }))!.paymentStatus).toBe('COMPLETED');
    expect(await prisma.orderStatusHistory.count({ where: { orderId: order.id } })).toBe(1);
  });
});
