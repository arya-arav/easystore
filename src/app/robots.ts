import { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/site-url';

export const dynamic = 'force-dynamic';

export default async function robots(): Promise<MetadataRoute.Robots> {
  const baseUrl = (await getSiteUrl());

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/api', '/checkout', '/cart', '/auth'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
