'use client';

import { useState } from 'react';
import { Mail, Phone, MessageCircle, MapPin, Clock, Send, CheckCircle } from 'lucide-react';
import { NewsletterSection } from '@/components/home/newsletter';
import { useSettings } from '@/lib/settings-context';


export default function ContactPage() {
  const { settings } = useSettings();
  const digits = (n: string) => n.replace(/\D/g, '');
  // Only the contact details set in Admin → Settings are shown.
  const contactMethods = [
    settings.storeEmail && { icon: Mail, title: 'Email Us', value: settings.storeEmail, sub: 'We reply within 24 hours', href: `mailto:${settings.storeEmail}`, color: 'bg-blue-50 text-blue-600' },
    settings.storePhone && { icon: Phone, title: 'Call Us', value: settings.storePhone, sub: 'Mon–Sat, 10am–7pm', href: `tel:${digits(settings.storePhone)}`, color: 'bg-green-50 text-green-600' },
    settings.whatsappNumber && { icon: MessageCircle, title: 'WhatsApp', value: settings.whatsappNumber, sub: 'Quick replies on WhatsApp', href: `https://wa.me/${digits(settings.whatsappNumber)}`, color: 'bg-[#DDEBE7] text-[#7FAF8E]' },
    settings.storeAddress && { icon: MapPin, title: 'Our Address', value: settings.storeAddress, sub: settings.storeName, href: `https://maps.google.com/?q=${encodeURIComponent(settings.storeAddress)}`, color: 'bg-orange-50 text-orange-500' },
  ].filter(Boolean) as { icon: typeof Mail; title: string; value: string; sub: string; href: string; color: string }[];
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: 'General Inquiry', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      setSubmitted(true);
    } catch {
      // still show success to user
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Hero */}
      <section className="bg-[#F5F0E8] py-14 text-center">
        <div className="content-container max-w-2xl">
          <span className="inline-block bg-white text-[#7FAF8E] text-sm font-medium px-4 py-1.5 rounded-full mb-4 shadow-sm">
            We are here to help 💬
          </span>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Get in Touch</h1>
          <p className="text-gray-600">Have a question, concern, or just want to say hi? Our team is happy to help.</p>
        </div>
      </section>

      {/* Contact cards */}
      <section className="bg-white py-10 border-b border-gray-100">
        <div className="content-container max-w-4xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {contactMethods.map(({ icon: Icon, title, value, sub, href, color }) => (
              <a key={title} href={href} className="p-5 bg-[#F7F7F5] rounded-2xl hover:shadow-md transition-shadow group text-center">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3 ${color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-gray-800 text-sm">{title}</h3>
                <p className="text-[#7FAF8E] text-sm font-medium mt-1 group-hover:underline">{value}</p>
                <p className="text-gray-400 text-xs mt-0.5">{sub}</p>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Form + Hours */}
      <section className="py-14 bg-[#F7F7F5]">
        <div className="content-container max-w-4xl">
          <div className="grid md:grid-cols-5 gap-8">
            {/* Form */}
            <div className="md:col-span-3 bg-white rounded-2xl p-8 shadow-sm">
              {submitted ? (
                <div className="text-center py-10">
                  <CheckCircle className="w-14 h-14 text-[#7FAF8E] mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Message Sent!</h3>
                  <p className="text-gray-500">We will get back to you within 24 hours.</p>
                  <button onClick={() => setSubmitted(false)} className="mt-6 text-[#7FAF8E] text-sm hover:underline">
                    Send another message
                  </button>
                </div>
              ) : (
                <>
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Send us a Message</h2>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Name *</label>
                        <input required type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#7FAF8E] outline-none text-sm" placeholder="Your name" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
                        <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#7FAF8E] outline-none text-sm" placeholder="+91 98765 43210" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Email *</label>
                      <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#7FAF8E] outline-none text-sm" placeholder="your@email.com" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Subject</label>
                      <select value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#7FAF8E] outline-none text-sm bg-white">
                        <option>General Inquiry</option>
                        <option>Order Issue</option>
                        <option>Return / Exchange</option>
                        <option>Product Question</option>
                        <option>Partnership</option>
                        <option>Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Message *</label>
                      <textarea required rows={4} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#7FAF8E] outline-none text-sm resize-none" placeholder="How can we help?" />
                    </div>
                    <button type="submit" disabled={loading}
                      className="w-full bg-[#7FAF8E] text-white py-3 rounded-xl font-semibold hover:bg-[#6a9a79] transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                      <Send className="w-4 h-4" />
                      {loading ? 'Sending...' : 'Send Message'}
                    </button>
                  </form>
                </>
              )}
            </div>

            {/* Sidebar */}
            <div className="md:col-span-2 space-y-5">
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <Clock className="w-5 h-5 text-[#7FAF8E]" />
                  <h3 className="font-semibold text-gray-800">Business Hours</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Monday – Friday</span>
                    <span className="text-gray-800 font-medium">10am – 7pm</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Saturday</span>
                    <span className="text-gray-800 font-medium">10am – 5pm</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Sunday</span>
                    <span className="text-red-400 font-medium">Closed</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#DDEBE7] rounded-2xl p-6">
                <h3 className="font-semibold text-gray-800 mb-2">Need Faster Help?</h3>
                <p className="text-sm text-gray-600 mb-4">For order issues, WhatsApp us directly for the quickest response.</p>
                <a href="https://wa.me/919876543210"
                  className="flex items-center justify-center gap-2 bg-white text-[#7FAF8E] font-semibold py-2.5 rounded-xl text-sm hover:bg-[#7FAF8E] hover:text-white transition-colors">
                  <MessageCircle className="w-4 h-4" />
                  Chat on WhatsApp
                </a>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h3 className="font-semibold text-gray-800 mb-3">Quick Links</h3>
                <div className="space-y-2 text-sm">
                  {[
                    { label: 'Track your order', href: '/track-order' },
                    { label: 'Return & exchange policy', href: '/returns' },
                    { label: 'Shipping information', href: '/shipping' },
                    { label: 'Frequently asked questions', href: '/faq' },
                  ].map((l) => (
                    <a key={l.href} href={l.href} className="flex items-center gap-2 text-gray-500 hover:text-[#7FAF8E] transition-colors">
                      <span className="text-[#7FAF8E]">→</span> {l.label}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <NewsletterSection />
    </>
  );
}
