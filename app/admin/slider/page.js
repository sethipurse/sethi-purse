'use client';
import { useEffect, useState } from 'react';
import AdminShell from '@/components/AdminShell';
import { toast } from 'sonner';
import { Plus, Trash2, Edit, ImageOff, Loader2, Upload, X, GripVertical, Eye, EyeOff } from 'lucide-react';

// ── Image compression (same as categories & products) ──────────────────────
const compressImage = (file) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const maxW = 1920; // wider for hero slider
      let { width, height } = img;
      const ratio = Math.min(maxW / width, maxW / height, 1);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => {
        if (!blob) return reject(new Error('Compression failed'));
        resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }));
      }, 'image/jpeg', 0.85);
    };
    img.onerror = () => reject(new Error('Could not read image'));
    img.src = url;
  });

// ── Image uploader component (same pattern as categories) ──────────────────
function ImageUploader({ value, onChange, label = 'Slider Image' }) {
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const compressed = await compressImage(file);
      const sizeKB = Math.round(compressed.size / 1024);
      const form = new FormData();
      form.append('file', compressed);
      form.append('bucket', 'products');
      const res = await fetch('/api/upload', { method: 'POST', body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error || 'Upload failed'); return; }
      onChange(data.url);
      toast.success(`Image uploaded ✓ (${sizeKB}KB)`);
    } catch (err) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input-sethi"
        placeholder="Paste image URL or upload below"
      />
      <div className="mt-2 flex items-center gap-3">
        <label className={`inline-flex items-center gap-2 px-4 py-2 border border-sethi-gold text-sethi-gold rounded-sm text-sm font-medium cursor-pointer hover:bg-sethi-gold hover:text-sethi-black transition-colors ${uploading ? 'opacity-60 pointer-events-none' : ''}`}>
          {uploading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</>
            : <><Upload className="w-4 h-4" /> Upload Image</>}
          <input type="file" accept="image/*" className="hidden" onChange={handleFile} disabled={uploading} />
        </label>
        {value && (
          <button type="button" onClick={() => onChange('')} className="text-sm text-red-500 hover:text-red-700 flex items-center gap-1">
            <X className="w-3 h-3" /> Remove
          </button>
        )}
      </div>
      {/* Preview */}
      <div className="mt-3 w-full max-w-[360px] h-[140px] bg-sethi-gray100 border border-sethi-gray200 rounded-sm overflow-hidden flex items-center justify-center">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
        ) : (
          <div className="flex flex-col items-center text-sethi-gray500 text-xs gap-1">
            <ImageOff className="w-6 h-6" /> No preview
          </div>
        )}
      </div>
    </div>
  );
}

// ── Empty form state ────────────────────────────────────────────────────────
const EMPTY = {
  headline: '',
  category: '',
  image_url: '',
  sort_order: 0,
  is_active: true,
};

