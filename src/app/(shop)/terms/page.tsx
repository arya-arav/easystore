import { Metadata } from 'next';
import { NewsletterSection } from '@/components/home/newsletter';
import { getPublicSettings } from '@/lib/public-settings';
import { withReturnWindow } from '@/lib/policies';

export const metadata: Metadata = {
  title: 'Terms of Service',
};

const sections = [
  {
    title: '1. Acceptance of Terms',
    content: 'By accessing and using {STORE}, you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree, please do not use our services.',
  },
  {
    title: '2. Account Responsibilities',
    content: 'You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account. Notify us immediately of any unauthorized use at {EMAIL}.',
  },
  {
    title: '3. Orders and Payment',
    items: [
      'All prices are listed in Indian Rupees (INR) and include applicable GST.',
      'We reserve the right to cancel orders due to pricing errors or stock unavailability.',
      'Payment must be received and confirmed before order fulfillment.',
      'For COD orders, payment is collected at the time of delivery.',
    ],
  },
  {
    title: '4. Shipping',
    content: 'Delivery timelines are estimates and may vary due to courier delays, public holidays, or circumstances beyond our control. We are not liable for delays caused by third-party courier partners.',
  },
  {
    title: '5. Returns and Refunds',
    content: 'We offer a 7-day return policy for eligible items. Please refer to our Returns & Exchanges page for full details. Refunds are processed within 5–7 business days after we receive and inspect the returned item.',
  },
  {
    title: '6. Product Information',
    content: 'We make every effort to display products accurately. However, colours may vary slightly due to screen calibration. Product descriptions are provided in good faith and may be updated without notice.',
  },
  {
    title: '7. Intellectual Property',
    content: 'All content on this website — including text, images, logos, and design — is owned by {STORE} and protected under applicable copyright law. Unauthorized use is prohibited.',
  },
  {
    title: '8. Limitation of Liability',
    content: '{STORE} shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of our services, to the maximum extent permitted by applicable law.',
  },
  {
    title: '9. Governing Law',
    content: 'These terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of courts in Mumbai, Maharashtra.',
  },
  {
    title: '10. Changes to Terms',
    content: 'We may update these terms from time to time. Continued use of our services after changes constitutes acceptance of the updated terms.',
  },
  {
    title: '11. Contact',
    content: 'For questions about these terms, email us at {EMAIL}{ADDRESS}.',
  },
];

export default async function TermsPage() {
  // Return window from Settings → Policies
  const st = await getPublicSettings();
  const rw = st.policies?.returnWindowDays ?? 7;
  const fill = (text: string) => withReturnWindow(text, rw)
    .replace(/\{STORE\}/g, st.storeName)
    .replace(/\{EMAIL\}/g, st.storeEmail || 'the email on our Contact page')
    .replace(/\{ADDRESS\}/g, st.storeAddress ? ` or write to us at ${st.storeAddress}` : '');
  return (
    <>
      <section className="bg-[#F5F0E8] py-14 text-center">
        <div className="content-container max-w-2xl">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Terms of Service</h1>
          <p className="text-gray-500 text-sm">Last updated: March 2026</p>
        </div>
      </section>

      <section className="py-14 bg-[#F7F7F5]">
        <div className="content-container max-w-3xl">
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="bg-[#DDEBE7] px-8 py-5">
              <p className="text-sm text-gray-700">
                Please read these terms carefully before using {st.storeName}. By placing an order or creating an account, you agree to these terms.
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
