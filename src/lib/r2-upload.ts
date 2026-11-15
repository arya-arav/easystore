import { getCloudflareContext } from '@opennextjs/cloudflare';

// Picture storage, whichever the host has:
//  1. Cloudflare Workers: the R2 binding IMAGES_BUCKET (+ Cloudflare Images for resizing)
//  2. Any S3-compatible bucket (Cloudflare R2, AWS S3, Backblaze B2, MinIO…): S3_* variables
//  3. Docker / VPS without S3: files on disk in UPLOAD_DIR, served at /uploads/…
// Vercel's disk isn't kept between requests, so Vercel installs need option 2.

import { AwsClient } from 'aws4fetch';

const isWorkerd = typeof navigator !== 'undefined' && navigator.userAgent === 'Cloudflare-Workers';

function getBindings(): { bucket?: any; images?: any } {
  try {
    const { env } = getCloudflareContext() as { env: any };
    return { bucket: env.IMAGES_BUCKET, images: env.IMAGES };
  } catch {
    return {};
  }
}

const s3 = () => {
  const e = process.env;
  if (!e.S3_BUCKET || !e.S3_ACCESS_KEY_ID || !e.S3_SECRET_ACCESS_KEY || !e.S3_PUBLIC_URL) return null;
  return {
    bucket: e.S3_BUCKET,
    endpoint: (e.S3_ENDPOINT || `https://s3.${e.S3_REGION || 'us-east-1'}.amazonaws.com`).replace(/\/$/, ''),
    publicUrl: e.S3_PUBLIC_URL.replace(/\/$/, ''),
    client: new AwsClient({ accessKeyId: e.S3_ACCESS_KEY_ID, secretAccessKey: e.S3_SECRET_ACCESS_KEY, service: 's3', region: e.S3_REGION || 'auto' }),
  };
};

const diskAllowed = () => !isWorkerd && !process.env.VERCEL;
export const uploadDir = () => process.env.UPLOAD_DIR || `${process.cwd()}/uploads`;

export type StorageKind = 'r2' | 's3' | 'disk';

export function storageKind(): StorageKind | null {
  if (getBindings().bucket && process.env.R2_PUBLIC_URL) return 'r2';
  if (s3()) return 's3';
  if (diskAllowed()) return 'disk';
  return null;
}

/** Kept for existing callers: true when uploads can be stored somewhere. */
export function isR2Configured() {
  return storageKind() !== null;
}

export const STORAGE_HELP = process.env.VERCEL
  ? 'Picture uploads need S3-compatible storage on Vercel. Set S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_ENDPOINT and S3_PUBLIC_URL (see docs/storage.md).'
  : 'Picture storage is not configured. See docs/storage.md.';

/** Upload bytes, returns the public URL. */
export async function uploadBufferToR2(
  body: ArrayBuffer | ArrayBufferView | ReadableStream,
  folder = 'products',
  contentType = 'image/webp',
  ext = contentType.split('/')[1] || 'webp'
): Promise<string> {
  const safeExt = String(ext).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5) || 'bin';
  const key = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${safeExt}`;
  const kind = storageKind();

  if (kind === 'r2') {
    await getBindings().bucket.put(key, body, { httpMetadata: { contentType, cacheControl: 'public, max-age=31536000' } });
    return `${process.env.R2_PUBLIC_URL!.replace(/\/$/, '')}/${key}`;
  }

  const bytes = body instanceof ReadableStream ? await new Response(body).arrayBuffer() : body;

  if (kind === 's3') {
    const c = s3()!;
    const res = await c.client.fetch(`${c.endpoint}/${c.bucket}/${key}`, {
      method: 'PUT',
      body: bytes as BodyInit,
      headers: { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=31536000' },
    });
    if (!res.ok) throw new Error(`S3 upload failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
    return `${c.publicUrl}/${key}`;
  }

  if (kind === 'disk') {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const file = path.join(uploadDir(), key);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, bytes instanceof ArrayBuffer ? new Uint8Array(bytes) : new Uint8Array((bytes as ArrayBufferView).buffer, (bytes as ArrayBufferView).byteOffset, (bytes as ArrayBufferView).byteLength));
    return `/uploads/${key}`;
  }

  throw new Error(STORAGE_HELP);
}

/** Fetch image from URL, resize + convert to WebP with Cloudflare Images, upload to R2 */
export async function fetchOptimizeUpload(
  sourceUrl: string,
  maxWidth = 1200
): Promise<{ url: string; width: number; height: number; size: number }> {
  const res = await fetch(sourceUrl, {
    headers: { 'User-Agent': 'EasyStore/1.0 (image import)' },
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status} ${sourceUrl}`);

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.startsWith('image/')) throw new Error(`URL is not an image: ${contentType}`);

  const input = await res.arrayBuffer();
  const { images } = getBindings();

  if (!images) {
    // No Images binding (e.g. local dev without it): store the original as-is.
    const url = await uploadBufferToR2(input, 'products', contentType);
    return { url, width: 0, height: 0, size: input.byteLength };
  }

  const toStream = () => new Blob([input]).stream();
  const info = await images.info(toStream());
  const srcWidth = 'width' in info ? info.width : 0;
  const srcHeight = 'height' in info ? info.height : 0;
  const width = srcWidth ? Math.min(srcWidth, maxWidth) : maxWidth;

  const result = await images
    .input(toStream())
    .transform({ width, fit: 'scale-down' })
    .output({ format: 'image/webp', quality: 82 });
  const optimized = await result.response().arrayBuffer();

  const url = await uploadBufferToR2(optimized, 'products', 'image/webp');
  const height = srcWidth ? Math.round((srcHeight * width) / srcWidth) : 0;

  return { url, width, height, size: optimized.byteLength };
}
