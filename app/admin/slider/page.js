'use client';
import { useEffect, useRef, useState } from 'react';
import AdminShell from '@/components/AdminShell';
import { Plus, Trash2, Pencil, GripVertical, Eye, EyeOff, ImageIcon, X, Check, ChevronUp, ChevronDown } from 'lucide-react';

// ─── small helpers ────────────────────────────────────────────────────────────
const empty = () => ({
  category: '',
  headline: '',
  imageUrl: '',
  sortOrder: 0,
  isActive: true,
  badgeLabels: ['Free Delivery', 'Premium Quality', 'Easy Returns'],
});

function Field({ label, children, hint }) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-semibold text-[#2c1f14]">{label}</label>
      {children}
      {hint && <p className="text-xs text-[#8a7060]">{hint}</p>}
    </div>
  );
}

function Input({ ...props }) {
  return (
    <input
      {...props}
      className="w-full rounded border border-[#ede8df] bg-white px-3 py-2 text-sm text-[#2c1f14] focus:outline-none focus:ring-2 focus:ring-[#c9a84c]"
    />
  );
}

// ─── Image uploader ────────────────────────────────────────────────────────────
function ImageUploader({ value, onChange }) {
  const fileRef = useRef();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFile = async (file) => {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('bucket', 'products');
      const res = await fetch('/api/upload', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      onChange(data.url);
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      {value ? (
        <div className="relative w-full aspect-[16/7] rounded overflow-hidden border border-[#ede8df] bg-[#faf8f4]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Slide preview" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center hover:bg-red-600"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="w-full aspect-[16/7] rounded border-2 border-dashed border-[#c9a84c] bg-[#faf8f4] flex flex-col items-center justify-center gap-2 text-[#8a7060] hover:bg-[#f5f0e8] transition disabled:opacity-60"
        >
          {uploading ? (
            <div className="w-6 h-6 border-2 border-[#c9a84c] border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <ImageIcon size={28} className="text-[#c9a84c]" />
              <span className="text-sm font-medium">Click to upload slide image</span>
              <span className="text-xs">JPG, PNG, WebP · Max 4MB</span>
            </>
          )}
        </button>
      )}
      <Input
        placeholder="Or paste image URL directly"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {!value && (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="text-xs text-[#c9a84c] underline hover:text-[#a07a28] disabled:opacity-60"
        >
          {uploading ? 'Uploading...' : 'Upload from device'}
        </button>
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
    </div>
  );
}

// ─── Slide Form (add / edit) ───────────────────────────────────────────────────
function SlideForm({ initial, categories, onSave, onCancel, saving }) {
  const [form, setForm] = useState(initial);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const setBadge = (i, v) => {
    const arr = [...(form.badgeLabels || ['', '', ''])];
    arr[i] = v;
    set('badgeLabels', arr);
  };

  return (
    <div className="rounded-xl border border-[#ede8df] bg-white p-6 shadow-sm space-y-5">
      {/* Image */}
      <Field label="Slide Image" hint="Recommended: 1200×500px, landscape">
        <ImageUploader value={form.imageUrl} onChange={(v) => set('imageUrl', v)} />
      </Field>

      {/* Category dropdown — exact match from your categories list */}
      <Field label="Category" hint="Clicking the slide opens this category's products">
        <select
          value={form.category}
          onChange={(e) => set('category', e.target.value)}
          className="w-full rounded border border-[#ede8df] bg-white px-3 py-2 text-sm text-[#2c1f14] focus:outline-none focus:ring-2 focus:ring-[#c9a84c]"
        >
          <option value="">— No category (opens all products) —</option>
          {categories.map((c) => (
            <option key={c.id || c.name} value={c.name}>{c.name}</option>
          ))}
        </select>
      </Field>

      {/* Headline */}
      <Field label="Headline" hint="Use \n for a line break (e.g. Travel\nBeyond)">
        <textarea
          rows={2}
          value={form.headline}
          onChange={(e) => set('headline', e.target.value)}
          placeholder="Travel Beyond"
          className="w-full rounded border border-[#ede8df] bg-white px-3 py-2 text-sm text-[#2c1f14] focus:outline-none focus:ring-2 focus:ring-[#c9a84c] resize-none"
        />
      </Field>

      {/* Badge labels */}
      <Field label="Badge Labels (3 shown below slide)">
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => (
            <Input
              key={i}
              value={(form.badgeLabels || [])[i] || ''}
              onChange={(e) => setBadge(i, e.target.value)}
              placeholder={['Free Delivery', 'Premium Quality', 'Easy Returns'][i]}
            />
          ))}
        </div>
      </Field>

      {/* Sort order + active toggle */}
      <div className="flex items-center gap-6">
        <Field label="Sort Order">
          <Input
            type="number"
            value={form.sortOrder}
            onChange={(e) => set('sortOrder', Number(e.target.value))}
            className="w-24"
          />
        </Field>
        <label className="flex items-center gap-2 cursor-pointer mt-5">
          <div
            onClick={() => set('isActive', !form.isActive)}
            className={`relative w-11 h-6 rounded-full transition-colors ${form.isActive ? 'bg-[#c9a84c]' : 'bg-gray-200'}`}
          >
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${form.isActive ? 'left-6' : 'left-1'}`} />
          </div>
          <span className="text-sm font-semibold text-[#2c1f14]">{form.isActive ? 'Active' : 'Hidden'}</span>
        </label>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={() => onSave(form)}
          disabled={saving || !form.imageUrl}
          className="flex-1 h-11 bg-[#c9a84c] text-white rounded font-bold text-sm hover:bg-[#a07a28] transition disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check size={16} />}
          {saving ? 'Saving…' : 'Save Slide'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-5 h-11 border border-[#ede8df] rounded text-sm font-semibold text-[#6b5544] hover:bg-[#faf8f4] transition"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminSliderPage() {
  const [slides, setSlides] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingSlides, setLoadingSlides] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [toast, setToast] = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  // Load slides + categories on mount
  useEffect(() => {
    Promise.all([
      fetch('/api/slider-images').then((r) => r.json()).catch(() => []),
      fetch('/api/categories').then((r) => r.json()).catch(() => []),
    ]).then(([s, c]) => {
      setSlides(Array.isArray(s) ? s : []);
      setCategories(Array.isArray(c) ? c : []);
      setLoadingSlides(false);
    });
  }, []);

  // ── Add ──
  const handleAdd = async (form) => {
    setSaving(true);
    try {
      const res = await fetch('/api/slider-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: form.category,
          headline: form.headline,
          imageUrl: form.imageUrl,
          badgeLabels: form.badgeLabels,
          sortOrder: form.sortOrder,
          isActive: form.isActive,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setSlides((prev) => [...prev, data].sort((a, b) => a.sort_order - b.sort_order));
      setAdding(false);
      showToast('✅ Slide added');
    } catch (e) {
      showToast('❌ ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Edit ──
  const handleEdit = async (form) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/slider-images/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: form.category,
          headline: form.headline,
          imageUrl: form.imageUrl,
          badgeLabels: form.badgeLabels,
          sortOrder: form.sortOrder,
          isActive: form.isActive,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setSlides((prev) => prev.map((s) => s.id === editingId ? data : s).sort((a, b) => a.sort_order - b.sort_order));
      setEditingId(null);
      showToast('✅ Slide updated');
    } catch (e) {
      showToast('❌ ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Toggle active ──
  const toggleActive = async (slide) => {
    const updated = { ...slide, isActive: !slide.is_active };
    const res = await fetch(`/api/slider-images/${slide.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !slide.is_active }),
    });
    if (res.ok) {
      const data = await res.json();
      setSlides((prev) => prev.map((s) => s.id === slide.id ? data : s));
    }
  };

  // ── Delete ──
  const handleDelete = async (id) => {
    if (!confirm('Delete this slide?')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/slider-images/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      setSlides((prev) => prev.filter((s) => s.id !== id));
      showToast('✅ Slide deleted');
    } catch (e) {
      showToast('❌ ' + e.message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <AdminShell>
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-medium text-[#2c1f14]">Hero slider</h1>
            <p className="text-sm text-[#8a7060] mt-1">
              Manage the slides shown on the home page. Each slide links to a product category.
            </p>
          </div>
          {!adding && (
            <button
              onClick={() => { setAdding(true); setEditingId(null); }}
              className="flex items-center gap-2 bg-[#c9a84c] text-white px-4 py-2 rounded font-semibold text-sm hover:bg-[#a07a28] transition"
            >
              <Plus size={16} /> Add Slide
            </button>
          )}
        </div>

        {/* Toast */}
        {toast && (
          <div className="fixed top-4 right-4 z-50 bg-[#2c1f14] text-white px-5 py-3 rounded-xl shadow-lg text-sm font-semibold animate-fade-in">
            {toast}
          </div>
        )}

        {/* Add form */}
        {adding && (
          <SlideForm
            initial={empty()}
            categories={categories}
            onSave={handleAdd}
            onCancel={() => setAdding(false)}
            saving={saving}
          />
        )}

        {/* Slides list */}
        {loadingSlides ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-[#c9a84c] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : slides.length === 0 ? (
          <div className="text-center py-16 text-[#8a7060]">
            <ImageIcon size={40} className="mx-auto mb-3 text-[#c9a84c] opacity-40" />
            <p className="font-semibold">No slides yet</p>
            <p className="text-sm mt-1">Click "Add Slide" to create your first hero slide.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {slides.map((slide) => (
              <div key={slide.id}>
                {editingId === slide.id ? (
                  <SlideForm
                    initial={{
                      category: slide.category || '',
                      headline: slide.headline || '',
                      imageUrl: slide.image_url || '',
                      sortOrder: slide.sort_order ?? 0,
                      isActive: slide.is_active !== false,
                      badgeLabels: slide.badge_labels?.length ? slide.badge_labels : ['Free Delivery', 'Premium Quality', 'Easy Returns'],
                    }}
                    categories={categories}
                    onSave={handleEdit}
                    onCancel={() => setEditingId(null)}
                    saving={saving}
                  />
                ) : (
                  <div className={`flex gap-4 rounded-xl border bg-white p-4 shadow-sm transition ${slide.is_active ? 'border-[#ede8df]' : 'border-dashed border-gray-200 opacity-60'}`}>
                    {/* Thumbnail */}
                    <div className="relative w-28 h-20 flex-shrink-0 rounded overflow-hidden bg-[#faf8f4]">
                      {slide.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={slide.image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[#c9a84c]">
                          <ImageIcon size={24} />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {slide.category && (
                          <span className="text-xs font-bold uppercase tracking-widest text-[#c9a84c]">
                            {slide.category}
                          </span>
                        )}
                        {!slide.is_active && (
                          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">Hidden</span>
                        )}
                      </div>
                      <p className="text-sm font-bold text-[#2c1f14] mt-1 truncate">
                        {slide.headline || <span className="text-gray-400 font-normal italic">No headline</span>}
                      </p>
                      <p className="text-xs text-[#8a7060] mt-0.5">
                        Sort: {slide.sort_order} ·{' '}
                        {slide.category
                          ? `Links → /products?category=${slide.category}`
                          : 'Links → /products (all)'}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      <button
                        onClick={() => { setEditingId(slide.id); setAdding(false); }}
                        className="flex items-center gap-1 text-xs font-semibold text-[#6b5544] hover:text-[#c9a84c] transition px-2 py-1 rounded hover:bg-[#faf8f4]"
                      >
                        <Pencil size={13} /> Edit
                      </button>
                      <button
                        onClick={() => toggleActive(slide)}
                        className="flex items-center gap-1 text-xs font-semibold text-[#6b5544] hover:text-[#c9a84c] transition px-2 py-1 rounded hover:bg-[#faf8f4]"
                      >
                        {slide.is_active ? <EyeOff size={13} /> : <Eye size={13} />}
                        {slide.is_active ? 'Hide' : 'Show'}
                      </button>
                      <button
                        onClick={() => handleDelete(slide.id)}
                        disabled={deletingId === slide.id}
                        className="flex items-center gap-1 text-xs font-semibold text-red-400 hover:text-red-600 transition px-2 py-1 rounded hover:bg-red-50 disabled:opacity-50"
                      >
                        <Trash2 size={13} />
                        {deletingId === slide.id ? '…' : 'Delete'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Help box */}
        <div className="rounded-xl bg-[#faf8f4] border border-[#ede8df] p-5 text-sm text-[#6b5544] space-y-2">
          <p className="font-medium text-[#2c1f14]">How it works</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>Add a slide with an image + category → it appears on the home page hero slider</li>
            <li>Select a category from the dropdown — this ensures exact match with your products</li>
            <li>Clicking the slide takes customers to that category's products page</li>
            <li>Leave category blank → slide links to all products</li>
            <li>Use Sort Order to control the order slides appear (lower = first)</li>
            <li>Hide/Show toggles a slide without deleting it</li>
          </ul>
        </div>
      </div>
    </AdminShell>
  );
}
