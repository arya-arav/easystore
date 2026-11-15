'use client';

import { useEffect, useState } from 'react';
import { SettingsOverride, useSettings } from '@/lib/settings-context';
import type { HomeData } from '@/lib/home-data';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { HeroSection } from '@/components/home/hero';
import { CategoriesSection } from '@/components/home/categories';
import { ProductTabsSection } from '@/components/home/product-tabs';
import { BenefitsSection } from '@/components/home/benefits';
import { TestimonialsSection } from '@/components/home/testimonials';
import { NewsletterSection } from '@/components/home/newsletter';
import { BannerSlider } from '@/components/home/banner-slider';
import { TrustBar } from '@/components/home/trust-bar';
import { AgeShopTiles } from '@/components/home/age-shop-tiles';
import { SECTIONS, type SectionId } from '@/lib/layout-settings';

/** The homepage. With `initial` (server-rendered), it shows content straight away. */
export function DynamicSections({ initial }: { initial?: HomeData }) {
  if (!initial) return <HomeSections />;
  return (
    <SettingsOverride initial={initial.settings as any}>
      <HomeSections initial={initial} />
    </SettingsOverride>
  );
}

function HomeSections({ initial }: { initial?: HomeData }) {
  const { settings, loading } = useSettings();
  const [hasHeroBanners, setHasHeroBanners] = useState<boolean | null>(initial ? initial.heroBanners.length > 0 : null);
  const [hasMiddleBanners, setHasMiddleBanners] = useState(initial ? initial.middleBanners.length > 0 : false);

  useEffect(() => {
    if (initial) return;
    fetch('/api/banners?position=HOMEPAGE_HERO')
      .then((r) => r.json())
      .then((d) => setHasHeroBanners((d.banners || []).length > 0))
      .catch(() => setHasHeroBanners(false));

    fetch('/api/banners?position=HOMEPAGE_MIDDLE')
      .then((r) => r.json())
      .then((d) => setHasMiddleBanners((d.banners || []).length > 0))
      .catch(() => setHasMiddleBanners(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-[#F7F7F5]">
        <div className="h-16 bg-white shadow-sm" />
        <div className="flex-1">
          <div className="bg-[#F5F0E8] py-20">
            <div className="content-container">
              <div className="animate-pulse space-y-4 text-center">
                <div className="h-6 bg-[#E8E0D0] rounded w-64 mx-auto" />
                <div className="h-12 bg-[#E8E0D0] rounded w-96 mx-auto" />
                <div className="h-6 bg-[#E8E0D0] rounded w-80 mx-auto" />
              </div>
            </div>
          </div>
          <div className="py-12 bg-white">
            <div className="content-container">
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-48 mx-auto mb-8" />
                <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-28 bg-gray-100 rounded-2xl" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="h-64 bg-gray-900" />
      </div>
    );
  }

  const { homeLayout, sectionOrder, hiddenSections } = settings.layout;

  const isVisible = (id: SectionId) => {
    const toggleKey = SECTIONS[id].toggleKey;
    return toggleKey ? !!settings[toggleKey] : !hiddenSections.includes(id);
  };

  const renderSection = (id: SectionId) => {
    switch (id) {
      case 'hero':
        // Homepage Hero banners, when there are any, take the hero's place.
        if (hasHeroBanners) return <BannerSlider position="HOMEPAGE_HERO" initialBanners={initial?.heroBanners} initialPlacement={initial?.heroPlacement} />;
        return <HeroSection variant={homeLayout} />;
      case 'trustBar':
        return <TrustBar />;
      case 'categories':
        return <CategoriesSection variant={homeLayout} initialCategories={initial?.categories} />;
      case 'ageTiles':
        return <AgeShopTiles />;
      case 'middleBanner':
        return hasMiddleBanners ? (
          <BannerSlider position="HOMEPAGE_MIDDLE" initialBanners={initial?.middleBanners} initialPlacement={initial?.middlePlacement} />
        ) : null;
      case 'products':
        return <ProductTabsSection initialProducts={initial?.products} />;
      case 'benefits':
        return <BenefitsSection variant={homeLayout} />;
      case 'testimonials':
        return <TestimonialsSection initial={initial?.testimonials} />;
      case 'newsletter':
        return <NewsletterSection />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        {sectionOrder.map((id) => {
          // Hero banners still show when the built-in hero section is switched off.
          const show = id === 'hero' ? hasHeroBanners === true || isVisible(id) : isVisible(id);
          const content = show ? renderSection(id) : null;
          return content ? <div key={id}>{content}</div> : null;
        })}
      </main>
      <Footer />
    </div>
  );
}
