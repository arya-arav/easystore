'use client';

import { FallbackImage } from '@/components/ui/fallback-image';
import { categoryPictures } from '@/lib/category-picture';
import Link from 'next/link';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import type { HomeLayoutId } from '@/lib/layout-settings';
import { categoryEmoji } from '@/lib/shop-types';
import { useShopType } from '@/lib/settings-context';

interface HomeCategory {
  name: string;
  slug: string;
  image: string | null;
  cover?: string | null;
  count: number;
}

// Soft tile colours and fallback emoji for the classic style, picked by position or slug.
const TILE_COLORS = [
  { bg: 'bg-[#FFF0F5]', border: 'border-pink-100' },
  { bg: 'bg-[#FFF8E7]', border: 'border-yellow-100' },
  { bg: 'bg-[#F0FFF4]', border: 'border-green-100' },
  { bg: 'bg-[#F0F8FF]', border: 'border-blue-100' },
  { bg: 'bg-[#F5F0FF]', border: 'border-purple-100' },
  { bg: 'bg-[#FFF5F0]', border: 'border-orange-100' },
];
const BUBBLE_RINGS = ['ring-pink-300', 'ring-amber-300', 'ring-emerald-300', 'ring-sky-300', 'ring-violet-300', 'ring-orange-300'];
const EMOJI: Record<string, string> = {
  toys: '🧸', accessories: '🎀', 'feeding-nursing': '🍼', 'diapers-wipes': '🧷', 'baby-gear': '🚼',
  'nursery-furniture': '🏠', 'bath-skincare': '🛁', 'books-learning': '📚', 'health-safety': '🩺', 'party-gifts': '🎁',
};
const emojiFor = (slug: string, typeId?: string) => (typeId === 'baby' && EMOJI[slug]) || categoryEmoji(slug, '🛍️', typeId);
const countLabel = (n: number) => `${n} item${n === 1 ? '' : 's'}`;

function CategoryImage({ category, className, emojiClass = 'text-4xl' }: { category: HomeCategory; className: string; emojiClass?: string }) {
  const typeId = useShopType().id;
  return (
    <FallbackImage
      sources={categoryPictures(category.image, category.cover)}
      className={`${className} object-cover`}
      fallback={<span className={`${className} flex items-center justify-center ${emojiClass}`}>{emojiFor(category.slug, typeId)}</span>}
    />
  );
}

function SectionHeading({ eyebrow, title, align = 'left' }: { eyebrow?: string; title: string; align?: 'left' | 'center' }) {
  return (
    <div className={align === 'center' ? 'text-center' : ''}>
      {eyebrow && <p className="text-primary-600 text-sm font-semibold uppercase tracking-wider mb-1">{eyebrow}</p>}
      <h2 className="text-2xl md:text-3xl font-bold text-gray-900">{title}</h2>
    </div>
  );
}

/** Categories that have products, from Admin → Categories (order and images included). */
function useHomeCategories(initial?: HomeCategory[]) {
  const [categories, setCategories] = useState<HomeCategory[] | null>(initial ?? null);
  useEffect(() => {
    if (initial) return;
    fetch('/api/categories')
      .then((r) => r.json())
      .then((data: any[]) => {
        const list: HomeCategory[] = (Array.isArray(data) ? data : [])
          .filter((c) => !c.parentId)
          .map((c) => ({ name: c.name, slug: c.slug, image: c.image || null, cover: c.cover || null, count: c._count?.products ?? 0 }));
        const stocked = list.filter((c) => c.count > 0);
        // Empty categories are hidden; if nothing is stocked yet, show them all rather than nothing.
        setCategories(stocked.length > 0 ? stocked : list);
      })
      .catch(() => setCategories([]));
  }, []);
  return categories;
}

