import { prisma } from '@/lib/prisma';

// Typo-tolerant fallback for product search ("tedy bera" finds "teddy bear"). Used only
// when the normal text search finds nothing, so it scans a light list of active products.

const words = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);

/** Edit distance where swapping two neighbouring letters counts as one typo ("bera" → "bear"). */
function distance(a: string, b: string) {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

/** How well one typed word matches one product word (1 = same, 0 = no match). */
function wordScore(typed: string, word: string) {
  if (word.startsWith(typed)) return 1;
  if (typed[0] !== word[0]) return 0; // typos rarely hit the first letter
  const allowed = typed.length <= 3 ? 0 : typed.length <= 7 ? 1 : 2;
  // Compare with the word, or its start when the shopper typed only part of it
  const d = Math.min(distance(typed, word), distance(typed, word.slice(0, typed.length + 1)), distance(typed, word.slice(0, typed.length)));
  return d <= allowed ? 1 - d / (typed.length + 1) : 0;
}

export async function fuzzyProductIds(query: string, limit = 60): Promise<string[]> {
  const typed = words(query).filter((w) => w.length >= 2);
  if (!typed.length) return [];
  const products = await prisma.product.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, name: true, category: { select: { name: true } }, tags: { select: { name: true } } },
    take: 3000,
  });
  return products
    .map((p) => {
      const vocab = words([p.name, p.category?.name, ...p.tags.map((t) => t.name)].join(' '));
      const scores = typed.map((t) => Math.max(0, ...vocab.map((w) => wordScore(t, w))));
      return { id: p.id, score: scores.every((s) => s > 0) ? scores.reduce((a, b) => a + b, 0) / scores.length : 0 };
    })
    .filter((p) => p.score >= 0.5)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((p) => p.id);
}
