'use client';

import { useState, useEffect } from 'react';
import { DesignTab } from './design-tab';
import { InternationalTab } from './international-tab';
import { Settings, Globe, LayoutTemplate, CreditCard, Truck, Percent, Mail, Palette, Save, CheckCircle, Home, Gift, Star, Eye, EyeOff, Layout, Loader2, Phone, Code, Upload, X, Smartphone, Banknote, AlertTriangle } from 'lucide-react';

const tabs = [
  { id: 'store', label: 'Store', icon: Settings },
  { id: 'contact', label: 'Contact', icon: Phone },
  { id: 'homepage', label: 'Homepage', icon: Home },
  { id: 'design', label: 'Design', icon: LayoutTemplate },
  { id: 'features', label: 'Features', icon: Star },
  { id: 'benefits', label: 'Benefits', icon: Star },
  { id: 'footer', label: 'Footer', icon: Layout },
  { id: 'newsletter', label: 'Newsletter', icon: Gift },
  { id: 'branding', label: 'Branding', icon: Palette },
  { id: 'custom', label: 'Custom Code', icon: Code },
  { id: 'smtp', label: 'SMTP', icon: Mail },
  { id: 'payment', label: 'Payment', icon: CreditCard },
  { id: 'international', label: 'International', icon: Globe },
  { id: 'shipping', label: 'Shipping', icon: Truck },
  { id: 'tax', label: 'Tax', icon: Percent },
];

