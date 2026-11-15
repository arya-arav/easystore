'use client';

import Link from 'next/link';
import { ShopEmoji } from '@/components/ui/shop-emoji';
import { Facebook, Instagram, Twitter, Youtube, Mail, Phone, ChevronDown } from 'lucide-react';
import { useSettings } from '@/lib/settings-context';
import { useEffect, useState } from 'react';
import { loadNavCategories } from '@/components/layout/header';

const footerLinks = {
  support: [
    { name: 'Track Order', href: '/track-order' },
    { name: 'Shipping', href: '/shipping' },
    { name: 'Returns', href: '/returns' },
    { name: 'FAQs', href: '/faq' },
    { name: 'Contact', href: '/contact' },
  ],
  company: [
    { name: 'About Us', href: '/about', external: false },
    { name: 'Privacy', href: '/privacy' },
    { name: 'Terms', href: '/terms' },
  ],
};

/** "Shop" column: your first five categories with products (same list as the header menu). */
function useShopLinks() {
  const [links, setLinks] = useState<{ name: string; href: string }[]>([{ name: 'All Products', href: '/products' }]);
  useEffect(() => {
    loadNavCategories().then((cats) => {
      if (cats.length) setLinks([...cats.slice(0, 5).map((c) => ({ name: c.name, href: c.href })), { name: 'All Products', href: '/products' }]);
    });
  }, []);
  return links;
}

// Social links come from Admin → Settings → Footer; empty ones are hidden.
const SOCIALS = [
  { name: 'Facebook', icon: Facebook, key: 'facebookUrl' },
  { name: 'Instagram', icon: Instagram, key: 'instagramUrl' },
  { name: 'Twitter', icon: Twitter, key: 'twitterUrl' },
  { name: 'YouTube', icon: Youtube, key: 'youtubeUrl' },
] as const;

// "We accept" badges for the payment methods that are switched on
const PAYMENT_BADGES: Record<string, { label: string; className: string }[]> = {
  RAZORPAY: [{ label: 'VISA', className: 'text-blue-600' }, { label: 'MC', className: 'text-red-500' }, { label: 'UPI', className: 'text-green-600' }, { label: 'NetBanking', className: 'text-blue-800' }],
  UPI: [{ label: 'UPI', className: 'text-green-600' }],
  STRIPE: [{ label: 'VISA', className: 'text-blue-600' }, { label: 'MC', className: 'text-red-500' }, { label: 'AMEX', className: 'text-sky-700' }],
  COD: [{ label: 'COD', className: 'text-text-secondary' }],
};

