import './globals.css';
import type { Metadata } from 'next';
import { Inter, Nunito, Poppins, Quicksand } from 'next/font/google';
import { Providers } from '@/components/providers';
import { getPublicSettings } from '@/lib/public-settings';
import { getSiteUrl } from '@/lib/site-url';
import { getShopType } from '@/lib/shop-types';
import { THEME_STORAGE_KEY } from '@/lib/layout-settings';

// Theme fonts (Admin → Settings → Design). Self-hosted by next/font; not preloaded,
// so only the one the theme uses is downloaded.
const nunito = Nunito({ subsets: ['latin'], variable: '--font-nunito', display: 'swap', preload: false });
const poppins = Poppins({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-poppins', display: 'swap', preload: false });
// Admin panel font (Medusa uses Inter).
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap', preload: false });
const quicksand = Quicksand({ subsets: ['latin'], variable: '--font-quicksand', display: 'swap', preload: false });

// Applies the last theme this browser saw before first paint, so returning visitors
// don't see the default colours flash while settings load. DynamicHead keeps it current.
const themeBootScript = `try{var t=JSON.parse(localStorage.getItem('${THEME_STORAGE_KEY}')||'null');if(t){var r=document.documentElement.style;for(var k in t){if(typeof t[k]==='string'&&k.indexOf('--')===0)r.setProperty(k,t[k])}}}catch(e){}`;

export async function generateMetadata(): Promise<Metadata> {
  const [s, siteUrl] = await Promise.all([getPublicSettings(), getSiteUrl()]);
  const type = getShopType(s.shopType);
  return {
    title: { default: `${s.storeName} - ${type.copy.metaDescription.split('.')[0]}`, template: `%s | ${s.storeName}` },
    description: `${type.copy.metaDescription} Shop online at ${s.storeName}.`,
    keywords: type.copy.keywords,
    metadataBase: new URL(siteUrl),
    icons: { icon: s.favicon || '/favicon.ico' },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Store settings in the first HTML, so the logo and name don't flash in after loading
  const settings = await getPublicSettings();
  return (
    <html lang="en" className={`${nunito.variable} ${poppins.variable} ${quicksand.variable} ${inter.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body>
        <Providers settings={JSON.parse(JSON.stringify(settings))}>{children}</Providers>
      </body>
    </html>
  );
}
