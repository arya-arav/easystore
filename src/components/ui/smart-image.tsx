'use client';

import Image from 'next/image';
import { useState } from 'react';
import { isOwnImage } from '@/lib/image-hosts';

// Hosts allowed in next.config.mjs images.remotePatterns. Photos from these are resized and
// converted to WebP/AVIF by the image optimiser (Cloudflare Images on Workers); anything
// else falls back to a plain <img>.
const OPTIMISED_HOSTS = [/(^|\.)unsplash\.com$/, /^res\.cloudinary\.com$/];

function canOptimise(src: string) {
  if (src.endsWith('.svg')) return false; // e.g. demo pictures
  if (isOwnImage(src)) return true;
  try {
    const host = new URL(src).hostname;
    return OPTIMISED_HOSTS.some((re) => re.test(host));
  } catch {
    return false;
  }
}

interface SmartImageProps {
  src: string;
  alt: string;
  /** Rendered width at common breakpoints, e.g. "(min-width: 1024px) 25vw, 50vw". */
  sizes: string;
  className?: string;
  priority?: boolean;
  /** Shown if the image fails to load. */
  fallback?: React.ReactNode;
}

/** Fills its (relatively positioned) parent, like object-cover. */
export function SmartImage({ src, alt, sizes, className = '', priority = false, fallback = null }: SmartImageProps) {
  const [failed, setFailed] = useState(false);
  if (failed) return <>{fallback}</>;
  // Cover by default; a caller asking for object-contain gets just that.
  const fit = /\bobject-(contain|fill|none|scale-down)\b/.test(className) ? '' : 'object-cover ';

  if (!canOptimise(src)) {
    return (
      <img
        src={src}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        className={`absolute inset-0 h-full w-full ${fit}${className}`}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      quality={80}
      className={`${fit}${className}`}
      onError={() => setFailed(true)}
    />
  );
}
