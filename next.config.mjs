import fs from 'node:fs';

// The store's own picture host(s): R2_PUBLIC_URL / S3_PUBLIC_URL / IMAGE_HOSTS (comma
// separated), or R2_PUBLIC_URL from wrangler.jsonc on Cloudflare. Allowed for resizing
// and passed to the browser so it knows which pictures are ours.
const hostOf = (v) => {
  if (!v) return '';
  try { return v.includes('://') ? new URL(v).hostname : v.trim(); } catch { return ''; }
};
let wranglerImages = '';
try {
  wranglerImages = (fs.readFileSync('wrangler.jsonc', 'utf8').match(/"R2_PUBLIC_URL"\s*:\s*"([^"]+)"/) || [])[1] || '';
} catch {}
const imageHosts = [...new Set(
  [process.env.R2_PUBLIC_URL, process.env.S3_PUBLIC_URL, wranglerImages, ...(process.env.IMAGE_HOSTS || '').split(',')]
    .map(hostOf)
    .filter(Boolean)
)];
const onCloudflare = !process.env.VERCEL && process.env.DEPLOY_TARGET !== 'node';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Prisma's generated client must not be bundled by Next; OpenNext picks the
  // workerd (wasm) build of it when bundling for Cloudflare.
  serverExternalPackages: ['@prisma/client', '.prisma/client'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
      ...imageHosts.map((hostname) => ({ protocol: 'https', hostname, pathname: '/**' })),
    ],
  },
  env: { NEXT_PUBLIC_IMAGE_HOSTS: imageHosts.join(',') },
  // Docker installs (Dokploy, Coolify, docker compose) run the standalone server.
  ...(process.env.DEPLOY_TARGET === 'node' ? { output: 'standalone' } : {}),
};

export default nextConfig;

// Makes Cloudflare bindings (R2, Images) available to `next dev` via getCloudflareContext().
if (onCloudflare && process.env.NODE_ENV !== 'production') {
  const { initOpenNextCloudflareForDev } = await import('@opennextjs/cloudflare');
  initOpenNextCloudflareForDev();
}
