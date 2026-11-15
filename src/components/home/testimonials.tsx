'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Quote, Star } from 'lucide-react';
import { useSettings, useShopType } from '@/lib/settings-context';
import { DEFAULT_TESTIMONIALS, type TestimonialsDesign } from '@/lib/layout-settings';

export interface TestimonialItem {
  id?: string;
  name: string;
  location?: string | null;
  avatar?: string | null;
  rating: number;
  text: string;
  product?: string | null;
}

const fallback: TestimonialItem[] = [
  { name: 'Priya M.', location: 'Mumbai', avatar: '👩', rating: 5, text: 'Ordered a soft toy for my 8-month-old and it arrived in 2 days. The quality is amazing — super soft and safe. My baby absolutely loves it!', product: 'Soft Bunny Plush' },
  { name: 'Rahul S.', location: 'Bangalore', avatar: '👨', rating: 5, text: 'Best baby store online. The feeding set I ordered was exactly as described. Packaging was secure and delivery was fast. Will definitely order again.', product: 'Feeding Starter Kit' },
  { name: 'Anita K.', location: 'Delhi', avatar: '👩‍👧', rating: 5, text: 'I was skeptical about ordering baby products online but this store changed my mind. Great quality, genuine products, and excellent customer support.', product: 'Baby Accessories Set' },
  { name: 'Deepak R.', location: 'Pune', avatar: '👨‍👦', rating: 4, text: 'The diaper bag I ordered is spacious and well-made. Looks exactly like the photos. Free shipping above ₹499 is a great deal. Highly recommend!', product: 'Diaper Bag Deluxe' },
];

const BG = {
  soft: 'bg-[#F7F7F5] text-gray-900',
  white: 'bg-white text-gray-900',
  brand: 'bg-primary-50 text-gray-900',
  dark: 'bg-gray-900 text-white',
};

const GRID_COLS = { 2: 'md:grid-cols-2', 3: 'md:grid-cols-2 lg:grid-cols-3', 4: 'md:grid-cols-2 lg:grid-cols-4' };
const WALL_COLS = { 2: 'sm:columns-2', 3: 'sm:columns-2 lg:columns-3', 4: 'sm:columns-2 lg:columns-4' };
const SLIDE_W = { 2: 'w-[85%] sm:w-[60%] lg:w-[calc(50%-10px)]', 3: 'w-[85%] sm:w-[48%] lg:w-[calc(33.333%-14px)]', 4: 'w-[85%] sm:w-[48%] lg:w-[calc(25%-15px)]' };

/**
 * Homepage reviews. Layout comes from Admin → Testimonials → Design (settings.layout.testimonials);
 * `design` and `initial` let the admin preview render unsaved changes.
 */
export function TestimonialsSection({ initial, design: override }: { initial?: TestimonialItem[]; design?: TestimonialsDesign } = {}) {
  const { settings } = useSettings();
  const type = useShopType();
  const design = override || settings.layout?.testimonials || DEFAULT_TESTIMONIALS;
  const title = design.title || type.copy.reviewsTitle;
  // Sample reviews only suit the baby store they were written for; other shops hide the section until they have reviews.
  const samples = type.id === 'baby' ? fallback : [];
  const [items, setItems] = useState<TestimonialItem[]>(initial ?? []);

  useEffect(() => {
    if (initial) { setItems(initial); return; }
    fetch('/api/testimonials')
      .then((r) => r.json())
      .then((d) => setItems(d.testimonials?.length ? d.testimonials : samples))
      .catch(() => setItems(samples));
  }, [initial]);

  const all = items.length >= 2 || override || samples.length === 0 ? items : samples;
  const shown = all.slice(0, design.limit);
  if (shown.length === 0) return null;

  const dark = design.background === 'dark';
  const avg = all.reduce((n, t) => n + (Number(t.rating) || 0), 0) / all.length;
  const center = design.align === 'center';

  return (
    <section className={`py-14 md:py-20 ${BG[design.background]}`}>
      <div className="content-container">
        <div className={`mb-10 ${center ? 'text-center' : 'text-left'}`}>
          {design.eyebrow && <p className="mb-1 text-sm font-semibold uppercase tracking-wider text-primary-500">{design.eyebrow}</p>}
          {title && <h2 className="text-2xl font-bold md:text-3xl">{title}</h2>}
          {design.subtitle && <p className={`mt-2 ${dark ? 'text-white/70' : 'text-gray-500'} ${center ? 'mx-auto' : ''} max-w-2xl`}>{design.subtitle}</p>}
          {design.showSummary && all.length > 0 && (
            <div className={`mt-3 flex items-center gap-2 ${center ? 'justify-center' : ''}`}>
              <Stars rating={Math.round(avg)} size="h-5 w-5" dark={dark} />
              <span className={`text-sm font-medium ${dark ? 'text-white/80' : 'text-gray-600'}`}>
                {avg.toFixed(1)} out of 5 · {all.length} review{all.length === 1 ? '' : 's'}
              </span>
            </div>
          )}
        </div>

        {design.style === 'spotlight' ? (
          <Spotlight items={shown} design={design} />
        ) : design.style === 'carousel' ? (
          <Carousel items={shown} design={design} />
        ) : design.style === 'wall' ? (
          <div className={`columns-1 gap-5 ${WALL_COLS[design.columns]}`}>
            {shown.map((t, i) => <div key={t.id || i} className="mb-5 break-inside-avoid"><Card t={t} design={{ ...design, clamp: false }} /></div>)}
          </div>
        ) : (
          <div className={`grid gap-5 ${GRID_COLS[design.columns]}`}>
            {shown.map((t, i) => <Card key={t.id || i} t={t} design={design} />)}
          </div>
        )}
      </div>
    </section>
  );
}

