'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Tries each picture in turn (e.g. the category's own photo, then a product photo) and
 * shows `fallback` when none loads, so a broken link never shows the browser's icon.
 */
export function FallbackImage({ sources, className, fallback, alt = '' }: { sources: (string | null | undefined)[]; className?: string; fallback: React.ReactNode; alt?: string }) {
  const list = sources.filter((s): s is string => !!s);
  const [index, setIndex] = useState(0);
  const ref = useRef<HTMLImageElement>(null);

  // A picture can fail before the page's scripts run, so its error event is missed;
  // check once mounted (and after each switch) whether it actually loaded.
  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) setIndex((i) => i + 1);
  }, [index]);

  if (index >= list.length) return <>{fallback}</>;
  return <img ref={ref} key={list[index]} src={list[index]} alt={alt} loading="lazy" onError={() => setIndex((i) => i + 1)} className={className} />;
}
