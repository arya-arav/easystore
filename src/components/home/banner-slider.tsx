'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { SmartImage } from '@/components/ui/smart-image';
import {
  DEFAULT_PLACEMENTS, HEIGHTS,
  type BannerPosition, type PlacementSettings, type StoreBanner,
} from '@/lib/banners';

type Device = 'desktop' | 'mobile';

interface BannerSliderProps {
  position: BannerPosition;
  /** Banners already fetched on the server; skips the browser request. */
  initialBanners?: StoreBanner[];
  initialPlacement?: PlacementSettings;
  /** Category/product pages: hides banners limited to other categories. */
  categorySlugs?: string[];
  /** Already inside a page container: skip the extra width wrapper. */
  nested?: boolean;
  className?: string;
}

/** Live banners for a position, laid out the way the admin chose for that position. */
export function BannerSlider({ position, initialBanners, initialPlacement, categorySlugs, nested = false, className = '' }: BannerSliderProps) {
  const [data, setData] = useState<{ banners: StoreBanner[]; placement: PlacementSettings } | null>(
    initialBanners ? { banners: initialBanners, placement: initialPlacement || DEFAULT_PLACEMENTS[position] } : null
  );

  useEffect(() => {
    if (initialBanners) return;
    fetch(`/api/banners?position=${position}`)
      .then((r) => r.json())
      .then((d) => setData({ banners: d.banners || [], placement: d.placement || DEFAULT_PLACEMENTS[position] }))
      .catch(() => setData({ banners: [], placement: DEFAULT_PLACEMENTS[position] }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position]);

  if (!data) return null;
  const banners = data.banners.filter((b) => !categorySlugs || b.design.categories.length === 0 || b.design.categories.some((c) => categorySlugs.includes(c)));
  if (banners.length === 0) return null;
  return <BannerView banners={banners} placement={data.placement} className={className} nested={nested} priority={position === 'HOMEPAGE_HERO'} />;
}

/* ── Layout ──────────────────────────────────────────────────── */

/**
 * Renders banners with a placement layout. `device` forces the phone or desktop look
 * (used by the admin preview); without it the layout is responsive.
 */
export function BannerView({ banners, placement, device, className = '', priority = false, nested = false }: {
  banners: StoreBanner[];
  placement: PlacementSettings;
  device?: Device;
  nested?: boolean;
  className?: string;
  priority?: boolean;
}) {
  const contained = placement.width === 'contained';
  const wrap = contained && !nested ? `content-container ${device ? 'py-3' : 'py-3 md:py-5'}` : '';
  const many = banners.length > 1;
  const display = many ? placement.display : 'carousel';

  let body: React.ReactNode;
  if (display === 'grid') {
    const cols = device === 'mobile' ? 'grid-cols-1' : device === 'desktop' ? (placement.columns === 3 ? 'grid-cols-3' : 'grid-cols-2') : placement.columns === 3 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2';
    body = (
      <div className={`grid gap-3 md:gap-4 ${cols}`}>
        {banners.map((b, i) => <Slide key={b.id} banner={b} placement={placement} device={device} tile eager={priority && i < 3} />)}
      </div>
    );
  } else if (display === 'peek') {
    body = <Peek banners={banners} placement={placement} device={device} priority={priority} />;
  } else {
    body = <Rotator banners={banners} placement={placement} device={device} fade={display === 'fade'} priority={priority} />;
  }

  return <section aria-label="Promotions" className={`${wrap} ${className}`}>{body}</section>;
}

/** Autoplay timer that pauses on hover/focus, in background tabs and for reduced motion. */
function useAutoplay(count: number, seconds: number, advance: () => void) {
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (count <= 1 || !seconds || paused) return;
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => { if (!document.hidden) advance(); }, seconds * 1000);
    return () => clearInterval(t);
  }, [count, seconds, paused, advance]);
  return { onMouseEnter: () => setPaused(true), onMouseLeave: () => setPaused(false), onFocus: () => setPaused(true), onBlur: () => setPaused(false) };
}

