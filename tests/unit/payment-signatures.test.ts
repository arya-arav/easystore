import { createHmac } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { toMinorUnits, verifyWebhook } from '@/lib/stripe';
import { hmacMatches, verifyRazorpaySignature } from '@/lib/razorpay';

const SECRET = 'whsec_test';

function stripeHeader(body: string, secret = SECRET, t = Math.floor(Date.now() / 1000)) {
  const sig = createHmac('sha256', secret).update(`${t}.${body}`).digest('hex');
  return `t=${t},v1=${sig}`;
}

describe('Stripe webhook signature', () => {
  const body = JSON.stringify({ type: 'checkout.session.completed', data: { object: { id: 'cs_1' } } });

  it('accepts a correctly signed event and returns it parsed', () => {
    expect(verifyWebhook(body, stripeHeader(body), SECRET)?.type).toBe('checkout.session.completed');
  });

  it('accepts when any of several v1 signatures matches (secret rotation)', () => {
    const good = stripeHeader(body).split(',v1=')[1];
    const t = Math.floor(Date.now() / 1000);
    expect(verifyWebhook(body, `t=${t},v1=${'0'.repeat(64)},v1=${good}`, SECRET)).not.toBeNull();
  });

  it('rejects a missing header, the wrong secret, or a changed body', () => {
    expect(verifyWebhook(body, null, SECRET)).toBeNull();
    expect(verifyWebhook(body, stripeHeader(body, 'whsec_other'), SECRET)).toBeNull();
    expect(verifyWebhook(body.replace('cs_1', 'cs_2'), stripeHeader(body), SECRET)).toBeNull();
  });

  it('rejects old events (replays)', () => {
    const tenMinutesAgo = Math.floor(Date.now() / 1000) - 600;
    expect(verifyWebhook(body, stripeHeader(body, SECRET, tenMinutesAgo), SECRET)).toBeNull();
  });

  it('rejects garbage headers without throwing', () => {
    expect(verifyWebhook(body, 'nonsense', SECRET)).toBeNull();
    expect(verifyWebhook(body, 't=abc,v1=zz', SECRET)).toBeNull();
  });
});

describe('Stripe amounts', () => {
  it('converts to the smallest unit, by currency', () => {
    expect(toMinorUnits(19.99, 'USD')).toBe(1999);
    expect(toMinorUnits(0.1 + 0.2, 'USD')).toBe(30); // float noise is rounded away
    expect(toMinorUnits(1500, 'JPY')).toBe(1500); // no decimals
  });
});

describe('Razorpay signatures', () => {
  const original = process.env.RAZORPAY_KEY_SECRET;
  afterEach(() => {
    process.env.RAZORPAY_KEY_SECRET = original;
  });
  const sign = (secret: string, body: string) => createHmac('sha256', secret).update(body).digest('hex');

  it('accepts a signature made with the key secret', () => {
    process.env.RAZORPAY_KEY_SECRET = 'rzp_secret';
    expect(verifyRazorpaySignature('order_1', 'pay_1', sign('rzp_secret', 'order_1|pay_1'))).toBe(true);
  });

  it('rejects a wrong or malformed signature', () => {
    process.env.RAZORPAY_KEY_SECRET = 'rzp_secret';
    expect(verifyRazorpaySignature('order_1', 'pay_1', sign('other', 'order_1|pay_1'))).toBe(false);
    expect(verifyRazorpaySignature('order_1', 'pay_2', sign('rzp_secret', 'order_1|pay_1'))).toBe(false);
    expect(verifyRazorpaySignature('order_1', 'pay_1', 'not-hex')).toBe(false);
  });

  it('rejects everything when no secret is set (an empty key would let anyone sign)', () => {
    process.env.RAZORPAY_KEY_SECRET = '';
    expect(verifyRazorpaySignature('order_1', 'pay_1', sign('', 'order_1|pay_1'))).toBe(false);
    expect(hmacMatches('', 'body', sign('', 'body'))).toBe(false);
  });
});
