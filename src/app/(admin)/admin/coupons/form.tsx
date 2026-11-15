'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface CouponFormProps {
  coupon?: {
    id: string;
    code: string;
    description: string | null;
    discountType: 'PERCENTAGE' | 'FIXED';
    discountValue: number;
    minOrderValue: number | null;
    maxDiscount: number | null;
    usageLimit: number | null;
    validFrom: string;
    validTo: string;
    isActive: boolean;
  };
}

export function CouponForm({ coupon }: CouponFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(() => ({
    code: coupon?.code || '',
    description: coupon?.description || '',
    discountType: coupon?.discountType || 'PERCENTAGE',
    discountValue: coupon?.discountValue || 10,
    minOrderValue: coupon?.minOrderValue || '',
    maxDiscount: coupon?.maxDiscount || '',
    usageLimit: coupon?.usageLimit || '',
    validFrom: coupon?.validFrom?.split('T')[0] || new Date().toISOString().split('T')[0],
    validTo: coupon?.validTo?.split('T')[0] || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    isActive: coupon?.isActive ?? true,
  }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = coupon ? `/api/admin/coupons/${coupon.id}` : '/api/admin/coupons';
      const method = coupon ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          discountValue: Number(formData.discountValue),
          minOrderValue: formData.minOrderValue ? Number(formData.minOrderValue) : null,
          maxDiscount: formData.maxDiscount ? Number(formData.maxDiscount) : null,
          usageLimit: formData.usageLimit ? Number(formData.usageLimit) : null,
        }),
      });

      if (res.ok) {
        toast.success(coupon ? 'Coupon updated!' : 'Coupon created!');
        router.push('/admin/coupons');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to save coupon');
      }
    } catch (error) {
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = 'w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none';
  const labelClass = 'block text-sm font-medium text-gray-700 mb-2';

  return (
    <div className="max-w-2xl mx-auto">
      <Link
        href="/admin/coupons"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Coupons
      </Link>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          {coupon ? 'Edit Coupon' : 'Create New Coupon'}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Code */}
          <div>
            <label className={labelClass}>Coupon Code *</label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              className={inputClass}
              placeholder="e.g., SAVE20"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Use uppercase letters and numbers</p>
          </div>

          {/* Description */}
          <div>
            <label className={labelClass}>Description</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className={inputClass}
              placeholder="e.g., 20% off on all toys"
            />
          </div>

          {/* Discount Type & Value */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Discount Type *</label>
              <select
                value={formData.discountType}
                onChange={(e) => setFormData({ ...formData, discountType: e.target.value as 'PERCENTAGE' | 'FIXED' })}
                className={inputClass}
              >
                <option value="PERCENTAGE">Percentage (%)</option>
                <option value="FIXED">Fixed Amount (₹)</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>
                {formData.discountType === 'PERCENTAGE' ? 'Discount %' : 'Discount Amount (₹)'} *
              </label>
              <input
                type="number"
                value={formData.discountValue}
                onChange={(e) => setFormData({ ...formData, discountValue: Number(e.target.value) })}
                className={inputClass}
                min="0"
                max={formData.discountType === 'PERCENTAGE' ? 100 : undefined}
                required
              />
            </div>
          </div>

          {/* Min Order & Max Discount */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Minimum Order Value (₹)</label>
              <input
                type="number"
                value={formData.minOrderValue}
                onChange={(e) => setFormData({ ...formData, minOrderValue: e.target.value })}
                className={inputClass}
                placeholder="e.g., 500"
                min="0"
              />
            </div>
            {formData.discountType === 'PERCENTAGE' && (
              <div>
                <label className={labelClass}>Maximum Discount (₹)</label>
                <input
                  type="number"
                  value={formData.maxDiscount}
                  onChange={(e) => setFormData({ ...formData, maxDiscount: e.target.value })}
                  className={inputClass}
                  placeholder="e.g., 200"
                  min="0"
                />
              </div>
            )}
          </div>

          {/* Usage Limit */}
          <div>
            <label className={labelClass}>Usage Limit</label>
            <input
              type="number"
              value={formData.usageLimit}
              onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
              className={inputClass}
              placeholder="Leave empty for unlimited"
              min="1"
            />
          </div>

          {/* Validity */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Valid From *</label>
              <input
                type="date"
                value={formData.validFrom}
                onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Valid To *</label>
              <input
                type="date"
                value={formData.validTo}
                onChange={(e) => setFormData({ ...formData, validTo: e.target.value })}
                className={inputClass}
                required
              />
            </div>
          </div>

          {/* Active Toggle */}
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="rounded border-gray-300 text-primary-500"
            />
            <span className="text-gray-700">Coupon is active</span>
          </label>

          {/* Submit */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 bg-primary-500 text-white py-3 rounded-xl font-medium hover:bg-primary-600 disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {loading ? 'Saving...' : 'Save Coupon'}
            </button>
            <Link
              href="/admin/coupons"
              className="px-6 py-3 border border-gray-200 rounded-xl hover:bg-gray-50"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