function Stars({ rating, size = 'h-3.5 w-3.5', dark = false }: { rating: number; size?: string; dark?: boolean }) {
  return (
    <div className="flex" aria-label={`${rating} out of 5 stars`}>
      {[0, 1, 2, 3, 4].map((j) => (
        <Star key={j} className={`${size} ${j < rating ? 'fill-yellow-400 text-yellow-400' : dark ? 'text-white/20' : 'text-gray-200'}`} />
      ))}
    </div>
  );
}

function Avatar({ t, size = 'h-10 w-10 text-xl' }: { t: TestimonialItem; size?: string }) {
  const [broken, setBroken] = useState(false);
  const isUrl = t.avatar?.startsWith('http') && !broken;
  return (
    <span className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-100 font-semibold text-primary-700 ${size}`}>
      {isUrl ? <img src={t.avatar!} alt="" className="h-full w-full object-cover" onError={() => setBroken(true)} /> : t.avatar && !t.avatar.startsWith('http') ? t.avatar : t.name.charAt(0).toUpperCase()}
    </span>
  );
}

function cardClass(design: TestimonialsDesign) {
  const dark = design.background === 'dark';
  if (design.style === 'quotes') return 'p-1';
  if (dark) return { shadow: 'bg-white/[0.06] shadow-lg', border: 'ring-1 ring-white/15', flat: 'bg-white/[0.06]' }[design.card] + ' rounded-2xl p-6';
  return {
    shadow: 'bg-white shadow-sm hover:shadow-md transition-shadow',
    border: 'bg-white ring-1 ring-gray-200',
    flat: design.background === 'white' ? 'bg-[#F7F7F5]' : 'bg-white/70',
  }[design.card] + ' rounded-2xl p-6';
}

function Card({ t, design }: { t: TestimonialItem; design: TestimonialsDesign }) {
  const dark = design.background === 'dark';
  const quotes = design.style === 'quotes';
  const person = (
    <div className="flex items-center gap-3">
      {design.showAvatar && <Avatar t={t} />}
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{t.name}</p>
        {design.showLocation && t.location && <p className={`truncate text-xs ${dark ? 'text-white/60' : 'text-gray-400'}`}>{t.location}</p>}
      </div>
    </div>
  );

  return (
    <figure className={`flex h-full flex-col ${cardClass(design)}`}>
      {quotes ? <Quote className="mb-3 h-8 w-8 fill-primary-200 text-primary-200" /> : <div className="mb-4">{person}</div>}
      {design.showRating && <div className="mb-2.5"><Stars rating={t.rating} dark={dark} /></div>}
      <blockquote className={`flex-1 leading-relaxed ${quotes ? 'text-base md:text-lg' : 'text-sm'} ${dark ? 'text-white/85' : 'text-gray-600'} ${design.clamp ? 'line-clamp-5' : ''}`}>
        &ldquo;{t.text}&rdquo;
      </blockquote>
      {design.showProduct && t.product && <p className="mt-3 text-xs font-medium text-primary-500">Purchased: {t.product}</p>}
      {quotes && <figcaption className="mt-4">{person}</figcaption>}
    </figure>
  );
}

function useAutoplay(enabled: boolean, seconds: number, step: () => void) {
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (!enabled || !seconds || paused) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => { if (!document.hidden) step(); }, seconds * 1000);
    return () => clearInterval(t);
  }, [enabled, seconds, paused, step]);
  return { onMouseEnter: () => setPaused(true), onMouseLeave: () => setPaused(false), onFocus: () => setPaused(true), onBlur: () => setPaused(false) };
}

function NavButton({ dir, onClick, dark }: { dir: -1 | 1; onClick: () => void; dark: boolean }) {
  const Icon = dir < 0 ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={dir < 0 ? 'Previous reviews' : 'More reviews'}
      className={`flex h-10 w-10 items-center justify-center rounded-full shadow-sm transition ${dark ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-white text-gray-700 ring-1 ring-gray-200 hover:text-primary-600'}`}
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}

function Carousel({ items, design }: { items: TestimonialItem[]; design: TestimonialsDesign }) {
  const ref = useRef<HTMLDivElement>(null);
  const dark = design.background === 'dark';
  const scroll = useCallback((dir: -1 | 1) => {
    const el = ref.current;
    if (!el) return;
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
    if (dir > 0 && atEnd) el.scrollTo({ left: 0, behavior: 'smooth' });
    else el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: 'smooth' });
  }, []);
  const step = useCallback(() => scroll(1), [scroll]);
  const hover = useAutoplay(items.length > 1, design.autoplay, step);

  return (
    <div {...hover}>
      <div ref={ref} className="-mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-px-4 px-4 pb-2 md:mx-0 md:scroll-px-0 md:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((t, i) => (
          <div key={t.id || i} className={`shrink-0 snap-start ${SLIDE_W[design.columns]}`}><Card t={t} design={design} /></div>
        ))}
      </div>
      {items.length > 1 && (
        <div className={`mt-6 flex gap-2 ${design.align === 'center' ? 'justify-center' : ''}`}>
          <NavButton dir={-1} onClick={() => scroll(-1)} dark={dark} />
          <NavButton dir={1} onClick={() => scroll(1)} dark={dark} />
        </div>
      )}
    </div>
  );
}

