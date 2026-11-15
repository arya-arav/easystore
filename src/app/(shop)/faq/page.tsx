'use client';

import { useState } from 'react';
import { useSettings, useShopType } from '@/lib/settings-context';
import { useMoney } from '@/lib/currency-context';
import { withReturnWindow } from '@/lib/policies';
import { ChevronDown, Search } from 'lucide-react';
import { NewsletterSection } from '@/components/home/newsletter';

const categories = ['All', 'Orders', 'Shipping', 'Returns', 'Products', 'Payments'];

// Shipping, COD and returns answers follow Admin → Settings, so they never contradict checkout.
const baseFaqs = [
  { cat: 'Orders', q: 'How do I track my order?', a: 'Once your order ships, you will receive an email and SMS with a tracking link. You can also visit our Track Order page and enter your order number and email.' },
  { cat: 'Orders', q: 'Can I modify or cancel my order?', a: 'You can cancel from My Orders until we start packing it. To change items, cancel and order again, or contact us on WhatsApp. Once shipped, you can return it after delivery instead.' },
  { cat: 'Orders', q: 'I received a wrong or damaged item. What do I do?', a: 'We are sorry about that! Contact us within 48 hours of delivery with a photo of the item. We will arrange a replacement or full refund immediately.' },
  { cat: 'Shipping', q: 'Is free shipping available?', a: '__FREE_SHIPPING__' },
  { cat: 'Shipping', q: 'How long does delivery take?', a: 'Metro cities: 2–4 business days. Tier 2 cities: 4–6 days. Remote areas: 6–8 days. You will get an estimated delivery date at checkout.' },
  { cat: 'Shipping', q: 'Do you deliver across India?', a: 'Yes, we deliver to all 28 states and 8 union territories. Some remote pin codes may have longer delivery times.' },
  { cat: 'Shipping', q: 'Is Cash on Delivery available?', a: '__COD__' },
  { cat: 'Returns', q: 'What is your return policy?', a: 'We offer a 7-day return window from the date of delivery. Items must be unused, in original packaging, with all tags intact.' },
  { cat: 'Returns', q: 'How do I initiate a return?', a: 'Open the order in My Orders and tap "Return items", choose what you are returning and why. We will arrange the pickup. You can also email or WhatsApp us with your order number.' },
  { cat: 'Returns', q: 'When will I get my refund?', a: 'Refunds are processed within 5–7 business days after we receive and inspect the returned item. For COD orders, refunds go to your bank account via NEFT.' },
  { cat: 'Products', q: '__PRODUCTS_1__', a: '' },
  { cat: 'Products', q: '__PRODUCTS_2__', a: '' },
  { cat: 'Payments', q: 'What payment methods do you accept?', a: 'We accept Credit/Debit Cards, UPI (GPay, PhonePe, Paytm), Net Banking, Wallets, and Cash on Delivery.' },
  { cat: 'Payments', q: 'Is my payment information secure?', a: 'Yes. All payments are processed through Razorpay, which is PCI-DSS compliant. We never store your card details.' },
];

export default function FAQPage() {
  const { settings } = useSettings();
  const shopType = useShopType();
  const { format } = useMoney();
  // Product questions depend on what the shop sells.
  const productFaqs: [string, string][] = shopType.id === 'baby'
    ? [
        ['Are your products safe for babies?', 'Absolutely. All products are made from non-toxic, certified materials and checked for safety before we list them.'],
        ['How do I know which size to order?', 'Each product page has a size guide. For clothing, we recommend going one size up for babies on the higher end of the weight range.'],
      ]
    : [
        ['Are your products genuine?', `Yes. Everything we sell is ${shopType.trust[0].toLowerCase()} and quality checked before it is dispatched.`],
        shopType.audience
          ? ['How do I know which size to order?', 'Each product page lists the sizes available, with a size guide where it matters. If it doesn’t fit, you can exchange or return it.']
          : ['Do products come with a warranty or guarantee?', 'Where the brand offers a warranty, it is mentioned on the product page and covered in full. Contact us if anything goes wrong.'],
      ];
  const cod = (settings.payment?.methods || []).includes('COD');
  const faqs = baseFaqs.map((f) => (f.q === '__PRODUCTS_1__' ? { ...f, q: productFaqs[0][0], a: productFaqs[0][1] } : f.q === '__PRODUCTS_2__' ? { ...f, q: productFaqs[1][0], a: productFaqs[1][1] } : f)).map((f) => ({
    ...f,
    a: f.a === '__FREE_SHIPPING__'
      ? (settings.freeShippingAbove > 0
        ? `Yes! Orders above ${format(settings.freeShippingAbove)} ship free. Below that, delivery is ${format(settings.baseShippingRate ?? 49)}.`
        : 'Yes, every order ships free.')
      : f.a === '__COD__'
        ? (cod ? 'Yes, Cash on Delivery is available with no extra fee. Choose it at checkout.' : 'Not at the moment. You can pay online at checkout.')
        : withReturnWindow(f.a, settings.policies?.returnWindowDays ?? 7),
  }));
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const filtered = faqs.filter((f) => {
    const matchCat = activeCategory === 'All' || f.cat === activeCategory;
    const matchSearch = !search || f.q.toLowerCase().includes(search.toLowerCase()) || f.a.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <>
      {/* Hero */}
      <section className="bg-[#F5F0E8] py-14 text-center">
        <div className="content-container max-w-2xl">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Frequently Asked Questions</h1>
          <p className="text-gray-600 mb-8">Find quick answers to the most common questions.</p>
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search questions..."
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-white focus:border-[#7FAF8E] outline-none text-sm"
            />
          </div>
        </div>
      </section>

      <section className="py-12 bg-[#F7F7F5]">
        <div className="content-container max-w-3xl">
          {/* Category tabs */}
          <div className="flex flex-wrap gap-2 mb-8">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeCategory === cat
                    ? 'bg-[#7FAF8E] text-white'
                    : 'bg-white text-gray-600 hover:bg-[#DDEBE7]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* FAQ list */}
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-lg">No results found for &quot;{search}&quot;</p>
              <button onClick={() => { setSearch(''); setActiveCategory('All'); }} className="mt-3 text-[#7FAF8E] text-sm hover:underline">
                Clear filters
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((faq, i) => (
                <div key={i} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  <button
                    onClick={() => setOpenIndex(openIndex === i ? null : i)}
                    className="w-full px-6 py-5 flex items-center justify-between text-left gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs bg-[#DDEBE7] text-[#7FAF8E] px-2 py-0.5 rounded-full font-medium shrink-0">
                        {faq.cat}
                      </span>
                      <span className="font-medium text-gray-800 text-sm">{faq.q}</span>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${openIndex === i ? 'rotate-180' : ''}`} />
                  </button>
                  {openIndex === i && (
                    <div className="px-6 pb-5 text-gray-600 text-sm leading-relaxed border-t border-gray-50 pt-4">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Still need help */}
          <div className="mt-10 bg-[#DDEBE7] rounded-2xl p-6 text-center">
            <h3 className="font-semibold text-gray-800 mb-2">Still have questions?</h3>
            <p className="text-gray-600 text-sm mb-4">Our support team is happy to help you out.</p>
            <a href="/contact" className="inline-block bg-[#7FAF8E] text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#6a9a79] transition-colors">
              Contact Us
            </a>
          </div>
        </div>
      </section>

      <NewsletterSection />
    </>
  );
}