function FooterSection({ title, links }: { title: string; links: { name: string; href: string; external?: boolean }[] }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-b border-cream-200 lg:border-0">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full py-4 flex items-center justify-between text-text-primary font-medium lg:pointer-events-none">
        {title}
        <ChevronDown className={`w-4 h-4 transition-transform lg:hidden ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <ul className={`space-y-3 pb-4 ${isOpen ? 'block' : 'hidden'} lg:block`}>
        {links.map((link) => (
          <li key={link.href}>
            {link.external ? (
              <a href={link.href} target="_blank" rel="noopener noreferrer" className="text-text-secondary hover:text-primary-500 transition-colors text-sm">{link.name}</a>
            ) : (
              <Link href={link.href} className="text-text-secondary hover:text-primary-500 transition-colors text-sm">{link.name}</Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Footer() {
  const { settings } = useSettings();
  const shopLinks = useShopLinks();
  const socialLinks = SOCIALS.map((s) => ({ ...s, href: (settings as any)[s.key] as string })).filter((s) => s.href);
  const methods = [...(settings.payment?.methods || []), ...(settings.payment?.internationalMethods || [])];
  const badges = Array.from(new Map(methods.flatMap((m) => PAYMENT_BADGES[m] || []).map((b) => [b.label, b])).values());
  return (
    <footer className="bg-bg-secondary">
      <div className="content-container py-10 md:py-12">
        {/* Mobile */}
        <div className="lg:hidden">
          <div className="text-center mb-8 pb-8 border-b border-cream-200">
            <Link href="/" className="inline-flex items-center gap-2 mb-3">
              {(settings.footerLogo || settings.logo) && (settings.footerLogo || settings.logo) !== '/images/logo.png' ? (
                <img src={settings.footerLogo || settings.logo} alt={settings.storeName} className="h-10 object-contain" />
              ) : (
                <>
                  <div className="w-9 h-9 bg-gradient-to-br from-primary-400 to-primary-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-base">{<ShopEmoji />}</span>
                  </div>
                  <span className="text-xl font-display font-bold text-text-primary">
                    {settings.storeName.split(' ')[0]}{' '}
                    <span className="text-primary-500">{settings.storeName.split(' ')[1]}</span>
                  </span>
                </>
              )}
            </Link>
            <p className="text-text-secondary text-sm max-w-xs mx-auto">{settings.footerAboutText}</p>
          </div>
          <FooterSection title="Shop" links={shopLinks} />
          <FooterSection title="Support" links={footerLinks.support} />
          <FooterSection title="Company" links={footerLinks.company} />
          <div className="py-6 mt-4">
            <div className="flex flex-col items-center gap-3">
              <a href={`mailto:${settings.storeEmail}`} className="flex items-center gap-2 text-text-secondary hover:text-primary-500 text-sm">
                <Mail className="w-4 h-4" /> {settings.storeEmail}
              </a>
              <a href={`tel:${settings.storePhone}`} className="flex items-center gap-2 text-text-secondary hover:text-primary-500 text-sm">
                <Phone className="w-4 h-4" /> {settings.storePhone}
              </a>
            </div>
          </div>
        </div>

        {/* Desktop */}
        <div className="hidden lg:grid lg:grid-cols-5 gap-10">
          <div className="lg:col-span-2">
            <Link href="/" className="inline-flex items-center gap-2 mb-4">
              {(settings.footerLogo || settings.logo) && (settings.footerLogo || settings.logo) !== '/images/logo.png' ? (
                <img src={settings.footerLogo || settings.logo} alt={settings.storeName} className="h-10 object-contain" />
              ) : (
                <>
                  <div className="w-9 h-9 bg-gradient-to-br from-primary-400 to-primary-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-base">{<ShopEmoji />}</span>
                  </div>
                  <span className="text-xl font-display font-bold text-text-primary">
                    {settings.storeName.split(' ')[0]}{' '}
                    <span className="text-primary-500">{settings.storeName.split(' ')[1]}</span>
                  </span>
                </>
              )}
            </Link>
            <p className="text-text-secondary text-sm max-w-sm mb-5">{settings.footerAboutText}</p>
            <div className="space-y-2.5">
              <a href={`mailto:${settings.storeEmail}`} className="flex items-center gap-2 text-text-secondary hover:text-primary-500 transition-colors">
                <Mail className="w-4 h-4" />
                <span className="text-sm">{settings.storeEmail}</span>
              </a>
              <a href={`tel:${settings.storePhone}`} className="flex items-center gap-2 text-text-secondary hover:text-primary-500 transition-colors">
                <Phone className="w-4 h-4" />
                <span className="text-sm">{settings.storePhone}</span>
              </a>
            </div>
          </div>
          <div>
            <h4 className="text-text-primary font-medium mb-4">Shop</h4>
            <ul className="space-y-3">
              {shopLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-text-secondary hover:text-primary-500 transition-colors text-sm">{link.name}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-text-primary font-medium mb-4">Support</h4>
            <ul className="space-y-3">
              {footerLinks.support.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-text-secondary hover:text-primary-500 transition-colors text-sm">{link.name}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-text-primary font-medium mb-4">Company</h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.href}>
                  {link.external ? (
                    <a href={link.href} target="_blank" rel="noopener noreferrer" className="text-text-secondary hover:text-primary-500 transition-colors text-sm">{link.name}</a>
                  ) : (
                    <Link href={link.href} className="text-text-secondary hover:text-primary-500 transition-colors text-sm">{link.name}</Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-10 pt-8 border-t border-cream-200">
          <div className="flex flex-col items-center gap-6">
            {/* Social */}
            {socialLinks.length > 0 && <div className="flex items-center gap-3">
              {socialLinks.map((social) => (
                <a key={social.name} href={social.href} target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-primary-500 hover:text-white text-text-secondary transition-all duration-200 shadow-sm">
                  <social.icon className="w-5 h-5" />
                </a>
              ))}
            </div>}
            {/* Payment */}
            <div className="flex items-center gap-2 flex-wrap justify-center">
              <span className="text-xs text-text-muted mr-1">We accept:</span>
              {badges.map((b) => <div key={b.label} className={`px-2.5 py-1 bg-white rounded text-[10px] font-semibold ${b.className}`}>{b.label}</div>)}
            </div>
            {/* Copyright */}
            <p className="text-xs text-text-muted text-center">© {new Date().getFullYear()} {settings.storeName}. All rights reserved. Made with ❤️ in India</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
