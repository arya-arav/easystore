'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Upload, Plus, Trash2, X, Star } from 'lucide-react';
import { productStatuses, gstRates } from '@/lib/config';
import { useShopType } from '@/lib/settings-context';
import { VariantStockGrid, variantCombos, variantKey } from './variant-stock-grid';
import toast from 'react-hot-toast';
import { useBreadcrumb } from '../../../admin-layout';

interface ColorOption { name: string; hex: string; }
interface SizeOption { label: string; value: string; }

interface ProductFormProps {
  product?: any;
  categories?: any[];
}

const SIZE_GUIDE_TYPES = [
  { value: 'NONE', label: 'None' },
  { value: 'CLOTHING', label: 'Clothing' },
  { value: 'FOOTWEAR', label: 'Footwear' },
  { value: 'TOY', label: 'Toy' },
  { value: 'DIAPER', label: 'Diaper' },
];

const DEFAULT_SIZES: Record<string, SizeOption[]> = {
  CLOTHING: [
    { label: '0-3 months', value: '0-3m' }, { label: '3-6 months', value: '3-6m' },
    { label: '6-12 months', value: '6-12m' }, { label: '1-2 years', value: '1-2y' },
    { label: '2-3 years', value: '2-3y' }, { label: '3-4 years', value: '3-4y' },
    { label: '4-5 years', value: '4-5y' }, { label: '5-6 years', value: '5-6y' },
  ],
  FOOTWEAR: [
    { label: 'UK 1 (0-3m)', value: 'uk1' }, { label: 'UK 2 (3-6m)', value: 'uk2' },
    { label: 'UK 3 (6-12m)', value: 'uk3' }, { label: 'UK 4 (1-2y)', value: 'uk4' },
    { label: 'UK 5 (2-3y)', value: 'uk5' }, { label: 'UK 6 (3-4y)', value: 'uk6' },
  ],
  TOY: [
    { label: 'Small (up to 20cm)', value: 'small' }, { label: 'Medium (20-40cm)', value: 'medium' },
    { label: 'Large (40-60cm)', value: 'large' }, { label: 'XL (60cm+)', value: 'xlarge' },
  ],
  DIAPER: [
    { label: 'NB (up to 5kg)', value: 'nb' }, { label: 'S (4-8kg)', value: 's' },
    { label: 'M (6-11kg)', value: 'm' }, { label: 'L (9-14kg)', value: 'l' },
    { label: 'XL (12-17kg)', value: 'xl' },
  ],
};

const PRESET_COLORS: ColorOption[] = [
  { name: 'Soft Pink', hex: '#FFD6E0' }, { name: 'Baby Blue', hex: '#B5D8EB' },
  { name: 'Mint Green', hex: '#C4EACB' }, { name: 'Soft Yellow', hex: '#FFF4B8' },
  { name: 'Lavender', hex: '#E6D5F2' }, { name: 'Peach', hex: '#FFDAB3' },
  { name: 'Cream', hex: '#FFF8E7' }, { name: 'White', hex: '#FFFFFF' },
  { name: 'Red', hex: '#FF6B6B' }, { name: 'Orange', hex: '#FFA94D' },
  { name: 'Teal', hex: '#4ECDC4' }, { name: 'Navy', hex: '#364F6B' },
];

