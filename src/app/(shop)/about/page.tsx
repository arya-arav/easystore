import { Metadata } from 'next';
import { NewsletterSection } from '@/components/home/newsletter';
import { Shield, Truck, RotateCcw, Heart, Users, Award } from 'lucide-react';
import { getPublicSettings } from '@/lib/public-settings';
import { getShopType } from '@/lib/shop-types';

export async function generateMetadata(): Promise<Metadata> {
  const s = await getPublicSettings();
  return { title: 'About Us', description: `Learn about ${s.storeName}. ${s.footerAboutText}` };
}

export default async function AboutPage() {
  const s = await getPublicSettings();
  const type = getShopType(s.shopType);
  const rw = s.policies?.returnWindowDays ?? 7;

  const values = [
    { icon: Shield, title: type.trust[0], desc: `Every product is checked before it reaches you, so you can shop with confidence.` },
    { icon: Award, title: type.trust[1], desc: 'We work only with trusted brands and suppliers who meet our quality standards.' },
    { icon: Heart, title: 'Chosen with Care', desc: 'Our range is hand-picked. If we wouldn’t buy it ourselves, we don’t sell it.' },
    { icon: Truck, title: 'Fast Delivery', desc: 'Orders are packed quickly and shipped with reliable delivery partners.' },
    ...(rw > 0 ? [{ icon: RotateCcw, title: 'Easy Returns', desc: `Not happy? Return it within ${rw} days, hassle free.` }] : []),
    { icon: Users, title: 'Customer First', desc: 'Real people answer your questions, and your feedback shapes what we stock next.' },
  ];

  return (
    <>
      <section className="bg-[#F5F0E8] py-16 md:py-20">
        <div className="content-container max-w-4xl text-center">
          <span className="inline-block bg-white text-[#7FAF8E] text-sm font-medium px-4 py-1.5 rounded-full mb-4 shadow-sm">
            Our Story {type.emoji}
          </span>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-5 leading-tight">About {s.storeName}</h1>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto leading-relaxed">{s.footerAboutText}</p>
        </div>
      </section>

      <section className="py-14 bg-[#F7F7F5]">
        <div className="content-container max-w-3xl text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">What We Do</h2>
          <p className="text-gray-600 leading-relaxed">
            {s.storeName} is an online store for {type.name.toLowerCase()}: {type.categories.map((c) => c.name.toLowerCase()).slice(0, 4).join(', ')} and more.
            {' '}We bring together quality products at fair prices, with secure checkout, quick delivery and friendly support.
          </p>
        </div>
      </section>

      <section className="py-14 bg-white">
        <div className="content-container max-w-4xl">
          <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">Why Shop With Us</h2>
          <p className="text-gray-500 text-center mb-10">What you can expect from {s.storeName}</p>
          <div className="grid md:grid-cols-3 gap-6">
            {values.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="p-6 bg-[#F7F7F5] rounded-2xl">
                <div className="w-10 h-10 bg-[#DDEBE7] rounded-xl flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-[#7FAF8E]" />
                </div>
                <h3 className="font-semibold text-gray-800 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14 bg-[#DDEBE7]">
        <div className="content-container max-w-2xl text-center">
          <div className="text-4xl mb-4">🤝</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Our Promise to You</h2>
          <p className="text-gray-600 leading-relaxed">
            If you are ever unhappy with an order, we will make it right. Your trust is the foundation everything we do is built on.
          </p>
        </div>
      </section>

      <NewsletterSection />
    </>
  );
}