function Spotlight({ items, design }: { items: TestimonialItem[]; design: TestimonialsDesign }) {
  const [current, setCurrent] = useState(0);
  const n = items.length;
  const step = useCallback(() => setCurrent((c) => (c + 1) % n), [n]);
  const hover = useAutoplay(n > 1, design.autoplay, step);
  const dark = design.background === 'dark';
  const t = items[Math.min(current, n - 1)];

  return (
    <div className="mx-auto max-w-3xl text-center" {...hover}>
      <div className={`relative ${design.card === 'flat' || design.card === 'border' || design.card === 'shadow' ? cardClass({ ...design, style: 'cards' }) : ''} px-6 py-10 md:px-14 md:py-14`}>
        <Quote className="mx-auto mb-5 h-10 w-10 fill-primary-200 text-primary-200" />
        {design.showRating && <div className="mb-4 flex justify-center"><Stars rating={t.rating} size="h-5 w-5" dark={dark} /></div>}
        <blockquote key={current} className={`text-lg font-medium leading-relaxed md:text-2xl ${dark ? 'text-white' : 'text-gray-800'}`}>
          &ldquo;{t.text}&rdquo;
        </blockquote>
        <div className="mt-6 flex flex-col items-center gap-1">
          <p className="font-semibold">{t.name}{design.showLocation && t.location && <span className={`font-normal ${dark ? 'text-white/60' : 'text-gray-400'}`}> · {t.location}</span>}</p>
          {design.showProduct && t.product && <p className="text-xs font-medium text-primary-500">Purchased: {t.product}</p>}
        </div>
      </div>
      {n > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3">
          {design.showAvatar ? (
            items.map((x, i) => (
              <button
                key={x.id || i}
                type="button"
                onClick={() => setCurrent(i)}
                aria-label={`Review by ${x.name}`}
                aria-current={i === current}
                className={`rounded-full transition ${i === current ? 'scale-110 ring-2 ring-primary-500 ring-offset-2' : 'opacity-60 hover:opacity-100'} ${dark ? 'ring-offset-gray-900' : ''}`}
              >
                <Avatar t={x} size="h-11 w-11 text-xl" />
              </button>
            ))
          ) : (
            <>
              <NavButton dir={-1} onClick={() => setCurrent((c) => (c - 1 + n) % n)} dark={dark} />
              <span className={`text-sm ${dark ? 'text-white/70' : 'text-gray-500'}`}>{current + 1} / {n}</span>
              <NavButton dir={1} onClick={step} dark={dark} />
            </>
          )}
        </div>
      )}
    </div>
  );
}