function Switch({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onToggle}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${on ? 'bg-primary-500' : 'bg-gray-300'}`}
    >
      <span
        className={`absolute left-0 top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-6' : 'translate-x-1'}`}
      />
    </button>
  );
}

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState('store');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  const handleImageUpload = async (field: string, file: File) => {
    setUploadingField(field);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      if (res.ok) {
        const data = await res.json();
        setFormData((prev) => ({ ...prev, [field]: data.url }));
      } else {
        setError('Upload failed');
      }
    } catch {
      setError('Upload failed');
    } finally {
      setUploadingField(null);
    }
  };

  useEffect(() => {
    fetch('/api/admin/settings', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (data.storeName) {
          setFormData(data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const target = e.target;
    const name = target.name;
    const value = target.value;
    const isCheckbox = (target as HTMLInputElement).type === 'checkbox';
    setFormData((prev) => {
      const next = { ...prev, [name]: isCheckbox ? (target as HTMLInputElement).checked : value };
      // Editing the brand colour by hand after picking a theme makes it a custom theme,
      // with the header and buttons following the new colour.
      if (name === 'primaryColor' && prev.layout?.theme && /^#[0-9a-fA-F]{6}$/.test(value)) {
        next.layout = { ...prev.layout, theme: null, accentColor: value };
      }
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        window.dispatchEvent(new CustomEvent('settings-updated'));
      } else {
        setError(data.error || 'Failed to save');
      }
    } catch (err: any) {
      setError(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const [testEmailAddress, setTestEmailAddress] = useState('');

  const handleTestEmail = async () => {
    if (!formData.smtpHost || !formData.smtpUser) {
      setError('Please configure SMTP settings first');
      return;
    }
    const recipient = testEmailAddress.trim() || formData.storeEmail;
    if (!recipient) {
      setError('Enter a test email address');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'registration',
          data: { name: 'Admin', email: recipient },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        setError(data.error || 'Failed to send test email');
      }
    } catch (err: any) {
      setError(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-pink-400 focus:ring-2 focus:ring-primary-100 outline-none';
  const labelClass = 'block text-sm font-medium text-gray-700 mb-2';

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <div className="h-8 bg-gray-200 rounded w-48 animate-pulse" />
            <div className="h-4 bg-gray-200 rounded w-32 mt-2 animate-pulse" />
          </div>
          <div className="h-12 bg-gray-200 rounded-xl w-36 animate-pulse" />
        </div>
        <div className="grid lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm p-2 space-y-1">
              {[...Array(13)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          </div>
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-6 bg-gray-200 rounded w-32" />
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="h-12 bg-gray-100 rounded-xl" />
                  <div className="h-12 bg-gray-100 rounded-xl" />
                </div>
                <div className="h-24 bg-gray-100 rounded-xl" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500">Configure your store</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 disabled:opacity-50"
        >
          <Save className="w-5 h-5" />
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {saved && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-3 bg-green-500 text-white px-6 py-4 rounded-xl shadow-lg">
          <CheckCircle className="w-6 h-6" />
          <span className="font-medium">Settings saved!</span>
        </div>
      )}

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">{error}</div>}

      <div className="grid lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-sm p-2 space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-colors ${
                  activeTab === tab.id ? 'bg-primary-50 text-primary-600' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-3 space-y-6">
          {/* Store Tab */}
          {activeTab === 'store' && (
            <div className="bg-white rounded-2xl shadow-sm p-6 space-y-6">
              <h2 className="text-lg font-bold text-gray-800">Store Information</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Store Name</label>
                  <input
                    type="text"
                    name="storeName"
                    value={formData.storeName || ''}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Contact Email</label>
                  <input
                    type="email"
                    name="storeEmail"
                    value={formData.storeEmail || ''}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Phone</label>
                  <input
                    type="tel"
                    name="storePhone"
                    value={formData.storePhone || ''}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>Store Address</label>
                <textarea
                  name="storeAddress"
                  value={formData.storeAddress || ''}
                  onChange={handleChange}
                  rows={3}
                  className={inputClass}
                />
              </div>
            </div>
          )}

          {/* Contact Tab */}
          {activeTab === 'contact' && (
            <div className="bg-white rounded-2xl shadow-sm p-6 space-y-6">
              <h2 className="text-lg font-bold text-gray-800">Contact Information</h2>
              <p className="text-gray-500 text-sm">These details appear on order pages and customer support sections.</p>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Support Email</label>
                  <input
                    type="email"
                    name="storeEmail"
                    value={formData.storeEmail || ''}
                    onChange={handleChange}
                    className={inputClass}
                    placeholder="support@example.com"
                  />
                </div>
                <div>
                  <label className={labelClass}>Phone Number</label>
                  <input
                    type="tel"
                    name="storePhone"
                    value={formData.storePhone || ''}
                    onChange={handleChange}
                    className={inputClass}
                    placeholder="+91 98765 43210"
                  />
                </div>
                <div>
                  <label className={labelClass}>WhatsApp Number</label>
                  <input
                    type="tel"
                    name="whatsappNumber"
                    value={formData.whatsappNumber || ''}
                    onChange={handleChange}
                    className={inputClass}
                    placeholder="+91 98765 43210"
                  />
                  <p className="text-xs text-gray-500 mt-1">Include country code (e.g., +91 for India)</p>
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-600 mb-2">Preview</p>
                <div className="flex flex-wrap gap-4 text-sm">
                  <span className="text-gray-700">📧 {formData.storeEmail || 'support@example.com'}</span>
                  <span className="text-gray-700">📞 {formData.storePhone || '+91 98765 43210'}</span>
                  <span className="text-green-600">💬 WhatsApp: {formData.whatsappNumber || '+91 98765 43210'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Homepage Tab */}
          {activeTab === 'homepage' && (
            <div className="bg-white rounded-2xl shadow-sm p-6 space-y-6">
              <h2 className="text-lg font-bold text-gray-800">Hero Section</h2>
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Badge Text</label>
                  <input
                    type="text"
                    name="heroBadgeText"
                    value={formData.heroBadgeText || ''}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Hero Title</label>
                  <input
                    type="text"
                    name="heroTitle"
                    value={formData.heroTitle || ''}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Hero Subtitle</label>
                  <textarea
                    name="heroSubtitle"
                    value={formData.heroSubtitle || ''}
                    onChange={handleChange}
                    rows={2}
                    className={inputClass}
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>CTA Button Text</label>
                    <input
                      type="text"
                      name="heroCtaText"
                      value={formData.heroCtaText || ''}
                      onChange={handleChange}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>CTA Link</label>
                    <input
                      type="text"
                      name="heroCtaLink"
                      value={formData.heroCtaLink || ''}
                      onChange={handleChange}
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>

              {/* Hero Image Upload */}
              <div>
                <label className={labelClass}>Hero Image</label>
                <p className="text-xs text-gray-400 mb-2">Replaces the emoji placeholder. Use PNG with transparent background for best results.</p>
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center bg-gray-50">
                  {formData.heroImage ? (
                    <div className="relative inline-block">
                      <img src={formData.heroImage} alt="Hero" className="h-32 object-contain mx-auto" />
                      <button type="button" onClick={() => setFormData((p) => ({ ...p, heroImage: '' }))}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="py-4 text-gray-400">
                      <Upload className="w-6 h-6 mx-auto mb-1" />
                      <p className="text-xs">No hero image — placeholder shown</p>
                    </div>
                  )}
                  <label className="mt-3 inline-flex items-center gap-1.5 cursor-pointer bg-white border border-gray-200 text-gray-700 text-sm px-3 py-1.5 rounded-lg hover:bg-gray-50">
                    {uploadingField === 'heroImage' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    {formData.heroImage ? 'Change' : 'Upload'} Hero Image
                    <input type="file" accept="image/*" className="hidden" disabled={uploadingField === 'heroImage'}
                      onChange={(e) => { const file = e.target.files?.[0]; if (file) handleImageUpload('heroImage', file); }} />
                  </label>
                </div>
                <p className="text-xs text-gray-400 mt-1">Or paste URL:</p>
                <input type="text" name="heroImage" value={formData.heroImage || ''} onChange={handleChange}
                  className={inputClass + ' mt-1 text-sm'} placeholder="https://..." />
                {formData.heroImage && (
                  <div className="mt-3">
                    <label className="block text-xs font-medium text-gray-600 mb-2">Image Zoom: {formData.heroImageZoom || 100}%</label>
                    <input type="range" name="heroImageZoom" min="50" max="200" step="5"
                      value={formData.heroImageZoom || 100} onChange={handleChange}
                      className="w-full accent-primary-500" />
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>50% (Zoom Out)</span>
                      <span>200% (Zoom In)</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sections Toggle Tab */}
          {activeTab === 'design' && <DesignTab formData={formData} setFormData={setFormData} />}

          {/* Features Tab */}
          {activeTab === 'features' && (
            <div className="bg-white rounded-2xl shadow-sm p-6 space-y-6">
              <h2 className="text-lg font-bold text-gray-800">Feature Toggles</h2>
              <p className="text-gray-500 text-sm">Control which conversion features are active on the storefront</p>
              <div className="space-y-3">
                {[
                  { key: 'showWhatsappButton', label: 'WhatsApp Chat Button', desc: 'Floating WhatsApp button on all pages' },
                  { key: 'showUrgencyIndicators', label: 'Urgency Indicators', desc: '"X people viewing" and "Selling fast" on product pages' },
                  { key: 'showAgeShopTiles', label: 'Shop-by tiles', desc: 'Age, style or budget tiles on the homepage (depends on your store type)' },
                ].map((feature) => (
                  <label
                    key={feature.key}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100"
                  >
                    <div>
                      <span className="font-medium text-gray-800">{feature.label}</span>
                      <p className="text-sm text-gray-500">{feature.desc}</p>
                    </div>
                    <div className="relative">
                      <input
                        type="checkbox"
                        name={feature.key}
                        checked={!!formData[feature.key]}
                        onChange={handleChange}
                        className="sr-only"
                      />
                      <div className={`w-12 h-6 rounded-full transition-colors ${formData[feature.key] ? 'bg-primary-500' : 'bg-gray-300'}`}>
                        <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform mt-0.5 ${formData[feature.key] ? 'translate-x-6' : 'translate-x-0.5'}`} />
                      </div>
                    </div>
                  </label>
                ))}
              </div>
              <div className="border-t border-gray-100 pt-4">
                <h3 className="font-medium text-gray-800 mb-3">Thresholds</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Low Stock Threshold</label>
                    <input
                      type="number"
                      name="lowStockThreshold"
                      value={formData.lowStockThreshold ?? 10}
                      onChange={handleChange}
                      className={inputClass}
                      min={1}
                    />
                    <p className="text-xs text-gray-400 mt-1">Show &quot;Only X left!&quot; when stock is at or below this number</p>
                  </div>
                  <div className="text-sm text-gray-500 self-center">Free-shipping threshold and rates are in the <b>Shipping</b> tab.</div>
                  <div>
                    <label className={labelClass}>Bundle Discount (%)</label>
                    <input
                      type="number"
                      name="bundleDiscount"
                      value={formData.bundleDiscount ?? 5}
                      onChange={handleChange}
                      className={inputClass}
                      min={0}
                      max={50}
                    />
                    <p className="text-xs text-gray-400 mt-1">&quot;Frequently Bought Together&quot; bundle discount percentage</p>
                  </div>
                  <div>
                    <label className={labelClass}>Referral Reward Points</label>
                    <input
                      type="number"
                      name="referralRewardPoints"
                      value={formData.referralRewardPoints ?? 100}
                      onChange={handleChange}
                      className={inputClass}
                      min={0}
                    />
                    <p className="text-xs text-gray-400 mt-1">Points awarded to referrer when friend places first order</p>
                  </div>
                </div>
              </div>
              <div className="border-t border-gray-100 pt-4">
                <h3 className="font-medium text-gray-800 mb-3">Loyalty Points</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Reward (% of order value back as points)</label>
                    <input type="number" name="loyaltyEarnRate" value={formData.loyaltyEarnRate ?? 1}
                      onChange={handleChange} className={inputClass} min={0} max={100} step={1} />
                    <p className="text-xs text-gray-400 mt-1">e.g. 1 = 1% back: a ₹1,000 order earns ₹10 in points, credited on delivery. 0 turns earning off.</p>
                  </div>
                  <div>
                    <label className={labelClass}>₹ Value per Point (Redeem Rate)</label>
                    <input type="number" name="loyaltyRedeemRate" value={formData.loyaltyRedeemRate ?? 1}
                      onChange={handleChange} className={inputClass} min={0} step={0.1} />
                    <p className="text-xs text-gray-400 mt-1">e.g. 1 = 1 point = ₹1 discount</p>
                  </div>
                  <div>
                    <label className={labelClass}>Minimum Points to Redeem</label>
                    <input type="number" name="loyaltyMinRedeem" value={formData.loyaltyMinRedeem ?? 50}
                      onChange={handleChange} className={inputClass} min={1} />
                    <p className="text-xs text-gray-400 mt-1">User must have at least this many points to redeem</p>
                  </div>
                  <div>
                    <label className={labelClass}>Max Redeem % of Order Value</label>
                    <input type="number" name="loyaltyMaxRedeemPct" value={formData.loyaltyMaxRedeemPct ?? 20}
                      onChange={handleChange} className={inputClass} min={1} max={100} />
                    <p className="text-xs text-gray-400 mt-1">Max % of order total that can be paid with points</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Benefits Tab */}
          {activeTab === 'benefits' && (
            <div className="bg-white rounded-2xl shadow-sm p-6 space-y-6">
              <h2 className="text-lg font-bold text-gray-800">Benefits Section</h2>
              <div className="grid md:grid-cols-2 gap-6">
                {[1, 2, 3, 4].map((num) => (
                  <div key={num} className="p-4 bg-gray-50 rounded-xl space-y-3">
                    <h3 className="font-medium text-gray-700">Benefit {num}</h3>
                    <div>
                      <label className="text-sm text-gray-600">Icon (emoji)</label>
                      <input
                        type="text"
                        name={`benefit${num}Icon`}
                        value={formData[`benefit${num}Icon`] || ''}
                        onChange={handleChange}
                        className={inputClass}
                        placeholder="🚚"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Title</label>
                      <input
                        type="text"
                        name={`benefit${num}Title`}
                        value={formData[`benefit${num}Title`] || ''}
                        onChange={handleChange}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Description</label>
                      <input
                        type="text"
                        name={`benefit${num}Desc`}
                        value={formData[`benefit${num}Desc`] || ''}
                        onChange={handleChange}
                        className={inputClass}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer Tab */}
          {activeTab === 'footer' && (
            <div className="bg-white rounded-2xl shadow-sm p-6 space-y-6">
              <h2 className="text-lg font-bold text-gray-800">Footer Settings</h2>

              {/* Footer Logo */}
              <div>
                <label className={labelClass}>Footer Logo</label>
                <p className="text-xs text-gray-400 mb-2">If set, this logo appears in the footer instead of the header logo.</p>
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center bg-gray-50">
                  {formData.footerLogo ? (
                    <div className="relative inline-block">
                      <img src={formData.footerLogo} alt="Footer Logo" className="h-14 object-contain mx-auto" />
                      <button
                        type="button"
                        onClick={() => setFormData((p) => ({ ...p, footerLogo: '' }))}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="py-3 text-gray-400">
                      <Upload className="w-6 h-6 mx-auto mb-1" />
                      <p className="text-xs">No footer logo — will use header logo</p>
                    </div>
                  )}
                  <label className="mt-3 inline-flex items-center gap-1.5 cursor-pointer bg-white border border-gray-200 text-gray-700 text-sm px-3 py-1.5 rounded-lg hover:bg-gray-50">
                    {uploadingField === 'footerLogo' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    {formData.footerLogo ? 'Change' : 'Upload'} Footer Logo
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploadingField === 'footerLogo'}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload('footerLogo', file);
                      }}
                    />
                  </label>
                </div>
                <p className="text-xs text-gray-400 mt-1">Or paste URL:</p>
                <input
                  type="text"
                  name="footerLogo"
                  value={formData.footerLogo || ''}
                  onChange={handleChange}
                  className={inputClass + ' mt-1 text-sm'}
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className={labelClass}>About Text</label>
                <textarea
                  name="footerAboutText"
                  value={formData.footerAboutText || ''}
                  onChange={handleChange}
                  rows={2}
                  className={inputClass}
                />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Facebook URL</label>
                  <input
                    type="url"
                    name="facebookUrl"
                    value={formData.facebookUrl || ''}
                    onChange={handleChange}
                    className={inputClass}
                    placeholder="https://facebook.com/..."
                  />
                </div>
                <div>
                  <label className={labelClass}>Instagram URL</label>
                  <input
                    type="url"
                    name="instagramUrl"
                    value={formData.instagramUrl || ''}
                    onChange={handleChange}
                    className={inputClass}
                    placeholder="https://instagram.com/..."
                  />
                </div>
                <div>
                  <label className={labelClass}>Twitter URL</label>
                  <input
                    type="url"
                    name="twitterUrl"
                    value={formData.twitterUrl || ''}
                    onChange={handleChange}
                    className={inputClass}
                    placeholder="https://twitter.com/..."
                  />
                </div>
                <div>
                  <label className={labelClass}>YouTube URL</label>
                  <input
                    type="url"
                    name="youtubeUrl"
                    value={formData.youtubeUrl || ''}
                    onChange={handleChange}
                    className={inputClass}
                    placeholder="https://youtube.com/..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* Newsletter Tab */}
          {activeTab === 'newsletter' && (
            <div className="bg-white rounded-2xl shadow-sm p-6 space-y-6">
              <h2 className="text-lg font-bold text-gray-800">Newsletter Settings</h2>
              <div>
                <label className={labelClass}>Newsletter Title</label>
                <input
                  type="text"
                  name="newsletterTitle"
                  value={formData.newsletterTitle || ''}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Newsletter Subtitle</label>
                <input
                  type="text"
                  name="newsletterSubtitle"
                  value={formData.newsletterSubtitle || ''}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>
            </div>
          )}

          {/* Branding Tab */}
          {activeTab === 'branding' && (
            <div className="bg-white rounded-2xl shadow-sm p-6 space-y-6">
              <h2 className="text-lg font-bold text-gray-800">Branding & Colors</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {/* Logo upload */}
                <div>
                  <label className={labelClass}>Logo</label>
                  <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center bg-gray-50">
                    {formData.logo ? (
                      <div className="relative inline-block">
                        <img src={formData.logo} alt="Logo" className="h-16 object-contain mx-auto" />
                        <button
                          type="button"
                          onClick={() => setFormData((p) => ({ ...p, logo: '' }))}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="py-4 text-gray-400">
                        <Upload className="w-6 h-6 mx-auto mb-1" />
                        <p className="text-xs">No logo uploaded</p>
                      </div>
                    )}
                    <label className="mt-3 inline-flex items-center gap-1.5 cursor-pointer bg-white border border-gray-200 text-gray-700 text-sm px-3 py-1.5 rounded-lg hover:bg-gray-50">
                      {uploadingField === 'logo' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4" />
                      )}
                      {formData.logo ? 'Change' : 'Upload'} Logo
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploadingField === 'logo'}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload('logo', file);
                        }}
                      />
                    </label>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Or paste URL:</p>
                  <input
                    type="text"
                    name="logo"
                    value={formData.logo || ''}
                    onChange={handleChange}
                    className={inputClass + ' mt-1 text-sm'}
                    placeholder="/images/logo.png"
                  />
                </div>

                {/* Favicon upload */}
                <div>
                  <label className={labelClass}>Favicon</label>
                  <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center bg-gray-50">
                    {formData.favicon ? (
                      <div className="relative inline-block">
                        <img src={formData.favicon} alt="Favicon" className="h-10 w-10 object-contain mx-auto" />
                        <button
                          type="button"
                          onClick={() => setFormData((p) => ({ ...p, favicon: '' }))}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="py-4 text-gray-400">
                        <Upload className="w-6 h-6 mx-auto mb-1" />
                        <p className="text-xs">No favicon uploaded</p>
                      </div>
                    )}
                    <label className="mt-3 inline-flex items-center gap-1.5 cursor-pointer bg-white border border-gray-200 text-gray-700 text-sm px-3 py-1.5 rounded-lg hover:bg-gray-50">
                      {uploadingField === 'favicon' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4" />
                      )}
                      {formData.favicon ? 'Change' : 'Upload'} Favicon
                      <input
                        type="file"
                        accept="image/x-icon,image/png,image/svg+xml,image/*"
                        className="hidden"
                        disabled={uploadingField === 'favicon'}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload('favicon', file);
                        }}
                      />
                    </label>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Or paste URL:</p>
                  <input
                    type="text"
                    name="favicon"
                    value={formData.favicon || ''}
                    onChange={handleChange}
                    className={inputClass + ' mt-1 text-sm'}
                    placeholder="/favicon.ico"
                  />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Primary Color</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      name="primaryColor"
                      value={formData.primaryColor || '#FF6B9D'}
                      onChange={handleChange}
                      className="w-12 h-12 rounded-lg cursor-pointer"
                    />
                    <input
                      type="text"
                      name="primaryColor"
                      value={formData.primaryColor || ''}
                      onChange={handleChange}
                      className={inputClass}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Secondary Color</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      name="secondaryColor"
                      value={formData.secondaryColor || '#4ECDC4'}
                      onChange={handleChange}
                      className="w-12 h-12 rounded-lg cursor-pointer"
                    />
                    <input
                      type="text"
                      name="secondaryColor"
                      value={formData.secondaryColor || ''}
                      onChange={handleChange}
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-600 mb-2">Preview</p>
                <div className="flex gap-3">
                  <span
                    className="px-4 py-2 rounded-lg text-white font-medium"
                    style={{ backgroundColor: formData.primaryColor || '#FF6B9D' }}
                  >
                    Primary
                  </span>
                  <span
                    className="px-4 py-2 rounded-lg text-white font-medium"
                    style={{ backgroundColor: formData.secondaryColor || '#4ECDC4' }}
                  >
                    Secondary
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Custom Code Tab */}
          {activeTab === 'custom' && (
            <div className="bg-white rounded-2xl shadow-sm p-6 space-y-6">
              <h2 className="text-lg font-bold text-gray-800">Custom Code</h2>
              <p className="text-gray-500 text-sm">Add custom JavaScript or HTML code for analytics, tracking, or other purposes.</p>

              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <p className="text-sm text-yellow-800">
                  ⚠️ <strong>Warning:</strong> Only add code from trusted sources. Invalid code may break your site.
                </p>
              </div>

              <div>
                <label className={labelClass}>Head Code (inside &lt;head&gt;)</label>
                <p className="text-xs text-gray-500 mb-2">
                  This code will be injected into the &lt;head&gt; section. Use for Google Analytics, Facebook Pixel, etc.
                </p>
                <textarea
                  name="customHeadCode"
                  value={formData.customHeadCode || ''}
                  onChange={handleChange}
                  rows={8}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-pink-400 focus:ring-2 focus:ring-primary-100 outline-none font-mono text-sm bg-gray-50"
                  placeholder={`<!-- Google Analytics -->\n<script>\n  // Your tracking code here\n</script>`}
                />
              </div>

              <div>
                <label className={labelClass}>Body Code (before &lt;/body&gt;)</label>
                <p className="text-xs text-gray-500 mb-2">
                  This code will be injected before the closing &lt;/body&gt; tag. Use for chat widgets, popups, etc.
                </p>
                <textarea
                  name="customBodyCode"
                  value={formData.customBodyCode || ''}
                  onChange={handleChange}
                  rows={8}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-pink-400 focus:ring-2 focus:ring-primary-100 outline-none font-mono text-sm bg-gray-50"
                  placeholder={`<!-- Chat Widget -->\n<script>\n  // Your widget code here\n</script>`}
                />
              </div>

              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-600 mb-2">💡 Common Use Cases:</p>
                <ul className="text-sm text-gray-500 space-y-1">
                  <li>• <strong>Google Analytics:</strong> Paste the full script in Head Code</li>
                  <li>• <strong>Facebook Pixel:</strong> Paste in Head Code</li>
                  <li>• <strong>Live Chat Widgets:</strong> Paste in Body Code</li>
                  <li>• <strong>Custom CSS:</strong> Use &lt;style&gt; tags in Head Code</li>
                </ul>
              </div>
            </div>
          )}

          {/* Shipping Tab */}
          {activeTab === 'shipping' && (
            <div className="bg-white rounded-2xl shadow-sm p-6 space-y-6">
              <h2 className="text-lg font-bold text-gray-800">Shipping</h2>
              <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
                Once you set up <a href="/admin/regions" className="font-semibold underline">Regions</a>, delivery prices, free-shipping thresholds and delivery days come from each region&apos;s delivery options and these fields are no longer used.
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Free Shipping Above (₹)</label>
                  <input
                    type="number"
                    name="freeShippingAbove"
                    value={formData.freeShippingAbove ?? 499}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Base Rate (₹)</label>
                  <input
                    type="number"
                    name="baseShippingRate"
                    value={formData.baseShippingRate ?? 49}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Min Days</label>
                  <input
                    type="number"
                    name="minDeliveryDays"
                    value={formData.minDeliveryDays || 3}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Max Days</label>
                  <input
                    type="number"
                    name="maxDeliveryDays"
                    value={formData.maxDeliveryDays || 7}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tax Tab */}
          {activeTab === 'tax' && (
            <div className="bg-white rounded-2xl shadow-sm p-6 space-y-6">
              <h2 className="text-lg font-bold text-gray-800">GST Settings</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Default GST Rate (%)</label>
                  <select
                    name="defaultGstRate"
                    value={formData.defaultGstRate ?? 18}
                    onChange={handleChange}
                    className={inputClass}
                  >
                    <option value="0">0%</option>
                    <option value="5">5%</option>
                    <option value="12">12%</option>
                    <option value="18">18%</option>
                    <option value="28">28%</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>GSTIN</label>
                  <input
                    type="text"
                    name="gstin"
                    value={formData.gstin || ''}
                    onChange={handleChange}
                    className={inputClass}
                    placeholder="29AAAAA0000A1Z5"
                  />
                </div>
              </div>
              <p className="text-sm text-gray-500">
                Product prices <b>include</b> GST, as Indian consumer prices must. Invoices and orders show the GST contained in each price (price × rate ÷ (100 + rate)).
                New products use the default rate above unless you pick another on the product.
              </p>
            </div>
          )}

          {/* Payment Tab */}
          {activeTab === 'payment' && (() => {
            const pm = formData.paymentMethods || {};
            const setPm = (patch: Record<string, any>) =>
              setFormData((prev) => ({ ...prev, paymentMethods: { ...prev.paymentMethods, ...patch } }));
            const razorpayReady = !!formData.razorpayConfigured;
            const upiReady = !!(pm.upiId || '').trim();
            const stripeReady = !!formData.stripeConfigured;
            const live = {
              stripe: !!pm.stripe && stripeReady,
              online: !!pm.online && razorpayReady,
              upi: !!pm.upi && upiReady,
              cod: !!pm.cod,
            };
            const statusFor = (on: boolean, isLive: boolean, blockedReason: string) =>
              !on
                ? { text: 'Off', className: 'bg-gray-100 text-gray-500' }
                : isLive
                  ? { text: 'Live at checkout', className: 'bg-green-50 text-green-700' }
                  : { text: blockedReason, className: 'bg-amber-50 text-amber-700' };
            const methods = [
              {
                key: 'online',
                icon: CreditCard,
                title: 'Online Payment (Razorpay)',
                desc: 'Cards, UPI, net banking and wallets through Razorpay. Orders are confirmed automatically.',
                status: statusFor(!!pm.online, live.online, 'Hidden: Razorpay keys missing'),
              },
              {
                key: 'upi',
                icon: Smartphone,
                title: 'UPI Transfer (manual)',
                desc: 'Customers pay to your UPI ID after ordering. You confirm the payment in Orders.',
                status: statusFor(!!pm.upi, live.upi, 'Hidden: add a UPI ID'),
              },
              {
                key: 'stripe',
                icon: Globe,
                title: 'Card payment (Stripe) — international',
                desc: 'For orders shipping outside India. Customers pay by card, Apple Pay or Google Pay in their own currency.',
                status: statusFor(!!pm.stripe, live.stripe, 'Hidden: Stripe keys missing'),
              },
              {
                key: 'cod',
                icon: Banknote,
                title: 'Cash on Delivery',
                desc: 'Customers pay in cash when the order is delivered.',
                status: statusFor(!!pm.cod, live.cod, ''),
              },
            ];

            return (
              <div className="bg-white rounded-2xl shadow-sm p-6 space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-gray-800">Payment Methods</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Choose which payment options customers see at checkout. Changes apply as soon as you save.
                  </p>
                </div>

                <div
                  className={`flex gap-3 rounded-xl border p-4 ${
                    razorpayReady ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'
                  }`}
                >
                  {razorpayReady ? (
                    <CheckCircle className="w-5 h-5 shrink-0 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600" />
                  )}
                  <div className="text-sm">
                    <p className={`font-medium ${razorpayReady ? 'text-green-800' : 'text-amber-800'}`}>
                      {razorpayReady ? 'Razorpay is connected' : 'Razorpay is not connected'}
                    </p>
                    <p className={razorpayReady ? 'text-green-700' : 'text-amber-700'}>
                      {razorpayReady
                        ? 'Online payments can be switched on below.'
                        : 'Online payment stays hidden from customers until RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are added as Secrets in Cloudflare (Worker → Settings → Variables and Secrets).'}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {methods.map((m) => {
                    const Icon = m.icon;
                    const on = !!pm[m.key];
                    return (
                      <div
                        key={m.key}
                        className={`rounded-xl border-2 transition-colors ${on ? 'border-primary-200 bg-white' : 'border-gray-100 bg-gray-50'}`}
                      >
                        <div className="flex items-start gap-4 p-4">
                          <span
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                              on ? 'bg-primary-50 text-primary-600' : 'bg-white text-gray-400'
                            }`}
                          >
                            <Icon className="w-5 h-5" />
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-gray-800">{m.title}</span>
                              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${m.status.className}`}>
                                {m.status.text}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500 mt-1">{m.desc}</p>
                          </div>
                          <Switch on={on} onToggle={() => setPm({ [m.key]: !on })} label={m.title} />
                        </div>

                        {m.key === 'upi' && on && (
                          <div className="grid gap-4 border-t border-gray-100 p-4 md:grid-cols-2">
                            <div>
                              <label className={labelClass}>UPI ID</label>
                              <input
                                type="text"
                                value={pm.upiId || ''}
                                onChange={(e) => setPm({ upiId: e.target.value })}
                                className={inputClass}
                                placeholder="yourshop@okaxis"
                              />
                            </div>
                            <div>
                              <label className={labelClass}>Instructions for customers (optional)</label>
                              <textarea
                                value={pm.upiInstructions || ''}
                                onChange={(e) => setPm({ upiInstructions: e.target.value })}
                                rows={2}
                                className={inputClass}
                                placeholder="Send a screenshot on WhatsApp after paying."
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {!live.online && !live.upi && !live.cod && (
                  <div className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm">
                    <AlertTriangle className="w-5 h-5 shrink-0 text-red-600" />
                    <p className="text-red-700">
                      <span className="font-medium">No payment method is live.</span> Customers can&apos;t place orders until you switch one on.
                    </p>
                  </div>
                )}
              </div>
            );
          })()}

          {activeTab === 'international' && (
            <>
            <p className="mb-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
              Countries, payment methods and delivery abroad are set per region in <a href="/admin/regions" className="font-semibold underline">Regions</a> once you set them up. Keep using this tab for which currencies shoppers can switch to.
            </p>
            <InternationalTab formData={formData} setFormData={setFormData} inputClass={inputClass} labelClass={labelClass} />
            </>
          )}

          {/* SMTP Tab */}
          {activeTab === 'smtp' && (
            <div className="bg-white rounded-2xl shadow-sm p-6 space-y-6">
              <h2 className="text-lg font-bold text-gray-800">SMTP Email Settings</h2>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-1">
                <p className="text-sm text-blue-800 font-medium">💡 Quick setup guide</p>
                <p className="text-sm text-blue-700">• Gmail: host <code className="bg-blue-100 px-1 rounded">smtp.gmail.com</code>, port <code className="bg-blue-100 px-1 rounded">587</code>, use an <a href="https://myaccount.google.com/apppasswords" target="_blank" className="underline">App Password</a></p>
                <p className="text-sm text-blue-700">• Port <strong>587</strong> = STARTTLS (most providers) &nbsp;|&nbsp; Port <strong>465</strong> = SSL</p>
                <p className="text-sm text-blue-700">• SSL mode is auto-detected from port — no manual toggle needed</p>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>SMTP Host</label>
                  <input
                    type="text"
                    name="smtpHost"
                    value={formData.smtpHost || ''}
                    onChange={handleChange}
                    className={inputClass}
                    placeholder="smtp.gmail.com"
                  />
                </div>
                <div>
                  <label className={labelClass}>Port</label>
                  <select name="smtpPort" value={formData.smtpPort || 587} onChange={handleChange} className={inputClass}>
                    <option value={587}>587 — STARTTLS (recommended)</option>
                    <option value={465}>465 — SSL</option>
                    <option value={25}>25 — Plain (not recommended)</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Username</label>
                  <input
                    type="text"
                    name="smtpUser"
                    value={formData.smtpUser || ''}
                    onChange={handleChange}
                    className={inputClass}
                    placeholder="your-email@gmail.com"
                  />
                </div>
                <div>
                  <label className={labelClass}>Password / App Password</label>
                  <input
                    type="password"
                    name="smtpPassword"
                    value={formData.smtpPassword || ''}
                    onChange={handleChange}
                    className={inputClass}
                    placeholder="App password (not your login password)"
                  />
                </div>
                <div>
                  <label className={labelClass}>From Name</label>
                  <input
                    type="text"
                    name="smtpFromName"
                    value={formData.smtpFromName || ''}
                    onChange={handleChange}
                    className={inputClass}
                    placeholder={formData.storeName || "My Store"}
                  />
                </div>
                <div>
                  <label className={labelClass}>From Email</label>
                  <input
                    type="email"
                    name="smtpFromEmail"
                    value={formData.smtpFromEmail || ''}
                    onChange={handleChange}
                    className={inputClass}
                    placeholder="noreply@yourdomain.com"
                  />
                </div>
              </div>
              <div className="border-t pt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Send Test Email</p>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={testEmailAddress}
                    onChange={e => setTestEmailAddress(e.target.value)}
                    placeholder={formData.storeEmail || 'Enter email address'}
                    className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                  />
                  <button
                    type="button"
                    onClick={handleTestEmail}
                    disabled={saving}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 text-sm whitespace-nowrap"
                  >
                    {saving ? 'Sending...' : 'Send Test'}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">Leave blank to send to store email. Sends a welcome email template.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end pt-6 border-t">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 disabled:opacity-50"
        >
          <Save className="w-5 h-5" />
          {saving ? 'Saving...' : 'Save All Settings'}
        </button>
      </div>
    </div>
  );
}