export function ProductForm({ product, categories = [] }: ProductFormProps) {
  const shopType = useShopType();
  const router = useRouter();
  useBreadcrumb(product?.name);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [urlError, setUrlError] = useState('');

  const [formData, setFormData] = useState({
    name: product?.name || '',
    slug: product?.slug || '',
    sku: product?.sku || '',
    description: product?.description || '',
    shortDescription: product?.shortDescription || '',
    price: product?.price || '',
    compareAtPrice: product?.compareAtPrice || '',
    costPrice: product?.costPrice || '',
    gstRate: product?.gstRate != null ? String(product.gstRate) : '', // '' = store default (Settings → Tax)
    gstInclusive: product?.gstInclusive ?? true,
    stock: product?.stock || '0',
    lowStockThreshold: product?.lowStockThreshold || '5',
    weight: product?.weight || '',
    dimensions: product?.dimensions || '',
    categoryId: product?.categoryId || '',
    ageGroup: product?.ageGroup || '',
    gender: product?.gender || 'UNISEX',
    status: product?.status || 'DRAFT',
    isFeatured: product?.isFeatured || false,
    isBestseller: product?.isBestseller || false,
    isNewArrival: product?.isNewArrival || false,
    metaTitle: product?.metaTitle || '',
    metaDescription: product?.metaDescription || '',
    sizeGuideType: product?.sizeGuideType || 'NONE',
  });

  // Organization: free-form tags and hand-picked collections
  const [tags, setTags] = useState<string>((product?.tags || []).map((t: { name: string }) => t.name).join(', '));
  const [collectionIds, setCollectionIds] = useState<string[]>((product?.collections || []).map((c: { id: string }) => c.id));
  const [allCollections, setAllCollections] = useState<{ id: string; title: string }[]>([]);
  useEffect(() => {
    fetch('/api/admin/collections').then((r) => (r.ok ? r.json() : null)).then((d) => d && setAllCollections(d.collections || [])).catch(() => {});
  }, []);

  const [images, setImages] = useState<{ url: string; alt: string; isPrimary: boolean }[]>(
    product?.images || []
  );
  const [colors, setColors] = useState<ColorOption[]>(
    product?.colors ? JSON.parse(product.colors) : []
  );
  const [sizes, setSizes] = useState<SizeOption[]>(
    product?.sizes ? JSON.parse(product.sizes) : []
  );
  // Stock per colour/size (text so a box can be left empty = not tracked)
  const [variantStock, setVariantStock] = useState<Record<string, string>>(() =>
    Object.fromEntries((product?.variants || []).map((v: { color: string; size: string; stock: number }) => [variantKey(v.color, v.size), String(v.stock)]))
  );
  const hasOptions = colors.length > 0 || sizes.length > 0;
  const variantRows = hasOptions
    ? variantCombos(colors, sizes)
        .filter((c) => (variantStock[variantKey(c.color, c.size)] ?? '') !== '')
        .map((c) => ({ ...c, stock: parseInt(variantStock[variantKey(c.color, c.size)]) || 0 }))
    : [];
  const variantTotal = variantRows.reduce((sum, r) => sum + r.stock, 0);
  const [newColorName, setNewColorName] = useState('');
  const [newColorHex, setNewColorHex] = useState('#FF6B9D');
  const [newSizeLabel, setNewSizeLabel] = useState('');
  const [activeTab, setActiveTab] = useState('basic');

  const inputClass = 'w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none';
  const labelClass = 'block text-sm font-medium text-gray-700 mb-2';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const generateSlug = () => {
    const slug = formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    setFormData(prev => ({ ...prev, slug }));
  };

  const generateSKU = async () => {
    try {
      const res = await fetch(`/api/admin/products/generate-sku?name=${encodeURIComponent(formData.name)}`);
      const data = await res.json();
      if (data.sku) setFormData(prev => ({ ...prev, sku: data.sku }));
    } catch {
      // fallback: local generation
      const prefix = formData.name.toUpperCase().replace(/[^A-Z0-9\s]/g, '').trim().split(/\s+/).slice(0, 2).map((w: string) => w.slice(0, 4)).join('');
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      const rand = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
      setFormData(prev => ({ ...prev, sku: `BB-${prefix || 'PROD'}-${rand}` }));
    }
  };

  // Image URL add
  const handleImageUrlAdd = () => {
    const url = imageUrlInput.trim();
    if (!url) { setUrlError('Please enter an image URL'); return; }
    setImages(prev => [...prev, { url, alt: '', isPrimary: prev.length === 0 }]);
    setImageUrlInput('');
    setUrlError('');
  };

  const handleImageRemove = (index: number) => {
    setImages(prev => {
      const next = prev.filter((_, i) => i !== index);
      // If we removed the primary, auto-assign to first remaining
      if (prev[index]?.isPrimary && next.length > 0) {
        next[0] = { ...next[0], isPrimary: true };
      }
      return next;
    });
  };
  const handleImagePrimary = (index: number) => setImages(prev => prev.map((img, i) => ({ ...img, isPrimary: i === index })));

  // File upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadError('');
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch('/api/upload', { method: 'POST', body: fd });
        const data = await res.json();
        if (res.ok) {
          setImages(prev => [...prev, { url: data.url, alt: file.name, isPrimary: prev.length === 0 }]);
        } else {
          setUploadError(data.error || `Failed to upload ${file.name}`);
        }
      }
    } catch {
      setUploadError('Upload failed. Check your storage configuration.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Colors
  const addColor = (preset?: ColorOption) => {
    const c = preset || { name: newColorName.trim(), hex: newColorHex };
    if (!c.name || colors.find(x => x.name === c.name)) return;
    setColors(prev => [...prev, c]);
    setNewColorName('');
  };

  // Sizes
  const addSize = () => {
    if (!newSizeLabel.trim()) return;
    const value = newSizeLabel.trim().toLowerCase().replace(/\s+/g, '-');
    if (sizes.find(s => s.value === value)) return;
    setSizes(prev => [...prev, { label: newSizeLabel.trim(), value }]);
    setNewSizeLabel('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = product ? `/api/admin/products/${product.id}` : '/api/admin/products';
      const method = product ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          images,
          colors: colors.length > 0 ? JSON.stringify(colors) : null,
          sizes: sizes.length > 0 ? JSON.stringify(sizes) : null,
          sizeGuideType: formData.sizeGuideType === 'NONE' ? null : formData.sizeGuideType,
          // Per-combination stock; an empty list means one stock number for the product
          variantStock: variantRows,
          tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
          collectionIds,
          ...(variantRows.length > 0 ? { stock: String(variantTotal) } : {}),
        }),
      });
      if (res.ok) {
        router.push('/admin/products');
        router.refresh();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to save product');
      }
    } catch {
      toast.error('Error saving product');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-2 overflow-x-auto">
        {['Basic', 'Images', 'Variants', 'Inventory', 'SEO'].map(tab => (
          <button key={tab} type="button" onClick={() => setActiveTab(tab.toLowerCase())}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.toLowerCase() ? 'bg-primary-500 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}>
            {tab}
          </button>
        ))}
      </div>

      {/* Basic Tab */}
      {activeTab === 'basic' && (
        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Product Name *</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} onBlur={() => { generateSlug(); if (!formData.sku) generateSKU(); }} required className={inputClass} placeholder="Enter product name" />
            </div>
            <div>
              <label className={labelClass}>Slug</label>
              <div className="flex gap-2">
                <input type="text" name="slug" value={formData.slug} onChange={handleChange} className={inputClass} placeholder="product-slug" />
                <button type="button" onClick={generateSlug} className="px-4 py-2 bg-gray-100 rounded-xl hover:bg-gray-200 text-sm whitespace-nowrap">Generate</button>
              </div>
            </div>
            <div>
              <label className={labelClass}>SKU *</label>
              <div className="flex gap-2">
                <input type="text" name="sku" value={formData.sku} onChange={handleChange} required className={inputClass} placeholder="BB-PROD-XXXX" />
                <button type="button" onClick={generateSKU} className="px-4 py-2 bg-gray-100 rounded-xl hover:bg-gray-200 text-sm whitespace-nowrap">Generate</button>
              </div>
            </div>
            <div>
              <label className={labelClass}>Category</label>
              <select name="categoryId" value={formData.categoryId} onChange={handleChange} className={inputClass}>
                <option value="">Select Category</option>
                {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Price (₹) *</label>
              <input type="number" name="price" value={formData.price} onChange={handleChange} required className={inputClass} placeholder="0.00" step="0.01" />
            </div>
            <div>
              <label className={labelClass}>Compare Price (₹)</label>
              <input type="number" name="compareAtPrice" value={formData.compareAtPrice} onChange={handleChange} className={inputClass} placeholder="0.00" step="0.01" />
            </div>
            {shopType.ages && (
              <div>
                <label className={labelClass}>Age group</label>
                <select name="ageGroup" value={formData.ageGroup} onChange={handleChange} className={inputClass}>
                  <option value="">Any age</option>
                  {shopType.ages.map(ag => <option key={ag.value} value={ag.value}>{ag.label}</option>)}
                </select>
              </div>
            )}
            {shopType.audience && (
              <div>
                <label className={labelClass}>{shopType.audience.label}</label>
                <select name="gender" value={formData.gender} onChange={handleChange} className={inputClass}>
                  {shopType.audience.options.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                </select>
              </div>
            )}
          </div>
          <div>
            <label className={labelClass}>Short Description</label>
            <textarea name="shortDescription" value={formData.shortDescription} onChange={handleChange} rows={2} className={inputClass} placeholder="Brief product description for listings" />
          </div>
          <div>
            <label className={labelClass}>Full Description *</label>
            <textarea name="description" value={formData.description} onChange={handleChange} required rows={6} className={inputClass} placeholder="Detailed product description" />
          </div>
          <div>
            <label className={labelClass}>Tags</label>
            <input type="text" value={tags} onChange={(e) => setTags(e.target.value)} className={inputClass} placeholder="e.g. organic cotton, gift, summer" />
            <p className="text-xs text-gray-400 mt-1">Separate with commas. Shoppers can browse a tag at /products?tag=…</p>
          </div>
          {allCollections.length > 0 && (
            <div>
              <label className={labelClass}>Collections</label>
              <div className="flex flex-wrap gap-2">
                {allCollections.map((c) => (
                  <label key={c.id} className="flex items-center gap-1.5 rounded-md border border-gray-200 px-2 py-1 text-sm">
                    <input type="checkbox" checked={collectionIds.includes(c.id)} onChange={(e) => setCollectionIds(e.target.checked ? [...collectionIds, c.id] : collectionIds.filter((x) => x !== c.id))} />
                    {c.title}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Images Tab */}
      {activeTab === 'images' && (
        <div className="space-y-5">
          {/* Upload area */}
          <div>
            <label className={labelClass}>Upload from Device</label>
            <div
              className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-primary-400 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" multiple className="hidden" />
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-600">{uploading ? 'Uploading...' : 'Click to upload images'}</p>
              <p className="text-xs text-gray-400 mt-1">PNG, JPG, WebP · Multiple files allowed</p>
            </div>
            {uploadError && <p className="text-red-500 text-sm mt-1">{uploadError}</p>}
          </div>

          {/* URL input */}
          <div>
            <label className={labelClass}>Add from URL</label>
            <div className="flex gap-2">
              <input type="text" value={imageUrlInput} onChange={e => setImageUrlInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleImageUrlAdd(); } }}
                placeholder="https://example.com/image.jpg" className={inputClass} />
              <button type="button" onClick={handleImageUrlAdd} className="px-4 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 whitespace-nowrap">
                Add
              </button>
            </div>
            {urlError && <p className="text-red-500 text-sm mt-1">{urlError}</p>}
          </div>

          {/* Image grid */}
          {images.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className={labelClass + ' mb-0'}>Product Images ({images.length})</label>
                <p className="text-xs text-gray-400">Click ★ to set as primary photo</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {images.map((img, idx) => (
                  <div
                    key={idx}
                    className={`relative rounded-xl overflow-hidden border-2 transition-all ${
                      img.isPrimary
                        ? 'border-primary-500 shadow-md shadow-primary-100'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <img src={img.url} alt={img.alt || 'Product image'} className="w-full h-28 object-cover" />

                    {/* Primary badge */}
                    {img.isPrimary && (
                      <div className="absolute top-1.5 left-1.5 flex items-center gap-1 px-2 py-0.5 bg-primary-500 text-white text-[10px] font-semibold rounded-full">
                        <Star className="w-2.5 h-2.5 fill-white" /> Primary
                      </div>
                    )}

                    {/* Action bar — always visible at bottom */}
                    <div className="absolute bottom-0 inset-x-0 flex items-center justify-between bg-black/50 px-2 py-1.5">
                      <button
                        type="button"
                        onClick={() => handleImagePrimary(idx)}
                        title={img.isPrimary ? 'Primary photo' : 'Set as primary'}
                        className={`flex items-center gap-1 text-[11px] font-medium transition-colors ${
                          img.isPrimary
                            ? 'text-yellow-300 cursor-default'
                            : 'text-white/80 hover:text-yellow-300'
                        }`}
                      >
                        <Star className={`w-3.5 h-3.5 ${img.isPrimary ? 'fill-yellow-300 text-yellow-300' : ''}`} />
                        {img.isPrimary ? 'Primary' : 'Set primary'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleImageRemove(idx)}
                        className="p-1 text-white/70 hover:text-red-400 transition-colors"
                        title="Remove image"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {!images.some(i => i.isPrimary) && (
                <p className="text-xs text-amber-600 mt-2">⚠ No primary photo set — the first image will be used by default.</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Variants Tab - Colors & Sizes */}
      {activeTab === 'variants' && (
        <div className="space-y-6">
          {/* Colors */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <p className="text-sm font-medium text-gray-700">Color Options <span className="text-gray-400 font-normal">(optional)</span></p>

            {colors.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {colors.map(c => (
                  <span key={c.name} className="flex items-center gap-1.5 px-3 py-1 bg-white border border-gray-200 rounded-full text-sm">
                    <span className="w-3.5 h-3.5 rounded-full border border-gray-300" style={{ backgroundColor: c.hex }} />
                    {c.name}
                    <button type="button" onClick={() => setColors(prev => prev.filter(x => x.name !== c.name))} className="text-gray-400 hover:text-red-500 ml-0.5">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div>
              <p className="text-xs text-gray-500 mb-2">Quick add:</p>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_COLORS.filter(p => !colors.find(c => c.name === p.name)).map(c => (
                  <button key={c.name} type="button" onClick={() => addColor(c)}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs border border-gray-200 bg-white rounded-full hover:border-primary-300">
                    <span className="w-3 h-3 rounded-full border border-gray-300" style={{ backgroundColor: c.hex }} />
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 items-center pt-1 border-t border-gray-200">
              <input type="text" value={newColorName} onChange={e => setNewColorName(e.target.value)}
                placeholder="Custom color name" className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-primary-400" />
              <input type="color" value={newColorHex} onChange={e => setNewColorHex(e.target.value)}
                className="w-9 h-9 rounded-lg border border-gray-200 cursor-pointer p-0.5" />
              <button type="button" onClick={() => addColor()} className="px-3 py-2 bg-primary-500 text-white rounded-lg text-sm hover:bg-primary-600">
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Sizes */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <p className="text-sm font-medium text-gray-700">Size Guide <span className="text-gray-400 font-normal">(optional)</span></p>

            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">Size guide type</label>
              <div className="flex flex-wrap gap-2">
                {SIZE_GUIDE_TYPES.map(t => (
                  <button key={t.value} type="button"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, sizeGuideType: t.value }));
                      if (t.value !== 'NONE' && sizes.length === 0 && DEFAULT_SIZES[t.value]) {
                        setSizes(DEFAULT_SIZES[t.value]);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                      formData.sizeGuideType === t.value ? 'bg-primary-500 text-white border-primary-500' : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300'
                    }`}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {formData.sizeGuideType !== 'NONE' && (
              <>
                {sizes.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {sizes.map(s => (
                      <span key={s.value} className="flex items-center gap-1 px-3 py-1 bg-white border border-gray-200 rounded-full text-sm">
                        {s.label}
                        <button type="button" onClick={() => setSizes(prev => prev.filter(x => x.value !== s.value))} className="text-gray-400 hover:text-red-500">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-2 items-center pt-1 border-t border-gray-200">
                  <input type="text" value={newSizeLabel} onChange={e => setNewSizeLabel(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSize(); } }}
                    placeholder="e.g. 3-6 months" className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-primary-400" />
                  <button type="button" onClick={addSize} className="px-3 py-2 bg-primary-500 text-white rounded-lg text-sm hover:bg-primary-600">
                    <Plus className="w-4 h-4" />
                  </button>
                  <button type="button" onClick={() => setSizes(DEFAULT_SIZES[formData.sizeGuideType] || [])}
                    className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300 whitespace-nowrap">
                    Load defaults
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Inventory Tab */}
      {activeTab === 'inventory' && (
        <div className="grid md:grid-cols-2 gap-4">
          {hasOptions && (
            <div className="md:col-span-2">
              <label className={labelClass}>Stock by colour / size</label>
              <VariantStockGrid colors={colors} sizes={sizes} value={variantStock} onChange={setVariantStock} />
            </div>
          )}
          <div>
            <label className={labelClass}>Stock Quantity{variantRows.length > 0 ? ' (total of the options above)' : ''}</label>
            <input type="number" name="stock" value={variantRows.length > 0 ? variantTotal : formData.stock} onChange={handleChange}
              readOnly={variantRows.length > 0} className={`${inputClass} ${variantRows.length > 0 ? 'bg-gray-50 text-gray-500' : ''}`} />
          </div>
          <div>
            <label className={labelClass}>Low Stock Alert</label>
            <input type="number" name="lowStockThreshold" value={formData.lowStockThreshold} onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Cost Price (₹)</label>
            <input type="number" name="costPrice" value={formData.costPrice} onChange={handleChange} className={inputClass} step="0.01" />
          </div>
          <div>
            <label className={labelClass}>GST Rate (%)</label>
            <select name="gstRate" value={formData.gstRate} onChange={handleChange} className={inputClass}>
              {!product && <option value="">Store default</option>}
              {gstRates.map(r => <option key={r} value={r}>{r}%</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Status</label>
            <select name="status" value={formData.status} onChange={handleChange} className={inputClass}>
              {productStatuses.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Weight (grams)</label>
            <input type="number" name="weight" value={formData.weight} onChange={handleChange} className={inputClass} placeholder="250" />
          </div>
          <div className="md:col-span-2 flex gap-6 pt-2">
            {[['isFeatured', 'Featured Product'], ['isBestseller', 'Best Seller'], ['isNewArrival', 'New Arrival']].map(([name, label]) => (
              <label key={name} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name={name} checked={(formData as any)[name]} onChange={handleChange} className="rounded text-primary-500" />
                <span className="text-sm">{label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* SEO Tab */}
      {activeTab === 'seo' && (
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Meta Title</label>
            <input type="text" name="metaTitle" value={formData.metaTitle} onChange={handleChange} className={inputClass} placeholder="SEO title for search engines" />
            <p className="text-xs text-gray-400 mt-1">{formData.metaTitle.length}/60</p>
          </div>
          <div>
            <label className={labelClass}>Meta Description</label>
            <textarea name="metaDescription" value={formData.metaDescription} onChange={handleChange} rows={3} className={inputClass} placeholder="SEO description" />
            <p className="text-xs text-gray-400 mt-1">{formData.metaDescription.length}/160</p>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4 border-t">
        <button type="button" onClick={() => router.back()} className="px-6 py-3 border border-gray-200 rounded-xl hover:bg-gray-50">
          Cancel
        </button>
        <button type="submit" disabled={saving || uploading} className="px-6 py-3 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 disabled:opacity-50 flex items-center gap-2">
          {saving ? 'Saving...' : <><Save className="w-4 h-4" /> Save Product</>}
        </button>
      </div>
    </form>
  );
}
