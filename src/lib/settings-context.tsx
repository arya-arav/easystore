'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { DEFAULT_LAYOUT, type LayoutConfig } from '@/lib/layout-settings';
import { getShopType, type ShopType } from '@/lib/shop-types';

interface SiteSettings {
  /** What kind of shop (lib/shop-types.ts) */
  shopType: string;
  /** Checkout payment options (public part only) */
  payment?: { methods?: string[]; internationalMethods?: string[] };
  /** Settings → Policies (customer-facing numbers) */
  policies?: { returnWindowDays: number; giftWrapCharge: number; codFee: number };
  storeName: string;
  storeEmail: string;
  storePhone: string;
  whatsappNumber: string;
  storeAddress: string;
  logo: string;
  favicon: string;
  primaryColor: string;
  secondaryColor: string;
  heroTitle: string;
  heroSubtitle: string;
  heroBadgeText: string;
  heroCtaText: string;
  heroCtaLink: string;
  heroImage: string;
  heroImageZoom: number;
  showHeroSection: boolean;
  showCategoriesSection: boolean;
  showFeaturedProducts: boolean;
  showBenefitsSection: boolean;
  showNewsletterSection: boolean;
  benefit1Icon: string;
  benefit1Title: string;
  benefit1Desc: string;
  benefit2Icon: string;
  benefit2Title: string;
  benefit2Desc: string;
  benefit3Icon: string;
  benefit3Title: string;
  benefit3Desc: string;
  benefit4Icon: string;
  benefit4Title: string;
  benefit4Desc: string;
  footerLogo: string;
  footerAboutText: string;
  facebookUrl: string;
  instagramUrl: string;
  twitterUrl: string;
  youtubeUrl: string;
  newsletterTitle: string;
  newsletterSubtitle: string;
  freeShippingAbove: number;
  baseShippingRate: number;
  minDeliveryDays: number;
  maxDeliveryDays: number;
  gstin: string;
  customHeadCode: string;
  customBodyCode: string;
  showWhatsappButton: boolean;
  showUrgencyIndicators: boolean;
  lowStockThreshold: number;
  showAgeShopTiles: boolean;
  bundleDiscount: number;
  layout: LayoutConfig;
}

// Empty defaults - don't show fake data
const defaultSettings: SiteSettings = {
  shopType: 'baby',
  storeName: '',
  storeEmail: '',
  storePhone: '',
  whatsappNumber: '',
  storeAddress: '',
  logo: '',
  favicon: '',
  primaryColor: '',
  secondaryColor: '',
  heroTitle: '',
  heroSubtitle: '',
  heroBadgeText: '',
  heroCtaText: '',
  heroCtaLink: '',
  heroImage: '',
  heroImageZoom: 100,
  showHeroSection: true,
  showCategoriesSection: true,
  showFeaturedProducts: true,
  showBenefitsSection: true,
  showNewsletterSection: true,
  benefit1Icon: '',
  benefit1Title: '',
  benefit1Desc: '',
  benefit2Icon: '',
  benefit2Title: '',
  benefit2Desc: '',
  benefit3Icon: '',
  benefit3Title: '',
  benefit3Desc: '',
  benefit4Icon: '',
  benefit4Title: '',
  benefit4Desc: '',
  footerLogo: '',
  footerAboutText: '',
  facebookUrl: '',
  instagramUrl: '',
  twitterUrl: '',
  youtubeUrl: '',
  newsletterTitle: '',
  newsletterSubtitle: '',
  freeShippingAbove: 0,
  baseShippingRate: 0,
  minDeliveryDays: 0,
  maxDeliveryDays: 0,
  gstin: '',
  customHeadCode: '',
  customBodyCode: '',
  showWhatsappButton: false,
  showUrgencyIndicators: false,
  lowStockThreshold: 10,
  showAgeShopTiles: false,
  bundleDiscount: 5,
  layout: DEFAULT_LAYOUT,
};

const SettingsContext = createContext<{
  settings: SiteSettings;
  loading: boolean;
  refreshSettings: () => Promise<void>;
}>({
  settings: defaultSettings,
  loading: true,
  refreshSettings: async () => {},
});

export function SettingsProvider({ children, initial }: { children: ReactNode; initial?: Partial<SiteSettings> | null }) {
  // Server-rendered settings (root layout) make the first paint right: logo, store name,
  // theme. The browser still refreshes them, e.g. after an admin saves.
  const [settings, setSettings] = useState<SiteSettings>(() =>
    initial ? ({ ...defaultSettings, ...initial, layout: initial.layout ?? DEFAULT_LAYOUT } as SiteSettings) : defaultSettings
  );
  const [loading, setLoading] = useState(!initial);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings', { 
        cache: 'no-store',
        next: { revalidate: 0 }
      });
      const data = await res.json();
      setSettings({ ...data, layout: data.layout ?? DEFAULT_LAYOUT });
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    const handleUpdate = () => {
      setLoading(true);
      fetchSettings();
    };
    window.addEventListener('settings-updated', handleUpdate);
    return () => window.removeEventListener('settings-updated', handleUpdate);
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, loading, refreshSettings: fetchSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

/**
 * Gives server-rendered pages their settings straight away: inside it, components see
 * `initial` until the browser's own settings request finishes, then the live values.
 */
export function SettingsOverride({ initial, children }: { initial: Partial<SiteSettings>; children: ReactNode }) {
  const context = useContext(SettingsContext);
  const value = context.loading
    ? { ...context, settings: { ...defaultSettings, ...initial, layout: initial.layout ?? DEFAULT_LAYOUT } as SiteSettings, loading: false }
    : context;
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}

/** The shop type's wording, categories and filters. */
export function useShopType(): ShopType {
  return getShopType(useContext(SettingsContext).settings.shopType);
}
