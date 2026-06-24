'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ImageOff, Loader2, Upload, Plus, Trash2, X, Sparkles } from 'lucide-react';
import { BRANDS, resolveImage } from '@/lib/constants';

// ── Helpers for color variants ────────────────────────────────────────────────
// A "colorVariant" looks like: { name: 'Red', images: ['url1','url2'], inStock: true }

function normalizeColorVariants(initial) {
  const raw = initial?.colors;
  if (!raw) return [];
  if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === 'object') {
    return raw.map((c) => ({
      name: c.name || '',
      images: Array.isArray(c.images) ? c.images : [],
      inStock: c.inStock !== false,
    }));
  }
  if (Array.isArray(raw)) {
    return raw.map((name) => ({ name: String(name), images: [], inStock: true }));
  }
  return [];
}

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
    featured: false,
  });
  const [colorVariants, setColorVariants] = useState([]);
  const [newColorName, setNewColorName] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploadingColor, setUploadingColor] = useState(null);
  const [imgErr, setImgErr] = useState(false);
  // ✅ NEW: AI description generation state
  const [generatingDesc, setGeneratingDesc] = useState(false);

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
        galleryImages: Array.isArray(initial.gallery_images || initial.galleryImages)
          ? (initial.gallery_images || initial.galleryImages).join('\n')
          : '',
        imageType: initial.imageType || 'url',
        sizes: Array.isArray(initial.sizes) ? initial.sizes.join(', ') : '',
        featured: !!initial.featured,
      });
      setColorVariants(normalizeColorVariants(initial));
    }
  }, [initial]);

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const compressImage = (file, forOG = false) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);
        const maxW = 1200;
        const maxH = forOG ? 630 : 1200;

        let { width, height } = img;
        const ratio = Math.min(maxW / width, maxH / height, 1);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error('Compression failed'));
            const compressed = new File(
              [blob],
              file.name.replace(/\.[^.]+$/, '.jpg'),
              { type: 'image/jpeg' }
            );
            if (compressed.size > 300 * 1024) {
              console.warn(`Image is ${Math.round(compressed.size / 1024)}KB — WhatsApp may not show preview. Try a smaller photo.`);
            }
            resolve(compressed);
          },
          'image/jpeg',
          0.82
        );
      };

      img.onerror = () => reject(new Error('Could not read image'));
      img.src = url;
    });

  const uploadFile = async (file, forOG = false) => {
    const compressed = await compressImage(file, forOG);
    const sizeKB = Math.round(compressed.size / 1024);
    const body = new FormData();
    body.append('file', compressed);
    body.append('bucket', 'products');
    const res = await fetch('/api/upload', { method: 'POST', body });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Upload failed');
    return { url: data.url, sizeKB };
  };

  const uploadImage = async (file, appendGallery = false) => {
    try {
      setBusy(true);
      const { url, sizeKB } = await uploadFile(file, !appendGallery);
      if (sizeKB > 300 && !appendGallery) {
        toast.warning(`Image is ${sizeKB}KB — WhatsApp preview works best under 300KB. Try a clearer/smaller photo.`);
      }
      if (appendGallery) {
        update('galleryImages', [form.galleryImages, url].filter(Boolean).join('\n'));
      } else {
        update('imageUrl', url);
      }
      setImgErr(false);
      toast.success(`Image uploaded ✓ (${sizeKB}KB — WhatsApp ready)`);
    } catch (error) {
      toast.error(error.message || 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  // ✅ Generate description using the main product image (vision) + name/brand/category
  // for context. Matches the updated /api/generate-description endpoint, which now
  // fetches the image and sends it to Gemini's vision model alongside the text context.
  const generateDescription = async () => {
    if (!form.name.trim()) {
      toast.error('Enter the product name first');
      return;
    }
    if (!form.imageUrl) {
      toast.error('Upload the main product image first');
      return;
    }
    setGeneratingDesc(true);
    try {
      const res = await fetch('/api/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          brand: form.brand,
          category: form.category,
          imageUrl: form.imageUrl,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || 'Could not generate description');
        return;
      }
      update('description', data.description);
      toast.success('Description generated ✨ — feel free to edit it');
    } catch (err) {
      console.error('Generate description failed:', err);
      toast.error('Network error. Please try again.');
    } finally {
      setGeneratingDesc(false);
    }
  };

  // ── Color variant handlers ──────────────────────────────────────────────────
  const addColorVariant = () => {
    const name = newColorName.trim();
    if (!name) { toast.error('Enter a color name first'); return; }
    if (colorVariants.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      toast.error('This color already exists');
      return;
    }
    setColorVariants((prev) => [...prev, { name, images: [], inStock: true }]);
    setNewColorName('');
  };

  const removeColorVariant = (index) => {
    setColorVariants((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleColorStock = (index) => {
    setColorVariants((prev) =>
      prev.map((c, i) => (i === index ? { ...c, inStock: !c.inStock } : c))
    );
  };

  const uploadColorPhoto = async (index, file) => {
    try {
      setUploadingColor(index);
      const { url, sizeKB } = await uploadFile(file, false);
      setColorVariants((prev) =>
        prev.map((c, i) => (i === index ? { ...c, images: [...c.images, url] } : c))
      );
      toast.success(`Photo added to ${colorVariants[index].name} ✓ (${sizeKB}KB)`);
    } catch (error) {
      toast.error(error.message || 'Upload failed');
    } finally {
      setUploadingColor(null);
    }
  };

  const removeColorPhoto = (colorIndex, photoIndex) => {
    setColorVariants((prev) =>
      prev.map((c, i) =>
        i === colorIndex ? { ...c, images: c.images.filter((_, pi) => pi !== photoIndex) } : c
      )
    );
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
      gallery_images: form.galleryImages
        .split(/\n|,/)
        .map((v) => v.trim())
        .filter(Boolean),
      sizes: form.sizes.split(',').map((v) => v.trim()).filter(Boolean),
      colors: colorVariants,
      stock: form.stock === '' ? null : Number(form.stock),
    };
    try {
      const url = productId
        ? `/api/products/${encodeURIComponent(productId)}`
        : '/api/products';
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
    <form
      onSubmit={submit}
      className="bg-white border border-sethi-gray200 rounded-sm p-5 md:p-7 grid gap-5 md:grid-cols-2"
    >
      <div>
        <label className="block text-sm font-medium mb-1.5">Product Name *</label>
        <input
          value={form.name}
          onChange={(e) => update('name', e.target.value)}
          className="input-sethi"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">Brand</label>
        <input
          list="brand-list"
          value={form.brand}
          onChange={(e) => update('brand', e.target.value)}
          className="input-sethi"
          placeholder="e.g. American Tourister"
        />
        <datalist id="brand-list">
          {BRANDS.map((b) => <option key={b} value={b} />)}
        </datalist>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">Category *</label>
        <select
          value={form.category}
          onChange={(e) => update('category', e.target.value)}
          className="input-sethi"
          required
        >
          <option value="">Select a category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.name}>{c.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">Featured Product</label>
        <div className="flex items-center h-12 gap-3">
          <button
            type="button"
            onClick={() => update('featured', !form.featured)}
            className={`relative w-14 h-7 rounded-full transition-colors ${form.featured ? 'bg-sethi-gold' : 'bg-sethi-gray200'}`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${form.featured ? 'translate-x-7' : ''}`}
            />
          </button>
          <span className="text-sm text-sethi-gray500">{form.featured ? 'Yes' : 'No'}</span>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">MRP (Original Price)</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sethi-gray500">Rs.</span>
          <input
            type="number"
            min="0"
            value={form.mrp}
            onChange={(e) => update('mrp', e.target.value)}
            className="input-sethi !pl-12"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">Sale Price *</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sethi-gray500">Rs.</span>
          <input
            type="number"
            min="0"
            value={form.salePrice}
            onChange={(e) => update('salePrice', e.target.value)}
            className="input-sethi !pl-12"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">
          Stock Quantity{' '}
          <span className="text-sethi-gray500 font-normal">(leave blank for unlimited)</span>
        </label>
        <input
          type="number"
          min="0"
          value={form.stock}
          onChange={(e) => update('stock', e.target.value)}
          className="input-sethi"
          placeholder="e.g. 10"
        />
      </div>

      <div className="md:col-span-2">
        <label className="block text-sm font-medium mb-1.5">
          Main Product Image{' '}
          <span className="text-sethi-gray500 font-normal text-xs">
            (auto-compressed to JPEG for WhatsApp preview)
          </span>
        </label>
        <input
          value={form.imageUrl}
          onChange={(e) => { update('imageUrl', e.target.value); setImgErr(false); }}
          className="input-sethi"
          placeholder="https://..."
        />
        <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded border border-sethi-gold px-4 py-2 text-sm font-semibold text-sethi-gold hover:bg-sethi-gold hover:text-white">
          <Upload className="h-4 w-4" />
          Upload image (WhatsApp ready)
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])}
          />
        </label>
        <div className="mt-3 w-[200px] h-[200px] bg-sethi-gray100 border border-sethi-gray200 rounded-sm flex items-center justify-center overflow-hidden">
          {form.imageUrl && !imgErr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={resolveImage(form)}
              alt=""
              className="w-full h-full object-cover"
              onError={() => setImgErr(true)}
            />
          ) : (
            <div className="flex flex-col items-center text-sethi-gray500 text-xs gap-1">
              <ImageOff className="w-6 h-6" /> No preview
            </div>
          )}
        </div>
      </div>

      <div className="md:col-span-2">
        <label className="block text-sm font-medium mb-1.5">
          Gallery Images{' '}
          <span className="text-sethi-gray500 font-normal text-xs">
            (shown when no color is selected, or product has no color variants)
          </span>
        </label>
        <textarea
          value={form.galleryImages}
          onChange={(e) => update('galleryImages', e.target.value)}
          className="input-sethi !min-h-[90px] py-3"
          placeholder="One image URL per line"
        />
        <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded border border-sethi-gold px-4 py-2 text-sm font-semibold text-sethi-gold hover:bg-sethi-gold hover:text-white">
          <Upload className="h-4 w-4" />
          Upload gallery image
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0], true)}
          />
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">Sizes</label>
        <input
          value={form.sizes}
          onChange={(e) => update('sizes', e.target.value)}
          className="input-sethi"
          placeholder="Cabin, Medium, Large"
        />
      </div>

      {/* ── Color Variants section ── */}
      <div className="md:col-span-2 border-t border-sethi-gray200 pt-5">
        <label className="block text-sm font-bold mb-1.5 text-sethi-black">
          Color Variants{' '}
          <span className="text-sethi-gray500 font-normal text-xs">
            (each color gets its own photos + in-stock toggle)
          </span>
        </label>

        <div className="flex gap-2 mt-2">
          <input
            value={newColorName}
            onChange={(e) => setNewColorName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addColorVariant(); } }}
            className="input-sethi flex-1"
            placeholder="e.g. Red, Black, White"
          />
          <button
            type="button"
            onClick={addColorVariant}
            className="inline-flex items-center gap-1.5 rounded bg-sethi-gold px-4 py-2 text-sm font-semibold text-white hover:bg-sethi-gold-dark shrink-0"
          >
            <Plus className="h-4 w-4" /> Add Color
          </button>
        </div>

        <div className="mt-4 grid gap-3">
          {colorVariants.map((color, index) => (
            <div
              key={index}
              className={`rounded-sm border p-4 transition-colors ${
                color.inStock ? 'border-sethi-gray200 bg-white' : 'border-red-200 bg-red-50'
              }`}
            >
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base">{color.name}</span>
                  <span className="text-xs text-sethi-gray500">
                    {color.images.length} photo{color.images.length !== 1 ? 's' : ''}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleColorStock(index)}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        color.inStock ? 'bg-green-500' : 'bg-red-400'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                          color.inStock ? 'translate-x-6' : ''
                        }`}
                      />
                    </button>
                    <span className={`text-xs font-semibold ${color.inStock ? 'text-green-700' : 'text-red-600'}`}>
                      {color.inStock ? 'In Stock' : 'Out of Stock'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeColorVariant(index)}
                    className="text-red-500 hover:text-red-700 p-1"
                    aria-label="Remove color"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {color.images.map((img, photoIndex) => (
                  <div key={photoIndex} className="relative w-16 h-16 rounded-sm overflow-hidden border border-sethi-gray200 group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeColorPhoto(index, photoIndex)}
                      className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}

                <label className={`w-16 h-16 rounded-sm border-2 border-dashed border-sethi-gold flex items-center justify-center cursor-pointer hover:bg-sethi-gold/10 ${uploadingColor === index ? 'opacity-50 pointer-events-none' : ''}`}>
                  {uploadingColor === index ? (
                    <Loader2 className="h-5 w-5 text-sethi-gold animate-spin" />
                  ) : (
                    <Upload className="h-5 w-5 text-sethi-gold" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && uploadColorPhoto(index, e.target.files[0])}
                  />
                </label>
              </div>
            </div>
          ))}

          {colorVariants.length === 0 && (
            <p className="text-sm text-sethi-gray500 italic">
              No color variants added yet. Type a color name above and click &quot;Add Color&quot;.
            </p>
          )}
        </div>
      </div>

      {/* ── Description with AI generate button ── */}
      <div className="md:col-span-2">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-1.5">
          <label className="block text-sm font-medium">Short Description</label>
          <button
            type="button"
            onClick={generateDescription}
            disabled={generatingDesc || !form.name.trim() || !form.imageUrl}
            title={!form.name.trim() ? 'Enter the product name first' : !form.imageUrl ? 'Upload the main product image first' : 'Generate description from the image'}
            className="inline-flex items-center gap-1.5 rounded-full border border-sethi-gold px-3 py-1.5 text-xs font-semibold text-sethi-gold hover:bg-sethi-gold hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-sethi-gold"
          >
            {generatingDesc ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating...</>
            ) : (
              <><Sparkles className="h-3.5 w-3.5" /> Generate Description</>
            )}
          </button>
        </div>
        {!form.name.trim() ? (
          <p className="text-xs text-sethi-gray500 mb-1.5">Enter the product name above to enable AI description generation.</p>
        ) : !form.imageUrl ? (
          <p className="text-xs text-sethi-gray500 mb-1.5">Upload the main product image above so AI can describe it.</p>
        ) : null}
        <textarea
          value={form.description}
          onChange={(e) => update('description', e.target.value)}
          className="input-sethi !min-h-[110px] py-3"
          rows={4}
          placeholder="Write a description, or click 'Generate Description' above."
        />
      </div>

      <div className="md:col-span-2 flex flex-wrap gap-3 pt-2">
        <button type="submit" disabled={busy} className="btn-primary">
          {busy ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
          ) : (
            'Save Product'
          )}
        </button>
        <button
          type="button"
          onClick={() => router.push('/admin/products')}
          className="btn-ghost"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