/** Photo card with the name over a dark fade; falls back to a light tile with the emoji. */
function BoutiqueCard({ category }: { category: HomeCategory }) {
  const typeId = useShopType().id;
  // Try the category's picture, then a product photo; the emoji tile if neither loads
  const sources = categoryPictures(category.image, category.cover).filter((s): s is string => !!s);
  const [tried, setTried] = useState(0);
  const hasPhoto = tried < sources.length;
  const imgRef = useRef<HTMLImageElement>(null);
  // Failed before the scripts ran? (its error event was missed)
  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) setTried((t) => t + 1);
  }, [tried]);
  return (
    <Link href={`/category/${category.slug}`} className={`group relative block overflow-hidden rounded-2xl aspect-[4/5] ${hasPhoto ? 'bg-gray-100' : 'bg-primary-50'}`}>
      {hasPhoto ? (
        <>
          <img ref={imgRef} key={sources[tried]} src={sources[tried]} alt="" loading="lazy" onError={() => setTried((t) => t + 1)} className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0" />
        </>
      ) : (
        <span className="absolute inset-0 flex items-center justify-center pb-12 text-7xl transition-transform duration-500 group-hover:scale-110">{emojiFor(category.slug, typeId)}</span>
      )}
      <div className={`absolute inset-x-0 bottom-0 p-4 md:p-5 ${hasPhoto ? 'text-white' : 'text-gray-900'}`}>
        <h3 className="font-display text-lg md:text-2xl font-bold">{category.name}</h3>
        <p className={`mt-0.5 flex items-center gap-1 text-sm ${hasPhoto ? 'text-white/80' : 'text-gray-500'}`}>
          {countLabel(category.count)} <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
        </p>
      </div>
    </Link>
  );
}

/** One horizontal row of category cards; scrolls sideways (with arrows on desktop) when there are many. */
function CategoryRow({ categories }: { categories: HomeCategory[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setEdges({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
    update();
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => { el.removeEventListener('scroll', update); window.removeEventListener('resize', update); };
  }, [categories.length]);

  const scrollBy = (dir: 1 | -1) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.8, behavior: 'smooth' });
  const arrow = 'absolute top-1/2 z-10 hidden -translate-y-1/2 md:flex h-11 w-11 items-center justify-center rounded-full bg-white text-gray-700 shadow-lg ring-1 ring-black/5 hover:text-primary-600 transition';

  return (
    <div className="relative">
      <div ref={ref} className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-2 md:mx-0 md:gap-5 md:scroll-px-0 md:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {categories.map((cat, i) => {
          const c = TILE_COLORS[i % TILE_COLORS.length];
          return (
            <Link key={cat.slug} href={`/category/${cat.slug}`} className={`group flex w-32 shrink-0 snap-start flex-col items-center gap-3 rounded-3xl border ${c.bg} ${c.border} p-3 text-center transition-all hover:shadow-lg sm:w-40 md:w-48 md:p-5`}>
              <CategoryImage category={cat} className="aspect-square w-full rounded-2xl bg-white/80 shadow-sm transition-transform group-hover:scale-[1.03]" emojiClass="text-4xl md:text-6xl" />
              <span className="min-w-0">
                <span className="block text-sm font-bold leading-tight text-gray-900 md:text-base">{cat.name}</span>
                <span className="mt-1 hidden items-center justify-center gap-1 text-sm text-gray-500 group-hover:text-primary-600 md:flex">
                  {countLabel(cat.count)} <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </span>
            </Link>
          );
        })}
      </div>
      {!edges.start && <button type="button" aria-label="Previous categories" onClick={() => scrollBy(-1)} className={`${arrow} -left-5`}><ChevronLeft className="h-5 w-5" /></button>}
      {!edges.end && <button type="button" aria-label="More categories" onClick={() => scrollBy(1)} className={`${arrow} -right-5`}><ChevronRight className="h-5 w-5" /></button>}
    </div>
  );
}

