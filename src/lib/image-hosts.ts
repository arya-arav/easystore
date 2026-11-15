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
