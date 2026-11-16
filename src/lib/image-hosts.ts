// Hosts of this store's own picture storage (R2 / S3 public URL), set at build time by
// next.config.mjs from R2_PUBLIC_URL, S3_PUBLIC_URL or IMAGE_HOSTS.
export const IMAGE_HOSTS = (process.env.NEXT_PUBLIC_IMAGE_HOSTS || '').split(',').map((h) => h.trim()).filter(Boolean);

/** True for pictures uploaded to this store (relative paths or the store's image host). */
export function isOwnImage(url?: string | null): boolean {
  if (!url) return false;
  if (url.startsWith('/')) return true;
  try {
    return IMAGE_HOSTS.includes(new URL(url).hostname);
  } catch {
    return false;
  }
}

// Outside hosts allowed in next.config.mjs images.remotePatterns (keep the two in step)
const OPTIMISED_HOSTS = [/(^|\.)unsplash\.com$/, /^res\.cloudinary\.com$/];

/** True when the image optimiser can resize this picture (our own or an allowed host). */
export function canOptimise(src: string): boolean {
  if (!src || src.endsWith('.svg') || src.startsWith('data:') || src.startsWith('blob:')) return false;
  if (isOwnImage(src)) return true;
  try {
    return OPTIMISED_HOSTS.some((re) => re.test(new URL(src).hostname));
  } catch {
    return false;
  }
}

// Widths the optimiser accepts (Next's default imageSizes + deviceSizes)
const WIDTHS = [64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1920];

/** A small, WebP/AVIF copy of a picture for plain <img> thumbnails (checkout, account, search). */
export function thumbSrc(src: string, width: number): string {
  if (!canOptimise(src)) return src;
  const w = WIDTHS.find((x) => x >= width) || 1920;
  return `/_next/image?url=${encodeURIComponent(src)}&w=${w}&q=75`;
}
