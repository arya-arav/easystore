'use client';

import { useSettings, useShopType } from '@/lib/settings-context';
import { Truck, Shield, RotateCcw, CreditCard } from 'lucide-react';
import type { HomeLayoutId } from '@/lib/layout-settings';

const iconMap: Record<string, any> = {
  truck: Truck, shield: Shield, rotate: RotateCcw, 'credit-card': CreditCard,
  '🚚': Truck, '🛡️': Shield, '↩️': RotateCcw, '💳': CreditCard,
};

const colors = [
  { bg: 'bg-[#E8F5E9]', icon: 'text-[#7FAF8E]', iconBg: 'bg-[#C8E6C9]' },
  { bg: 'bg-[#FFF3E0]', icon: 'text-orange-500', iconBg: 'bg-orange-100' },
  { bg: 'bg-[#E3F2FD]', icon: 'text-blue-500', iconBg: 'bg-blue-100' },
  { bg: 'bg-[#FCE4EC]', icon: 'text-pink-500', iconBg: 'bg-pink-100' },
];

export function BenefitsSection({ variant = 'classic' }: { variant?: HomeLayoutId }) {
  const { settings } = useSettings();
  const type = useShopType();

  const benefits = [
    { icon: settings.benefit1Icon, title: settings.benefit1Title, desc: settings.benefit1Desc },
    { icon: settings.benefit2Icon, title: settings.benefit2Title, desc: settings.benefit2Desc },
    { icon: settings.benefit3Icon, title: settings.benefit3Title, desc: settings.benefit3Desc },
    { icon: settings.benefit4Icon, title: settings.benefit4Title, desc: settings.benefit4Desc },
  ];

  const renderIcon = (icon: string, className: string) => {
    const isEmoji = icon && (icon.length <= 2 || /[\u{1F300}-\u{1F9FF}]/u.test(icon));
    const IconComponent = iconMap[icon] || Truck;
    return isEmoji ? <span className="text-xl">{icon}</span> : <IconComponent className={className} />;
  };

  if (variant === 'spotlight') {
    return (
      <section className="py-10 bg-white">
        <div className="content-container">
          <div className="grid grid-cols-2 md:grid-cols-4 rounded-3xl bg-primary-50 ring-1 ring-primary-100 divide-primary-100 md:divide-x">
            {benefits.map((benefit, i) => (
              <div key={i} className="flex items-center gap-3 p-5 md:p-6">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-500 text-white">
                  {renderIcon(benefit.icon, 'w-6 h-6')}
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold text-gray-900 text-sm md:text-base">{benefit.title || 'Feature'}</span>
                  <span className="block text-xs md:text-sm text-gray-500">{benefit.desc}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (variant === 'boutique') {
    return (
      <section className="py-14 md:py-16 bg-cream-100">
        <div className="content-container grid grid-cols-2 md:grid-cols-4 gap-y-8 md:divide-x divide-gray-300/60">
          {benefits.map((benefit, i) => (
            <div key={i} className="px-4 md:px-8 text-center">
              <div className="mx-auto mb-3 flex h-8 w-8 items-center justify-center text-gray-900">
                {renderIcon(benefit.icon, 'w-6 h-6 stroke-[1.5]')}
              </div>
              <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-900">{benefit.title || 'Feature'}</h3>
              <p className="mt-1.5 text-sm text-gray-500">{benefit.desc}</p>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (variant === 'playful') {
    const stickers = ['bg-amber-200 -rotate-2', 'bg-sky-200 rotate-1', 'bg-emerald-200 -rotate-1', 'bg-pink-200 rotate-2'];
    return (
      <section className="py-14 md:py-16 bg-white">
        <div className="content-container">
          <h2 className="text-center text-2xl md:text-3xl font-extrabold text-gray-900 mb-10">{type.copy.whyTitle}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {benefits.map((benefit, i) => (
              <div key={i} className={`${stickers[i % stickers.length]} rounded-3xl p-5 md:p-6 text-center shadow-[4px_4px_0_0_rgba(0,0,0,0.85)] transition-transform hover:rotate-0`}>
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-white text-gray-900">
                  {renderIcon(benefit.icon, 'w-7 h-7')}
                </div>
                <h3 className="font-extrabold text-gray-900">{benefit.title || 'Feature'}</h3>
                <p className="mt-1 text-sm text-gray-700">{benefit.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (variant === 'minimal') {
    return (
      <section className="py-10 bg-white border-y border-gray-100">
        <div className="content-container grid grid-cols-2 md:grid-cols-4 gap-6">
          {benefits.map((benefit, i) => (
            <div key={i} className="text-center">
              <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center text-primary-500">
                {renderIcon(benefit.icon, 'w-7 h-7')}
              </div>
              <h3 className="font-semibold text-gray-900 text-sm">{benefit.title || 'Feature'}</h3>
              <p className="text-xs text-gray-500 mt-0.5">{benefit.desc}</p>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="py-14 bg-white">
      <div className="content-container">
        <div className="text-center mb-10">
          <p className="text-[#7FAF8E] text-sm font-semibold uppercase tracking-wider mb-1">Why Us</p>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">{type.copy.whyTitle.replace(/ [^ ]*$/, '')}</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {benefits.map((benefit, i) => {
            const IconComponent = iconMap[benefit.icon] || Truck;
            const isEmoji = benefit.icon && (benefit.icon.length <= 2 || /[\u{1F300}-\u{1F9FF}]/u.test(benefit.icon));
            const c = colors[i];
            return (
              <div key={i} className={`${c.bg} rounded-2xl p-6 text-center group hover:shadow-md transition-shadow`}>
                <div className={`w-14 h-14 mx-auto mb-4 ${c.iconBg} rounded-2xl flex items-center justify-center`}>
                  {isEmoji
                    ? <span className="text-2xl">{benefit.icon}</span>
                    : <IconComponent className={`w-7 h-7 ${c.icon}`} />}
                </div>
                <h3 className="font-semibold text-gray-800 mb-1.5">{benefit.title || 'Feature'}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{benefit.desc || ''}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