export function CategoriesSection({ variant = 'classic', initialCategories }: { variant?: HomeLayoutId; initialCategories?: HomeCategory[] }) {
  const categories = useHomeCategories(initialCategories);
  const type = useShopType();

  if (categories === null) {
    return (
      <section className="py-12">
        <div className="content-container grid grid-cols-3 md:grid-cols-6 gap-4 animate-pulse">
          {[...Array(6)].map((_, i) => <div key={i} className="h-28 rounded-2xl bg-gray-100" />)}
        </div>
      </section>
    );
  }
  if (categories.length === 0) return null;

  if (variant === 'minimal') {
    return (
      <section className="py-8 bg-white">
        <div className="content-container">
          <div className="flex gap-2.5 overflow-x-auto pb-1 md:flex-wrap md:justify-center md:overflow-visible [scrollbar-width:none]">
            {categories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/category/${cat.slug}`}
                className="flex shrink-0 items-center gap-2 rounded-full border border-gray-200 bg-white py-1.5 pl-1.5 pr-4 text-sm font-medium text-gray-700 hover:border-primary-400 hover:text-primary-600 transition-colors"
              >
                <CategoryImage category={cat} className="h-7 w-7 rounded-full" emojiClass="text-base" />
                {cat.name}
              </Link>
            ))}
            <Link href="/products" className="flex shrink-0 items-center gap-1.5 rounded-full bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors">
              All products <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    );
  }

  if (variant === 'spotlight') {
    return (
      <section className="py-14 md:py-16 bg-white">
        <div className="content-container">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Shop by Category</h2>
            <p className="text-gray-500 mt-1.5">{type.copy.categoriesSubtitle}</p>
          </div>
          <CategoryRow categories={categories} />
        </div>
      </section>
    );
  }

  if (variant === 'boutique') {
    return (
      <section className="py-16 md:py-20 bg-white">
        <div className="content-container">
          <div className="flex items-end justify-between mb-8 md:mb-10">
            <SectionHeading eyebrow="Collections" title="Shop by Category" />
            <Link href="/products" className="hidden md:inline-flex items-center gap-1.5 text-sm font-semibold text-gray-900 underline underline-offset-4 decoration-primary-300 hover:decoration-primary-500">
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className={`grid gap-4 md:gap-6 ${categories.length <= 2 ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-4'}`}>
            {categories.slice(0, 8).map((cat) => <BoutiqueCard key={cat.slug} category={cat} />)}
          </div>
        </div>
      </section>
    );
  }

  if (variant === 'playful') {
    return (
      <section className="py-14 md:py-16 bg-white">
        <div className="content-container">
          <SectionHeading eyebrow="Let's explore!" title="What are you shopping for?" align="center" />
          <div className="mt-8 flex gap-5 md:gap-8 overflow-x-auto pb-3 md:flex-wrap md:justify-center md:overflow-visible [scrollbar-width:none]">
            {categories.map((cat, i) => (
              <Link key={cat.slug} href={`/category/${cat.slug}`} className="group flex w-24 md:w-32 shrink-0 flex-col items-center text-center">
                <span className={`relative block h-24 w-24 md:h-32 md:w-32 rounded-full bg-white p-1.5 ring-4 ${BUBBLE_RINGS[i % BUBBLE_RINGS.length]} transition-transform duration-300 group-hover:-translate-y-1.5 group-hover:rotate-3`}>
                  <CategoryImage category={cat} className="h-full w-full rounded-full bg-primary-50" emojiClass="text-4xl md:text-5xl" />
                </span>
                <span className="mt-3 font-bold text-gray-900 text-sm md:text-base leading-tight">{cat.name}</span>
                <span className="text-xs text-gray-500">{countLabel(cat.count)}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-14 md:py-16 bg-[#F7F7F5]">
      <div className="content-container">
        <div className="flex items-end justify-between mb-8">
          <SectionHeading eyebrow="Browse" title="Shop by Category" />
          <Link href="/products" className="hidden md:flex items-center gap-1 text-[#7FAF8E] hover:text-[#6a9a79] font-medium text-sm">
            All Products <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 md:gap-4">
          {categories.slice(0, 12).map((cat, i) => {
            const c = TILE_COLORS[i % TILE_COLORS.length];
            return (
              <Link key={cat.slug} href={`/category/${cat.slug}`} className="group">
                <div className={`${c.bg} border ${c.border} rounded-2xl p-4 md:p-5 text-center transition-all duration-300 hover:shadow-md hover:-translate-y-1`}>
                  <CategoryImage category={cat} className="mx-auto mb-2.5 h-12 w-12 md:h-14 md:w-14 rounded-full group-hover:scale-110 transition-transform duration-300" emojiClass="text-4xl md:text-5xl" />
                  <h3 className="font-semibold text-gray-800 text-sm leading-tight">{cat.name}</h3>
                  <p className="text-[10px] text-gray-400 mt-0.5">{countLabel(cat.count)}</p>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="mt-6 md:hidden text-center">
          <Link href="/products" className="inline-flex items-center gap-2 px-5 py-2.5 border border-[#7FAF8E] text-[#7FAF8E] rounded-full text-sm font-medium hover:bg-[#7FAF8E] hover:text-white transition-colors">
            View All Products <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
