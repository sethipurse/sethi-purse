'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ChevronDown, ChevronUp, ImageOff, Loader2, Plus, Sparkles, Trash2, Upload, X } from 'lucide-react';
import { BRANDS, resolveImage } from '@/lib/constants';

function normalizeColorVariants(initial) {
  const raw = initial?.colors;
  if (!raw) return [];
  if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === 'object') {
    return raw.map((c) => ({ name: c.name || '', images: Array.isArray(c.images) ? c.images : [], inStock: c.inStock !== false }));
  }
  if (Array.isArray(raw)) return raw.map((name) => ({ name: String(name), images: [], inStock: true }));
  return [];
}

const SCARCITY_MODES = [
  { value: 'off', label: 'Off — no urgency signals' },
  { value: 'low_stock', label: 'Low Stock — show stock count' },
  { value: 'high_demand', label: 'High Demand — show viewers + label' },
  { value: 'full', label: 'Full — all signals active' },
];

const SIZE_PRESETS = ['20" Cabin', '24" Medium', '28" Large', '32" XL', 'Standard', 'Small', 'Medium', 'Large'];

function Section({ title, icon, subtitle, children, collapsible = false, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="md:col-span-2 rounded-sm border border-sethi-gray200 overflow-hidden">
      <div
        className={`flex items-center justify-between px-5 py-3.5 bg-[#faf8f4] border-b border-sethi-gray200 ${collapsible ? 'cursor-pointer select-none hover:bg-[#f3ede3]' : ''}`}
        onClick={collapsible ? () => setOpen((v) => !v) : undefined}
      >
        <div className="flex items-center gap-2.5">
          <span className="text-lg">{icon}</span>
          <div>
            <p className="font-bold text-sm text-sethi-black">{title}</p>
            {subtitle && <p className="text-xs text-sethi-gray500">{subtitle}</p>}
          </div>
        </div>
        {collapsible && (open ? <ChevronUp className="h-4 w-4 text-sethi-gray500" /> : <ChevronDown className="h-4 w-4 text-sethi-gray500" />)}
      </div>
      {open && <div className="p-5 grid gap-4 md:grid-cols-2">{children}</div>}
    </div>
  );
}

