// Which payment methods the store offers. Stored as JSON in SiteSettings.paymentMethods
// and switched on/off from Admin → Settings → Payment.

export type PaymentMethodId = 'RAZORPAY' | 'UPI' | 'COD' | 'STRIPE';

export interface PaymentConfig {
  online: boolean; // Razorpay checkout (cards, UPI, net banking, wallets)
  upi: boolean; // Manual UPI: the customer pays to upiId after ordering
  cod: boolean;
  stripe: boolean; // Cards worldwide via Stripe; used for orders shipping outside India
  upiId: string;
  upiInstructions: string;
}

export const DEFAULT_PAYMENT_CONFIG: PaymentConfig = {
  online: true,
  upi: false,
  cod: true,
  stripe: true,
  upiId: '',
  upiInstructions: '',
};

/** Parses the stored JSON, including the older {cards, upi, netbanking, wallets, cod} shape. */
export function parsePaymentConfig(raw: string | null | undefined): PaymentConfig {
  let stored: Record<string, any> = {};
  try {
    stored = raw ? JSON.parse(raw) : {};
  } catch {
    stored = {};
  }

  const legacyOnline = ['cards', 'netbanking', 'wallets'].some((k) => stored[k] === true);
  const hasNewShape = 'online' in stored;

  return {
    online: hasNewShape ? !!stored.online : legacyOnline || DEFAULT_PAYMENT_CONFIG.online,
    // The old "upi" flag meant UPI inside Razorpay, so it doesn't carry over to manual UPI.
    upi: hasNewShape ? !!stored.upi : DEFAULT_PAYMENT_CONFIG.upi,
    cod: 'cod' in stored ? !!stored.cod : DEFAULT_PAYMENT_CONFIG.cod,
    stripe: 'stripe' in stored ? !!stored.stripe : DEFAULT_PAYMENT_CONFIG.stripe,
    upiId: typeof stored.upiId === 'string' ? stored.upiId.trim() : '',
    upiInstructions: typeof stored.upiInstructions === 'string' ? stored.upiInstructions.trim() : '',
  };
}

export function serializePaymentConfig(input: Partial<PaymentConfig> | null | undefined): string {
  const config = { ...DEFAULT_PAYMENT_CONFIG, ...(input || {}) };
  return JSON.stringify({
    online: !!config.online,
    upi: !!config.upi,
    cod: !!config.cod,
    stripe: !!config.stripe,
    upiId: String(config.upiId || '').trim(),
    upiInstructions: String(config.upiInstructions || '').trim(),
  });
}

/** Razorpay can only take payments when both server-side keys are present. */
export function isRazorpayConfigured(): boolean {
  return !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

/** Stripe can only take payments when its secret key is present. */
export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

/**
 * Methods a customer can actually choose right now, in display order.
 * India: Razorpay, UPI and COD. Elsewhere: Stripe (cards, charged in their currency).
 */
export function availablePaymentMethods(config: PaymentConfig, country = 'IN'): PaymentMethodId[] {
  const methods: PaymentMethodId[] = [];
  if (country !== 'IN') {
    if (config.stripe && isStripeConfigured()) methods.push('STRIPE');
    return methods;
  }
  if (config.online && isRazorpayConfigured()) methods.push('RAZORPAY');
  if (config.upi && config.upiId) methods.push('UPI');
  if (config.cod) methods.push('COD');
  return methods;
}
