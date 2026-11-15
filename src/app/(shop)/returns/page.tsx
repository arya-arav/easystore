import { Metadata } from 'next';
import { CheckCircle, XCircle, ArrowRight, RefreshCw, Clock, Mail } from 'lucide-react';
import { NewsletterSection } from '@/components/home/newsletter';
import Link from 'next/link';
import { getPublicSettings } from '@/lib/public-settings';
import { withReturnWindow } from '@/lib/policies';

export const metadata: Metadata = {
  title: 'Returns & Exchanges',
};

const eligible = [
  'Wrong product received',
  'Damaged or defective item',
  'Product not as described on the website',
  'Missing items in the package',
  'Size or colour mismatch from what was ordered',
];

const notEligible = [
  'Used, washed, or altered items',
  'Items without original packaging or tags',
  'Personalized or customized products',
  'Innerwear, diapers, and hygiene products',
  'Items returned after 7 days of delivery',
];

const steps = [
  { icon: Mail, title: 'Contact Us', desc: 'Email or WhatsApp us within 7 days of delivery with your order number and reason.' },
  { icon: RefreshCw, title: 'We Arrange Pickup', desc: 'Our team will schedule a free pickup from your address within 2 business days.' },
  { icon: CheckCircle, title: 'Inspection', desc: 'Once we receive the item, we inspect it within 1-2 business days.' },
  { icon: Clock, title: 'Refund Processed', desc: 'Refund is credited to your original payment method within 5-7 business days.' },
];

export default async function ReturnsPage() {
  // Return window from Settings → Policies
  const rw = (await getPublicSettings()).policies?.returnWindowDays ?? 7;
  const fill = (text: string) => withReturnWindow(text, rw);
  return (
    <>
      <section className="bg-[#F5F0E8] py-14 text-center">
        <div className="content-container max-w-2xl">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Returns &amp; Exchanges</h1>
          <p className="text-gray-600">Not happy with your order? We make returns simple and stress-free.</p>
        </div>
      </section>

      <section className="bg-[#7FAF8E] py-5 text-white text-center">
        <p className="font-semibold text-lg">{fill('7-Day Return Window')} - Free Pickup - Full Refund</p>
      </section>

      <section className="py-14 bg-[#F7F7F5]">
        <div className="content-container max-w-4xl">
          <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">How to Return</h2>
          <p className="text-gray-500 text-center mb-10">4 simple steps</p>
          <div className="grid md:grid-cols-4 gap-5">
            {steps.map(({ icon: Icon, title, desc }, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 shadow-sm text-center relative">
                {i < steps.length - 1 && (
                  <ArrowRight className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 z-10" />
                )}
                <div className="w-10 h-10 bg-[#DDEBE7] rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Icon className="w-5 h-5 text-[#7FAF8E]" />
                </div>
                <div className="text-xs text-[#7FAF8E] font-bold mb-1">Step {i + 1}</div>
                <h3 className="font-semibold text-gray-800 text-sm mb-1">{title}</h3>
                <p className="text-gray-500 text-xs leading-relaxed">{fill(desc)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14 bg-white">
        <div className="content-container max-w-4xl">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">What Can Be Returned?</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-green-50 rounded-2xl p-6">
              <h3 className="font-semibold text-green-700 mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5" /> Eligible for Return
              </h3>
              <ul className="space-y-2.5">
                {eligible.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-gray-700">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                    {fill(item)}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-red-50 rounded-2xl p-6">
              <h3 className="font-semibold text-red-600 mb-4 flex items-center gap-2">
                <XCircle className="w-5 h-5" /> Not Eligible for Return
              </h3>
              <ul className="space-y-2.5">
                {notEligible.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-gray-700">
                    <XCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                    {fill(item)}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="py-14 bg-[#F7F7F5]">
        <div className="content-container max-w-3xl">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Refund Details</h2>
          <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4 text-sm text-gray-600">
            <div className="flex gap-3 items-start">
              <span className="text-[#7FAF8E] font-bold shrink-0 w-36">Online Payments</span>
              <span>Refunded to your original payment method within 5-7 business days.</span>
            </div>
            <div className="border-t border-gray-100 pt-4 flex gap-3 items-start">
              <span className="text-[#7FAF8E] font-bold shrink-0 w-36">COD Orders</span>
              <span>Refunded to your bank account via NEFT within 7-10 business days.</span>
            </div>
            <div className="border-t border-gray-100 pt-4 flex gap-3 items-start">
              <span className="text-[#7FAF8E] font-bold shrink-0 w-36">Exchange</span>
              <span>We will ship the replacement once we receive the original item.</span>
            </div>
          </div>
          <div className="mt-6 bg-[#DDEBE7] rounded-2xl p-6 text-center">
            <p className="text-gray-700 font-medium mb-3">Ready to start a return?</p>
            <Link href="/contact" className="inline-block bg-[#7FAF8E] text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#6a9a79] transition-colors">
              Contact Support
            </Link>
          </div>
        </div>
      </section>

      <NewsletterSection />
    </>
  );
}