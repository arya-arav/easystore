// Force dynamic rendering
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { DEFAULT_MARKETS, parseMarketsConfig } from '@/lib/markets';
import { getMarkets } from '@/lib/markets-server';
import { DEFAULT_LAYOUT, parseLayoutConfig, serializeLayoutConfig } from '@/lib/layout-settings';
import { DEFAULT_PAYMENT_CONFIG, isRazorpayConfigured, isStripeConfigured, parsePaymentConfig, serializePaymentConfig } from '@/lib/payment-settings';

const defaultSettings = {
  storeName: 'My Store',
  storeEmail: '',
  storePhone: '',
  whatsappNumber: '',
  storeAddress: '',
  logo: '',
  favicon: '/favicon.ico',
  primaryColor: '#FF6B9D',
  secondaryColor: '#4ECDC4',
  // Empty hero and footer text = the shop type's wording (lib/shop-types.ts)
  heroTitle: '',
  heroSubtitle: '',
  heroBadgeText: '',
  heroCtaText: '',
  heroCtaLink: '',
  showHeroSection: true,
  showCategoriesSection: true,
  showFeaturedProducts: true,
  showBenefitsSection: true,
  showNewsletterSection: true,
  footerAboutText: '',
  facebookUrl: '',
  instagramUrl: '',
  twitterUrl: '',
  youtubeUrl: '',
  newsletterTitle: 'Subscribe to our Newsletter!',
  newsletterSubtitle: 'Get 15% off on your first order + exclusive deals',
  benefit1Icon: '🚚',
  benefit1Title: 'Free Shipping',
  benefit1Desc: 'On orders above ₹499',
  benefit2Icon: '🛡️',
  benefit2Title: '100% Safe',
  benefit2Desc: 'Non-toxic materials',
  benefit3Icon: '↩️',
  benefit3Title: 'Easy Returns',
  benefit3Desc: '7-day return policy',
  benefit4Icon: '💳',
  benefit4Title: 'COD Available',
  benefit4Desc: 'Pay on delivery',
  freeShippingAbove: 499,
  baseShippingRate: 49,
  minDeliveryDays: 3,
  maxDeliveryDays: 7,
  defaultGstRate: 18,
  gstInclusive: true,
  gstin: '',
  smtpHost: '',
  smtpPort: 587,
  smtpUser: '',
  smtpPassword: '',
  smtpFromName: '',
  smtpFromEmail: '',
  smtpSecure: true,
  razorpayKeyId: '',
  paymentMethods: DEFAULT_PAYMENT_CONFIG,
  layout: DEFAULT_LAYOUT,
  markets: DEFAULT_MARKETS,
  notifications: {
    orderConfirmation: true,
    shippingUpdate: true,
    deliveryConfirmation: true,
    reviewRequest: false,
    registrationEmail: true,
    passwordReset: true,
  },
  showWhatsappButton: true,
  showUrgencyIndicators: true,
  lowStockThreshold: 10,
  showAgeShopTiles: true,
};

