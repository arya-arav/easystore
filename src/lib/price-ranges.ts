// Price filter ranges, in INR (what the products API filters on).
export const PRICE_RANGES = ['0-500', '500-1000', '1000-2000', '2000-5000', '5000-'];

/** "Under ₹500", "$6 – $12", "Above €55": a range label in the shopper's currency. */
export function priceRangeLabel(value: string, format: (inr: number) => string): string {
  const [min, max] = value.split('-').map((v) => (v ? Number(v) : null));
  if (!min && max) return `Under ${format(max)}`;
  if (min && !max) return `Above ${format(min)}`;
  return `${format(min || 0)} – ${format(max || 0)}`;
}
