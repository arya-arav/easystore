import type { Metadata } from 'next';
import { DynamicSections } from '@/components/home/dynamic-sections';
import { OrganizationJsonLd, WebsiteJsonLd } from '@/components/json-ld';
import { getHomeData } from '@/lib/home-data';
import { getPublicSettings } from '@/lib/public-settings';
import { getSiteUrl } from '@/lib/site-url';
import { needsSetup } from '@/lib/setup';
import { redirect } from 'next/navigation';

// Rendered per request so the page arrives with products, categories and banners
// (search engines and slow phones see the content without waiting for scripts).
export const dynamic = 'force-dynamic';


export async function generateMetadata(): Promise<Metadata> {
  const s = await getPublicSettings();
  const SITE_URL = await getSiteUrl();
  const title = `${s.storeName} - ${s.heroTitle}`.slice(0, 70);
  const description = s.heroSubtitle;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: SITE_URL },
    openGraph: {
      title,
      description,
      url: SITE_URL,
      siteName: s.storeName,
      type: 'website',
      images: s.heroImage ? [{ url: s.heroImage }] : undefined,
    },
    twitter: { card: 'summary_large_image', title, description, images: s.heroImage ? [s.heroImage] : undefined },
  };
}

export default async function HomePage() {
  // Fresh install: run the setup wizard first
  if (await needsSetup()) redirect('/setup');
  const [data, SITE_URL] = await Promise.all([getHomeData(), getSiteUrl()]);
  const s = data.settings;

  return (
    <>
      <OrganizationJsonLd
        name={s.storeName}
        url={SITE_URL}
        logo={s.logo ? (s.logo.startsWith('http') ? s.logo : `${SITE_URL}${s.logo}`) : undefined}
        email={s.storeEmail}
      />
      <WebsiteJsonLd name={s.storeName} url={SITE_URL} />
      <DynamicSections initial={data} />
    </>
  );
}
