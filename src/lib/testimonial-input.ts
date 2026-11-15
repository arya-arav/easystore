/** Validates an admin testimonial form. */
export function testimonialInput(data: any): { data: any } | { error: string } {
  const name = typeof data?.name === 'string' ? data.name.trim().slice(0, 80) : '';
  const text = typeof data?.text === 'string' ? data.text.trim().slice(0, 1000) : '';
  if (!name) return { error: 'Add the customer’s name' };
  if (!text) return { error: 'Add what the customer said' };
  const opt = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);
  return {
    data: {
      name,
      text,
      location: opt(data.location, 80),
      avatar: opt(data.avatar, 1000),
      product: opt(data.product, 120),
      rating: Math.min(5, Math.max(1, Math.round(Number(data.rating) || 5))),
      isActive: data.isActive !== false,
      sortOrder: Number.isFinite(Number(data.sortOrder)) ? Math.trunc(Number(data.sortOrder)) : 0,
    },
  };
}
