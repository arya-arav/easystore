'use client';

import { useEffect, useState } from 'react';
import { Truck } from 'lucide-react';
import { useSettings } from '@/lib/settings-context';
import { useMoney } from '@/lib/currency-context';
import { useShippingOffer } from '@/lib/use-shipping-offer';

/** Adds working days (Mon–Sat; couriers don't deliver on Sundays). */
function addWorkingDays(from: Date, days: number) {
  const date = new Date(from);
  let added = 0;
  while (added < days) {
    date.setDate(date.getDate() + 1);
    if (date.getDay() !== 0) added++;
  }
  return date;
}

const fmt = (d: Date) => d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });

/** "Get it by Mon, 27 Oct – Thu, 30 Oct", from the shipping settings for this shopper's market. */
export function DeliveryEstimate({ price }: { price: number }) {
  const { settings } = useSettings();
  const { shipping, format } = useMoney();
  const offer = useShippingOffer();
  // Dates use the shopper's clock and locale, so render them in the browser only.
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => { setNow(new Date()); }, []);
  if (!now) return <div className="h-[68px] rounded-xl bg-[#F8F6F2]" aria-hidden />;

  const [minDays, maxDays] = shipping
    ? [shipping.minDays, shipping.maxDays]
    : [settings.minDeliveryDays || 3, settings.maxDeliveryDays || 7];
  const earliest = addWorkingDays(now, minDays);
  const latest = addWorkingDays(now, Math.max(minDays, maxDays));
  const freeShipping = offer.threshold != null && price >= offer.threshold;

  return (
    <div className="flex gap-3 rounded-xl bg-[#F8F6F2] p-3.5">
      <Truck className="mt-0.5 w-5 h-5 shrink-0 text-[#7FAF8E]" />
      <div className="text-sm">
        <p className="font-medium text-[#333333]">
          Get it by {fmt(earliest)}{latest.getTime() !== earliest.getTime() && ` – ${fmt(latest)}`}
        </p>
        <p className="text-[#777777]">
          {freeShipping
            ? 'Free shipping on this item'
            : offer.threshold != null
              ? `Free shipping on orders over ${format(offer.threshold)}`
              : offer.abroad
                ? 'Shipping calculated at checkout'
                : ''}
        </p>
      </div>
    </div>
  );
}
