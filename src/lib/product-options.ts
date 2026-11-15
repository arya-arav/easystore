/** Products whose colours/sizes (stored as JSON text) need choosing before adding to cart. */
export function hasOptions(product: { colors?: string | null; sizes?: string | null }): boolean {
  const count = (raw?: string | null) => {
    if (!raw) return 0;
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.length : 0;
    } catch {
      return 0;
    }
  };
  return count(product.colors) > 0 || count(product.sizes) > 0;
}
