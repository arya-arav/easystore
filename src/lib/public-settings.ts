import { cache } from 'react';
import { prisma } from '@/lib/prisma';
import { availablePaymentMethods, parsePaymentConfig } from '@/lib/payment-settings';
import { parsePolicies, DEFAULT_POLICIES } from '@/lib/policies';
import { parseLayoutConfig } from '@/lib/layout-settings';
import { getShopType } from '@/lib/shop-types';

// The store settings shoppers' browsers may see (no secrets), used by GET /api/settings
// and by server-rendered pages such as the homepage.

/** Reads (creating if missing) and formats the public settings. Falls back to defaults on error. */
export const getPublicSettings = cache(async function getPublicSettings() {
  try {
    const settings =
      (await prisma.siteSettings.findUnique({ where: { id: 'default' } })) ??
      (await prisma.siteSettings.create({ data: { id: 'default' } }));
    return formatSettings(settings);
  } catch (error) {
    console.error('Public settings error:', error);
    return getFallbackSettings();
  }
});

export type PublicSettings = ReturnType<typeof formatSettings>;

export function formatSettings(s: any) {
  const type = getShopType(s.shopType);
  const [b1, b2, b3, b4] = type.benefits;
  return {
    shopType: type.id,
    storeName: s.storeName || 'My Store',
    storeEmail: s.storeEmail || '',
    storePhone: s.storePhone || '',
    whatsappNumber: s.whatsappNumber || '',
    customHeadCode: s.customHeadCode || '',
    customBodyCode: s.customBodyCode || '',
    storeAddress: s.storeAddress || '',
    // '/images/logo.png' was the old placeholder default (no such file): treat as no logo
    logo: s.logo && s.logo !== '/images/logo.png' ? s.logo : '',
    primaryColor: s.primaryColor || '#A78BFA',
    secondaryColor: s.secondaryColor || '#C4ADF6',
    heroTitle: s.heroTitle || type.copy.heroTitle,
    heroSubtitle: s.heroSubtitle || type.copy.heroSubtitle,
    heroBadgeText: s.heroBadgeText || type.copy.heroBadge,
    heroCtaText: s.heroCtaText || type.copy.heroCta,
    heroCtaLink: s.heroCtaLink || `/category/${type.copy.heroCtaCategory}`,
    heroImage: s.heroImage || '',
    heroImageZoom: s.heroImageZoom ?? 100,
    showHeroSection: s.showHeroSection ?? true,
    showCategoriesSection: s.showCategoriesSection ?? true,
    showFeaturedProducts: s.showFeaturedProducts ?? true,
    showBenefitsSection: s.showBenefitsSection ?? true,
    showNewsletterSection: s.showNewsletterSection ?? true,
    benefit1Icon: s.benefit1Icon || b1[0],
    benefit1Title: s.benefit1Title || b1[1],
    benefit1Desc: s.benefit1Desc || b1[2],
    benefit2Icon: s.benefit2Icon || b2[0],
    benefit2Title: s.benefit2Title || b2[1],
    benefit2Desc: s.benefit2Desc || b2[2],
    benefit3Icon: s.benefit3Icon || b3[0],
    benefit3Title: s.benefit3Title || b3[1],
    benefit3Desc: s.benefit3Desc || b3[2],
    benefit4Icon: s.benefit4Icon || b4[0],
    benefit4Title: s.benefit4Title || b4[1],
    benefit4Desc: s.benefit4Desc || b4[2],
    footerLogo: s.footerLogo || '',
    footerAboutText: s.footerAboutText || type.copy.footerAbout,
    facebookUrl: s.facebookUrl || '',
    instagramUrl: s.instagramUrl || '',
    twitterUrl: s.twitterUrl || '',
    youtubeUrl: s.youtubeUrl || '',
    newsletterTitle: s.newsletterTitle || 'Subscribe to our Newsletter!',
    newsletterSubtitle: s.newsletterSubtitle || type.copy.newsletterSubtitle,
    freeShippingAbove: s.freeShippingAbove || 499,
    baseShippingRate: s.baseShippingRate || 49,
    minDeliveryDays: s.minDeliveryDays || 3,
    maxDeliveryDays: s.maxDeliveryDays || 7,
    gstin: s.gstin || '',
    favicon: s.favicon || '/favicon.ico',
    showWhatsappButton: s.showWhatsappButton ?? true,
    showUrgencyIndicators: s.showUrgencyIndicators ?? true,
    lowStockThreshold: s.lowStockThreshold ?? 10,
    showAgeShopTiles: s.showAgeShopTiles ?? true,
    bundleDiscount: s.bundleDiscount ?? 5,
    payment: publicPayment(s.paymentMethods),
    // Customer-facing policy numbers (gift wrap price, COD fee, return window)
    policies: (({ returnWindowDays, giftWrapCharge, codFee }) => ({ returnWindowDays, giftWrapCharge, codFee }))(parsePolicies(s.policies)),
    layout: parseLayoutConfig(s.layout),
  };
}

// Only what checkout needs: the methods a customer can pick, and where to send UPI payments.
function publicPayment(raw: string | null | undefined) {
  const config = parsePaymentConfig(raw);
  const methods = availablePaymentMethods(config);
  return {
    methods,
    internationalMethods: availablePaymentMethods(config, 'INTL'),
    upiId: methods.includes('UPI') ? config.upiId : '',
    upiInstructions: methods.includes('UPI') ? config.upiInstructions : '',
  };
}

export function getFallbackSettings() {
  // The database couldn't be read: show neutral defaults (no made-up contact details).
  return { ...formatSettings({}), storePhone: '', whatsappNumber: '' };
}
