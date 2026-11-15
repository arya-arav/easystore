'use client';

import { useState, useEffect } from 'react';
import { useSettings } from '@/lib/settings-context';
import { Copy, Check, Gift, Users, Star, Share2 } from 'lucide-react';
import { AccountHeader, accountButton } from '@/components/account/ui';

const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-blue-100 text-blue-700',
  REWARDED: 'bg-green-100 text-green-700',
};

export default function ReferralPage() {
  const { settings } = useSettings();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/referral').then(r => r.json()).then(d => { setData(d); setLoading(false); });
  }, []);

  const copyLink = () => {
    navigator.clipboard.writeText(data.referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareWhatsApp = () => {
    const msg = encodeURIComponent(`Shop at ${settings.storeName}! Use my referral link and we both get rewards:\n${data.referralLink}`);
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  if (loading) return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}
    </div>
  );

  const { code, referralLink, referrals = [], rewardPoints, stats = {} } = data || {};

  return (
    <div>
      <AccountHeader title="Refer & earn" description="Share your link. When a friend places their first order, you get points." />

      {/* Hero card */}
      <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl p-6 text-white mb-6">
        <div className="flex items-center gap-2 mb-2 opacity-80">
          <Gift className="w-4 h-4" />
          <span className="text-sm font-medium">Your Referral Program</span>
        </div>
        <p className="text-2xl font-bold mb-1">Earn {rewardPoints} points</p>
        <p className="text-sm opacity-80 mb-5">for every friend who places their first order</p>

        {/* Referral link */}
        <div className="bg-white/20 rounded-xl p-3 flex items-center gap-2">
          <code className="flex-1 text-sm font-mono truncate">{referralLink}</code>
          <button onClick={copyLink}
            className="flex items-center gap-1.5 bg-white text-[#7FAF8E] px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-white/90 flex-shrink-0">
            {copied ? <><Check className="w-3.5 h-3.5" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
          </button>
        </div>

        <div className="flex gap-3 mt-3">
          <button onClick={shareWhatsApp}
            className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">
            <Share2 className="w-4 h-4" /> Share on WhatsApp
          </button>
          <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-xl text-sm">
            <span className="opacity-80">Code:</span>
            <span className="font-bold tracking-wider">{code}</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { icon: Users, label: 'Total Referred', value: stats.total || 0, color: 'bg-blue-50 text-blue-600' },
          { icon: Gift, label: 'Rewarded', value: stats.rewarded || 0, color: 'bg-green-50 text-green-600' },
          { icon: Star, label: 'Points Earned', value: stats.totalPointsEarned || 0, color: 'bg-[#DDEBE7] text-[#7FAF8E]' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-[#EEEEEE] p-4 flex flex-col gap-2">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${color}`}>
              <Icon className="w-4 h-4" />
            </div>
            <p className="text-xl font-bold text-[#333333]">{value}</p>
            <p className="text-xs text-[#767676]">{label}</p>
          </div>
        ))}
      </div>

      {/* How it works */}
      <div className="bg-white rounded-2xl border border-[#EEEEEE] p-5 mb-6">
        <h3 className="font-semibold text-[#333333] mb-4">How it works</h3>
        <div className="space-y-3">
          {[
            { step: '1', text: 'Share your unique referral link with friends & family' },
            { step: '2', text: `They register and place their first order on ${settings.storeName}` },
            { step: '3', text: `You earn ${rewardPoints} loyalty points to spend on your next order` },
            { step: '4', text: 'Use your points for discounts on future orders' },
          ].map(({ step, text }) => (
            <div key={step} className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[#DDEBE7] text-[#7FAF8E] flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{step}</div>
              <p className="text-sm text-[#555555]">{text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Referral history */}
      <div className="bg-white rounded-2xl border border-[#EEEEEE] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#EEEEEE]">
          <p className="font-semibold text-[#333333]">Referral History</p>
        </div>
        {referrals.length === 0 ? (
          <div className="p-10 text-center">
            <Users className="w-10 h-10 text-[#DDDDDD] mx-auto mb-3" />
            <p className="text-sm text-[#767676]">No referrals yet — share your link to start earning!</p>
          </div>
        ) : (
          <div className="divide-y divide-[#F5F5F5]">
            {referrals.map((r: any) => (
              <div key={r.id} className="flex items-center gap-4 px-5 py-3.5">
                <div className="w-8 h-8 rounded-full bg-[#DDEBE7] flex items-center justify-center text-sm font-bold text-[#7FAF8E] flex-shrink-0">
                  {(r.referred?.name || r.referredEmail || '?')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#333333] truncate">
                    {r.referred?.name || r.referredEmail || 'Pending registration'}
                  </p>
                  <p className="text-xs text-[#767676]">{fmtDate(r.createdAt)}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {r.status === 'REWARDED' && (
                    <span className="text-xs text-[#7FAF8E] font-medium">+{r.rewardPoints} pts</span>
                  )}
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColors[r.status] || 'bg-gray-100 text-gray-500'}`}>
                    {r.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
