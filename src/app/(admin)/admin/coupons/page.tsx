'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Edit, Trash2, Tag, Percent, IndianRupee, Calendar, Eye, EyeOff, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import { useConfirm } from '@/components/admin/overlays';
import { Badge } from '@/components/admin/ui';

interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  minOrderValue: number | null;
  maxDiscount: number | null;
  usageLimit: number | null;
  usedCount: number;
  validFrom: string;
  validTo: string;
  isActive: boolean;
}

// What shoppers see: switched off, not started, ended, used up, or live.
function couponState(c: Coupon): { label: string; tone: 'green' | 'grey' | 'orange' | 'red' } {
  const now = Date.now();
  if (!c.isActive) return { label: 'Off', tone: 'grey' };
  if (new Date(c.validTo).getTime() < now) return { label: 'Expired', tone: 'red' };
  if (new Date(c.validFrom).getTime() > now) return { label: 'Scheduled', tone: 'orange' };
  if (c.usageLimit && c.usedCount >= c.usageLimit) return { label: 'Used up', tone: 'red' };
  return { label: 'Live', tone: 'green' };
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(price);
};

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

export default function CouponsPage() {
  const confirm = useConfirm();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    try {
      const res = await fetch('/api/admin/coupons');
      const data = await res.json();
      setCoupons(data.coupons || []);
    } catch (error) {
      console.error('Failed to fetch coupons:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      await fetch(`/api/admin/coupons/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      });
      toast.success(`Coupon ${!isActive ? 'activated' : 'deactivated'}`);
      fetchCoupons();
    } catch (error) {
      toast.error('Failed to update coupon');
    }
  };

  const deleteCoupon = async (id: string) => {
    if (!(await confirm({ title: 'Are you sure you want to delete this coupon?', confirmText: 'Delete', danger: true }))) return;
    try {
      await fetch(`/api/admin/coupons/${id}`, { method: 'DELETE' });
      toast.success('Coupon deleted');
      fetchCoupons();
    } catch (error) {
      toast.error('Failed to delete coupon');
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Code copied to clipboard!');
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/4 animate-pulse" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Coupons</h1>
          <p className="text-gray-500">Manage discount codes and promotions</p>
        </div>
        <Link
          href="/admin/coupons/new"
          className="flex items-center gap-2 bg-primary-500 text-white px-4 py-2 rounded-xl font-medium hover:bg-primary-600"
        >
          <Plus className="w-5 h-5" />
          Add Coupon
        </Link>
      </div>

      {coupons.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
          <Tag className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-800 mb-2">No coupons yet</h3>
          <p className="text-gray-500 mb-6">Create discount codes to boost sales</p>
          <Link
            href="/admin/coupons/new"
            className="inline-flex items-center gap-2 bg-primary-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-primary-600"
          >
            <Plus className="w-5 h-5" />
            Create First Coupon
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {coupons.map((coupon) => (
            <div key={coupon.id} className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-4">
              {/* Code Badge */}
              <div className="flex-shrink-0">
                <button
                  onClick={() => copyCode(coupon.code)}
                  className="px-4 py-2 bg-gradient-to-r from-primary-500 to-secondary-500 text-white font-mono font-bold rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
                >
                  {coupon.code}
                  <Copy className="w-4 h-4" />
                </button>
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-gray-800">
                    {coupon.discountType === 'PERCENTAGE' ? (
                      <span className="flex items-center gap-1">
                        <Percent className="w-4 h-4 text-green-500" />
                        {Number(coupon.discountValue)}% off
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <IndianRupee className="w-4 h-4 text-green-500" />
                        {formatPrice(Number(coupon.discountValue))} off
                      </span>
                    )}
                  </span>
                  {coupon.minOrderValue && (
                    <span className="text-sm text-gray-500">
                      • Min order: {formatPrice(Number(coupon.minOrderValue))}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {formatDate(coupon.validFrom)} - {formatDate(coupon.validTo)}
                  </span>
                  {coupon.usageLimit && (
                    <span>
                      Used: {coupon.usedCount}/{coupon.usageLimit}
                    </span>
                  )}
                </div>
              </div>

              {/* Status */}
              <div className="flex-shrink-0">
                {(() => {
                  const state = couponState(coupon);
                  return <Badge tone={state.tone}>{state.label}</Badge>;
                })()}
              </div>

              {/* Actions */}
              <div className="flex-shrink-0 flex gap-2">
                <button
                  onClick={() => toggleActive(coupon.id, coupon.isActive)}
                  className={`p-2 rounded-lg ${
                    coupon.isActive
                      ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      : 'bg-green-100 text-green-600 hover:bg-green-200'
                  }`}
                  title={coupon.isActive ? 'Deactivate' : 'Activate'}
                >
                  {coupon.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <Link
                  href={`/admin/coupons/${coupon.id}`}
                  className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
                >
                  <Edit className="w-4 h-4" />
                </Link>
                <button
                  onClick={() => deleteCoupon(coupon.id)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