/** One banner at a time: slides sideways or cross-fades. */
function Rotator({ banners, placement, device, fade, priority }: { banners: StoreBanner[]; placement: PlacementSettings; device?: Device; fade: boolean; priority: boolean }) {
  const [current, setCurrent] = useState(0);
  const n = banners.length;
  const go = useCallback((i: number) => setCurrent(((i % n) + n) % n), [n]);
  const next = useCallback(() => setCurrent((c) => (c + 1) % n), [n]);
  const hover = useAutoplay(n, placement.autoplay, next);
  const touch = useRef<number | null>(null);
  const radius = placement.rounded ? 'rounded-2xl' : '';

  return (
    <div
      className={`group/banner relative overflow-hidden ${radius}`}
      {...hover}
      onTouchStart={(e) => { touch.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (touch.current === null) return;
        const dx = e.changedTouches[0].clientX - touch.current;
        if (Math.abs(dx) > 40) go(current + (dx < 0 ? 1 : -1));
        touch.current = null;
      }}
    >
      {fade ? (
        <div className="grid">
          {banners.map((b, i) => (
            <div key={b.id} aria-hidden={i !== current} className={`[grid-area:1/1] transition-opacity duration-700 ${i === current ? 'opacity-100' : 'pointer-events-none opacity-0'}`}>
              <Slide banner={b} placement={placement} device={device} eager={priority && i === 0} />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-start transition-transform duration-700 ease-out" style={{ transform: `translateX(-${current * 100}%)` }}>
          {banners.map((b, i) => (
            <div key={b.id} aria-hidden={i !== current} className="w-full shrink-0">
              <Slide banner={b} placement={placement} device={device} eager={priority && i === 0} />
            </div>
          ))}
        </div>
      )}
      {n > 1 && placement.arrows && (
        <>
          <Arrow side="left" onClick={() => go(current - 1)} />
          <Arrow side="right" onClick={() => go(current + 1)} />
        </>
      )}
      {n > 1 && placement.dots && <Dots count={n} current={current} onPick={go} />}
    </div>
  );
}

/** Swipeable row where the next banner peeks in at the edge. */
function Peek({ banners, placement, device, priority }: { banners: StoreBanner[]; placement: PlacementSettings; device?: Device; priority: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);
  const n = banners.length;

  const scrollTo = useCallback((i: number) => {
    const el = ref.current;
    if (!el) return;
    const target = ((i % n) + n) % n;
    const child = el.children[target] as HTMLElement | undefined;
    if (child) el.scrollTo({ left: child.offsetLeft - el.offsetLeft, behavior: 'smooth' });
  }, [n]);
  const next = useCallback(() => scrollTo(current + 1), [scrollTo, current]);
  const hover = useAutoplay(n, placement.autoplay, next);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => {
      const kids = Array.from(el.children) as HTMLElement[];
      const left = el.scrollLeft;
      let best = 0;
      kids.forEach((k, i) => { if (Math.abs(k.offsetLeft - el.offsetLeft - left) < Math.abs(kids[best].offsetLeft - el.offsetLeft - left)) best = i; });
      setCurrent(best);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const width = device === 'mobile' ? 'w-[86%]' : device === 'desktop' ? 'w-[78%]' : 'w-[86%] md:w-[78%]';
  return (
    <div className="group/banner relative" {...hover}>
      <div ref={ref} className="flex snap-x snap-mandatory gap-3 overflow-x-auto md:gap-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {banners.map((b, i) => (
          <div key={b.id} className={`${width} shrink-0 snap-start`}>
            <Slide banner={b} placement={{ ...placement, rounded: placement.rounded || placement.width === 'full' }} device={device} eager={priority && i < 2} roundEach />
          </div>
        ))}
      </div>
      {placement.arrows && (
        <>
          {current > 0 && <Arrow side="left" onClick={() => scrollTo(current - 1)} />}
          {current < n - 1 && <Arrow side="right" onClick={() => scrollTo(current + 1)} />}
        </>
      )}
      {placement.dots && <Dots count={n} current={current} onPick={scrollTo} below />}
    </div>
  );
}

function Arrow({ side, onClick }: { side: 'left' | 'right'; onClick: () => void }) {
  const Icon = side === 'left' ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={(e) => { e.preventDefault(); onClick(); }}
      aria-label={side === 'left' ? 'Previous banner' : 'Next banner'}
      className={`absolute top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-gray-800 shadow-md backdrop-blur transition hover:bg-white md:h-11 md:w-11 md:opacity-0 md:group-hover/banner:opacity-100 focus-visible:opacity-100 ${side === 'left' ? 'left-3' : 'right-3'}`}
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}

function Dots({ count, current, onPick, below = false }: { count: number; current: number; onPick: (i: number) => void; below?: boolean }) {
  return (
    <div className={below ? 'mt-3 flex justify-center gap-1.5' : 'absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5'}>
      {Array.from({ length: count }, (_, i) => (
        <button
          key={i}
          type="button"
          onClick={(e) => { e.preventDefault(); onPick(i); }}
          aria-label={`Show banner ${i + 1}`}
          aria-current={i === current}
          className={`h-2 rounded-full transition-all ${i === current ? 'w-6' : 'w-2'} ${below ? (i === current ? 'bg-primary-500' : 'bg-gray-300') : i === current ? 'bg-white' : 'bg-white/55'}`}
        />
      ))}
    </div>
  );
}

/* ── One banner ──────────────────────────────────────────────── */

const X_ALIGN = { left: 'items-start text-left', center: 'items-center text-center', right: 'items-end text-right' };
const Y_ALIGN = { top: 'justify-start', middle: 'justify-center', bottom: 'justify-end' };

function overlayClass(design: StoreBanner['design']) {
  if (design.overlay === 'none') return '';
  const strong = design.overlay === 'strong';
  const c = design.textTone === 'light' ? (strong ? 'from-black/70' : 'from-black/45') : strong ? 'from-white/85' : 'from-white/60';
  if (design.textX === 'center') return design.textTone === 'light' ? (strong ? 'bg-black/45' : 'bg-black/25') : strong ? 'bg-white/60' : 'bg-white/35';
  return `${design.textX === 'left' ? 'bg-gradient-to-r' : 'bg-gradient-to-l'} ${c} to-transparent`;
}

function Slide({ banner, placement, device, tile = false, eager = false, roundEach = false }: {
  banner: StoreBanner;
  placement: PlacementSettings;
  device?: Device;
  tile?: boolean;
  eager?: boolean;
  roundEach?: boolean;
}) {
  const d = banner.design;
  const h = HEIGHTS[placement.height];
  const fit = placement.height === 'fit';
  const ratio = fit ? '' : tile ? h.tile : device === 'mobile' ? h.mobile : device === 'desktop' ? h.wide : `${h.mobile} ${h.desktop}`;
  const radius = (tile || roundEach) && (placement.rounded || tile) ? 'rounded-2xl' : '';
  const compact = tile || placement.height === 'slim' || placement.height === 'short';
  const light = d.textTone === 'light';
  const big = device === 'mobile' ? false : !compact;
  const mobileSrc = d.mobileImage || banner.image;
  const sizes = tile ? '(min-width: 768px) 50vw, 100vw' : '100vw';

  const picture = fit ? (
    // Natural size: the whole picture shows, nothing is cropped.
    device ? (
      <img src={device === 'mobile' ? mobileSrc : banner.image} alt={banner.title} className="block h-auto w-full" />
    ) : (
      <picture>
        {d.mobileImage && <source media="(max-width: 767px)" srcSet={d.mobileImage} />}
        <img src={banner.image} alt={banner.title} loading={eager ? 'eager' : 'lazy'} className="block h-auto w-full" />
      </picture>
    )
  ) : device ? (
    <SmartImage src={device === 'mobile' ? mobileSrc : banner.image} alt={banner.title} sizes={sizes} priority={eager} />
  ) : d.mobileImage && !tile ? (
    <>
      <span className="md:hidden"><SmartImage src={d.mobileImage} alt={banner.title} sizes="100vw" priority={eager} /></span>
      <span className="hidden md:block"><SmartImage src={banner.image} alt={banner.title} sizes={sizes} priority={eager} /></span>
    </>
  ) : (
    <SmartImage src={banner.image} alt={banner.title} sizes={sizes} priority={eager} />
  );

  const hasText = d.showText && (banner.title || banner.subtitle || d.badge || d.buttonText);
  const content = (
    <div className={`relative w-full overflow-hidden bg-gray-100 ${ratio} ${radius}`}>
      {picture}
      {hasText && (
        <div className={`absolute inset-0 flex flex-col gap-1.5 ${X_ALIGN[d.textX]} ${Y_ALIGN[d.textY]} ${overlayClass(d)} ${compact || device === 'mobile' ? 'p-4 sm:p-6' : 'p-6 md:p-12 lg:px-16'}`}>
          <div className={`flex max-w-xl flex-col gap-1.5 md:gap-2 ${X_ALIGN[d.textX]} ${light ? 'text-white' : 'text-gray-900'}`}>
            {d.badge && (
              <span className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${light ? 'bg-white/90 text-gray-900' : 'bg-gray-900 text-white'}`}>{d.badge}</span>
            )}
            {banner.title && (
              <h2 className={`font-display font-bold leading-tight ${light ? 'drop-shadow-md' : ''} ${big ? 'text-2xl sm:text-3xl md:text-5xl' : 'text-lg sm:text-xl md:text-2xl'}`}>{banner.title}</h2>
            )}
            {banner.subtitle && (
              <p className={`${light ? 'text-white/90 drop-shadow' : 'text-gray-700'} ${big ? 'text-sm md:text-lg' : 'text-xs sm:text-sm'} line-clamp-2`}>{banner.subtitle}</p>
            )}
            {d.buttonText && (
              <span className={`mt-1.5 inline-flex items-center rounded-full font-semibold shadow-sm transition group-hover/slide:scale-[1.03] ${big ? 'px-6 py-2.5 text-sm md:mt-3 md:px-7 md:py-3' : 'px-4 py-1.5 text-xs sm:text-sm'} ${light ? 'bg-white text-gray-900' : 'bg-gray-900 text-white'}`}>
                {d.buttonText}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );

  if (!banner.link) return content;
  const external = /^https?:\/\//.test(banner.link);
  return external || d.newTab ? (
    <a href={banner.link} target={d.newTab ? '_blank' : undefined} rel={d.newTab ? 'noopener noreferrer' : undefined} className="group/slide block">{content}</a>
  ) : (
    <Link href={banner.link} className="group/slide block">{content}</Link>
  );
}
