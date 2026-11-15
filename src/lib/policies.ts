// Store policies (Admin → Settings → Policies), kept as JSON in SiteSettings.policies.

export interface StorePolicies {
  returnWindowDays: number;   // 0 = no returns
  giftWrapCharge: number;     // INR
  codFee: number;             // INR added when paying cash on delivery
  returnReasons: string[];
  refundReasons: string[];
}

export const DEFAULT_POLICIES: StorePolicies = {
  returnWindowDays: 7,
  giftWrapCharge: 49,
  codFee: 0,
  returnReasons: ['Wrong size', 'Damaged or faulty', 'Not as described', 'Wrong item sent', 'Changed my mind', 'Other'],
  refundReasons: ['Returned items', 'Damaged or faulty', 'Missing item', 'Order cancelled', 'Late delivery', 'Goodwill', 'Other'],
};

const n = (v: unknown, fallback: number, max = 100000) => {
  const x = Number(v);
  return v === '' || v === null || v === undefined || !Number.isFinite(x) ? fallback : Math.min(max, Math.max(0, x));
};
const list = (v: unknown, fallback: string[]) => {
  const items = Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean).slice(0, 30) : [];
  return items.length ? Array.from(new Set(items)) : fallback;
};

export function parsePolicies(raw: unknown): StorePolicies {
  let s: Record<string, unknown> = {};
  if (typeof raw === 'string') {
    try { s = JSON.parse(raw) || {}; } catch { s = {}; }
  } else if (raw && typeof raw === 'object') s = raw as Record<string, unknown>;
  return {
    returnWindowDays: Math.round(n(s.returnWindowDays, DEFAULT_POLICIES.returnWindowDays, 365)),
    giftWrapCharge: n(s.giftWrapCharge, DEFAULT_POLICIES.giftWrapCharge),
    codFee: n(s.codFee, DEFAULT_POLICIES.codFee),
    returnReasons: list(s.returnReasons, DEFAULT_POLICIES.returnReasons),
    refundReasons: list(s.refundReasons, DEFAULT_POLICIES.refundReasons),
  };
}

/** Rewrites "7-day"/"7 days" style wording in static copy to the store's return window. */
export function withReturnWindow(text: string, days: number) {
  return text.replace(/\b7([- ])(day|Day|days)\b/g, `${days}$1$2`);
}
