'use client';
import { useEffect, useState } from 'react';
import AdminShell from '@/components/AdminShell';
import StarRating from '@/components/StarRating';
import { toast } from 'sonner';
import { Plus, Trash2, Edit, ImageOff, Loader2, Star as StarIcon, X } from 'lucide-react';
import { getInitials } from '@/lib/constants';

const EMPTY = { customerName: '', customerPhoto: '', rating: 5, reviewText: '', isFeatured: false };

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reviews');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setReviews(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Load reviews failed:', err);
      toast.error('Could not load reviews. Please refresh.');
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  // FIX: read snake_case fields from Supabase, fallback to camelCase if present
  const getName = (r) => r.customer_name ?? r.customerName ?? '';
  const getPhoto = (r) => r.customer_photo ?? r.customerPhoto ?? '';
  const getRating = (r) => r.rating ?? 5;
  const getText = (r) => r.review_text ?? r.reviewText ?? '';
  const getFeatured = (r) => !!(r.is_featured ?? r.isFeatured);

  const openNew = () => { setEditing('new'); setForm(EMPTY); };
  const openEdit = (r) => {
    setEditing(r);
    setForm({
      customerName: getName(r),
      customerPhoto: getPhoto(r),
      rating: getRating(r),
      reviewText: getText(r),
      isFeatured: getFeatured(r),
    });
  };
  const close = () => { setEditing(null); setForm(EMPTY); };

  const save = async (e) => {
    e?.preventDefault?.();
    if (!form.customerName.trim() || !form.reviewText.trim()) {
      toast.error('Name and review text are required'); return;
    }
    setSaving(true);
    try {
      const isNew = editing === 'new';
      const url = isNew ? '/api/reviews' : `/api/reviews/${encodeURIComponent(editing.id)}`;
      const method = isNew ? 'POST' : 'PUT';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error || `Failed (status ${res.status})`); return; }
      toast.success(isNew ? 'Review added' : 'Review updated');
      close();
      load();
    } catch (err) {
      console.error('Save review failed:', err);
      toast.error('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const toggleFeatured = async (r) => {
    try {
      const res = await fetch(`/api/reviews/${encodeURIComponent(r.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFeatured: !getFeatured(r) }),
      });
      if (!res.ok) { toast.error('Failed to toggle'); return; }
      toast.success(getFeatured(r) ? 'Removed from featured' : 'Marked as featured');
      load();
    } catch (err) {
      console.error(err);
      toast.error('Network error');
    }
  };

  const doDelete = async (id) => {
    if (!id) { setConfirm(null); return; }
    try {
      const res = await fetch(`/api/reviews/${encodeURIComponent(id)}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error || 'Failed to delete'); return; }
      toast.success('Review deleted');
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
        <h2 className="font-serif text-2xl">All Reviews ({reviews.length})</h2>
        <button onClick={openNew} className="btn-primary"><Plus className="w-4 h-4" /> Add Review</button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-sethi-gray500">Loading...</div>
      ) : reviews.length === 0 ? (
        <div className="bg-white border border-sethi-gray200 rounded-sm p-10 text-center text-sethi-gray500">No reviews yet.</div>
      ) : (
        <div className="grid gap-4">
          {reviews.map((r) => (
            <div key={r.id} className="bg-white border border-sethi-gray200 rounded-sm p-5 flex items-start gap-4">
              <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-sethi-gold bg-sethi-gold flex items-center justify-center shrink-0">
                {getPhoto(r) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={getPhoto(r)} alt={getName(r)} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                ) : (
                  <span className="font-serif text-base text-sethi-black font-bold">{getInitials(getName(r))}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold">{getName(r)}</h3>
                  <StarRating value={getRating(r)} size={14} />
                  {getFeatured(r) && <span className="inline-block bg-sethi-gold text-sethi-black text-[10px] font-bold px-2 py-0.5 rounded-sm tracking-wide">FEATURED</span>}
                </div>
                <p className="text-sm text-sethi-gray800 mt-1 italic line-clamp-2">&ldquo;{getText(r)}&rdquo;</p>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <button onClick={() => toggleFeatured(r)} className={`inline-flex items-center gap-1 px-3 py-1 rounded-sm text-xs font-medium ${getFeatured(r) ? 'bg-sethi-gold text-sethi-black' : 'border border-sethi-gold text-sethi-gold hover:bg-sethi-gold hover:text-sethi-black'}`}><StarIcon className="w-3 h-3" /> {getFeatured(r) ? 'Featured' : 'Feature'}</button>
                <button onClick={() => openEdit(r)} className="inline-flex items-center gap-1 border border-sethi-gold text-sethi-gold px-3 py-1 rounded-sm hover:bg-sethi-gold hover:text-sethi-black text-xs"><Edit className="w-3 h-3" /> Edit</button>
                <button onClick={() => setConfirm(r)} className="inline-flex items-center gap-1 border border-red-500 text-red-600 px-3 py-1 rounded-sm hover:bg-red-500 hover:text-white text-xs"><Trash2 className="w-3 h-3" /> Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 md:pl-[260px]">
          <form onSubmit={save} className="bg-white rounded-sm w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-sethi-gray200">
              <h3 className="font-serif text-xl">{editing === 'new' ? 'Add Review' : 'Edit Review'}</h3>
              <button type="button" onClick={close} className="w-9 h-9 inline-flex items-center justify-center"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Customer Name *</label>
                <input value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} className="input-sethi" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Customer Photo URL</label>
                <input value={form.customerPhoto} onChange={(e) => setForm({ ...form, customerPhoto: e.target.value })} className="input-sethi" placeholder="https://..." />
                <div className="mt-3 w-20 h-20 rounded-full overflow-hidden border-2 border-sethi-gold bg-sethi-gold flex items-center justify-center">
                  {form.customerPhoto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={form.customerPhoto} alt="" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                  ) : (
                    <span className="font-serif text-lg text-sethi-black font-bold">{getInitials(form.customerName) || <ImageOff className="w-4 h-4" />}</span>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Rating *</label>
                <StarRating value={form.rating} onChange={(n) => setForm({ ...form, rating: n })} size={28} readOnly={false} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Review Text *</label>
                <textarea value={form.reviewText} onChange={(e) => setForm({ ...form, reviewText: e.target.value })} rows={4} className="input-sethi !min-h-[110px] py-2" required />
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium">Featured</label>
                <button type="button" onClick={() => setForm({ ...form, isFeatured: !form.isFeatured })} className={`relative w-14 h-7 rounded-full transition-colors ${form.isFeatured ? 'bg-sethi-gold' : 'bg-sethi-gray200'}`}>
                  <span className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${form.isFeatured ? 'translate-x-7' : ''}`} />
                </button>
                <span className="text-sm text-sethi-gray500">{form.isFeatured ? 'Yes' : 'No'}</span>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-sethi-gray200">
              <button type="button" onClick={close} className="btn-ghost">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : 'Save Review'}
              </button>
            </div>
          </form>
        </div>
      )}

      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 md:pl-[260px]">
          <div className="bg-white rounded-sm p-6 max-w-md w-full">
            <h3 className="font-serif text-xl mb-2">Delete review?</h3>
            <p className="text-sethi-gray500 text-sm mb-5">Are you sure you want to delete review from "{confirm ? getName(confirm) : ''}"?</p>
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
