'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from 'lucide-react';

export interface LightboxImage {
  url: string;
  alt?: string | null;
}

interface ImageLightboxProps {
  images: LightboxImage[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  title?: string;
}

/** Full-screen photo viewer: arrows/keys/swipe to browse, click (or the button) to zoom and move to pan. */
export function ImageLightbox({ images, index, onIndexChange, onClose, title }: ImageLightboxProps) {
  const [zoomed, setZoomed] = useState(false);
  const [origin, setOrigin] = useState('50% 50%');
  const touchStart = useRef<number | null>(null);
  const count = images.length;

  const go = useCallback(
    (delta: number) => {
      setZoomed(false);
      onIndexChange((index + delta + count) % count);
    },
    [index, count, onIndexChange]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'ArrowRight') go(1);
    };
    document.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [go, onClose]);

  const pointAt = (e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setOrigin(`${((e.clientX - rect.left) / rect.width) * 100}% ${((e.clientY - rect.top) / rect.height) * 100}%`);
  };

  const image = images[index];
  if (!image) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black/95 text-white" role="dialog" aria-modal="true" aria-label={title ? `${title} photos` : 'Photos'}>
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-sm text-white/70">{count > 1 ? `${index + 1} / ${count}` : ''}</span>
        <div className="flex items-center gap-1">
          <button onClick={() => setZoomed((z) => !z)} aria-label={zoomed ? 'Zoom out' : 'Zoom in'} className="rounded-full p-2 hover:bg-white/10">
            {zoomed ? <ZoomOut className="w-5 h-5" /> : <ZoomIn className="w-5 h-5" />}
          </button>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-2 hover:bg-white/10">
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div
        className={`relative flex flex-1 items-center justify-center overflow-hidden ${zoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'}`}
        onClick={(e) => {
          pointAt(e);
          setZoomed((z) => !z);
        }}
        onMouseMove={(e) => zoomed && pointAt(e)}
        onTouchStart={(e) => { touchStart.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => {
          if (touchStart.current === null || zoomed) return;
          const dx = e.changedTouches[0].clientX - touchStart.current;
          if (Math.abs(dx) > 50 && count > 1) go(dx < 0 ? 1 : -1);
          touchStart.current = null;
        }}
      >
        <img
          src={image.url}
          alt={image.alt || title || ''}
          draggable={false}
          className="max-h-full max-w-full select-none object-contain transition-transform duration-200"
          style={{ transform: zoomed ? 'scale(2.2)' : 'scale(1)', transformOrigin: origin }}
        />

        {count > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); go(-1); }}
              aria-label="Previous photo"
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 hover:bg-white/20"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); go(1); }}
              aria-label="Next photo"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 hover:bg-white/20"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}
      </div>

      {count > 1 && (
        <div className="flex justify-center gap-2 overflow-x-auto px-4 py-3">
          {images.map((img, i) => (
            <button
              key={`${img.url}-${i}`}
              onClick={() => { setZoomed(false); onIndexChange(i); }}
              aria-label={`Photo ${i + 1}`}
              aria-current={i === index}
              className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 ${i === index ? 'border-white' : 'border-transparent opacity-60 hover:opacity-100'}`}
            >
              <img src={img.url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
