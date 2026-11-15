'use client';

import Link from 'next/link';
import { ShopEmoji } from '@/components/ui/shop-emoji';
import { ArrowRight, Truck, Shield, RotateCcw } from 'lucide-react';
import { useSettings, useShopType } from '@/lib/settings-context';
import { useState, useEffect } from 'react';
import type { HomeLayoutId } from '@/lib/layout-settings';
import { useShippingOffer } from '@/lib/use-shipping-offer';
import { SmartImage } from '@/components/ui/smart-image';

export function HeroSection({ variant = 'classic' }: { variant?: HomeLayoutId }) {
  const { settings } = useSettings();
  const shippingOffer = useShippingOffer();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (variant === 'spotlight') return <SpotlightHero />;
  if (variant === 'minimal') return <MinimalHero />;
  if (variant === 'boutique') return <BoutiqueHero />;
  if (variant === 'playful') return <PlayfulHero />;

  return (
    <section className="relative bg-gradient-to-br from-bg-secondary via-cream-100 to-bg-secondary overflow-hidden">
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 left-0 w-96 h-96 bg-primary-200 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-secondary-200 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
      </div>

      <div className="content-container py-16 md:py-20 lg:py-28 relative">
        <div className="grid md:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Content */}
          <div className="text-center md:text-left">
            <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm text-primary-600 px-4 py-2 rounded-full text-sm font-medium mb-6 shadow-sm">
              ✨ {settings.heroBadgeText}
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-text-primary mb-6 leading-tight">
              {settings.heroTitle.split(' ').slice(0, -1).join(' ')}{' '}
              <span className="text-primary-500">{settings.heroTitle.split(' ').slice(-1)}</span>
            </h1>

            <p className="text-lg text-text-secondary mb-8 max-w-md mx-auto md:mx-0 leading-relaxed">
              {settings.heroSubtitle}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
              <Link
                href={settings.heroCtaLink}
                className="inline-flex items-center justify-center gap-2 bg-primary-500 text-white px-8 py-4 rounded-full font-semibold hover:bg-primary-600 transition-all duration-200 shadow-lg shadow-primary-500/20"
              >
                {settings.heroCtaText}
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/products"
                className="inline-flex items-center justify-center px-8 py-4 border-2 border-cream-300 bg-white/50 backdrop-blur-sm text-text-primary rounded-full font-semibold hover:bg-white hover:border-cream-400 transition-all duration-200"
              >
                View All Products
              </Link>
            </div>

            {/* Trust badges */}
            <div className="mt-10 flex flex-wrap gap-6 justify-center md:justify-start">
              <div className="flex items-center gap-2.5 bg-white/80 backdrop-blur-sm px-4 py-2.5 rounded-full shadow-sm">
                <Truck className="w-5 h-5 text-secondary-500" />
                <span className="text-sm text-text-secondary">{shippingOffer.short}</span>
              </div>
              <div className="flex items-center gap-2.5 bg-white/80 backdrop-blur-sm px-4 py-2.5 rounded-full shadow-sm">
                <Shield className="w-5 h-5 text-secondary-500" />
                <span className="text-sm text-text-secondary">100% Safe</span>
              </div>
              <div className="flex items-center gap-2.5 bg-white/80 backdrop-blur-sm px-4 py-2.5 rounded-full shadow-sm">
                <RotateCcw className="w-5 h-5 text-secondary-500" />
                <span className="text-sm text-text-secondary">Easy Returns</span>
              </div>
            </div>
          </div>

          {/* Hero image */}
          <div className="relative flex justify-center">
            <div className={`relative z-10 rounded-3xl w-full max-w-md shadow-xl shadow-primary-500/5 overflow-hidden ${mounted && settings.heroImage ? 'aspect-auto' : 'aspect-square bg-white/60 backdrop-blur-sm p-6 md:p-8 flex items-center justify-center'}`}>
              {mounted && settings.heroImage ? (
                <img
                  src={settings.heroImage}
                  alt="Hero"
                  className="w-full h-auto block"
                  style={{
                    transform: `scale(${(settings.heroImageZoom || 100) / 100})`,
                    transformOrigin: 'center center',
                  }}
                />
              ) : mounted ? (
                <div className="text-center text-[#CCCCCC]">
                  <div className="text-6xl mb-3">🖼️</div>
                  <p className="text-sm">Upload a hero image in Admin → Settings → Homepage</p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Edge-to-edge hero: text on a soft brand tint, the hero image as a full-height panel
 * that bleeds to the right edge. The whole image is shown (never cropped), so portrait,
 * landscape and cut-out PNGs all fit.
 */
function SpotlightHero() {
  const { settings } = useSettings();
  const words = settings.heroTitle.split(' ');

  return (
    <section className="relative overflow-hidden bg-primary-50">
      {/* Image panel: top on phones, right half on larger screens */}
      <div className="relative h-72 sm:h-96 md:absolute md:inset-y-0 md:right-0 md:h-auto md:w-1/2">
        {settings.heroImage ? (
          // Show the whole picture (no cropping) sitting on the brand tint; the admin
          // zoom slider scales it from the bottom so it can be enlarged if wanted.
          <div className="absolute inset-0 pt-4 md:py-10" style={{ transform: `scale(${(settings.heroImageZoom || 100) / 100})`, transformOrigin: 'bottom center' }}>
            <div className="relative h-full w-full">
              <SmartImage src={settings.heroImage} alt="" sizes="(min-width: 768px) 50vw, 100vw" priority className="object-contain object-bottom" />
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-primary-100 text-8xl">{<ShopEmoji />}</div>
        )}
        {/* Soft blend into the text side */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-primary-50 to-transparent md:inset-y-0 md:left-0 md:right-auto md:h-auto md:w-32 md:bg-gradient-to-r" />
      </div>

      <div className="relative content-container">
        <div className="py-10 md:py-24 lg:py-32 md:w-1/2 md:pr-10">
          {settings.heroBadgeText && (
            <span className="inline-block bg-white text-primary-600 px-4 py-1.5 rounded-full text-sm font-semibold mb-5 shadow-sm">
              ✨ {settings.heroBadgeText}
            </span>
          )}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-text-primary leading-[1.1] mb-5">
            {words.slice(0, -1).join(' ')} <span className="text-primary-500">{words.slice(-1)}</span>
          </h1>
          <p className="text-lg text-text-secondary mb-8 leading-relaxed max-w-md">{settings.heroSubtitle}</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href={settings.heroCtaLink}
              className="inline-flex items-center justify-center gap-2 bg-primary-500 text-white px-8 py-4 rounded-full font-semibold hover:bg-primary-600 transition-colors shadow-lg shadow-primary-500/25"
            >
              {settings.heroCtaText} <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/products"
              className="inline-flex items-center justify-center px-8 py-4 rounded-full font-semibold bg-white text-text-primary ring-1 ring-primary-200 hover:ring-primary-400 transition-colors"
            >
              View All Products
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Compact centred hero without an image, so products appear sooner. */
function MinimalHero() {
  const { settings } = useSettings();

  return (
    <section className="bg-white border-b border-gray-100">
      <div className="content-container py-12 md:py-16 text-center">
        {settings.heroBadgeText && (
          <p className="text-primary-600 text-sm font-semibold uppercase tracking-wider mb-3">{settings.heroBadgeText}</p>
        )}
        <h1 className="text-3xl md:text-5xl font-display font-bold text-text-primary leading-tight max-w-3xl mx-auto mb-4">
          {settings.heroTitle}
        </h1>
        <p className="text-base md:text-lg text-text-secondary max-w-xl mx-auto mb-7">{settings.heroSubtitle}</p>
        <div className="flex items-center justify-center gap-5">
          <Link
            href={settings.heroCtaLink}
            className="inline-flex items-center gap-2 bg-primary-500 text-white px-7 py-3 rounded-full font-semibold hover:bg-primary-600 transition-colors"
          >
            {settings.heroCtaText} <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="/products" className="text-sm font-semibold text-text-primary underline underline-offset-4 decoration-primary-300 hover:decoration-primary-500">
            View all products
          </Link>
        </div>
      </div>
    </section>
  );
}

function HeroImage({ className }: { className: string }) {
  const { settings } = useSettings();
  if (!settings.heroImage) {
    return <div className={`${className} flex items-center justify-center bg-primary-100 text-8xl`}>{<ShopEmoji />}</div>;
  }
  return (
    <div className={`${className} relative overflow-hidden`}>
      <div className="absolute inset-0" style={{ transform: `scale(${(settings.heroImageZoom || 100) / 100})`, transformOrigin: 'top center' }}>
        <SmartImage src={settings.heroImage} alt="" sizes="(min-width: 768px) 448px, 90vw" priority className="object-top" fallback={null} />
      </div>
    </div>
  );
}

/** Editorial hero: small caps eyebrow, large headline, image in an arched frame. */
function BoutiqueHero() {
  const { settings } = useSettings();

  return (
    <section className="bg-cream-100">
      <div className="content-container py-12 md:py-20 grid md:grid-cols-2 gap-10 md:gap-16 items-center">
        <div className="order-2 md:order-1">
          {settings.heroBadgeText && (
            <p className="text-xs md:text-sm font-semibold uppercase tracking-[0.25em] text-primary-600 mb-5">{settings.heroBadgeText}</p>
          )}
          <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-gray-900 leading-[1.05]">
            {settings.heroTitle}
          </h1>
          <div className="mt-6 h-px w-16 bg-primary-400" />
          <p className="mt-6 text-lg text-gray-600 max-w-md leading-relaxed">{settings.heroSubtitle}</p>
          <div className="mt-9 flex flex-wrap items-center gap-6">
            <Link href={settings.heroCtaLink} className="inline-flex items-center gap-2 bg-gray-900 text-white px-8 py-4 rounded-full font-semibold hover:bg-gray-800 transition-colors">
              {settings.heroCtaText} <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="/products" className="text-sm font-semibold uppercase tracking-wider text-gray-900 border-b-2 border-primary-400 pb-1 hover:border-gray-900 transition-colors">
              Shop all
            </Link>
          </div>
        </div>
        <div className="order-1 md:order-2 flex justify-center md:justify-end">
          <div className="relative w-full max-w-sm md:max-w-md">
            <div className="absolute -inset-3 rounded-t-full border border-primary-200" />
            <HeroImage className="relative w-full aspect-[4/5] rounded-t-full" />
          </div>
        </div>
      </div>
    </section>
  );
}

/** Bright hero with colourful shapes, a round image and sticker badges. */
function PlayfulHero() {
  const { settings } = useSettings();
  const shippingOffer = useShippingOffer();
  const shopType = useShopType();
  const words = settings.heroTitle.split(' ');

  return (
    <section className="relative overflow-hidden bg-primary-100">
      <div className="absolute -top-16 -left-16 h-56 w-56 rounded-full bg-amber-200/70" />
      <div className="absolute top-1/3 right-[42%] h-10 w-10 rounded-full bg-sky-300/80" />
      <div className="absolute -bottom-20 right-10 h-64 w-64 rounded-full bg-emerald-200/60" />
      <div className="absolute bottom-16 left-[45%] h-6 w-6 rotate-45 rounded-md bg-pink-300" />

      <div className="relative content-container pt-12 pb-20 md:pt-16 md:pb-28 grid md:grid-cols-2 gap-10 items-center">
        <div className="text-center md:text-left">
          {settings.heroBadgeText && (
            <span className="inline-block -rotate-2 rounded-full bg-white px-4 py-1.5 text-sm font-bold text-primary-600 shadow-[3px_3px_0_0_rgba(0,0,0,0.12)] mb-6">
              🎉 {settings.heroBadgeText}
            </span>
          )}
          <h1 className="font-display text-4xl md:text-6xl font-extrabold text-gray-900 leading-tight">
            {words.slice(0, -1).join(' ')}{' '}
            <span className="relative inline-block text-primary-600">
              {words.slice(-1)}
              <svg className="absolute -bottom-2 left-0 w-full" height="10" viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden>
                <path d="M2 7 Q 25 1 50 6 T 98 4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </span>
          </h1>
          <p className="mt-6 text-lg text-gray-700 max-w-md mx-auto md:mx-0">{settings.heroSubtitle}</p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
            <Link href={settings.heroCtaLink} className="inline-flex items-center justify-center gap-2 bg-primary-500 text-white px-8 py-4 rounded-2xl font-bold shadow-[4px_4px_0_0_rgba(0,0,0,0.85)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_rgba(0,0,0,0.85)] transition-all">
              {settings.heroCtaText} <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="/products" className="inline-flex items-center justify-center px-8 py-4 rounded-2xl font-bold bg-white text-gray-900 shadow-[4px_4px_0_0_rgba(0,0,0,0.85)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_rgba(0,0,0,0.85)] transition-all">
              View All Products
            </Link>
          </div>
        </div>

        <div className="relative mx-auto w-72 md:w-96">
          <div className="absolute inset-0 translate-x-3 translate-y-3 rounded-full bg-primary-300" />
          <HeroImage className="relative aspect-square w-full rounded-full border-4 border-white" />
          <span className="absolute -top-2 -right-2 rotate-12 rounded-full bg-amber-300 px-4 py-2 text-sm font-extrabold text-gray-900 shadow-md">
            {shippingOffer.short}
          </span>
          <span className="absolute -bottom-3 -left-4 -rotate-6 rounded-full bg-white px-4 py-2 text-sm font-extrabold text-gray-900 shadow-md">
            ✨ {shopType.trust[0]}
          </span>
        </div>
      </div>

      {/* Wavy bottom edge */}
      <svg className="absolute bottom-0 left-0 w-full text-white" height="40" viewBox="0 0 1440 40" preserveAspectRatio="none" aria-hidden>
        <path d="M0 20 C 240 45 480 0 720 20 S 1200 40 1440 15 V40 H0 Z" fill="currentColor" />
      </svg>
    </section>
  );
}
