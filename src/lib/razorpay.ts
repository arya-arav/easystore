import { createHmac, timingSafeEqual } from 'crypto';

// Razorpay integration

export const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || '';
export const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';

// Create Razorpay Order
export async function createRazorpayOrder(amount: number, receipt: string, notes: Record<string, string> = {}) {
  const auth = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');

  const response = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${auth}`,
    },
    body: JSON.stringify({
      amount: Math.round(amount * 100), // Amount in paise
      currency: 'INR',
      receipt,
      notes,
      payment_capture: 1,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to create Razorpay order');
  }

  return response.json();
}

// Verify Razorpay Payment Signature. False when the key secret isn't set: an empty
// secret would let anyone compute a "valid" signature.
export function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET || '';
  if (!secret || !orderId || !paymentId || typeof signature !== 'string') return false;
  return hmacMatches(secret, `${orderId}|${paymentId}`, signature);
}

/** Constant-time check that `signature` (hex) is the HMAC-SHA256 of `body` under `secret`. */
export function hmacMatches(secret: string, body: string, signature: string | null | undefined): boolean {
  if (!secret || !signature) return false;
  const expected = createHmac('sha256', secret).update(body).digest();
  const given = Buffer.from(signature, 'hex');
  return given.length === expected.length && timingSafeEqual(given, expected);
}

// Fetch Payment Details
export async function fetchRazorpayPayment(paymentId: string) {
  const auth = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');

  const response = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
    headers: {
      'Authorization': `Basic ${auth}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch payment details');
  }

  return response.json();
}

// Refund Payment
export async function refundRazorpayPayment(paymentId: string, amount?: number) {
  const auth = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');

  const response = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}/refund`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${auth}`,
    },
    body: JSON.stringify({
      amount: amount ? Math.round(amount * 100) : undefined,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to refund payment');
  }

  return response.json();
}
