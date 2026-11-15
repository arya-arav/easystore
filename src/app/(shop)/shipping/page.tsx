import { Metadata } from 'next';
import { Truck, Clock, MapPin, Package, CreditCard, Phone } from 'lucide-react';
import { NewsletterSection } from '@/components/home/newsletter';
import { getPublicSettings } from '@/lib/public-settings';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Shipping Information',
};

const zones = [
  { zone: 'Metro Cities', cities: 'Delhi, Mumbai, Bangalore, Chennai, Hyderabad, Kolkata', days: '2–4 days', icon: '🏙️' },
  { zone: 'Tier 2 Cities', cities: 'Pune, Jaipur, Lucknow, Ahmedabad, Surat, Nagpur & more', days: '4–6 days', icon: '🏘️' },
  { zone: 'Tier 3 & Remote', cities: 'All other pin codes across India', days: '6–8 days', icon: '🗺️' },
];

const steps = [
  { step: '1', title: 'Order Placed', desc: 'You place your order and receive a confirmation email.' },
  { step: '2', title: 'Processing', desc: 'We verify payment and prepare your items for dispatch (1 business day).' },
  { step: '3', title: 'Dispatched', desc: 'Your package is handed to our courier partner. You get a tracking link.' },
  { step: '4', title: 'Out for Delivery', desc: 'The courier is on the way to your address.' },
  { step: '5', title: 'Delivered', desc: 'Package delivered. Enjoy your order!' },
];

export default async function ShippingPage() {
  const settings = await getPublicSettings();
  const inr = (n: number) => `₹${Number(n).toLocaleString('en-IN')}`;
  const free = Number(settings.freeShippingAbove ?? 499);
  const rate = Number(settings.baseShippingRate ?? 49);
  const cod = (settings.payment?.methods || []).includes('COD');
  return (
    <>
      {/* Hero */}
      <section className="bg-[#F5F0E8] py-14 text-center">
        <div className="content-container max-w-2xl">
          <span className="inline-block bg-white text-[#7FAF8E] text-sm font-medium px-4 py-1.5 rounded-full mb-4 shadow-sm">
            🚚 Fast & Reliable
          </span>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Shipping Information</h1>
          <p className="text-gray-600">Everything you need to know about how we get your order to you.</p>
        </div>
      </section>

      {/* Free shipping banner */}
      <section className="bg-[#7FAF8E] py-5 text-white text-center">
        <p className="font-semibold text-lg">{free > 0 ? `🎉 FREE shipping on orders above ${inr(free)}` : '🎉 FREE shipping on every order'}</p>
        {free > 0 && <p className="text-white/80 text-sm mt-1">Flat {inr(rate)} delivery for orders below {inr(free)}</p>}
      </section>

      {/* Delivery zones */}
      <section className="py-14 bg-[#F7F7F5]">
        <div className="content-container max-w-4xl">
          <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">Delivery Timelines</h2>
          <p className="text-gray-500 text-center mb-8">Estimated delivery times by location</p>
          <div className="grid md:grid-cols-3 gap-5">
            {zones.map((z) => (
              <div key={z.zone} className="bg-white rounded-2xl p-6 shadow-sm text-center">
                <div className="text-4xl mb-3">{z.icon}</div>
                <h3 className="font-semibold text-gray-800 mb-1">{z.zone}</h3>
                <p className="text-xs text-gray-400 mb-3">{z.cities}</p>
                <div className="bg-[#DDEBE7] text-[#7FAF8E] font-bold text-lg rounded-xl py-2">
                  {z.days}
                </div>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-gray-400 mt-4">* Business days only. Excludes public holidays.</p>
        </div>
      </section>

      {/* How it works */}
      <section className="py-14 bg-white">
        <div className="content-container max-w-3xl">
          <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">How Your Order Gets to You</h2>
          <p className="text-gray-500 text-center mb-10">From click to doorstep</p>
          <div className="space-y-4">
            {steps.map((s, i) => (
              <div key={i} className="flex gap-4 items-start">
                <div className="w-9 h-9 rounded-full bg-[#DDEBE7] text-[#7FAF8E] font-bold flex items-center justify-center shrink-0 text-sm">
                  {s.step}
                </div>
                <div className="bg-[#F7F7F5] rounded-xl p-4 flex-1">
                  <h3 className="font-semibold text-gray-800 text-sm">{s.title}</h3>
                  <p className="text-gray-500 text-sm mt-0.5">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Details grid */}
      <section className="py-14 bg-[#F7F7F5]">
        <div className="content-container max-w-4xl">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 bg-[#DDEBE7] rounded-xl flex items-center justify-center">
                  <Package className="w-5 h-5 text-[#7FAF8E]" />
                </div>
                <h3 className="font-semibold text-gray-800">Courier Partners</h3>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed">
                We ship with Delhivery, BlueDart, and DTDC — India&apos;s most reliable courier networks. Your package is insured and tracked end-to-end.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 bg-[#DDEBE7] rounded-xl flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-[#7FAF8E]" />
                </div>
                <h3 className="font-semibold text-gray-800">Order Tracking</h3>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed mb-3">
                Once dispatched, you will receive an SMS and email with a tracking link. You can also track anytime from your account.
              </p>
              <Link href="/track-order" className="text-[#7FAF8E] text-sm font-medium hover:underline">
                Track your order →
              </Link>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 bg-[#DDEBE7] rounded-xl flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-[#7FAF8E]" />
                </div>
                <h3 className="font-semibold text-gray-800">Cash on Delivery</h3>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed">
                {cod ? 'Cash on Delivery is available with no extra fee. Choose it at checkout.' : 'Cash on Delivery is not available right now; pay online at checkout.'}
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 bg-[#DDEBE7] rounded-xl flex items-center justify-center">
                  <Phone className="w-5 h-5 text-[#7FAF8E]" />
                </div>
                <h3 className="font-semibold text-gray-800">Shipping Issues?</h3>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed mb-3">
                Package delayed, lost, or damaged? Contact us and we will resolve it within 24 hours.
              </p>
              <Link href="/contact" className="text-[#7FAF8E] text-sm font-medium hover:underline">
                Contact support →
              </Link>
            </div>
          </div>
        </div>
      </section>

      <NewsletterSection />
    </>
  );
}
