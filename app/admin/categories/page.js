'use client';
import { useEffect, useState } from 'react';
import AdminShell from '@/components/AdminShell';
import { toast } from 'sonner';
import { Plus, Trash2, Edit, ImageOff, Loader2 } from 'lucide-react';

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
    } catch (err) {
      console.error('Load categories failed:', err);
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
    } catch (err) {
      console.error('Add category failed:', err);
      toast.error('Network error. Please try again.');
    } finally {
      setAdding(false);
    }
  };

  const doDelete = async (id) => {
    if (!id) { toast.error('Invalid category'); setConfirm(null); return; }
    try {
      const res = await fetch(`/api/categories/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || `Failed to delete (status ${res.status})`);
        return;
      }
      toast.success('Category deleted');
      setConfirm(null);
      load();
    } catch (err) {
      console.error('Delete category failed:', err);
      toast.error('Network error while deleting. Please try again.');
      setConfirm(null);
    }
  };

  const saveEdit = async () => {
    if (!editName.trim()) { toast.error('Name required'); return; }
    if (!editing?.id) { toast.error('Invalid category'); return; }
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
    } catch (err) {
      console.error('Edit category failed:', err);
      toast.error('Network error while updating. Please try again.');
    }
  };

  return (
    <AdminShell>
      <div className="grid lg:grid-cols-2 gap-6">
        <form onSubmit={add} className="bg-white border border-sethi-gray200 rounded-sm p-5 md:p-6 space-y-4">
          <h2 className="font-serif text-xl">Add New Category</h2>
          <div>
            <label className="block text-sm font-medium mb-1.5">Category Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="input-sethi" placeholder="e.g. Trolley Bags" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Image URL</label>
            <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="input-sethi" placeholder="https://..." />
            <div className="mt-3 w-full max-w-[280px] h-[140px] bg-sethi-gray100 border border-sethi-gray200 rounded-sm overflow-hidden flex items-center justify-center">
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl} alt="" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              ) : (
                <div className="flex flex-col items-center text-sethi-gray500 text-xs"><ImageOff className="w-6 h-6" /> No preview</div>
              )}
            </div>
          </div>
          <button type="submit" disabled={adding} className="btn-primary">
            {adding ? <><Loader2 className="w-4 h-4 animate-spin" /> Adding...</> : <><Plus className="w-4 h-4" /> Add Category</>}
          </button>
        </form>

        <div className="bg-white border border-sethi-gray200 rounded-sm">
          <div className="p-5 border-b border-sethi-gray200"><h2 className="font-serif text-xl">All Categories ({categories.length})</h2></div>
          <ul className="divide-y divide-sethi-gray200">
            {loading ? (
              <li className="p-6 text-sethi-gray500 text-center">Loading...</li>
            ) : categories.length === 0 ? (
              <li className="p-6 text-sethi-gray500 text-center">No categories yet.</li>
            ) : categories.map((c) => (
              <li key={c.id} className="p-4 flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.imageUrl} alt="" className="w-14 h-14 object-cover rounded-sm bg-sethi-gray100" />
                <div className="flex-1 font-medium">{c.name}</div>
                <button onClick={() => { setEditing(c); setEditName(c.name); setEditImg(c.imageUrl || ''); }} className="inline-flex items-center gap-1 border border-sethi-gold text-sethi-gold px-3 py-1.5 rounded-sm hover:bg-sethi-gold hover:text-sethi-black text-sm"><Edit className="w-3.5 h-3.5" /> Edit</button>
                <button onClick={() => setConfirm(c)} className="inline-flex items-center gap-1 border border-red-500 text-red-600 px-3 py-1.5 rounded-sm hover:bg-red-500 hover:text-white text-sm"><Trash2 className="w-3.5 h-3.5" /> Delete</button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-sm p-6 max-w-md w-full">
            <h3 className="font-serif text-xl mb-2">Delete category?</h3>
            <p className="text-sethi-gray500 text-sm mb-5">Are you sure you want to delete “{confirm.name}”?</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirm(null)} className="btn-ghost">Cancel</button>
              <button onClick={() => doDelete(confirm.id)} className="inline-flex items-center gap-2 min-h-[48px] px-6 bg-red-600 text-white font-semibold rounded-sm hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-sm p-6 max-w-md w-full space-y-4">
            <h3 className="font-serif text-xl">Edit Category</h3>
            <div>
              <label className="block text-sm font-medium mb-1.5">Name</label>
              <input value={editName} onChange={(e) => setEditName(e.target.value)} className="input-sethi" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Image URL</label>
              <input value={editImg} onChange={(e) => setEditImg(e.target.value)} className="input-sethi" />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setEditing(null)} className="btn-ghost">Cancel</button>
              <button onClick={saveEdit} className="btn-primary">Save</button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
