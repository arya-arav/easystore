import { Metadata } from 'next';
import { NewsletterSection } from '@/components/home/newsletter';
import { Shield, Lock, Eye, Trash2 } from 'lucide-react';
import { getPublicSettings } from '@/lib/public-settings';

export const metadata: Metadata = {
  title: 'Privacy Policy',
};

const highlights = [
  { icon: Shield, title: 'We Never Sell Your Data', desc: 'Your personal information is never sold to third parties.' },
  { icon: Lock, title: 'Secure Payments', desc: 'All transactions are encrypted and processed by PCI-DSS compliant payment providers.' },
  { icon: Eye, title: 'Transparent Usage', desc: 'We only use your data to process orders and improve your experience.' },
  { icon: Trash2, title: 'Right to Delete', desc: 'You can request deletion of your account and data at any time.' },
];

const sections = [
  {
    title: '1. Information We Collect',
    items: [
      'Name, email address, and phone number',
      'Shipping and billing addresses',
      'Payment information (processed securely via Razorpay — we never store card details)',
      'Order history and product preferences',
      'Device and browser information for analytics',
    ],
  },
  {
    title: '2. How We Use Your Information',
    items: [
      'Process and deliver your orders',
      'Send order confirmations and shipping updates',
      'Respond to customer service requests',
      'Improve our products, website, and services',
      'Send promotional emails (only with your consent — you can unsubscribe anytime)',
    ],
  },
  {
    title: '3. Data Security',
    content: 'We implement industry-standard security measures including SSL encryption, secure servers, and access controls. Payment data is handled exclusively by Razorpay and is never stored on our servers.',
  },
  {
    title: '4. Cookies',
    content: 'We use cookies to remember your preferences, keep you logged in, and understand how visitors use our site. You can disable cookies in your browser settings, though some features may not work correctly.',
  },
  {
    title: '5. Third-Party Sharing',
    items: [
      'Shipping partners (Delhivery, BlueDart, DTDC) — for order delivery only',
      'Payment processors (Razorpay) — for secure transaction processing',
      'Analytics tools (anonymized, aggregated data only)',
      'We do not share your data with advertisers or data brokers',
    ],
  },
  {
    title: '6. Your Rights',
    items: [
      'Access: Request a copy of the personal data we hold about you',
      'Correction: Ask us to correct inaccurate information',
      'Deletion: Request deletion of your account and associated data',
      'Opt-out: Unsubscribe from marketing emails at any time',
    ],
  },
  {
    title: '7. Data Retention',
    content: 'We retain your data for as long as your account is active or as needed to provide services. Order records are kept for 7 years as required by Indian tax law.',
  },
  {
    title: '8. Children\'s Privacy',
    content: 'Our services are intended for adults purchasing products for children. We do not knowingly collect personal information from children under 13.',
  },
  {
    title: '9. Changes to This Policy',
    content: 'We may update this policy periodically. We will notify you of significant changes via email or a notice on our website.',
  },
  {
    title: '10. Contact Us',
    content: 'For privacy-related questions or to exercise your rights, email us at {EMAIL}{ADDRESS}.',
  },
];

export default async function PrivacyPage() {
  const st = await getPublicSettings();
  const fill = (text: string) => text
    .replace(/\{STORE\}/g, st.storeName)
    .replace(/\{EMAIL\}/g, st.storeEmail || 'the email on our Contact page')
    .replace(/\{ADDRESS\}/g, st.storeAddress ? ` or write to us at ${st.storeAddress}` : '');
  return (
    <>
      <section className="bg-[#F5F0E8] py-14 text-center">
        <div className="content-container max-w-2xl">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Privacy Policy</h1>
          <p className="text-gray-500 text-sm">Last updated: March 2026</p>
        </div>
      </section>

      {/* Highlights */}
      <section className="bg-white py-10 border-b border-gray-100">
        <div className="content-container max-w-4xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {highlights.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="text-center p-4">
                <div className="w-10 h-10 bg-[#DDEBE7] rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Icon className="w-5 h-5 text-[#7FAF8E]" />
                </div>
                <h3 className="font-semibold text-gray-800 text-sm mb-1">{title}</h3>
                <p className="text-gray-500 text-xs leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14 bg-[#F7F7F5]">
        <div className="content-container max-w-3xl">
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="bg-[#DDEBE7] px-8 py-5">
              <p className="text-sm text-gray-700">
                Your privacy matters to us. This policy explains what data we collect, how we use it, and your rights as a customer.
              </p>
            </div>
            <div className="divide-y divide-gray-100">
              {sections.map((s) => (
                <div key={s.title} className="px-8 py-6">
                  <h2 className="font-semibold text-gray-900 mb-3">{s.title}</h2>
                  {s.content && <p className="text-gray-600 text-sm leading-relaxed">{fill(s.content)}</p>}
                  {s.items && (
                    <ul className="space-y-1.5">
                      {s.items.map((item) => (
                        <li key={item} className="text-gray-600 text-sm flex items-start gap-2">
                          <span className="text-[#7FAF8E] mt-0.5">•</span>
                          {fill(item)}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <NewsletterSection />
    </>
  );
}
