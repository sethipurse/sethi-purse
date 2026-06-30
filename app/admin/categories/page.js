'use client';
import { useEffect, useState } from 'react';
import AdminShell from '@/components/AdminShell';
import { toast } from 'sonner';
import { Plus, Trash2, Edit, ImageOff, Loader2, Upload, X } from 'lucide-react';

// Same compress logic as ProductForm — JPEG, max 1200px, WhatsApp ready
const compressImage = (file) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const maxW = 1200;
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
      }, 'image/jpeg', 0.82);
    };
    img.onerror = () => reject(new Error('Could not read image'));
    img.src = url;
  });

function ImageUploader({ value, onChange, bucket = 'products' }) {
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
      form.append('bucket', 'products'); // FIX: 'categories' bucket doesn't exist; use 'products'
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
      <label className="block text-sm font-medium mb-1.5">Category Image</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input-sethi"
        placeholder="Paste URL or upload below"
      />
      <div className="mt-2 flex items-center gap-3">
        <label className={`inline-flex items-center gap-2 px-4 py-2 border border-sethi-gold text-sethi-gold rounded-sm text-sm font-medium cursor-pointer hover:bg-sethi-gold hover:text-sethi-black transition-colors ${uploading ? 'opacity-60 pointer-events-none' : ''}`}>
          {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</> : <><Upload className="w-4 h-4" /> Upload Image</>}
          <input type="file" accept="image/*" className="hidden" onChange={handleFile} disabled={uploading} />
        </label>
        {value && (
          <button type="button" onClick={() => onChange('')} className="text-sm text-red-500 hover:text-red-700 flex items-center gap-1">
            <X className="w-3 h-3" /> Remove
          </button>
        )}
      </div>
      <div className="mt-3 w-full max-w-[280px] h-[140px] bg-sethi-gray100 border border-sethi-gray200 rounded-sm overflow-hidden flex items-center justify-center">
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

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [adding, setAdding] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [editing, setEditing] = useState(null);
  const [editName, setEditName] = useState('');
  const [editImg, setEditImg] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/categories');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Could not load categories. Please refresh.');
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const add = async (e) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Category name required'); return; }
    setAdding(true);
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, imageUrl }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error || 'Failed to add category'); return; }
      toast.success('Category added');
      setName(''); setImageUrl('');
      load();
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setAdding(false);
    }
  };

  const doDelete = async (id) => {
    if (!id) { setConfirm(null); return; }
    try {
      const res = await fetch(`/api/categories/${encodeURIComponent(id)}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error || 'Failed to delete'); return; }
      toast.success('Category deleted');
      setConfirm(null);
      load();
    } catch {
      toast.error('Network error while deleting.');
      setConfirm(null);
    }
  };

  const saveEdit = async () => {
    if (!editName.trim()) { toast.error('Name required'); return; }
    try {
      const res = await fetch(`/api/categories/${encodeURIComponent(editing.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, imageUrl: editImg }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error || 'Failed to update'); return; }
      toast.success('Category updated');
      setEditing(null);
      load();
    } catch {
      toast.error('Network error while updating.');
    }
  };

  return (
    <AdminShell>
      <div className="grid lg:grid-cols-2 gap-6">
        <form onSubmit={add} className="bg-white border border-sethi-gray200 rounded-sm p-5 md:p-6 space-y-4">
          <h2 className="font-serif text-base font-medium">Add new category</h2>
          <div>
            <label className="block text-sm font-medium mb-1.5">Category Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="input-sethi" placeholder="e.g. Trolley Bags" />
          </div>
          <ImageUploader value={imageUrl} onChange={setImageUrl} />
          <button type="submit" disabled={adding} className="btn-primary">
            {adding ? <><Loader2 className="w-4 h-4 animate-spin" /> Adding...</> : <><Plus className="w-4 h-4" /> Add Category</>}
          </button>
        </form>

        <div className="bg-white border border-sethi-gray200 rounded-sm">
          <div className="p-5 border-b border-sethi-gray200">
            <h2 className="font-serif text-base font-medium">All categories ({categories.length})</h2>
          </div>
          <ul className="divide-y divide-sethi-gray200">
            {loading ? (
              <li className="p-6 text-sethi-gray500 text-center">Loading...</li>
            ) : categories.length === 0 ? (
              <li className="p-6 text-sethi-gray500 text-center">No categories yet.</li>
            ) : categories.map((c) => (
              <li key={c.id} className="p-4 flex items-center gap-3">
                {(c.image_url || c.imageUrl) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.image_url || c.imageUrl} alt="" className="w-14 h-14 object-cover rounded-sm bg-sethi-gray100 shrink-0" />
                ) : (
                  <div className="w-14 h-14 bg-sethi-gray100 rounded-sm flex items-center justify-center shrink-0">
                    <ImageOff className="w-5 h-5 text-sethi-gray500" />
                  </div>
                )}
                <div className="flex-1 font-medium">{c.name}</div>
                <button onClick={() => { setEditing(c); setEditName(c.name); setEditImg(c.image_url || c.imageUrl || ''); }} className="inline-flex items-center gap-1 border border-sethi-gold text-sethi-gold px-3 py-1.5 rounded-sm hover:bg-sethi-gold hover:text-sethi-black text-sm">
                  <Edit className="w-3.5 h-3.5" /> Edit
                </button>
                <button onClick={() => setConfirm(c)} className="inline-flex items-center gap-1 border border-red-500 text-red-600 px-3 py-1.5 rounded-sm hover:bg-red-500 hover:text-white text-sm">
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 md:pl-[260px]">
          <div className="bg-white rounded-sm p-6 max-w-md w-full">
            <h3 className="font-serif text-base font-medium mb-2">Delete category?</h3>
            <p className="text-sethi-gray500 text-sm mb-5">Are you sure you want to delete "{confirm.name}"?</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirm(null)} className="btn-ghost">Cancel</button>
              <button onClick={() => doDelete(confirm.id)} className="inline-flex items-center gap-2 min-h-[48px] px-6 bg-red-600 text-white font-semibold rounded-sm hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 md:pl-[260px]">
          <div className="bg-white rounded-sm w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-sethi-gray200">
              <h3 className="font-serif text-base font-medium">Edit category</h3>
              <button onClick={() => setEditing(null)} className="w-9 h-9 inline-flex items-center justify-center"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Name</label>
                <input value={editName} onChange={(e) => setEditName(e.target.value)} className="input-sethi" />
              </div>
              <ImageUploader value={editImg} onChange={setEditImg} />
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-sethi-gray200">
              <button onClick={() => setEditing(null)} className="btn-ghost">Cancel</button>
              <button onClick={saveEdit} className="btn-primary">Save</button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
