'use client';
import { useEffect, useState } from 'react';
import AdminShell from '@/components/AdminShell';
import { toast } from 'sonner';
import { Plus, Trash2, Edit, ImageOff, Loader2, Eye, EyeOff, X } from 'lucide-react';
import { formatDateShort } from '@/lib/constants';

const EMPTY = { title: '', description: '', bannerUrl: '', expiryDate: '', isActive: true };

export default function AdminOffersPage() {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null | 'new' | offer object
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/offers');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setOffers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Load offers failed:', err);
      toast.error('Could not load offers. Please refresh.');
      setOffers([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing('new'); setForm(EMPTY); };
  const openEdit = (o) => {
    setEditing(o);
    setForm({
      title: o.title || '',
      description: o.description || '',
      bannerUrl: o.bannerUrl || '',
      expiryDate: o.expiryDate ? String(o.expiryDate).slice(0, 10) : '',
      isActive: !!o.isActive,
    });
  };
  const close = () => { setEditing(null); setForm(EMPTY); };

  const save = async (e) => {
    e?.preventDefault?.();
    if (!form.title.trim()) { toast.error('Title required'); return; }
    setSaving(true);
    try {
      const isNew = editing === 'new';
      const url = isNew ? '/api/offers' : `/api/offers/${encodeURIComponent(editing.id)}`;
      const method = isNew ? 'POST' : 'PUT';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error || `Failed (status ${res.status})`); return; }
      toast.success(isNew ? 'Offer added' : 'Offer updated');
      close();
      load();
    } catch (err) {
      console.error('Save offer failed:', err);
      toast.error('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (o) => {
    try {
      const res = await fetch(`/api/offers/${encodeURIComponent(o.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !o.isActive }),
      });
      if (!res.ok) { toast.error('Failed to toggle'); return; }
      toast.success(o.isActive ? 'Offer deactivated' : 'Offer activated');
      load();
    } catch (err) {
      console.error(err);
      toast.error('Network error');
    }
  };

  const doDelete = async (id) => {
    if (!id) { setConfirm(null); return; }
    try {
      const res = await fetch(`/api/offers/${encodeURIComponent(id)}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error || 'Failed to delete'); return; }
      toast.success('Offer deleted');
      setConfirm(null);
      load();
    } catch (err) {
      console.error(err);
      toast.error('Network error');
      setConfirm(null);
    }
  };

  return (
    <AdminShell>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h2 className="font-serif text-2xl">All Offers ({offers.length})</h2>
        <button onClick={openNew} className="btn-primary"><Plus className="w-4 h-4" /> Add New Offer</button>
      </div>

      <div className="bg-white border border-sethi-gray200 rounded-sm overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-sethi-gray100 text-left text-xs uppercase tracking-wider text-sethi-gray500">
              <tr>
                <th className="px-4 py-3">Banner</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Expiry</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" className="text-center p-8 text-sethi-gray500">Loading...</td></tr>
              ) : offers.length === 0 ? (
                <tr><td colSpan="5" className="text-center p-8 text-sethi-gray500">No offers yet.</td></tr>
              ) : offers.map((o) => (
                <tr key={o.id} className="border-t border-sethi-gray200 hover:bg-sethi-gray100/50">
                  <td className="px-4 py-3">
                    {o.bannerUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={o.bannerUrl} alt="" className="w-20 h-12 object-cover rounded-sm bg-sethi-gray100" />
                    ) : (
                      <div className="w-20 h-12 bg-sethi-gray100 flex items-center justify-center rounded-sm"><ImageOff className="w-4 h-4 text-sethi-gray500" /></div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium max-w-xs">{o.title}</td>
                  <td className="px-4 py-3 text-sethi-gray500">{o.expiryDate ? formatDateShort(o.expiryDate) : '—'}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleActive(o)} className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${o.isActive ? 'bg-green-100 text-green-700' : 'bg-sethi-gray100 text-sethi-gray500'}`}>
                      {o.isActive ? <><Eye className="w-3 h-3" /> Active</> : <><EyeOff className="w-3 h-3" /> Inactive</>}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(o)} className="inline-flex items-center gap-1 border border-sethi-gold text-sethi-gold px-3 py-1 rounded-sm hover:bg-sethi-gold hover:text-sethi-black text-sm"><Edit className="w-3.5 h-3.5" /> Edit</button>
                      <button onClick={() => setConfirm(o)} className="inline-flex items-center gap-1 border border-red-500 text-red-600 px-3 py-1 rounded-sm hover:bg-red-500 hover:text-white text-sm"><Trash2 className="w-3.5 h-3.5" /> Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="md:hidden divide-y divide-sethi-gray200">
          {loading ? (
            <div className="p-6 text-sethi-gray500 text-center">Loading...</div>
          ) : offers.length === 0 ? (
            <div className="p-6 text-sethi-gray500 text-center">No offers yet.</div>
          ) : offers.map((o) => (
            <div key={o.id} className="p-4 flex gap-3">
              {o.bannerUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={o.bannerUrl} alt="" className="w-20 h-14 object-cover rounded-sm bg-sethi-gray100 shrink-0" />
              ) : (
                <div className="w-20 h-14 bg-sethi-gray100 flex items-center justify-center rounded-sm shrink-0"><ImageOff className="w-4 h-4 text-sethi-gray500" /></div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{o.title}</div>
                <div className="text-xs text-sethi-gray500">Expiry: {o.expiryDate ? formatDateShort(o.expiryDate) : '—'}</div>
                <div className="flex gap-2 mt-2 flex-wrap">
                  <button onClick={() => toggleActive(o)} className={`text-xs px-2 py-0.5 rounded-full ${o.isActive ? 'bg-green-100 text-green-700' : 'bg-sethi-gray100 text-sethi-gray500'}`}>{o.isActive ? 'Active' : 'Inactive'}</button>
                  <button onClick={() => openEdit(o)} className="text-sm text-sethi-gold underline">Edit</button>
                  <button onClick={() => setConfirm(o)} className="text-sm text-red-600 underline">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <form onSubmit={save} className="bg-white rounded-sm w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-sethi-gray200">
              <h3 className="font-serif text-xl">{editing === 'new' ? 'Add New Offer' : 'Edit Offer'}</h3>
              <button type="button" onClick={close} className="w-9 h-9 inline-flex items-center justify-center"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Title *</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input-sethi" placeholder="e.g. Summer Sale" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="input-sethi !min-h-[90px] py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Banner Image URL</label>
                <input value={form.bannerUrl} onChange={(e) => setForm({ ...form, bannerUrl: e.target.value })} className="input-sethi" placeholder="https://..." />
                {form.bannerUrl && (
                  <div className="mt-3 aspect-[16/9] bg-sethi-gray100 overflow-hidden rounded-sm border border-sethi-gray200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={form.bannerUrl} alt="" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Expiry Date</label>
                <input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} className="input-sethi" />
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium">Active</label>
                <button type="button" onClick={() => setForm({ ...form, isActive: !form.isActive })} className={`relative w-14 h-7 rounded-full transition-colors ${form.isActive ? 'bg-sethi-gold' : 'bg-sethi-gray200'}`}>
                  <span className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${form.isActive ? 'translate-x-7' : ''}`} />
                </button>
                <span className="text-sm text-sethi-gray500">{form.isActive ? 'Yes' : 'No'}</span>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-sethi-gray200">
              <button type="button" onClick={close} className="btn-ghost">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : 'Save Offer'}
              </button>
            </div>
          </form>
        </div>
      )}

      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-sm p-6 max-w-md w-full">
            <h3 className="font-serif text-xl mb-2">Delete offer?</h3>
            <p className="text-sethi-gray500 text-sm mb-5">Are you sure you want to delete “{confirm.title}”?</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirm(null)} className="btn-ghost">Cancel</button>
              <button onClick={() => doDelete(confirm.id)} className="inline-flex items-center gap-2 min-h-[48px] px-6 bg-red-600 text-white font-semibold rounded-sm hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
