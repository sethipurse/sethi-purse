'use client';
import { useEffect, useState } from 'react';
import AdminShell from '@/components/AdminShell';
import StarRating from '@/components/StarRating';
import ConfirmDialog from '@/components/ConfirmDialog';
import { toast } from 'sonner';
import { Plus, Trash2, Edit, ImageOff, Loader2, Star as StarIcon, X, Square, CheckSquare } from 'lucide-react';
import { getInitials } from '@/lib/constants';

const EMPTY = { customerName: '', customerPhoto: '', rating: 5, reviewText: '', isFeatured: false, category: '', googleReviewLink: '' };

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [confirm,      setConfirm]      = useState(null);
  const [selected,     setSelected]     = useState(new Set());
  const [bulkConfirm,  setBulkConfirm]  = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

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
  useEffect(() => {
    fetch('/api/categories').then((res) => res.json()).then((data) => setCategories(Array.isArray(data) ? data : [])).catch(() => setCategories([]));
  }, []);

  // FIX: read snake_case fields from Supabase, fallback to camelCase if present
  const getName = (r) => r.customer_name ?? r.customerName ?? '';
  const getPhoto = (r) => r.customer_photo ?? r.customerPhoto ?? '';
  const getRating = (r) => r.rating ?? 5;
  const getText = (r) => r.review_text ?? r.reviewText ?? '';
  const getFeatured = (r) => !!(r.is_featured ?? r.isFeatured);
  const getCategory = (r) => r.category ?? '';
  const getGoogleLink = (r) => r.google_review_link ?? r.googleReviewLink ?? '';

  const openNew = () => { setEditing('new'); setForm(EMPTY); };
  const openEdit = (r) => {
    setEditing(r);
    setForm({
      customerName: getName(r),
      customerPhoto: getPhoto(r),
      rating: getRating(r),
      reviewText: getText(r),
      isFeatured: getFeatured(r),
      category: getCategory(r),
      googleReviewLink: getGoogleLink(r),
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

  const clearSelection = () => setSelected(new Set());

  const toggleSelect = (id) => setSelected((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const allSelected = reviews.length > 0 && reviews.every((r) => selected.has(r.id));

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(reviews.map((r) => r.id)));
    }
  };

  const doBulkDelete = async () => {
    setBulkDeleting(true);
    const ids = [...selected];
    const results = await Promise.allSettled(
      ids.map((id) => fetch(`/api/reviews/${encodeURIComponent(id)}`, { method: 'DELETE' }))
    );
    const failed = results.filter((r) => r.status === 'rejected' || !r.value?.ok).length;
    setBulkDeleting(false);
    setBulkConfirm(false);
    clearSelection();
    if (failed > 0) toast.error(`${failed} deletion${failed > 1 ? 's' : ''} failed`);
    else toast.success(`${ids.length} review${ids.length > 1 ? 's' : ''} deleted`);
    load();
  };

  const selectedCount = selected.size;

  return (
    <AdminShell>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h2 className="font-serif text-2xl">All Reviews ({reviews.length})</h2>
        <button onClick={openNew} className="btn-primary"><Plus className="w-4 h-4" /> Add Review</button>
      </div>

      {selectedCount > 0 && (
        <div className="flex items-center justify-between bg-sethi-black text-white rounded-sm px-4 py-3 mb-4">
          <span className="text-sm font-medium">{selectedCount} review{selectedCount > 1 ? 's' : ''} selected</span>
          <div className="flex items-center gap-3">
            <button onClick={clearSelection} className="text-sm text-white/70 hover:text-white">Deselect all</button>
            <button
              onClick={() => setBulkConfirm(true)}
              className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-sm text-sm font-semibold hover:bg-red-700 transition-colors"
            >
              <Trash2 className="w-4 h-4" /> Delete {selectedCount} selected
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-sethi-gray500">Loading...</div>
      ) : reviews.length === 0 ? (
        <div className="bg-white border border-sethi-gray200 rounded-sm p-10 text-center text-sethi-gray500">No reviews yet.</div>
      ) : (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <button onClick={toggleAll} className="inline-flex items-center gap-1.5 text-sm text-sethi-gray500 hover:text-sethi-black">
              {allSelected ? <CheckSquare className="w-4 h-4 text-sethi-gold" /> : <Square className="w-4 h-4" />}
              {allSelected ? 'Deselect all' : 'Select all'}
            </button>
            {selectedCount > 0 && <span className="text-sm text-sethi-gold font-semibold">{selectedCount} selected</span>}
          </div>
          <div className="grid gap-4">
            {reviews.map((r) => {
              const isSel = selected.has(r.id);
              return (
                <div key={r.id} className={`bg-white border rounded-sm p-5 flex items-start gap-4 transition-colors ${isSel ? 'border-sethi-gold bg-sethi-gold/5' : 'border-sethi-gray200'}`}>
                  <button onClick={() => toggleSelect(r.id)} className="mt-1 shrink-0 text-sethi-gray500 hover:text-sethi-black">
                    {isSel ? <CheckSquare className="w-5 h-5 text-sethi-gold" /> : <Square className="w-5 h-5" />}
                  </button>
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
                      {getCategory(r) ? (
                        <span className="inline-block border border-sethi-gray200 text-sethi-gray500 text-[10px] font-medium px-2 py-0.5 rounded-sm tracking-wide">{getCategory(r)}</span>
                      ) : (
                        <span className="inline-block border border-sethi-gray200 text-sethi-gray500 text-[10px] font-medium px-2 py-0.5 rounded-sm tracking-wide">Shows on all products</span>
                      )}
                    </div>
                    <p className="text-sm text-sethi-gray800 mt-1 italic line-clamp-2">&ldquo;{getText(r)}&rdquo;</p>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <button onClick={() => toggleFeatured(r)} className={`inline-flex items-center gap-1 px-3 py-1 rounded-sm text-xs font-medium ${getFeatured(r) ? 'bg-sethi-gold text-sethi-black' : 'border border-sethi-gold text-sethi-gold hover:bg-sethi-gold hover:text-sethi-black'}`}><StarIcon className="w-3 h-3" /> {getFeatured(r) ? 'Featured' : 'Feature'}</button>
                    <button onClick={() => openEdit(r)} className="inline-flex items-center gap-1 border border-sethi-gold text-sethi-gold px-3 py-1 rounded-sm hover:bg-sethi-gold hover:text-sethi-black text-xs"><Edit className="w-3 h-3" /> Edit</button>
                    <button onClick={() => setConfirm(r)} className="inline-flex items-center gap-1 border border-red-500 text-red-600 px-3 py-1 rounded-sm hover:bg-red-500 hover:text-white text-xs"><Trash2 className="w-3 h-3" /> Delete</button>
                  </div>
                </div>
              );
            })}
          </div>
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
              <div>
                <label className="block text-sm font-medium mb-1.5">Category</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input-sethi">
                  <option value="">Show on all products (general)</option>
                  {categories.map((c) => <option key={c.id || c.name} value={c.name}>{c.name}</option>)}
                </select>
                <p className="text-xs text-sethi-gray500 mt-1">Tag this review to a category so it only shows on that category&rsquo;s product pages.</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Google Review Link (optional)</label>
                <input type="url" value={form.googleReviewLink} onChange={(e) => setForm({ ...form, googleReviewLink: e.target.value })} className="input-sethi" placeholder="https://g.page/r/..." />
                <p className="text-xs text-sethi-gray500 mt-1">Google Business listing ka link — customer isse asli reviews verify kar sakta hai.</p>
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

      <ConfirmDialog
        open={!!confirm}
        title="Delete review?"
        message={<>Are you sure you want to delete the review from <strong>{confirm ? getName(confirm) : ''}</strong>? This cannot be undone.</>}
        confirmLabel="Delete"
        onConfirm={() => doDelete(confirm.id)}
        onCancel={() => setConfirm(null)}
      />

      <ConfirmDialog
        open={bulkConfirm}
        title={<span className="text-red-700">Delete {selectedCount} review{selectedCount > 1 ? 's' : ''}?</span>}
        message={<>You are about to permanently delete <strong>{selectedCount} review{selectedCount > 1 ? 's' : ''}</strong>. This cannot be undone.</>}
        confirmLabel={bulkDeleting ? <><Loader2 className="w-4 h-4 animate-spin" /> Deleting…</> : <><Trash2 className="w-4 h-4" /> Delete {selectedCount}</>}
        loading={bulkDeleting}
        onConfirm={doBulkDelete}
        onCancel={() => setBulkConfirm(false)}
      />
    </AdminShell>
  );
}
