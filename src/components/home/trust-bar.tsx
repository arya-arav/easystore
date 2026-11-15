'use client';

import { Truck, Shield, RotateCcw, Headphones, Award } from 'lucide-react';
import { useShippingOffer } from '@/lib/use-shipping-offer';
import { useSettings, useShopType } from '@/lib/settings-context';

export function TrustBar() {
  const shipping = useShippingOffer();
  const { settings } = useSettings();
  const type = useShopType();
  const items = [
    { icon: Shield, text: type.trust[0] },
    { icon: Award, text: type.trust[1] },
    { icon: RotateCcw, text: 'RETURNS' },
    { icon: Headphones, text: '24/7 Support' },
  ];
  const days = settings.policies?.returnWindowDays ?? 7;
  const all = [{ icon: Truck, text: shipping.short }, ...items]
    .map((i) => (i.text === 'RETURNS' ? { ...i, text: `${days}-Day Easy Returns` } : i))
    .filter((i) => days > 0 || i.icon !== RotateCcw);
  return (
    <div className="bg-white border-b border-gray-100 py-3 overflow-x-auto">
      <div className="content-container">
        <div className="flex items-center justify-between gap-4 min-w-max md:min-w-0 md:justify-center md:gap-10">
          {all.map(({ icon: Icon, text }, i) => (
            <div key={i} className="flex items-center gap-2 text-gray-600 shrink-0">
              <Icon className="w-4 h-4 text-[#7FAF8E]" />
              <span className="text-xs font-medium whitespace-nowrap">{text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
