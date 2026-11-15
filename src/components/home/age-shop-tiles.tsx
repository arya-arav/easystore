'use client';

import Link from 'next/link';
import { useShopType } from '@/lib/settings-context';
import { useMoney } from '@/lib/currency-context';
import { PRICE_RANGES, priceRangeLabel } from '@/lib/price-ranges';

// Homepage "shop by" tiles under the categories. What they are depends on the shop type:
// baby ages, who it's for (men / women), or price bands.

const TONES = [
  { bg: '#FFF0F5', border: '#F9C8D9' },
  { bg: '#FFF8E7', border: '#F6E0A0' },
  { bg: '#F0FFF4', border: '#B2DFC0' },
  { bg: '#F0F4FF', border: '#B2C4F0' },
  { bg: '#FFF4F0', border: '#F0C4B2' },
  { bg: '#F5F0FF', border: '#C8B2F0' },
];

const AUDIENCE_EMOJI: Record<string, string> = { UNISEX: '✨', BOYS: '🧔', GIRLS: '👩' };
const PRICE_EMOJI = ['🪙', '💵', '💳', '💎', '👑'];

export function AgeShopTiles() {
  const type = useShopType();
  const { format: formatPrice } = useMoney();

  let tiles: { label: string; sub?: string; emoji: string; href: string }[] = [];
  if (type.shopBy.kind === 'age' && type.ages) {
    tiles = type.ages.map((a) => ({ label: a.label.split(' (')[0], sub: a.short, emoji: a.emoji, href: `/products?ageGroup=${a.value}` }));
  } else if (type.shopBy.kind === 'audience' && type.audience) {
    tiles = type.audience.options.map((o) => ({ label: o.label, emoji: AUDIENCE_EMOJI[o.value], href: `/products?gender=${o.value}` }));
  } else {
    tiles = PRICE_RANGES.map((r, i) => ({ label: priceRangeLabel(r, (n) => formatPrice(n)), emoji: PRICE_EMOJI[i] || '🛍️', href: `/products?price=${r}` }));
  }

  const cols = tiles.length <= 3 ? 'grid-cols-3' : tiles.length === 5 ? 'grid-cols-3 sm:grid-cols-5' : 'grid-cols-3 sm:grid-cols-6';

  return (
    <section className="py-10 bg-[#F7F7F5]">
      <div className="content-container">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-[#333333]">{type.shopBy.title}</h2>
          <p className="text-[#777777] mt-2">{type.shopBy.subtitle}</p>
        </div>
        <div className={`grid gap-3 md:gap-4 ${cols} ${tiles.length <= 3 ? 'mx-auto max-w-3xl' : ''}`}>
          {tiles.map((tile, i) => (
            <Link
              key={tile.href}
              href={tile.href}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all hover:scale-105 hover:shadow-md text-center"
              style={{ backgroundColor: TONES[i % TONES.length].bg, borderColor: TONES[i % TONES.length].border }}
            >
              <span className="text-3xl md:text-4xl">{tile.emoji}</span>
              <div>
                <p className="font-semibold text-[#333333] text-sm">{tile.label}</p>
                {tile.sub && <p className="text-xs text-[#777777]">{tile.sub}</p>}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