export default function ProductForm({ initial, productId, onSaved }) {
  const router = useRouter();
  const [categories, setCategories] = useState([]);
  const videoInputRef = useRef(null);

  const [form, setForm] = useState({
    name: '', brand: '', category: '', mrp: '', salePrice: '', stock: '',
    description: '', imageUrl: '', imageType: 'url', featured: false,
    scarcity_mode: 'off', display_stock: '', stock_decay_speed: '0',
    viewing_min: '3', viewing_max: '12', price_lock_hours: '0',
    local_scarcity: false, scarcity_label: '', demo_video_url: '',
  });
  const [galleryImages, setGalleryImages] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [customSize, setCustomSize] = useState('');
  const [colorVariants, setColorVariants] = useState([]);
  const [newColorName, setNewColorName] = useState('');
  const [busy, setBusy] = useState(false);
  const [generatingDesc, setGeneratingDesc] = useState(false);
  const [generatingGallery, setGeneratingGallery] = useState(false);
  const [galleryProgress, setGalleryProgress] = useState(0);
  const [uploadingColor, setUploadingColor] = useState(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [imgErr, setImgErr] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/categories');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) setCategories(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Load categories failed:', err);
        if (!cancelled) { toast.error('Could not load categories. Please refresh.'); setCategories([]); }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (initial) {
      setForm({
        name: initial.name || '',
        brand: initial.brand || '',
        category: initial.category || '',
        mrp: initial.mrp ?? '',
        salePrice: initial.salePrice ?? initial.sale_price ?? initial.price ?? '',
        stock: initial.stock === null || initial.stock === undefined ? '' : initial.stock,
        description: initial.description || '',
        imageUrl: initial.imageUrl || initial.image_url || '',
        imageType: initial.imageType || 'url',
        featured: !!initial.featured,
        scarcity_mode: initial.scarcity_mode || 'off',
        display_stock: initial.display_stock ?? '',
        stock_decay_speed: initial.stock_decay_speed ?? '0',
        viewing_min: initial.viewing_min ?? '3',
        viewing_max: initial.viewing_max ?? '12',
        price_lock_hours: initial.price_lock_hours ?? '0',
        local_scarcity: !!initial.local_scarcity,
        scarcity_label: initial.scarcity_label || '',
        demo_video_url: initial.demo_video_url || '',
      });
      const rawGallery = initial.gallery_images || initial.galleryImages;
      setGalleryImages(
        Array.isArray(rawGallery)
          ? rawGallery
          : String(rawGallery || '').split(/\n|,/).map((v) => v.trim()).filter(Boolean)
      );
      const rawSizes = initial.sizes;
      setSizes(
        Array.isArray(rawSizes)
          ? rawSizes
          : String(rawSizes || '').split(',').map((v) => v.trim()).filter(Boolean)
      );
      setColorVariants(normalizeColorVariants(initial));
    }
  }, [initial]);

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Derived pricing
  const mrpNum = Number(form.mrp) || 0;
  const salePriceNum = Number(form.salePrice) || 0;
  const discountPct = mrpNum > salePriceNum && salePriceNum > 0 ? Math.round(((mrpNum - salePriceNum) / mrpNum) * 100) : 0;
  const savings = mrpNum > salePriceNum ? mrpNum - salePriceNum : 0;

  const compressImage = (file) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const maxW = 1200, maxH = 1200;
        let { width, height } = img;
        const ratio = Math.min(maxW / width, maxH / height, 1);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error('Compression failed'));
            resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }));
          },
          'image/jpeg', 0.82
        );
      };
      img.onerror = () => reject(new Error('Could not read image'));
      img.src = url;
    });

  const uploadFile = async (file, isVideo = false) => {
    const fileToUpload = isVideo ? file : await compressImage(file);
    const sizeKB = Math.round(fileToUpload.size / 1024);
    const body = new FormData();
    body.append('file', fileToUpload);
    body.append('bucket', 'products');
    const res = await fetch('/api/upload', { method: 'POST', body });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Upload failed');
    return { url: data.url, sizeKB };
  };

  const uploadMainImage = async (file) => {
    try {
      setBusy(true);
      const { url, sizeKB } = await uploadFile(file);
      if (sizeKB > 300) toast.warning(`Image is ${sizeKB}KB — WhatsApp preview works best under 300KB.`);
      update('imageUrl', url);
      setImgErr(false);
      toast.success(`Main image uploaded ✓ (${sizeKB}KB)`);
    } catch (error) { toast.error(error.message || 'Upload failed'); }
    finally { setBusy(false); }
  };

  const uploadGalleryImage = async (file) => {
    try {
      setBusy(true);
      const { url, sizeKB } = await uploadFile(file);
      setGalleryImages((prev) => [...prev, url]);
      toast.success(`Gallery image added ✓ (${sizeKB}KB)`);
    } catch (error) { toast.error(error.message || 'Upload failed'); }
    finally { setBusy(false); }
  };

  const uploadVideo = async (file) => {
    try {
      setUploadingVideo(true);
      const { url, sizeKB } = await uploadFile(file, true);
      update('demo_video_url', url);
      const sizeMB = (sizeKB / 1024).toFixed(1);
      toast.success(`Demo video uploaded ✓ (${sizeMB}MB)`);
    } catch (error) { toast.error(error.message || 'Video upload failed'); }
    finally { setUploadingVideo(false); }
  };

  const GALLERY_ANGLES = ['front', 'left-side', 'back', 'three-quarter', 'detail'];

  const generateGallery = async () => {
    if (!form.imageUrl) { toast.error('Upload a main image first'); return; }
    if (!form.name.trim()) { toast.error('Enter a product name first'); return; }
    setGeneratingGallery(true);
    setGalleryProgress(0);
    let successCount = 0;
    for (let i = 0; i < GALLERY_ANGLES.length; i++) {
      try {
        const res = await fetch('/api/generate-gallery', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl: form.imageUrl, name: form.name, brand: form.brand, category: form.category, angle: GALLERY_ANGLES[i] }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.url) {
          setGalleryImages((prev) => [...prev, data.url]);
          successCount++;
        }
      } catch (e) { console.warn(`Gallery angle ${GALLERY_ANGLES[i]} failed:`, e); }
      setGalleryProgress(i + 1);
    }
    if (successCount > 0) toast.success(`${successCount} AI photos added to gallery ✓`);
    else toast.error('Generation failed — check API keys or try again');
    setGeneratingGallery(false);
    setGalleryProgress(0);
  };

  const generateDescription = async () => {
    if (!form.name.trim()) { toast.error('Enter a product name first'); return; }
    setGeneratingDesc(true);
    try {
      const res = await fetch('/api/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, brand: form.brand, category: form.category, imageUrl: form.imageUrl }),
      });
      const data = await res.json();
      if (!res.ok || !data.description) throw new Error(data.error || 'Generation failed');
      update('description', data.description);
      toast.success('Description generated ✓');
    } catch (e) { toast.error(e.message || 'Could not generate description'); }
    finally { setGeneratingDesc(false); }
  };

  const toggleSize = (size) =>
    setSizes((prev) => prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]);

  const addCustomSize = () => {
    const s = customSize.trim();
    if (!s) return;
    if (!sizes.includes(s)) setSizes((prev) => [...prev, s]);
    setCustomSize('');
  };

  const addColorVariant = () => {
    const name = newColorName.trim();
    if (!name) { toast.error('Enter a color name first'); return; }
    if (colorVariants.some((c) => c.name.toLowerCase() === name.toLowerCase())) { toast.error('This color already exists'); return; }
    setColorVariants((prev) => [...prev, { name, images: [], inStock: true }]);
    setNewColorName('');
  };
  const removeColorVariant = (index) => setColorVariants((prev) => prev.filter((_, i) => i !== index));
  const toggleColorStock = (index) => setColorVariants((prev) => prev.map((c, i) => (i === index ? { ...c, inStock: !c.inStock } : c)));

  const uploadColorPhoto = async (index, file) => {
    try {
      setUploadingColor(index);
      const { url, sizeKB } = await uploadFile(file);
      setColorVariants((prev) => prev.map((c, i) => (i === index ? { ...c, images: [...c.images, url] } : c)));
      toast.success(`Photo added to ${colorVariants[index].name} ✓ (${sizeKB}KB)`);
    } catch (error) { toast.error(error.message || 'Upload failed'); }
    finally { setUploadingColor(null); }
  };

  const removeColorPhoto = (colorIndex, photoIndex) =>
    setColorVariants((prev) => prev.map((c, i) => i === colorIndex ? { ...c, images: c.images.filter((_, pi) => pi !== photoIndex) } : c));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.category || !form.salePrice) { toast.error('Name, category and sale price are required'); return; }
    setBusy(true);
    const payload = {
      ...form,
      mrp: form.mrp === '' ? 0 : Number(form.mrp),
      salePrice: Number(form.salePrice),
      discount_percent: discountPct,
      gallery_images: galleryImages,
      sizes,
      colors: colorVariants,
      stock: form.stock === '' ? null : Number(form.stock),
      display_stock: form.display_stock === '' ? null : Number(form.display_stock),
      stock_decay_speed: Number(form.stock_decay_speed) || 0,
      viewing_min: Number(form.viewing_min) || 3,
      viewing_max: Number(form.viewing_max) || 12,
      price_lock_hours: Number(form.price_lock_hours) || 0,
      local_scarcity: !!form.local_scarcity,
      scarcity_label: form.scarcity_label || null,
      demo_video_url: form.demo_video_url?.trim() || null,
    };
    try {
      const url = productId ? `/api/products/${encodeURIComponent(productId)}` : '/api/products';
      const method = productId ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error || `Failed to save (status ${res.status})`); return; }
      toast.success(productId ? 'Product updated' : 'Product added');
      if (onSaved) onSaved(data); else router.push('/admin/products');
    } catch (err) { console.error('Save product failed:', err); toast.error('Network error. Please try again.'); }
    finally { setBusy(false); }
  };

  const scarcityActive = form.scarcity_mode !== 'off';

  return (
    <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">

      {/* ── 1. Basic Info ── */}
      <Section title="Basic Info" icon="📋" subtitle="Name, brand and category">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1.5">Product Name *</label>
          <input value={form.name} onChange={(e) => update('name', e.target.value)}
            className="input-sethi" placeholder="e.g. American Tourister Trolley 24 inch" required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Brand</label>
          <input list="brand-list" value={form.brand} onChange={(e) => update('brand', e.target.value)}
            className="input-sethi" placeholder="e.g. American Tourister" />
          <datalist id="brand-list">{BRANDS.map((b) => <option key={b} value={b} />)}</datalist>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Category *</label>
          <select value={form.category} onChange={(e) => update('category', e.target.value)} className="input-sethi" required>
            <option value="">Select a category</option>
            {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Featured on homepage?</label>
          <div className="flex items-center h-12 gap-3">
            <button type="button" onClick={() => update('featured', !form.featured)}
              className={`relative w-14 h-7 rounded-full transition-colors ${form.featured ? 'bg-sethi-gold' : 'bg-sethi-gray200'}`}>
              <span className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${form.featured ? 'translate-x-7' : ''}`} />
            </button>
            <span className="text-sm text-sethi-gray500">{form.featured ? '⭐ Shown on homepage' : 'Not featured'}</span>
          </div>
        </div>
      </Section>

      {/* ── 2. Pricing & Stock ── */}
      <Section title="Pricing & Stock" icon="💰" subtitle="MRP, sale price and inventory">
        <div>
          <label className="block text-sm font-medium mb-1.5">MRP <span className="text-sethi-gray500 font-normal text-xs">(original price, crossed out)</span></label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sethi-gray500 text-sm">Rs.</span>
            <input type="number" min="0" value={form.mrp} onChange={(e) => update('mrp', e.target.value)}
              className="input-sethi !pl-12" placeholder="0" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Sale Price *</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sethi-gray500 text-sm">Rs.</span>
            <input type="number" min="0" value={form.salePrice} onChange={(e) => update('salePrice', e.target.value)}
              className="input-sethi !pl-12" placeholder="0" required />
          </div>
        </div>
        {discountPct > 0 && (
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 rounded bg-green-50 border border-green-200 px-4 py-2.5">
              <span className="text-green-700 font-bold text-sm">✓ {discountPct}% OFF</span>
              <span className="text-green-600 text-sm">· Customer saves Rs.{savings.toLocaleString('en-IN')}</span>
            </div>
          </div>
        )}
        <div>
          <label className="block text-sm font-medium mb-1.5">Stock Quantity <span className="text-sethi-gray500 font-normal text-xs">(blank = unlimited)</span></label>
          <input type="number" min="0" value={form.stock} onChange={(e) => update('stock', e.target.value)}
            className="input-sethi" placeholder="e.g. 10" />
        </div>
      </Section>

      {/* ── 3. Images ── */}
      <Section title="Images" icon="🖼️" subtitle="Main photo and gallery">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1.5">Main Product Image</label>
          <div className="flex gap-2 flex-wrap">
            <input value={form.imageUrl} onChange={(e) => { update('imageUrl', e.target.value); setImgErr(false); }}
              className="input-sethi flex-1 min-w-0" placeholder="Paste URL or upload →" />
            <label className={`inline-flex cursor-pointer items-center gap-2 rounded border border-sethi-gold px-4 py-2.5 text-sm font-semibold text-sethi-gold hover:bg-sethi-gold hover:text-white shrink-0 transition-colors ${busy ? 'opacity-50 pointer-events-none' : ''}`}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload
              <input type="file" accept="image/*" className="hidden" disabled={busy}
                onChange={(e) => e.target.files?.[0] && uploadMainImage(e.target.files[0])} />
            </label>
          </div>
          <div className="mt-3 w-[160px] h-[160px] rounded border border-sethi-gray200 bg-sethi-gray100 overflow-hidden flex items-center justify-center">
            {form.imageUrl && !imgErr
              /* eslint-disable-next-line @next/next/no-img-element */
              ? <img src={resolveImage(form)} alt="" className="w-full h-full object-cover" onError={() => setImgErr(true)} />
              : <div className="flex flex-col items-center gap-1 text-sethi-gray500"><ImageOff className="w-6 h-6" /><span className="text-xs">No preview</span></div>
            }
          </div>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-2">
            Gallery Images <span className="text-sethi-gray500 font-normal text-xs">({galleryImages.length} added — click thumbnail to remove)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {galleryImages.map((img, idx) => (
              <div key={idx} className="relative h-16 w-16 rounded overflow-hidden border border-sethi-gray200 group shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img} alt="" className="h-full w-full object-cover" />
                <button type="button" onClick={() => setGalleryImages((prev) => prev.filter((_, i) => i !== idx))}
                  className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                  <X className="h-4 w-4 text-white" />
                </button>
              </div>
            ))}
            <label className={`h-16 w-16 rounded border-2 border-dashed border-sethi-gold flex items-center justify-center cursor-pointer hover:bg-sethi-gold/10 transition-colors shrink-0 ${busy ? 'opacity-50 pointer-events-none' : ''}`}>
              {busy ? <Loader2 className="h-5 w-5 text-sethi-gold animate-spin" /> : <Plus className="h-5 w-5 text-sethi-gold" />}
              <input type="file" accept="image/*" className="hidden" disabled={busy}
                onChange={(e) => e.target.files?.[0] && uploadGalleryImage(e.target.files[0])} />
            </label>
          </div>
          {form.imageUrl && (
            <div className="flex flex-col gap-2">
              <button type="button" onClick={generateGallery} disabled={generatingGallery || busy}
                className="inline-flex items-center gap-2 self-start rounded border border-[#8a7060] px-4 py-2.5 text-sm font-semibold text-[#8a7060] hover:bg-[#8a7060] hover:text-white disabled:opacity-50 transition-colors">
                {generatingGallery ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {generatingGallery ? `Generating ${galleryProgress}/5 photos…` : '✨ Generate 5 AI Gallery Photos'}
              </button>
              {generatingGallery && (
                <div className="w-48 bg-sethi-gray200 rounded-full h-1">
                  <div className="bg-sethi-gold h-1 rounded-full transition-all duration-500" style={{ width: `${(galleryProgress / 5) * 100}%` }} />
                </div>
              )}
            </div>
          )}
        </div>
      </Section>

      {/* ── 4. Product Details ── */}
      <Section title="Product Details" icon="📝" subtitle="Description, available sizes and demo video">
        <div className="md:col-span-2">
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-medium">Description</label>
            <button type="button" onClick={generateDescription} disabled={generatingDesc || busy}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-sethi-gold hover:text-sethi-gold-dark disabled:opacity-50 transition-colors">
              {generatingDesc ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              {generatingDesc ? 'Generating…' : 'Generate with AI'}
            </button>
          </div>
          <textarea value={form.description} onChange={(e) => update('description', e.target.value)}
            className="input-sethi !min-h-[100px] py-3" rows={4}
            placeholder="Description will appear here — or type it manually." />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-2">Sizes</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {SIZE_PRESETS.map((s) => (
              <button key={s} type="button" onClick={() => toggleSize(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${sizes.includes(s) ? 'bg-sethi-gold border-sethi-gold text-white' : 'bg-white border-sethi-gray200 text-sethi-gray500 hover:border-sethi-gold hover:text-sethi-gold'}`}>
                {sizes.includes(s) ? '✓ ' : ''}{s}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={customSize} onChange={(e) => setCustomSize(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomSize(); } }}
              className="input-sethi flex-1" placeholder="Custom size (e.g. 22 inch)" />
            <button type="button" onClick={addCustomSize}
              className="px-3 py-2 rounded border border-sethi-gold text-sethi-gold text-sm font-semibold hover:bg-sethi-gold hover:text-white transition-colors shrink-0">
              Add
            </button>
          </div>
          {sizes.filter((s) => !SIZE_PRESETS.includes(s)).length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {sizes.filter((s) => !SIZE_PRESETS.includes(s)).map((s) => (
                <span key={s} className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-sethi-gold text-white">
                  {s}
                  <button type="button" onClick={() => setSizes((prev) => prev.filter((x) => x !== s))}><X className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1.5">
            Demo Video <span className="text-sethi-gray500 font-normal text-xs">(optional — short clip shown on product page, mp4/webm, max 50MB)</span>
          </label>
          <div className="flex gap-2 flex-wrap">
            <input value={form.demo_video_url} onChange={(e) => update('demo_video_url', e.target.value)}
              className="input-sethi flex-1 min-w-0" placeholder="Paste video URL or upload →" />
            <label className={`inline-flex cursor-pointer items-center gap-2 rounded border border-[#8a7060] px-4 py-2.5 text-sm font-semibold text-[#8a7060] hover:bg-[#8a7060] hover:text-white shrink-0 transition-colors ${uploadingVideo ? 'opacity-50 pointer-events-none' : ''}`}>
              {uploadingVideo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploadingVideo ? 'Uploading…' : 'Upload Video'}
              <input ref={videoInputRef} type="file" accept="video/mp4,video/webm,video/*" className="hidden"
                disabled={uploadingVideo} onChange={(e) => e.target.files?.[0] && uploadVideo(e.target.files[0])} />
            </label>
          </div>
          {form.demo_video_url && (
            <div className="mt-3 rounded overflow-hidden border border-sethi-gray200 bg-black" style={{ maxWidth: 280 }}>
              <video src={form.demo_video_url} muted autoPlay loop playsInline
                style={{ width: '100%', maxHeight: 180, objectFit: 'contain', display: 'block' }} />
              <div className="flex items-center justify-between px-3 py-1.5 bg-[#2c1f14]">
                <span className="text-white/60 text-xs">▶ Preview</span>
                <button type="button" onClick={() => update('demo_video_url', '')} className="text-red-400 text-xs hover:text-red-300">Remove</button>
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* ── 5. Color Variants ── */}
      <Section title="Color Variants" icon="🎨" subtitle="Each color can have its own photos and stock status" collapsible defaultOpen={true}>
        <div className="md:col-span-2">
          <div className="flex gap-2">
            <input value={newColorName} onChange={(e) => setNewColorName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addColorVariant(); } }}
              className="input-sethi flex-1" placeholder="e.g. Red, Black, Navy Blue" />
            <button type="button" onClick={addColorVariant}
              className="inline-flex items-center gap-1.5 rounded bg-sethi-gold px-4 py-2 text-sm font-semibold text-white hover:bg-sethi-gold-dark shrink-0">
              <Plus className="h-4 w-4" /> Add Color
            </button>
          </div>
          <div className="mt-4 grid gap-3">
            {colorVariants.map((color, index) => (
              <div key={index} className={`rounded-sm border p-4 transition-colors ${color.inStock ? 'border-sethi-gray200 bg-white' : 'border-red-200 bg-red-50'}`}>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base">{color.name}</span>
                    <span className="text-xs text-sethi-gray500">{color.images.length} photo{color.images.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => toggleColorStock(index)}
                      className={`relative w-12 h-6 rounded-full transition-colors ${color.inStock ? 'bg-green-500' : 'bg-red-400'}`}>
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${color.inStock ? 'translate-x-6' : ''}`} />
                    </button>
                    <span className={`text-xs font-semibold ${color.inStock ? 'text-green-700' : 'text-red-600'}`}>{color.inStock ? 'In Stock' : 'Out of Stock'}</span>
                    <button type="button" onClick={() => removeColorVariant(index)} className="text-red-500 hover:text-red-700 p-1" aria-label="Remove color">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {color.images.map((img, photoIndex) => (
                    <div key={photoIndex} className="relative w-16 h-16 rounded-sm overflow-hidden border border-sethi-gray200 group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img} alt="" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => removeColorPhoto(index, photoIndex)}
                        className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  <label className={`w-16 h-16 rounded-sm border-2 border-dashed border-sethi-gold flex items-center justify-center cursor-pointer hover:bg-sethi-gold/10 ${uploadingColor === index ? 'opacity-50 pointer-events-none' : ''}`}>
                    {uploadingColor === index ? <Loader2 className="h-5 w-5 text-sethi-gold animate-spin" /> : <Upload className="h-5 w-5 text-sethi-gold" />}
                    <input type="file" accept="image/*" className="hidden"
                      onChange={(e) => e.target.files?.[0] && uploadColorPhoto(index, e.target.files[0])} />
                  </label>
                </div>
              </div>
            ))}
            {colorVariants.length === 0 && (
              <p className="text-sm text-sethi-gray500 italic">No color variants yet. Add one above if this product comes in multiple colors.</p>
            )}
          </div>
        </div>
      </Section>

      {/* ── 6. Scarcity & Urgency (collapsed by default) ── */}
      <Section title="Scarcity & Urgency" icon="🔥" subtitle="Show urgency signals — leave off if unsure" collapsible defaultOpen={false}>
        <div>
          <label className="block text-sm font-medium mb-1.5">Urgency Mode</label>
          <select value={form.scarcity_mode} onChange={(e) => update('scarcity_mode', e.target.value)} className="input-sethi">
            {SCARCITY_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Badge Text <span className="text-sethi-gray500 font-normal text-xs">(shown as red badge)</span></label>
          <input value={form.scarcity_label} onChange={(e) => update('scarcity_label', e.target.value)}
            className="input-sethi" placeholder='e.g. "Only 3 Left!"' disabled={!scarcityActive} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Show Stock Count As <span className="text-sethi-gray500 font-normal text-xs">(what customers see)</span></label>
          <input type="number" min="1" value={form.display_stock} onChange={(e) => update('display_stock', e.target.value)}
            className="input-sethi" placeholder="e.g. 5" disabled={!scarcityActive} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Count Appears to Decrease By</label>
          <input type="number" min="0" max="10" value={form.stock_decay_speed} onChange={(e) => update('stock_decay_speed', e.target.value)}
            className="input-sethi" placeholder="0 = never changes" disabled={!scarcityActive} />
          <p className="text-xs text-sethi-gray500 mt-1">Each page view may reduce displayed count by 0 to this number (random)</p>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Show &ldquo;X–Y people viewing this&rdquo;</label>
          <div className="flex gap-2">
            <input type="number" min="1" value={form.viewing_min} onChange={(e) => update('viewing_min', e.target.value)}
              className="input-sethi" placeholder="Min (e.g. 3)" disabled={!scarcityActive} />
            <input type="number" min="1" value={form.viewing_max} onChange={(e) => update('viewing_max', e.target.value)}
              className="input-sethi" placeholder="Max (e.g. 12)" disabled={!scarcityActive} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Price Lock Duration <span className="text-sethi-gray500 font-normal text-xs">(hours, 0 = off)</span></label>
          <input type="number" min="0" value={form.price_lock_hours} onChange={(e) => update('price_lock_hours', e.target.value)}
            className="input-sethi" placeholder="0" disabled={!scarcityActive} />
          <p className="text-xs text-sethi-gray500 mt-1">Shows a countdown &ldquo;price locked for X hours&rdquo; to first-time visitors</p>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Show &ldquo;Popular in your area&rdquo;</label>
          <div className="flex items-center h-12 gap-3">
            <button type="button" onClick={() => scarcityActive && update('local_scarcity', !form.local_scarcity)}
              className={`relative w-14 h-7 rounded-full transition-colors ${form.local_scarcity && scarcityActive ? 'bg-sethi-gold' : 'bg-sethi-gray200'} ${!scarcityActive ? 'opacity-40 cursor-not-allowed' : ''}`}>
              <span className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${form.local_scarcity ? 'translate-x-7' : ''}`} />
            </button>
            <span className="text-sm text-sethi-gray500">{form.local_scarcity && scarcityActive ? 'On — shows location badge' : 'Off'}</span>
          </div>
        </div>
      </Section>

      {/* ── Submit ── */}
      <div className="md:col-span-2 flex flex-wrap gap-3 pt-2">
        <button type="submit" disabled={busy} className="btn-primary">
          {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : (productId ? 'Update Product' : 'Add Product')}
        </button>
        <button type="button" onClick={() => router.push('/admin/products')} className="btn-ghost">Cancel</button>
      </div>
    </form>
  );
}
