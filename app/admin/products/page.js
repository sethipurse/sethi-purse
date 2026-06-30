'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AdminShell from '@/components/AdminShell';
import { toast } from 'sonner';
import { Trash2, Edit, Plus, Search, CheckSquare, Square, Loader2, Package, Star } from 'lucide-react';
import { resolveImage } from '@/lib/constants';

export default function AdminProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('All');
  const [sort, setSort] = useState('newest');
  const [confirm, setConfirm] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Inline stock edit state: { [productId]: { value, saving } }
  const [stockEdits, setStockEdits] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const [pRes, cRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/categories'),
      ]);
      if (!pRes.ok) throw new Error(`Products HTTP ${pRes.status}`);
      if (!cRes.ok) throw new Error(`Categories HTTP ${cRes.status}`);
      const [p, c] = await Promise.all([pRes.json(), cRes.json()]);
      setProducts(Array.isArray(p) ? p : []);
      setCategories(Array.isArray(c) ? c : []);
    } catch (err) {
      console.error('Load products failed:', err);
      toast.error('Could not load products. Please refresh.');
      setProducts([]);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let list = [...products];
    if (cat !== 'All') list = list.filter((p) => p.category === cat);
    if (q.trim()) {
      const t = q.trim().toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(t) || (p.brand || '').toLowerCase().includes(t));
    }
    switch (sort) {
      case 'oldest': list.sort((a, b) => new Date(a.created_at ?? a.createdAt) - new Date(b.created_at ?? b.createdAt)); break;
      case 'price_asc': list.sort((a, b) => (a.salePrice ?? a.sale_price ?? a.price ?? 0) - (b.salePrice ?? b.sale_price ?? b.price ?? 0)); break;
      case 'price_desc': list.sort((a, b) => (b.salePrice ?? b.sale_price ?? b.price ?? 0) - (a.salePrice ?? a.sale_price ?? a.price ?? 0)); break;
      default: list.sort((a, b) => new Date(b.created_at ?? b.createdAt) - new Date(a.created_at ?? a.createdAt));
    }
    return list;
  }, [products, q, cat, sort]);

  // ── Selection helpers ──
  const allFilteredIds = filtered.map((p) => p.id);
  const allSelected = allFilteredIds.length > 0 && allFilteredIds.every((id) => selected.has(id));
  const someSelected = allFilteredIds.some((id) => selected.has(id));

  const toggleOne = (id) => setSelected((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const toggleAll = () => {
    if (allSelected) {
      setSelected((prev) => { const next = new Set(prev); allFilteredIds.forEach((id) => next.delete(id)); return next; });
    } else {
      setSelected((prev) => { const next = new Set(prev); allFilteredIds.forEach((id) => next.add(id)); return next; });
    }
  };

  const clearSelection = () => setSelected(new Set());

  // ── Single delete ──
  const doDelete = async (id) => {
    if (!id) { toast.error('Invalid product'); setConfirm(null); return; }
    try {
      const res = await fetch(`/api/products/${encodeURIComponent(id)}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' } });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error || `Failed to delete (status ${res.status})`); return; }
      toast.success('Product deleted');
      setConfirm(null);
      setSelected((prev) => { const next = new Set(prev); next.delete(id); return next; });
      load();
    } catch (err) {
      console.error('Delete product failed:', err);
      toast.error('Network error while deleting. Please try again.');
      setConfirm(null);
    }
  };

  // ── Bulk delete ──
  const doBulkDelete = async () => {
    setBulkDeleting(true);
    const ids = [...selected];
    let successCount = 0; let failCount = 0;
    for (const id of ids) {
      try {
        const res = await fetch(`/api/products/${encodeURIComponent(id)}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' } });
        res.ok ? successCount++ : failCount++;
      } catch { failCount++; }
    }
    setBulkDeleting(false); setBulkConfirm(false); clearSelection();
    if (successCount > 0) toast.success(`${successCount} product${successCount > 1 ? 's' : ''} deleted`);
    if (failCount > 0) toast.error(`${failCount} product${failCount > 1 ? 's' : ''} failed to delete`);
    load();
  };

  // ── Inline stock edit ──
  const startStockEdit = (p) => {
    setStockEdits((prev) => ({ ...prev, [p.id]: { value: String(p.stock ?? ''), saving: false } }));
  };

  const cancelStockEdit = (id) => {
    setStockEdits((prev) => { const next = { ...prev }; delete next[id]; return next; });
  };

  const saveStock = async (p) => {
    const edit = stockEdits[p.id];
    if (!edit) return;
    const newStock = edit.value === '' ? null : parseInt(edit.value, 10);
    if (edit.value !== '' && (isNaN(newStock) || newStock < 0)) {
      toast.error('Stock must be a valid number (0 or more)'); return;
    }
    setStockEdits((prev) => ({ ...prev, [p.id]: { ...prev[p.id], saving: true } }));
    try {
      const res = await fetch(`/api/products/${encodeURIComponent(p.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...p, stock: newStock }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error || 'Failed to update stock'); setStockEdits((prev) => ({ ...prev, [p.id]: { ...prev[p.id], saving: false } })); return; }
      toast.success(`Stock updated to ${newStock ?? '∞'}`);
      cancelStockEdit(p.id);
      // Update locally without full reload for snappy UX
      setProducts((prev) => prev.map((pr) => pr.id === p.id ? { ...pr, stock: newStock } : pr));
    } catch (err) {
      console.error('Update stock failed:', err);
      toast.error('Network error. Please try again.');
      setStockEdits((prev) => ({ ...prev, [p.id]: { ...prev[p.id], saving: false } }));
    }
  };

  // ── Toggle Featured ──
  const toggleFeatured = async (p) => {
    const newFeatured = !(p.featured ?? false);
    // Optimistic update
    setProducts((prev) => prev.map((pr) => pr.id === p.id ? { ...pr, featured: newFeatured } : pr));
    try {
      const res = await fetch(`/api/products/${encodeURIComponent(p.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...p, featured: newFeatured }),
      });
      if (!res.ok) {
        // Revert on failure
        setProducts((prev) => prev.map((pr) => pr.id === p.id ? { ...pr, featured: !newFeatured } : pr));
        toast.error('Failed to update featured status');
        return;
      }
      toast.success(newFeatured ? '⭐ Marked as Featured' : 'Removed from Featured');
    } catch {
      setProducts((prev) => prev.map((pr) => pr.id === p.id ? { ...pr, featured: !newFeatured } : pr));
      toast.error('Network error');
    }
  };

  const selectedCount = selected.size;

  const StockCell = ({ p }) => {
    const edit = stockEdits[p.id];
    const isLow = typeof p.stock === 'number' && p.stock <= 5;

    if (edit) {
      return (
        <div className="flex items-center gap-1">
          <input
            type="number"
            min="0"
            value={edit.value}
            onChange={(e) => setStockEdits((prev) => ({ ...prev, [p.id]: { ...prev[p.id], value: e.target.value } }))}
            onKeyDown={(e) => { if (e.key === 'Enter') saveStock(p); if (e.key === 'Escape') cancelStockEdit(p.id); }}
            className="w-16 border border-sethi-gold rounded-sm px-2 py-1 text-sm text-center focus:outline-none focus:ring-1 focus:ring-sethi-gold"
            autoFocus
          />
          {edit.saving ? (
            <Loader2 className="w-4 h-4 animate-spin text-sethi-gold" />
          ) : (
            <>
              <button onClick={() => saveStock(p)} className="text-green-600 hover:text-green-800 font-bold text-lg leading-none" title="Save">✓</button>
              <button onClick={() => cancelStockEdit(p.id)} className="text-red-400 hover:text-red-600 font-bold text-lg leading-none" title="Cancel">✕</button>
            </>
          )}
        </div>
      );
    }

    return (
      <button
        onClick={() => startStockEdit(p)}
        title="Click to edit stock"
        className={`group flex items-center gap-1.5 rounded px-2 py-1 hover:bg-sethi-gold/10 transition-colors ${isLow ? 'text-red-600 font-semibold' : ''}`}
      >
        <Package className="w-3.5 h-3.5 text-sethi-gray400 group-hover:text-sethi-gold" />
        <span>{p.stock === null || p.stock === undefined ? '∞' : p.stock}</span>
        <span className="text-[10px] text-sethi-gray400 group-hover:text-sethi-gold hidden group-hover:inline">edit</span>
      </button>
    );
  };

  return (
    <AdminShell>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h2 className="font-serif text-xl font-medium">All products ({products.length})</h2>
        <Link href="/admin/products/add" className="btn-primary"><Plus className="w-4 h-4" /> Add New Product</Link>
      </div>

      {/* Filters */}
      <div className="bg-white border border-sethi-gray200 rounded-sm p-4 mb-4 grid gap-3 md:grid-cols-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sethi-gray500" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or brand..." className="input-sethi !pl-10" />
        </div>
        <select value={cat} onChange={(e) => setCat(e.target.value)} className="input-sethi">
          <option>All</option>
          {categories.map((c) => <option key={c.id}>{c.name}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="input-sethi">
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
        </select>
      </div>

      {/* Bulk action bar */}
      {selectedCount > 0 && (
        <div className="flex items-center justify-between bg-sethi-gold/10 border border-sethi-gold rounded-sm px-4 py-3 mb-4">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-sethi-black">{selectedCount} product{selectedCount > 1 ? 's' : ''} selected</span>
            <button onClick={clearSelection} className="text-sm text-sethi-gray500 hover:text-sethi-black underline">Clear</button>
          </div>
          <button onClick={() => setBulkConfirm(true)} className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-sm text-sm font-semibold hover:bg-red-700 transition-colors">
            <Trash2 className="w-4 h-4" /> Delete {selectedCount} selected
          </button>
        </div>
      )}

      <div className="bg-white border border-sethi-gray200 rounded-sm overflow-hidden">
        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-sethi-gray100 text-left text-xs uppercase tracking-wider text-sethi-gray500">
              <tr>
                <th className="px-4 py-3 w-10">
                  <button onClick={toggleAll} className="text-sethi-gray500 hover:text-sethi-gold transition-colors">
                    {allSelected ? <CheckSquare className="w-5 h-5 text-sethi-gold" /> : someSelected ? <CheckSquare className="w-5 h-5 text-sethi-gray400" /> : <Square className="w-5 h-5" />}
                  </button>
                </th>
                <th className="px-4 py-3">Image</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Brand</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Sale Price</th>
                <th className="px-4 py-3">
                  <span className="flex items-center gap-1">Stock <span className="text-[10px] normal-case tracking-normal text-sethi-gray400 font-normal">(click to edit)</span></span>
                </th>
                <th className="px-4 py-3">Featured</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="9" className="text-center p-8 text-sethi-gray500">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="9" className="text-center p-8 text-sethi-gray500">No products found.</td></tr>
              ) : filtered.map((p) => (
                <tr key={p.id} className={`border-t border-sethi-gray200 transition-colors ${selected.has(p.id) ? 'bg-sethi-gold/5' : 'hover:bg-sethi-gray100/50'}`}>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleOne(p.id)} className="text-sethi-gray500 hover:text-sethi-gold transition-colors">
                      {selected.has(p.id) ? <CheckSquare className="w-5 h-5 text-sethi-gold" /> : <Square className="w-5 h-5" />}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={resolveImage(p)} alt="" className="w-12 h-12 object-cover rounded-sm bg-sethi-gray100" />
                  </td>
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-sethi-gray500">{p.brand}</td>
                  <td className="px-4 py-3">{p.category}</td>
                  <td className="px-4 py-3 font-semibold">Rs.{p.salePrice ?? p.sale_price ?? p.price}</td>
                  <td className="px-4 py-3"><StockCell p={p} /></td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleFeatured(p)}
                      title={p.featured ? 'Remove from featured' : 'Mark as featured'}
                      className={`flex items-center justify-center w-9 h-9 rounded-full transition-all ${p.featured ? 'bg-sethi-gold text-sethi-black' : 'bg-sethi-gray100 text-sethi-gray400 hover:bg-sethi-gold/20 hover:text-sethi-gold'}`}
                    >
                      <Star className={`w-4 h-4 ${p.featured ? 'fill-sethi-black' : ''}`} />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link href={`/admin/products/edit/${p.id}`} className="inline-flex items-center gap-1 border border-sethi-gold text-sethi-gold px-3 py-1 rounded-sm hover:bg-sethi-gold hover:text-sethi-black transition-colors">
                        <Edit className="w-3.5 h-3.5" /> Edit
                      </Link>
                      <button onClick={() => setConfirm(p)} className="inline-flex items-center gap-1 border border-red-500 text-red-600 px-3 py-1 rounded-sm hover:bg-red-500 hover:text-white transition-colors">
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-sethi-gray200">
          {!loading && filtered.length > 0 && (
            <div className="px-4 py-3 flex items-center justify-between bg-sethi-gray100">
              <button onClick={toggleAll} className="flex items-center gap-2 text-sm font-medium">
                {allSelected ? <CheckSquare className="w-5 h-5 text-sethi-gold" /> : <Square className="w-5 h-5 text-sethi-gray500" />}
                {allSelected ? 'Deselect all' : 'Select all'}
              </button>
              {selectedCount > 0 && <span className="text-sm text-sethi-gold font-semibold">{selectedCount} selected</span>}
            </div>
          )}
          {loading ? (
            <div className="p-6 text-sethi-gray500 text-center">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-sethi-gray500 text-center">No products found.</div>
          ) : filtered.map((p) => (
            <div key={p.id} className={`p-4 flex gap-3 ${selected.has(p.id) ? 'bg-sethi-gold/5' : ''}`}>
              <button onClick={() => toggleOne(p.id)} className="mt-1 shrink-0">
                {selected.has(p.id) ? <CheckSquare className="w-5 h-5 text-sethi-gold" /> : <Square className="w-5 h-5 text-sethi-gray400" />}
              </button>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={resolveImage(p)} alt="" className="w-16 h-16 object-cover rounded-sm bg-sethi-gray100 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{p.name}</div>
                <div className="text-xs text-sethi-gray500">{p.brand} • {p.category}</div>
                <div className="flex items-center gap-3 mt-1 text-sm flex-wrap">
                  <span className="font-semibold">Rs.{p.salePrice ?? p.sale_price ?? p.price}</span>
                  <StockCell p={p} />
                </div>
                <div className="flex gap-2 mt-2 flex-wrap items-center">
                  <button
                    onClick={() => toggleFeatured(p)}
                    className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${p.featured ? 'bg-sethi-gold text-sethi-black' : 'bg-sethi-gray100 text-sethi-gray500'}`}
                  >
                    <Star className={`w-3 h-3 ${p.featured ? 'fill-sethi-black' : ''}`} />
                    {p.featured ? 'Featured' : 'Feature'}
                  </button>
                  <Link href={`/admin/products/edit/${p.id}`} className="text-sm text-sethi-gold underline">Edit</Link>
                  <button onClick={() => setConfirm(p)} className="text-sm text-red-600 underline">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Single delete confirm */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 md:pl-[260px]">
          <div className="bg-white rounded-sm p-6 max-w-md w-full">
            <h3 className="font-serif text-base font-medium mb-2">Delete product?</h3>
            <p className="text-sethi-gray500 text-sm mb-5">Are you sure you want to delete "<strong>{confirm.name}</strong>"? This cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirm(null)} className="btn-ghost">Cancel</button>
              <button onClick={() => doDelete(confirm.id)} className="inline-flex items-center gap-2 min-h-[48px] px-6 bg-red-600 text-white font-semibold rounded-sm hover:bg-red-700">
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk delete confirm */}
      {bulkConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 md:pl-[260px]">
          <div className="bg-white rounded-sm p-6 max-w-md w-full">
            <h3 className="font-serif text-base font-medium mb-2 text-red-700">Delete {selectedCount} products?</h3>
            <p className="text-sethi-gray500 text-sm mb-5">You are about to permanently delete <strong>{selectedCount} product{selectedCount > 1 ? 's' : ''}</strong>. This cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setBulkConfirm(false)} disabled={bulkDeleting} className="btn-ghost">Cancel</button>
              <button onClick={doBulkDelete} disabled={bulkDeleting} className="inline-flex items-center gap-2 min-h-[48px] px-6 bg-red-600 text-white font-semibold rounded-sm hover:bg-red-700 disabled:opacity-60">
                {bulkDeleting ? <><Loader2 className="w-4 h-4 animate-spin" /> Deleting...</> : <><Trash2 className="w-4 h-4" /> Delete {selectedCount}</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
