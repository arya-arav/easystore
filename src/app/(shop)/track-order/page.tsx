'use client';

import { useState } from 'react';
import { Search, Package, CheckCircle, Truck, MapPin, Clock, AlertCircle } from 'lucide-react';
import { NewsletterSection } from '@/components/home/newsletter';
import Link from 'next/link';

const statusSteps = [
  { key: 'PENDING', label: 'Order Placed', icon: Package, desc: 'We received your order' },
  { key: 'CONFIRMED', label: 'Confirmed', icon: CheckCircle, desc: 'Payment verified' },
  { key: 'PROCESSING', label: 'Processing', icon: Clock, desc: 'Preparing your items' },
  { key: 'SHIPPED', label: 'Shipped', icon: Truck, desc: 'On the way to you' },
  { key: 'DELIVERED', label: 'Delivered', icon: MapPin, desc: 'Package delivered' },
];

const statusOrder = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'];

export default function TrackOrderPage() {
  const [orderNumber, setOrderNumber] = useState('');
  const [email, setEmail] = useState('');
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNumber.trim()) return;
    setLoading(true);
    setError('');
    setOrder(null);
    try {
      const res = await fetch(`/api/orders/track?orderNumber=${encodeURIComponent(orderNumber)}&email=${encodeURIComponent(email)}`);
      if (res.ok) {
        const data = await res.json();
        setOrder(data.order);
      } else {
        setError('Order not found. Please check your order number and email.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const currentStep = order ? statusOrder.indexOf(order.status) : -1;

  return (
    <>
      <section className="bg-[#F5F0E8] py-14 text-center">
        <div className="content-container max-w-2xl">
          <span className="inline-block bg-white text-[#7FAF8E] text-sm font-medium px-4 py-1.5 rounded-full mb-4 shadow-sm">
            📦 Real-time Tracking
          </span>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Track Your Order</h1>
          <p className="text-gray-600">Enter your order details to see the latest status.</p>
        </div>
      </section>

      <section className="py-14 bg-[#F7F7F5]">
        <div className="content-container max-w-2xl">
          {/* Search form */}
          <div className="bg-white rounded-2xl p-8 shadow-sm mb-8">
            <form onSubmit={handleTrack} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Order Number *</label>
                <input
                  type="text"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  placeholder="e.g. BB-2024-12345"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#7FAF8E] outline-none text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#7FAF8E] outline-none text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#7FAF8E] text-white py-3 rounded-xl font-semibold hover:bg-[#6a9a79] transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <Search className="w-4 h-4" />
                {loading ? 'Searching...' : 'Track Order'}
              </button>
            </form>

            {error && (
              <div className="mt-4 flex items-center gap-2 bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}
          </div>

          {/* Order result */}
          {order && (
            <div className="bg-white rounded-2xl p-8 shadow-sm space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="font-bold text-gray-900">Order #{order.orderNumber}</h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <span className="bg-[#DDEBE7] text-[#7FAF8E] text-xs font-semibold px-3 py-1.5 rounded-full">
                  {order.status.replace(/_/g, ' ')}
                </span>
              </div>

              {/* Progress */}
              <div className="relative">
                <div className="flex justify-between relative z-10">
                  {statusSteps.map((step, i) => {
                    const stepIndex = statusOrder.indexOf(step.key);
                    const done = currentStep >= stepIndex;
                    const active = currentStep === stepIndex;
                    return (
                      <div key={step.key} className="flex flex-col items-center flex-1">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center mb-2 transition-colors ${
                          done ? 'bg-[#7FAF8E] text-white' : 'bg-gray-100 text-gray-400'
                        } ${active ? 'ring-4 ring-[#DDEBE7]' : ''}`}>
                          <step.icon className="w-4 h-4" />
                        </div>
                        <span className={`text-xs font-medium text-center ${done ? 'text-[#7FAF8E]' : 'text-gray-400'}`}>
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
                {/* Progress line */}
                <div className="absolute top-4 left-[10%] right-[10%] h-0.5 bg-gray-100 -z-0">
                  <div
                    className="h-full bg-[#7FAF8E] transition-all"
                    style={{ width: `${Math.min(100, (currentStep / (statusSteps.length - 1)) * 100)}%` }}
                  />
                </div>
              </div>

              {order.trackingNumber && (
                <div className="bg-[#F7F7F5] rounded-xl p-4 text-sm">
                  <span className="text-gray-500">Tracking Number: </span>
                  <span className="font-semibold text-gray-800">{order.trackingNumber}</span>
                </div>
              )}

              {/* Status Timeline */}
              {order.statusHistory?.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-800 mb-3 text-sm">Status History</h3>
                  <div className="space-y-3">
                    {[...order.statusHistory].reverse().map((h: any, i: number) => (
                      <div key={i} className="flex gap-3 text-sm">
                        <div className="flex flex-col items-center">
                          <div className={`w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 ${i === 0 ? 'bg-[#7FAF8E]' : 'bg-gray-300'}`} />
                          {i < order.statusHistory.length - 1 && <div className="w-0.5 h-full bg-gray-200 mt-1" />}
                        </div>
                        <div className="pb-3">
                          <p className={`font-medium ${i === 0 ? 'text-[#7FAF8E]' : 'text-gray-600'}`}>
                            {h.status.replace(/_/g, ' ')}
                          </p>
                          {h.note && <p className="text-gray-400 text-xs mt-0.5">{h.note}</p>}
                          <p className="text-gray-400 text-xs mt-0.5">
                            {new Date(h.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}            </div>
          )}

          {/* Status guide */}
          {!order && (
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="font-semibold text-gray-800 mb-4">Order Status Guide</h3>
              <div className="space-y-3">
                {[
                  { emoji: '📋', status: 'Pending', desc: 'Order received, awaiting payment confirmation' },
                  { emoji: '✅', status: 'Confirmed', desc: 'Payment verified, order is being prepared' },
                  { emoji: '⚙️', status: 'Processing', desc: 'Items are being packed and labelled' },
                  { emoji: '🚚', status: 'Shipped', desc: 'Package handed to courier, tracking active' },
                  { emoji: '🏠', status: 'Out for Delivery', desc: 'Courier is on the way to your address' },
                  { emoji: '🎉', status: 'Delivered', desc: 'Package successfully delivered' },
                ].map((s) => (
                  <div key={s.status} className="flex items-start gap-3 text-sm">
                    <span className="text-lg">{s.emoji}</span>
                    <div>
                      <span className="font-medium text-gray-800">{s.status}: </span>
                      <span className="text-gray-500">{s.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5 pt-5 border-t border-gray-100 text-sm text-gray-500">
                Signed in? <Link href="/account/orders" className="text-[#7FAF8E] hover:underline font-medium">View all your orders</Link> in your account.
              </div>
            </div>
          )}
        </div>
      </section>

      <NewsletterSection />
    </>
  );
}
