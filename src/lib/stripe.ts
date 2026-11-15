import { createHmac, timingSafeEqual } from 'crypto';
import { CURRENCIES } from '@/lib/markets';

// Minimal Stripe client over fetch (works on Cloudflare Workers without the Node SDK).
// Orders are paid on Stripe's hosted Checkout page; see /api/stripe/* and /api/webhooks/stripe.

const API = 'https://api.stripe.com/v1';

function secretKey() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('Stripe is not configured');
  return key;
}

/** Flattens { a: { b: 1 } } into Stripe's form encoding: a[b]=1. */
function encode(params: Record<string, unknown>, prefix = '', out = new URLSearchParams()) {
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    const name = prefix ? `${prefix}[${key}]` : key;
    if (typeof value === 'object') encode(value as Record<string, unknown>, name, out);
    else out.append(name, String(value));
  }
  return out;
}

async function stripeRequest<T>(method: 'GET' | 'POST', path: string, params?: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: method === 'POST' && params ? encode(params) : undefined,
  });
  const data = (await res.json()) as any;
  if (!res.ok) throw new Error(data?.error?.message || `Stripe error ${res.status}`);
  return data as T;
}

/** Amount in the currency's smallest unit (cents), as Stripe expects. */
export function toMinorUnits(amount: number, currency: string) {
  const decimals = CURRENCIES[currency]?.decimals ?? 2;
  return Math.round(amount * 10 ** decimals);
}

export interface CheckoutSession {
  id: string;
  url: string | null;
  payment_status: 'paid' | 'unpaid' | 'no_payment_required';
  status: 'open' | 'complete' | 'expired';
  amount_total: number | null;
  currency: string | null;
  payment_intent: string | null;
  metadata: Record<string, string>;
}

export function createCheckoutSession(input: {
  orderId: string;
  orderNumber: string;
  amount: number; // in `currency`, major units
  currency: string;
  customerEmail?: string | null;
  successUrl: string;
  cancelUrl: string;
}) {
  return stripeRequest<CheckoutSession>('POST', '/checkout/sessions', {
    mode: 'payment',
    client_reference_id: input.orderId,
    customer_email: input.customerEmail || undefined,
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    metadata: { order_id: input.orderId, order_number: input.orderNumber },
    payment_intent_data: { metadata: { order_id: input.orderId, order_number: input.orderNumber } },
    line_items: {
      0: {
        quantity: 1,
        price_data: {
          currency: input.currency.toLowerCase(),
          unit_amount: toMinorUnits(input.amount, input.currency),
          product_data: { name: `Order ${input.orderNumber}` },
        },
      },
    },
  });
}

export function retrieveCheckoutSession(id: string) {
  return stripeRequest<CheckoutSession>('GET', `/checkout/sessions/${encodeURIComponent(id)}`);
}

/** Verifies a Stripe-Signature header (v1 scheme) and returns the parsed event, or null. */
export function verifyWebhook(rawBody: string, signatureHeader: string | null, secret: string, toleranceSeconds = 300) {
  if (!signatureHeader) return null;
  const parts = Object.fromEntries(
    signatureHeader.split(',').map((p) => {
      const i = p.indexOf('=');
      return [p.slice(0, i), p.slice(i + 1)];
    })
  );
  const timestamp = Number(parts.t);
  const signatures = signatureHeader.split(',').filter((p) => p.startsWith('v1=')).map((p) => p.slice(3));
  if (!timestamp || signatures.length === 0) return null;
  if (Math.abs(Date.now() / 1000 - timestamp) > toleranceSeconds) return null;

  const expected = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
  const valid = signatures.some((sig) => {
    const a = Buffer.from(sig, 'hex');
    const b = Buffer.from(expected, 'hex');
    return a.length === b.length && timingSafeEqual(a, b);
  });
  return valid ? (JSON.parse(rawBody) as { type: string; data: { object: any } }) : null;
}
