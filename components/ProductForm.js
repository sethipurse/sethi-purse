'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ImageOff, Loader2, Upload } from 'lucide-react';
import { BRANDS, resolveImage } from '@/lib/constants';

export default function ProductForm({ initial, productId, onSaved }) {
  const router = useRouter();
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    name: '',
    brand: '',
    category: '',
    mrp: '',
    salePrice: '',
    stock: '',
    description: '',
    imageUrl: '',
    galleryImages: '',
    imageType: 'url',
    sizes: '',
    colors: '',
    featured: false,
  });
  const [busy, setBusy] = useState(false);
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
        if (!cancelled) {
          toast.error('Could not load categories. Please refresh.');
          setCategories([]);
        }
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
        galleryImages: Array.isArray(initial.gallery_images || initial.galleryImages) ? (initial.gallery_images || initial.galleryImages).join('\n') : '',
        imageType: initial.imageType || 'url',
        sizes: Array.isArray(initial.sizes) ? initial.sizes.join(', ') : '',
        colors: Array.isArray(initial.colors) ? initial.colors.join(', ') : '',
        featured: !!initial.featured,
      });
    }
  }, [initial]);

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const compressImage = (file) => new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const max = 1600;
      const ratio = Math.min(1, max / Math.max(img.width, img.height));
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(url);
        if (!blob) reject(new Error('Compression failed'));
        else resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.webp'), { type: 'image/webp' }));
      }, 'image/webp', 0.82);
    };
    img.onerror = () => reject(new Error('Could not read image'));
    img.src = url;
  });

  const uploadImage = async (file, appendGallery = false) => {
    try {
      setBusy(true);
      const compressed = await compressImage(file);
      const body = new FormData();
      body.append('file', compressed);
      body.append('bucket', 'products');
      const res = await fetch('/api/upload', { method: 'POST', body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || 'Upload failed');
        return;
      }
      if (appendGallery) {
        update('galleryImages', [form.galleryImages, data.url].filter(Boolean).join('\n'));
      } else {
        update('imageUrl', data.url);
      }
      setImgErr(false);
      toast.success('Image uploaded and compressed');
    } catch (error) {
      toast.error(error.message || 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.category || !form.salePrice) {
      toast.error('Name, category and sale price are required');
      return;
    }
    setBusy(true);
    const payload = {
      ...form,
      mrp: form.mrp === '' ? 0 : Number(form.mrp),
      salePrice: Number(form.salePrice),
      gallery_images: form.galleryImages.split(/\n|,/).map((v) => v.trim()).filter(Boolean),
      sizes: form.sizes.split(',').map((v) => v.trim()).filter(Boolean),
      colors: form.colors.split(',').map((v) => v.trim()).filter(Boolean),
      stock: form.stock === '' ? null : Number(form.stock),
    };
    try {
      const url = productId ? `/api/products/${encodeURIComponent(productId)}` : '/api/products';
      const method = productId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || `Failed to save (status ${res.status})`);
        return;
      }
      toast.success(productId ? 'Product updated' : 'Product added');
      if (onSaved) onSaved(data);
      else router.push('/admin/products');
    } catch (err) {
      console.error('Save product failed:', err);
      toast.error('Network error. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="bg-white border border-sethi-gray200 rounded-sm p-5 md:p-7 grid gap-5 md:grid-cols-2">
      <div>
        <label className="block text-sm font-medium mb-1.5">Product Name *</label>
        <input value={form.name} onChange={(e) => update('name', e.target.value)} className="input-sethi" required />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1.5">Brand</label>
        <input list="brand-list" value={form.brand} onChange={(e) => update('brand', e.target.value)} className="input-sethi" placeholder="e.g. American Tourister" />
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
        <label className="block text-sm font-medium mb-1.5">Featured Product</label>
        <div className="flex items-center h-12 gap-3">
          <button type="button" onClick={() => update('featured', !form.featured)} className={`relative w-14 h-7 rounded-full transition-colors ${form.featured ? 'bg-sethi-gold' : 'bg-sethi-gray200'}`}>
            <span className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${form.featured ? 'translate-x-7' : ''}`} />
          </button>
          <span className="text-sm text-sethi-gray500">{form.featured ? 'Yes' : 'No'}</span>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1.5">MRP (Original Price)</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sethi-gray500">Rs.</span>
          <input type="number" min="0" value={form.mrp} onChange={(e) => update('mrp', e.target.value)} className="input-sethi !pl-12" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1.5">Sale Price *</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sethi-gray500">Rs.</span>
          <input type="number" min="0" value={form.salePrice} onChange={(e) => update('salePrice', e.target.value)} className="input-sethi !pl-12" required />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1.5">Stock Quantity <span className="text-sethi-gray500 font-normal">(leave blank for unlimited)</span></label>
        <input type="number" min="0" value={form.stock} onChange={(e) => update('stock', e.target.value)} className="input-sethi" placeholder="e.g. 10" />
      </div>
      <div className="md:col-span-2">
        <label className="block text-sm font-medium mb-1.5">Image URL</label>
        <input value={form.imageUrl} onChange={(e) => { update('imageUrl', e.target.value); setImgErr(false); }} className="input-sethi" placeholder="https://..." />
        <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded border border-sethi-gold px-4 py-2 text-sm font-semibold text-sethi-gold hover:bg-sethi-gold hover:text-white">
          <Upload className="h-4 w-4" />
          Upload compressed image
          <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])} />
        </label>
        <div className="mt-3 w-[200px] h-[200px] bg-sethi-gray100 border border-sethi-gray200 rounded-sm flex items-center justify-center overflow-hidden">
          {form.imageUrl && !imgErr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={resolveImage(form)} alt="" className="w-full h-full object-cover" onError={() => setImgErr(true)} />
          ) : (
            <div className="flex flex-col items-center text-sethi-gray500 text-xs gap-1"><ImageOff className="w-6 h-6" /> No preview</div>
          )}
        </div>
      </div>
      <div className="md:col-span-2">
        <label className="block text-sm font-medium mb-1.5">Gallery Images</label>
        <textarea value={form.galleryImages} onChange={(e) => update('galleryImages', e.target.value)} className="input-sethi !min-h-[90px] py-3" placeholder="One image URL per line" />
        <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded border border-sethi-gold px-4 py-2 text-sm font-semibold text-sethi-gold hover:bg-sethi-gold hover:text-white">
          <Upload className="h-4 w-4" />
          Upload gallery image
          <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0], true)} />
        </label>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1.5">Sizes</label>
        <input value={form.sizes} onChange={(e) => update('sizes', e.target.value)} className="input-sethi" placeholder="Cabin, Medium, Large" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1.5">Colors</label>
        <input value={form.colors} onChange={(e) => update('colors', e.target.value)} className="input-sethi" placeholder="Gold, Black, Silver" />
      </div>
      <div className="md:col-span-2">
        <label className="block text-sm font-medium mb-1.5">Short Description</label>
        <textarea value={form.description} onChange={(e) => update('description', e.target.value)} className="input-sethi !min-h-[110px] py-3" rows={4} />
      </div>
      <div className="md:col-span-2 flex flex-wrap gap-3 pt-2">
        <button type="submit" disabled={busy} className="btn-primary">
          {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : 'Save Product'}
        </button>
        <button type="button" onClick={() => router.push('/admin/products')} className="btn-ghost">Cancel</button>
      </div>
    </form>
  );
}
