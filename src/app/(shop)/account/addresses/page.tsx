'use client';

import { useState, useEffect } from 'react';
import { AccountHeader } from '@/components/account/ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MapPin, Plus, Edit, Trash2, Home, Building, MapPinned, Check, X, Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react';

interface Address {
  id: string;
  name: string;
  phone: string;
  addressLine1: string;
  addressLine2: string | null;
  landmark?: string | null;
  city: string;
  state: string;
  pincode: string;
  type: 'HOME' | 'OFFICE' | 'OTHER';
  isDefault: boolean;
}

const indianStates = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
];

export default function AddressesPage() {
  const router = useRouter();
  const { status } = useSession();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    landmark: '',
    city: '',
    state: '',
    pincode: '',
    type: 'HOME' as 'HOME' | 'OFFICE' | 'OTHER',
    isDefault: false,
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login?redirect=/account/addresses');
      return;
    }
    if (status === 'authenticated') {
      fetchAddresses();
    }
  }, [status]);

  const fetchAddresses = async () => {
    try {
      const res = await fetch('/api/addresses');
      if (res.ok) {
        const data = await res.json();
        setAddresses(data.addresses || []);
      }
    } catch (err) {
      console.error('Failed to fetch addresses:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = editingId ? `/api/addresses?id=${editingId}` : '/api/addresses';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingId ? { id: editingId, ...formData } : formData),
      });

      if (res.ok) {
        await fetchAddresses();
        setShowForm(false);
        setEditingId(null);
        resetForm();
      }
    } catch (err) {
      console.error('Failed to save address:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (address: Address) => {
    setFormData({
      name: address.name,
      phone: address.phone,
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2 || '',
      landmark: address.landmark || '',
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      type: address.type,
      isDefault: address.isDefault,
    });
    setEditingId(address.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this address?')) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/addresses?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setAddresses(addresses.filter(a => a.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete address:', err);
    } finally {
      setDeleting(null);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      const address = addresses.find(a => a.id === id);
      if (!address) return;

      await fetch(`/api/addresses?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...address, isDefault: true }),
      });
      await fetchAddresses();
    } catch (err) {
      console.error('Failed to set default:', err);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      addressLine1: '',
      addressLine2: '',
      landmark: '',
      city: '',
      state: '',
      pincode: '',
      type: 'HOME',
      isDefault: false,
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'HOME': return <Home className="w-4 h-4" />;
      case 'OFFICE': return <Building className="w-4 h-4" />;
      default: return <MapPinned className="w-4 h-4" />;
    }
  };

  if (loading) {
    return <div className="grid gap-4 sm:grid-cols-2">{[0, 1].map((i) => <div key={i} className="h-[200px] animate-pulse rounded-2xl bg-white" />)}</div>;
  }

  return (
    <div>
      <AccountHeader title="Shipping addresses" description="Saved addresses are ready to pick at checkout. You can add as many as you like." />

      <div className="space-y-4">
        {/* Add/Edit Form: a pop-up (bottom sheet on phones) so the list stays in place */}
        {showForm && (
          <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
            onClick={() => { setShowForm(false); setEditingId(null); resetForm(); }}
            onKeyDown={(e) => { if (e.key === 'Escape') { setShowForm(false); setEditingId(null); resetForm(); } }}>
          <div role="dialog" aria-modal="true" aria-label={editingId ? 'Edit address' : 'Add address'} onClick={(e) => e.stopPropagation()}
            className="bg-white w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-[#333333]">
                {editingId ? 'Edit Address' : 'Add New Address'}
              </h2>
              <button
                onClick={() => { setShowForm(false); setEditingId(null); resetForm(); }}
                className="p-2 hover:bg-[#F7F7F5] rounded-full"
              >
                <X className="w-5 h-5 text-[#777777]" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#333333] mb-2">Full Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-[#E5E5E5] focus:border-[#7FAF8E] focus:ring-2 focus:ring-[#AFC8B8] outline-none"
                  placeholder="Recipient's name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#333333] mb-2">Phone Number *</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-[#E5E5E5] focus:border-[#7FAF8E] focus:ring-2 focus:ring-[#AFC8B8] outline-none"
                  placeholder="+91 98765 43210"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-[#333333] mb-2">Address Line 1 *</label>
                <input
                  type="text"
                  name="addressLine1"
                  value={formData.addressLine1}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-[#E5E5E5] focus:border-[#7FAF8E] focus:ring-2 focus:ring-[#AFC8B8] outline-none"
                  placeholder="House/Flat No., Building Name"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-[#333333] mb-2">Address Line 2</label>
                <input
                  type="text"
                  name="addressLine2"
                  value={formData.addressLine2}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-[#E5E5E5] focus:border-[#7FAF8E] focus:ring-2 focus:ring-[#AFC8B8] outline-none"
                  placeholder="Street, Area"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#333333] mb-2">City *</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-[#E5E5E5] focus:border-[#7FAF8E] focus:ring-2 focus:ring-[#AFC8B8] outline-none"
                  placeholder="Mumbai"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#333333] mb-2">State *</label>
                <select
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-[#E5E5E5] focus:border-[#7FAF8E] outline-none"
                >
                  <option value="">Select State</option>
                  {indianStates.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#333333] mb-2">Pincode *</label>
                <input
                  type="text"
                  name="pincode"
                  value={formData.pincode}
                  onChange={handleChange}
                  required
                  pattern="[0-9]{6}"
                  className="w-full px-4 py-3 rounded-xl border border-[#E5E5E5] focus:border-[#7FAF8E] focus:ring-2 focus:ring-[#AFC8B8] outline-none"
                  placeholder="400001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#333333] mb-2">Address Type</label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-[#E5E5E5] focus:border-[#7FAF8E] outline-none"
                >
                  <option value="HOME">Home</option>
                  <option value="OFFICE">Office</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="isDefault"
                    checked={formData.isDefault}
                    onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                    className="w-4 h-4 text-[#7FAF8E] rounded"
                  />
                  <span className="text-sm text-[#777777]">Set as default address</span>
                </label>
              </div>
              <div className="md:col-span-2 flex gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3 bg-[#7FAF8E] text-white rounded-xl font-semibold hover:bg-[#6A9B7D] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Check className="w-5 h-5" /> Save Address</>}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setEditingId(null); resetForm(); }}
                  className="px-6 py-3 border border-[#E5E5E5] text-[#777777] rounded-xl font-medium hover:bg-[#F7F7F5]"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
          </div>
        )}

        {/* Addresses: a "New address" card, then one card per saved address */}
        <div className="grid gap-4 sm:grid-cols-2">
          <button type="button" onClick={() => { setShowForm(true); setEditingId(null); resetForm(); }}
            className="flex min-h-[200px] flex-col justify-between rounded-2xl border-2 border-dashed border-primary-200 bg-white p-5 text-left transition-colors hover:border-primary-400 hover:bg-primary-50/40">
            <span className="font-semibold text-text-primary">New address</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-500 text-white"><Plus className="h-5 w-5" /></span>
          </button>
          {addresses.map((address) => (
            <div key={address.id} className={`flex min-h-[200px] flex-col justify-between rounded-2xl bg-white p-5 shadow-sm ${address.isDefault ? 'ring-2 ring-primary-300' : ''}`}>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-text-primary">{address.name}</p>
                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-text-secondary">
                    {getTypeIcon(address.type)} {address.type.charAt(0) + address.type.slice(1).toLowerCase()}
                  </span>
                  {address.isDefault && <span className="rounded-full bg-primary-500 px-2 py-0.5 text-xs font-medium text-white">Default</span>}
                </div>
                <p className="mt-3 text-sm text-text-secondary">
                  {address.addressLine1}{address.addressLine2 && <>, {address.addressLine2}</>}<br />
                  {address.city}, {address.state} {address.pincode}<br />
                  {address.phone}
                </p>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
                <button onClick={() => handleEdit(address)} className="inline-flex items-center gap-1.5 text-text-secondary hover:text-text-primary"><Edit className="h-4 w-4" /> Edit</button>
                <button onClick={() => handleDelete(address.id)} disabled={deleting === address.id} className="inline-flex items-center gap-1.5 text-text-secondary hover:text-red-600 disabled:opacity-50">
                  {deleting === address.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Remove
                </button>
                {!address.isDefault && <button onClick={() => handleSetDefault(address.id)} className="font-medium text-primary-500 hover:underline">Make default</button>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
