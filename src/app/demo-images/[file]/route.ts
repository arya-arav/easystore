import { categoryEmoji } from '@/lib/shop-types';

// Demo product pictures, drawn on the fly: a soft gradient with the category's emoji.
// URL: /demo-images/<type>.<category-slug>-<n>.svg (no storage needed, works on every host).

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

export async function GET(_req: Request, props: { params: Promise<{ file: string }> }) {
  const { file } = await props.params;
  // <type>.<category-slug>-<n>.svg (type optional)
  const m = /^(?:([a-z]+)\.)?([a-z0-9-]+?)-(\d+)\.svg$/.exec(file);
  if (!m) return new Response('Not found', { status: 404 });
  const [, typeId, slug, n] = m;
  const emoji = categoryEmoji(slug, '🛍️', typeId);
  const hue = (hash(slug) + Number(n) * 47) % 360;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="hsl(${hue},70%,94%)"/>
      <stop offset="1" stop-color="hsl(${(hue + 40) % 360},65%,84%)"/>
    </linearGradient>
  </defs>
  <rect width="800" height="800" fill="url(#g)"/>
  <circle cx="400" cy="400" r="${210 + (Number(n) % 3) * 15}" fill="white" fill-opacity="0.55"/>
  <text x="400" y="400" font-size="260" text-anchor="middle" dominant-baseline="central">${emoji}</text>
  <text x="400" y="740" font-family="system-ui,sans-serif" font-size="28" font-weight="600" letter-spacing="6" text-anchor="middle" fill="hsl(${hue},35%,40%)" fill-opacity="0.6">DEMO</text>
</svg>`;
  return new Response(svg, {
    headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=31536000, immutable' },
  });
}
