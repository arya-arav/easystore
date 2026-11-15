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

// Verify Razorpay Payment Signature
export function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  const crypto = require('crypto');
  const body = `${orderId}|${paymentId}`;
  const expectedSignature = crypto
    .createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');

  return expectedSignature === signature;
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
