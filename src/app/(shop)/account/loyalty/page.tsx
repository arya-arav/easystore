'use client';

import { useState, useEffect } from 'react';
import { Star, TrendingUp, Gift, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { useMoney } from '@/lib/currency-context';
import { AccountHeader, accountButton } from '@/components/account/ui';

const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export default function LoyaltyPage() {
  const { format } = useMoney();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/loyalty').then(r => r.json()).then(d => { setData(d); setLoading(false); });
  }, []);

  if (loading) return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}
    </div>
  );

  const { balance = 0, value = 0, history = [], config = {} } = data || {};

  return (
    <div>
      <AccountHeader title="Loyalty points" description="Points you earn on delivered orders, and how to spend them at checkout." />

      {/* Balance card */}
      <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl p-6 text-white mb-6">
        <div className="flex items-center gap-2 mb-1 opacity-80">
          <Star className="w-4 h-4 fill-white" />
          <span className="text-sm font-medium">Your Points Balance</span>
        </div>
        <p className="text-5xl font-bold mb-1">{balance.toLocaleString('en-IN')}</p>
        <p className="text-sm opacity-80">Worth {format(value)}</p>
        <div className="mt-4 pt-4 border-t border-white/20 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="opacity-70">Rewards</p>
            <p className="font-semibold">{config.earnRate}% back in points</p>
          </div>
          <div>
            <p className="opacity-70">Redeem rate</p>
            <p className="font-semibold">1 pt = {format(config.redeemRate)}</p>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        {[
          { icon: TrendingUp, title: 'Earn Points', desc: `Get ${config.earnRate}% of every order back as points, credited once it’s delivered`, color: 'bg-green-50 text-green-600' },
          { icon: Gift, title: 'Redeem', desc: `Use points at checkout (min ${config.minRedeem} pts)`, color: 'bg-blue-50 text-blue-600' },
          { icon: Star, title: 'Save More', desc: `Up to ${config.maxRedeemPct}% of order value`, color: 'bg-[#DDEBE7] text-[#7FAF8E]' },
        ].map(({ icon: Icon, title, desc, color }) => (
          <div key={title} className="bg-white rounded-2xl border border-[#EEEEEE] p-4 flex gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#333333]">{title}</p>
              <p className="text-xs text-[#777777] mt-0.5">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* History */}
      <div className="bg-white rounded-2xl border border-[#EEEEEE] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#EEEEEE]">
          <p className="font-semibold text-[#333333]">Points History</p>
        </div>
        {history.length === 0 ? (
          <div className="p-10 text-center">
            <Star className="w-10 h-10 text-[#DDDDDD] mx-auto mb-3" />
            <p className="text-sm text-[#767676]">No points yet — you’ll earn points once your first order is delivered.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#F5F5F5]">
            {history.map((h: any) => (
              <div key={h.id} className="flex items-center gap-4 px-5 py-3.5">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${h.points > 0 ? 'bg-green-50' : 'bg-orange-50'}`}>
                  {h.points > 0
                    ? <ArrowUpRight className="w-4 h-4 text-green-600" />
                    : <ArrowDownLeft className="w-4 h-4 text-orange-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#333333] truncate">{h.description}</p>
                  <p className="text-xs text-[#767676]">{fmtDate(h.createdAt)}</p>
                </div>
                <span className={`text-sm font-bold flex-shrink-0 ${h.points > 0 ? 'text-green-600' : 'text-orange-500'}`}>
                  {h.points > 0 ? '+' : ''}{h.points} pts
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