export async function GET() {
  try {
    const settings = await prisma.siteSettings.findUnique({
      where: { id: 'default' },
    });

    if (!settings) {
      return NextResponse.json({ ...defaultSettings, razorpayConfigured: isRazorpayConfigured(), stripeConfigured: isStripeConfigured() });
    }

    return NextResponse.json({
      storeName: settings.storeName,
      storeEmail: settings.storeEmail,
      storePhone: settings.storePhone,
      whatsappNumber: settings.whatsappNumber,
      customHeadCode: settings.customHeadCode,
      customBodyCode: settings.customBodyCode,
      storeAddress: settings.storeAddress,
      logo: settings.logo,
      favicon: settings.favicon,
      primaryColor: settings.primaryColor,
      secondaryColor: settings.secondaryColor,
      heroTitle: settings.heroTitle,
      heroSubtitle: settings.heroSubtitle,
      heroBadgeText: settings.heroBadgeText,
      heroCtaText: settings.heroCtaText,
      heroCtaLink: settings.heroCtaLink,
      heroImage: settings.heroImage || '',
      heroImageZoom: settings.heroImageZoom ?? 100,
      showHeroSection: settings.showHeroSection,
      showCategoriesSection: settings.showCategoriesSection,
      showFeaturedProducts: settings.showFeaturedProducts,
      showBenefitsSection: settings.showBenefitsSection,
      showNewsletterSection: settings.showNewsletterSection,
      footerLogo: settings.footerLogo || '',
      footerAboutText: settings.footerAboutText,
      facebookUrl: settings.facebookUrl,
      instagramUrl: settings.instagramUrl,
      twitterUrl: settings.twitterUrl,
      youtubeUrl: settings.youtubeUrl,
      newsletterTitle: settings.newsletterTitle,
      newsletterSubtitle: settings.newsletterSubtitle,
      benefit1Icon: settings.benefit1Icon,
      benefit1Title: settings.benefit1Title,
      benefit1Desc: settings.benefit1Desc,
      benefit2Icon: settings.benefit2Icon,
      benefit2Title: settings.benefit2Title,
      benefit2Desc: settings.benefit2Desc,
      benefit3Icon: settings.benefit3Icon,
      benefit3Title: settings.benefit3Title,
      benefit3Desc: settings.benefit3Desc,
      benefit4Icon: settings.benefit4Icon,
      benefit4Title: settings.benefit4Title,
      benefit4Desc: settings.benefit4Desc,
      freeShippingAbove: settings.freeShippingAbove,
      baseShippingRate: settings.baseShippingRate,
      minDeliveryDays: settings.minDeliveryDays,
      maxDeliveryDays: settings.maxDeliveryDays,
      defaultGstRate: settings.defaultGstRate,
      gstInclusive: settings.gstInclusive,
      gstin: settings.gstin,
      smtpHost: settings.smtpHost || '',
      smtpPort: settings.smtpPort || 587,
      smtpUser: settings.smtpUser || '',
      smtpPassword: '••••••••',
      smtpFromName: settings.smtpFromName || settings.storeName,
      smtpFromEmail: settings.smtpFromEmail || '',
      smtpSecure: settings.smtpSecure,
      razorpayKeyId: settings.razorpayKeyId,
      paymentMethods: parsePaymentConfig(settings.paymentMethods),
      razorpayConfigured: isRazorpayConfigured(),
      stripeConfigured: isStripeConfigured(),
      layout: parseLayoutConfig(settings.layout),
      markets: await getMarkets(),
      notifications: JSON.parse(settings.notifications || '{}'),
      showWhatsappButton: settings.showWhatsappButton ?? true,
      showUrgencyIndicators: settings.showUrgencyIndicators ?? true,
      lowStockThreshold: settings.lowStockThreshold ?? 10,
      showAgeShopTiles: settings.showAgeShopTiles ?? true,
      bundleDiscount: settings.bundleDiscount ?? 5,
      referralRewardPoints: settings.referralRewardPoints ?? 100,
      loyaltyEarnRate: settings.loyaltyEarnRate ?? 1,
      loyaltyRedeemRate: settings.loyaltyRedeemRate ?? 1,
      loyaltyMinRedeem: settings.loyaltyMinRedeem ?? 50,
      loyaltyMaxRedeemPct: settings.loyaltyMaxRedeemPct ?? 20,
    }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  } catch (error: any) {
    console.error('Settings GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const data = await request.json();

    const existing = await prisma.siteSettings.findUnique({
      where: { id: 'default' },
    });

    // Numbers: 0 is a real choice (e.g. free shipping on everything); a blank or missing
    // field keeps what's saved instead of resetting to the default.
    const num = (key: string, fallback: number, min = 0, max = Number.MAX_SAFE_INTEGER) => {
      const v = data[key];
      const saved = (existing as any)?.[key];
      if (v === '' || v === null || v === undefined || !Number.isFinite(Number(v))) return saved != null ? Number(saved) : fallback;
      return Math.min(max, Math.max(min, Number(v)));
    };

    const smtpPassword = data.smtpPassword === '••••••••' && existing?.smtpPassword
      ? existing.smtpPassword
      : data.smtpPassword;

    const settings = await prisma.siteSettings.upsert({
      where: { id: 'default' },
      update: {
        storeName: data.storeName || 'My Store',
        storeEmail: data.storeEmail || '',
        storePhone: data.storePhone,
        whatsappNumber: data.whatsappNumber,
        customHeadCode: data.customHeadCode,
        customBodyCode: data.customBodyCode,
        storeAddress: data.storeAddress,
        logo: data.logo,
        favicon: data.favicon,
        primaryColor: data.primaryColor || '#FF6B9D',
        secondaryColor: data.secondaryColor || '#4ECDC4',
        heroTitle: data.heroTitle,
        heroSubtitle: data.heroSubtitle,
        heroBadgeText: data.heroBadgeText,
        heroCtaText: data.heroCtaText,
        heroCtaLink: data.heroCtaLink,
        heroImage: data.heroImage || null,
        heroImageZoom: num('heroImageZoom', 100, 50, 200),
        showHeroSection: data.showHeroSection !== false,
        showCategoriesSection: data.showCategoriesSection !== false,
        showFeaturedProducts: data.showFeaturedProducts !== false,
        showBenefitsSection: data.showBenefitsSection !== false,
        showNewsletterSection: data.showNewsletterSection !== false,
        footerLogo: data.footerLogo || '',
        footerAboutText: data.footerAboutText,
        facebookUrl: data.facebookUrl,
        instagramUrl: data.instagramUrl,
        twitterUrl: data.twitterUrl,
        youtubeUrl: data.youtubeUrl,
        newsletterTitle: data.newsletterTitle,
        newsletterSubtitle: data.newsletterSubtitle,
        benefit1Icon: data.benefit1Icon,
        benefit1Title: data.benefit1Title,
        benefit1Desc: data.benefit1Desc,
        benefit2Icon: data.benefit2Icon,
        benefit2Title: data.benefit2Title,
        benefit2Desc: data.benefit2Desc,
        benefit3Icon: data.benefit3Icon,
        benefit3Title: data.benefit3Title,
        benefit3Desc: data.benefit3Desc,
        benefit4Icon: data.benefit4Icon,
        benefit4Title: data.benefit4Title,
        benefit4Desc: data.benefit4Desc,
        freeShippingAbove: num('freeShippingAbove', 499),
        baseShippingRate: num('baseShippingRate', 49),
        minDeliveryDays: num('minDeliveryDays', 3),
        maxDeliveryDays: num('maxDeliveryDays', 7),
        defaultGstRate: num('defaultGstRate', 18, 0, 100),
        gstInclusive: data.gstInclusive !== false,
        gstin: data.gstin,
        smtpHost: data.smtpHost,
        smtpPort: num('smtpPort', 587),
        smtpUser: data.smtpUser,
        smtpPassword: smtpPassword,
        smtpFromName: data.smtpFromName,
        smtpFromEmail: data.smtpFromEmail,
        smtpSecure: data.smtpSecure !== false,
        razorpayKeyId: data.razorpayKeyId,
        paymentMethods: serializePaymentConfig(data.paymentMethods),
        layout: serializeLayoutConfig(data.layout),
        markets: await mergeMarkets(data.markets),
        notifications: JSON.stringify(data.notifications || {}),
        showWhatsappButton: data.showWhatsappButton !== false,
        showUrgencyIndicators: data.showUrgencyIndicators !== false,
        lowStockThreshold: num('lowStockThreshold', 10),
        showAgeShopTiles: data.showAgeShopTiles !== false,
        bundleDiscount: num('bundleDiscount', 5, 0, 90),
        referralRewardPoints: num('referralRewardPoints', 100),
        loyaltyEarnRate: Math.round(num('loyaltyEarnRate', 1, 0, 100)),
        loyaltyRedeemRate: num('loyaltyRedeemRate', 1),
        loyaltyMinRedeem: num('loyaltyMinRedeem', 50),
        loyaltyMaxRedeemPct: num('loyaltyMaxRedeemPct', 20, 0, 100),
      },
      create: {
        id: 'default',
        storeName: data.storeName || 'My Store',
        storeEmail: data.storeEmail || '',
        smtpPassword: smtpPassword,
        bundleDiscount: num('bundleDiscount', 5, 0, 90),
        referralRewardPoints: num('referralRewardPoints', 100),
        loyaltyEarnRate: Math.round(num('loyaltyEarnRate', 1, 0, 100)),
        loyaltyRedeemRate: num('loyaltyRedeemRate', 1),
        loyaltyMinRedeem: num('loyaltyMinRedeem', 50),
        loyaltyMaxRedeemPct: num('loyaltyMaxRedeemPct', 20, 0, 100),
      },
    });

    return NextResponse.json({ success: true, message: 'Settings saved' });
  } catch (error: any) {
    console.error('Settings PUT error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/** Saves the admin's market choices; exchange rates are kept server-side and refreshed as needed. */
async function mergeMarkets(incoming: unknown) {
  const current = parseMarketsConfig((await prisma.siteSettings.findUnique({ where: { id: 'default' }, select: { markets: true } }))?.markets);
  const next = parseMarketsConfig(incoming as any);
  return JSON.stringify({ ...next, rates: current.rates, ratesUpdatedAt: current.ratesUpdatedAt });
}