// ── Main page ───────────────────────────────────────────────────────────────
export default function AdminSliderPage() {
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY);
  const [confirm, setConfirm] = useState(null);

  // ── Load slides ────────────────────────────────────────────────────────
  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/slider-images');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSlides(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Could not load slider images. Please refresh.');
      setSlides([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  // ── Add new slide ──────────────────────────────────────────────────────
  const add = async (e) => {
    e.preventDefault();
    if (!form.image_url.trim()) { toast.error('Image is required'); return; }
    setAdding(true);
    try {
      const res = await fetch('/api/slider-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          headline: form.headline,
          category: form.category,
          image_url: form.image_url,
          sort_order: Number(form.sort_order) || 0,
          is_active: form.is_active,
          badge_icons: [],
          badge_labels: [],
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error || 'Failed to add slide'); return; }
      toast.success('Slide added!');
      setForm(EMPTY);
      load();
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setAdding(false);
    }
  };

  // ── Save edit ──────────────────────────────────────────────────────────
  const saveEdit = async () => {
    if (!editForm.image_url.trim()) { toast.error('Image is required'); return; }
    try {
      const res = await fetch(`/api/slider-images/${encodeURIComponent(editing.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          headline: editForm.headline,
          category: editForm.category,
          image_url: editForm.image_url,
          sort_order: Number(editForm.sort_order) || 0,
          is_active: editForm.is_active,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error || 'Failed to update slide'); return; }
      toast.success('Slide updated!');
      setEditing(null);
      load();
    } catch {
      toast.error('Network error while updating.');
    }
  };

  // ── Toggle active ──────────────────────────────────────────────────────
  const toggleActive = async (slide) => {
    try {
      const res = await fetch(`/api/slider-images/${encodeURIComponent(slide.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !slide.is_active }),
      });
      if (!res.ok) { toast.error('Failed to update'); return; }
      toast.success(slide.is_active ? 'Slide hidden' : 'Slide visible');
      load();
    } catch {
      toast.error('Network error');
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────
  const doDelete = async (id) => {
    if (!id) { setConfirm(null); return; }
    try {
      const res = await fetch(`/api/slider-images/${encodeURIComponent(id)}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error || 'Failed to delete'); return; }
      toast.success('Slide deleted');
      setConfirm(null);
      load();
    } catch {
      toast.error('Network error while deleting.');
      setConfirm(null);
    }
  };

  // ── UI ─────────────────────────────────────────────────────────────────
  return (
    <AdminShell>
      <div className="grid lg:grid-cols-2 gap-6">

        {/* ── Add Form ── */}
        <form onSubmit={add} className="bg-white border border-sethi-gray200 rounded-sm p-5 md:p-6 space-y-4">
          <h2 className="font-serif text-xl">Add New Slide</h2>

          <ImageUploader
            value={form.image_url}
            onChange={(url) => setForm((f) => ({ ...f, image_url: url }))}
            label="Slide Image *"
          />

          <div>
            <label className="block text-sm font-medium mb-1.5">Headline</label>
            <input
              value={form.headline}
              onChange={(e) => setForm((f) => ({ ...f, headline: e.target.value }))}
              className="input-sethi"
              placeholder="e.g. Premium Bags Collection"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Category (optional)</label>
            <input
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className="input-sethi"
              placeholder="e.g. Luggage"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Sort Order</label>
            <input
              type="number"
              value={form.sort_order}
              onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))}
              className="input-sethi"
              placeholder="0"
              min="0"
            />
            <p className="text-xs text-sethi-gray500 mt-1">Lower number = shows first</p>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm font-medium">Active (visible on site)</label>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, is_active: !f.is_active }))}
              className={`relative w-14 h-7 rounded-full transition-colors ${form.is_active ? 'bg-sethi-gold' : 'bg-sethi-gray200'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${form.is_active ? 'translate-x-7' : ''}`} />
            </button>
            <span className="text-sm text-sethi-gray500">{form.is_active ? 'Yes' : 'No'}</span>
          </div>

          <button type="submit" disabled={adding} className="btn-primary">
            {adding
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Adding...</>
              : <><Plus className="w-4 h-4" /> Add Slide</>}
          </button>
        </form>

        {/* ── Slides List ── */}
        <div className="bg-white border border-sethi-gray200 rounded-sm">
          <div className="p-5 border-b border-sethi-gray200">
            <h2 className="font-serif text-xl">All Slides ({slides.length})</h2>
            <p className="text-xs text-sethi-gray500 mt-1">These images show in your home page hero slider</p>
          </div>

          {loading ? (
            <div className="p-6 text-sethi-gray500 text-center">Loading...</div>
          ) : slides.length === 0 ? (
            <div className="p-6 text-sethi-gray500 text-center">No slides yet. Add your first slide!</div>
          ) : (
            <ul className="divide-y divide-sethi-gray200">
              {slides.map((slide) => (
                <li key={slide.id} className="p-4 flex items-center gap-3">
                  {/* Drag handle icon (visual only) */}
                  <GripVertical className="w-4 h-4 text-sethi-gray500 shrink-0" />

                  {/* Thumbnail */}
                  {slide.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={slide.image_url}
                      alt=""
                      className="w-20 h-14 object-cover rounded-sm bg-sethi-gray100 shrink-0"
                    />
                  ) : (
                    <div className="w-20 h-14 bg-sethi-gray100 rounded-sm flex items-center justify-center shrink-0">
                      <ImageOff className="w-5 h-5 text-sethi-gray500" />
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{slide.headline || '(No headline)'}</div>
                    <div className="text-xs text-sethi-gray500 mt-0.5">
                      {slide.category && <span>Category: {slide.category} · </span>}
                      Order: {slide.sort_order ?? 0}
                    </div>
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded-sm text-[10px] font-bold ${slide.is_active ? 'bg-green-100 text-green-700' : 'bg-sethi-gray200 text-sethi-gray500'}`}>
                      {slide.is_active ? 'VISIBLE' : 'HIDDEN'}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <button
                      onClick={() => toggleActive(slide)}
                      className="inline-flex items-center gap-1 border border-sethi-gray200 text-sethi-gray500 px-2.5 py-1 rounded-sm hover:border-sethi-gold hover:text-sethi-gold text-xs"
                    >
                      {slide.is_active ? <><EyeOff className="w-3 h-3" /> Hide</> : <><Eye className="w-3 h-3" /> Show</>}
                    </button>
                    <button
                      onClick={() => {
                        setEditing(slide);
                        setEditForm({
                          headline: slide.headline || '',
                          category: slide.category || '',
                          image_url: slide.image_url || '',
                          sort_order: slide.sort_order ?? 0,
                          is_active: slide.is_active !== false,
                        });
                      }}
                      className="inline-flex items-center gap-1 border border-sethi-gold text-sethi-gold px-2.5 py-1 rounded-sm hover:bg-sethi-gold hover:text-sethi-black text-xs"
                    >
                      <Edit className="w-3 h-3" /> Edit
                    </button>
                    <button
                      onClick={() => setConfirm(slide)}
                      className="inline-flex items-center gap-1 border border-red-500 text-red-600 px-2.5 py-1 rounded-sm hover:bg-red-500 hover:text-white text-xs"
                    >
                      <Trash2 className="w-3 h-3" /> Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ── Edit Modal ── */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-sm w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-sethi-gray200">
              <h3 className="font-serif text-xl">Edit Slide</h3>
              <button onClick={() => setEditing(null)} className="w-9 h-9 inline-flex items-center justify-center">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <ImageUploader
                value={editForm.image_url}
                onChange={(url) => setEditForm((f) => ({ ...f, image_url: url }))}
                label="Slide Image *"
              />
              <div>
                <label className="block text-sm font-medium mb-1.5">Headline</label>
                <input
                  value={editForm.headline}
                  onChange={(e) => setEditForm((f) => ({ ...f, headline: e.target.value }))}
                  className="input-sethi"
                  placeholder="e.g. Premium Bags Collection"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Category</label>
                <input
                  value={editForm.category}
                  onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))}
                  className="input-sethi"
                  placeholder="e.g. Luggage"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Sort Order</label>
                <input
                  type="number"
                  value={editForm.sort_order}
                  onChange={(e) => setEditForm((f) => ({ ...f, sort_order: e.target.value }))}
                  className="input-sethi"
                  min="0"
                />
                <p className="text-xs text-sethi-gray500 mt-1">Lower number = shows first</p>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium">Active</label>
                <button
                  type="button"
                  onClick={() => setEditForm((f) => ({ ...f, is_active: !f.is_active }))}
                  className={`relative w-14 h-7 rounded-full transition-colors ${editForm.is_active ? 'bg-sethi-gold' : 'bg-sethi-gray200'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${editForm.is_active ? 'translate-x-7' : ''}`} />
                </button>
                <span className="text-sm text-sethi-gray500">{editForm.is_active ? 'Yes' : 'No'}</span>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-sethi-gray200">
              <button onClick={() => setEditing(null)} className="btn-ghost">Cancel</button>
              <button onClick={saveEdit} className="btn-primary">Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-sm p-6 max-w-md w-full">
            <h3 className="font-serif text-xl mb-2">Delete slide?</h3>
            <p className="text-sethi-gray500 text-sm mb-5">
              Are you sure you want to delete "{confirm.headline || 'this slide'}"? This cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirm(null)} className="btn-ghost">Cancel</button>
              <button
                onClick={() => doDelete(confirm.id)}
                className="inline-flex items-center gap-2 min-h-[48px] px-6 bg-red-600 text-white font-semibold rounded-sm hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
