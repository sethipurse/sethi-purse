'use client';
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import AdminShell from '@/components/AdminShell';
import ConfirmDialog from '@/components/ConfirmDialog';
import { toast } from 'sonner';
import { Trash2, Edit, Plus, Search, CheckSquare, Square, Loader2, Package, Star, ChevronDown, ChevronRight, List, LayoutGrid, Eye, EyeOff, ImageOff } from 'lucide-react';
import { resolveImage } from '@/lib/constants';

const VIEW_STORAGE_KEY = 'sethi-admin-products-view';
const COLLAPSED_STORAGE_KEY = 'sethi-admin-products-collapsed';

export default function AdminProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('All');
  const [sort, setSort] = useState('newest');
  const [hiddenOnly, setHiddenOnly] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // View mode: 'list' (existing behavior, default) or 'grouped' (category-wise)
  const [view, setView] = useState('list');
  const [collapsedGroups, setCollapsedGroups] = useState(new Set());

  // Inline stock edit state: { [productId]: { value, saving } }
  const [stockEdits, setStockEdits] = useState({});

  // ── Manual hidden-image cleanup tool state ──
  // staleData stays null until the owner explicitly runs a check — nothing
  // is fetched or acted on automatically. It holds two separate groups:
  // `confident` (real hidden_at-based day counts) and `unknownDuration`
  // (hidden before hidden_at tracking started — no trustworthy duration).
  const [staleOpen, setStaleOpen] = useState(false);
  const [staleDays, setStaleDays] = useState('180');
  const [staleLoading, setStaleLoading] = useState(false);
  const [staleData, setStaleData] = useState(null);
  const [staleSelected, setStaleSelected] = useState(new Set());
  const [staleConfirm, setStaleConfirm] = useState(false);
  const [staleCleaning, setStaleCleaning] = useState(false);

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

  // Restore view mode + collapsed groups once on mount (client-only — kept
  // out of useState initializers to avoid an SSR/client hydration mismatch).
  useEffect(() => {
    try {
      const savedView = window.localStorage.getItem(VIEW_STORAGE_KEY);
      if (savedView === 'list' || savedView === 'grouped') setView(savedView);
      const savedCollapsed = JSON.parse(window.localStorage.getItem(COLLAPSED_STORAGE_KEY) || '[]');
      if (Array.isArray(savedCollapsed)) setCollapsedGroups(new Set(savedCollapsed));
    } catch {}
  }, []);

  useEffect(() => {
    try { window.localStorage.setItem(VIEW_STORAGE_KEY, view); } catch {}
  }, [view]);

  useEffect(() => {
    try { window.localStorage.setItem(COLLAPSED_STORAGE_KEY, JSON.stringify([...collapsedGroups])); } catch {}
  }, [collapsedGroups]);

  // Counts always reflect the FULL product list (not the search-filtered
  // one), so the owner can spot empty categories via a "(0)" count.
  const categoryCounts = useMemo(() => {
    const map = new Map();
    products.forEach((p) => {
      const key = p.category || '';
      if (!key) return;
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [products]);

  const filtered = useMemo(() => {
    let list = [...products];
    if (cat !== 'All') list = list.filter((p) => p.category === cat);
    if (hiddenOnly) list = list.filter((p) => p.is_active === false);
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
  }, [products, q, cat, sort, hiddenOnly]);

  // Groups the already-filtered/sorted list by category, ordered by the
  // categories list order (falling back to alphabetical for anything not in
  // that list) with Uncategorized always last.
  const grouped = useMemo(() => {
    const map = new Map();
    filtered.forEach((p) => {
      const key = p.category && p.category.trim() ? p.category : 'Uncategorized';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(p);
    });
    const knownOrder = categories.map((c) => c.name);
    const keys = Array.from(map.keys()).filter((k) => k !== 'Uncategorized');
    keys.sort((a, b) => {
      const ia = knownOrder.indexOf(a);
      const ib = knownOrder.indexOf(b);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return a.localeCompare(b);
    });
    if (map.has('Uncategorized')) keys.push('Uncategorized');
    return keys.map((key) => ({ key, products: map.get(key) }));
  }, [filtered, categories]);

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

  const toggleGroupSelection = (groupProducts) => {
    const ids = groupProducts.map((p) => p.id);
    const allIn = ids.length > 0 && ids.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allIn) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  };

  const toggleGroupCollapse = (key) => setCollapsedGroups((prev) => {
    const next = new Set(prev);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  });

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

  // ── Manual hidden-image cleanup: preview (read-only, never deletes) ──
  const checkStaleHidden = async () => {
    setStaleLoading(true);
    try {
      const res = await fetch(`/api/products/stale-hidden?days=${encodeURIComponent(staleDays)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setStaleData({
        confident: Array.isArray(data.confident) ? data.confident : [],
        unknownDuration: Array.isArray(data.unknownDuration) ? data.unknownDuration : [],
      });
      setStaleSelected(new Set());
    } catch (err) {
      console.error('Check stale hidden products failed:', err);
      toast.error('Could not check for old hidden products.');
      setStaleData({ confident: [], unknownDuration: [] });
    } finally {
      setStaleLoading(false);
    }
  };

  const toggleStaleOne = (id) => setStaleSelected((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  // Selects/deselects all items within a single group (confident or
  // unknownDuration) without touching the other group's selection.
  const toggleStaleGroup = (list) => {
    const ids = list.map((p) => p.id);
    const allIn = ids.length > 0 && ids.every((id) => staleSelected.has(id));
    setStaleSelected((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => allIn ? next.delete(id) : next.add(id));
      return next;
    });
  };

  // Only ever sends the exact IDs the owner checked — no "clean all stale"
  // shortcut exists anywhere in this flow.
  const doCleanImages = async () => {
    setStaleCleaning(true);
    try {
      const res = await fetch('/api/products/clean-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [...staleSelected] }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      const failCount = Array.isArray(data.failed) ? data.failed.length : 0;
      if (data.cleaned > 0) toast.success(`${data.cleaned} image${data.cleaned > 1 ? 's' : ''} cleaned`);
      if (failCount > 0) toast.error(`${failCount} failed: ${data.failed.map((f) => f.reason).join(', ')}`);
      setStaleConfirm(false);
      setStaleSelected(new Set());
      checkStaleHidden();
      load();
    } catch (err) {
      console.error('Clean images failed:', err);
      toast.error('Network error while cleaning images. Please try again.');
      setStaleConfirm(false);
    } finally {
      setStaleCleaning(false);
    }
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

  // ── Toggle Live/Hidden ──
  const toggleActive = async (p) => {
    const newActive = !(p.is_active ?? true);
    // Optimistic update
    setProducts((prev) => prev.map((pr) => pr.id === p.id ? { ...pr, is_active: newActive } : pr));
    try {
      const res = await fetch(`/api/products/${encodeURIComponent(p.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...p, is_active: newActive }),
      });
      if (!res.ok) {
        // Revert on failure
        setProducts((prev) => prev.map((pr) => pr.id === p.id ? { ...pr, is_active: !newActive } : pr));
        toast.error('Failed to update visibility');
        return;
      }
      toast.success(newActive ? '✅ Live site pe dikh raha hai' : '🚫 Live site se chhupa diya');
    } catch {
      setProducts((prev) => prev.map((pr) => pr.id === p.id ? { ...pr, is_active: !newActive } : pr));
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

  // Reused verbatim by both the flat list view and each category group in
  // grouped mode, so selection/edit/delete/feature behavior never diverges.
  const DesktopProductRow = ({ p }) => {
    const isHidden = p.is_active === false;
    return (
    <tr className={`border-t border-sethi-gray200 transition-colors ${isHidden ? 'opacity-50' : ''} ${selected.has(p.id) ? 'bg-sethi-gold/5' : 'hover:bg-sethi-gray100/50'}`}>
      <td className="px-4 py-3">
        <button onClick={() => toggleOne(p.id)} className="text-sethi-gray500 hover:text-sethi-gold transition-colors">
          {selected.has(p.id) ? <CheckSquare className="w-5 h-5 text-sethi-gold" /> : <Square className="w-5 h-5" />}
        </button>
      </td>
      <td className="px-4 py-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={resolveImage(p)} alt="" className="w-12 h-12 object-cover rounded-sm bg-sethi-gray100" />
      </td>
      <td className="px-4 py-3 font-medium">
        <div className="flex items-center gap-2">
          {p.name}
          {isHidden && <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide bg-sethi-gray200 text-sethi-gray500 px-1.5 py-0.5 rounded-sm">Hidden</span>}
        </div>
      </td>
      <td className="px-4 py-3 text-sethi-gray500">{p.brand}</td>
      <td className="px-4 py-3">{p.category}</td>
      <td className="px-4 py-3 font-semibold">Rs.{p.salePrice ?? p.sale_price ?? p.price}</td>
      <td className="px-4 py-3"><StockCell p={p} /></td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => toggleFeatured(p)}
            title={p.featured ? 'Remove from featured' : 'Mark as featured'}
            className={`flex items-center justify-center w-9 h-9 rounded-full transition-all ${p.featured ? 'bg-sethi-gold text-sethi-black' : 'bg-sethi-gray100 text-sethi-gray400 hover:bg-sethi-gold/20 hover:text-sethi-gold'}`}
          >
            <Star className={`w-4 h-4 ${p.featured ? 'fill-sethi-black' : ''}`} />
          </button>
          <button
            onClick={() => toggleActive(p)}
            title="Live site pe dikhao / chhupao"
            className={`flex items-center justify-center w-9 h-9 rounded-full transition-all ${isHidden ? 'bg-sethi-gray100 text-sethi-gray400 hover:bg-sethi-gray200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
          >
            {isHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
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
    );
  };

  const MobileProductCard = ({ p }) => {
    const isHidden = p.is_active === false;
    return (
    <div className={`p-4 flex gap-3 ${isHidden ? 'opacity-50' : ''} ${selected.has(p.id) ? 'bg-sethi-gold/5' : ''}`}>
      <button onClick={() => toggleOne(p.id)} className="mt-1 shrink-0">
        {selected.has(p.id) ? <CheckSquare className="w-5 h-5 text-sethi-gold" /> : <Square className="w-5 h-5 text-sethi-gray400" />}
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={resolveImage(p)} alt="" className="w-16 h-16 object-cover rounded-sm bg-sethi-gray100 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="font-medium truncate">{p.name}</div>
          {isHidden && <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide bg-sethi-gray200 text-sethi-gray500 px-1.5 py-0.5 rounded-sm">Hidden</span>}
        </div>
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
          <button
            onClick={() => toggleActive(p)}
            title="Live site pe dikhao / chhupao"
            className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${isHidden ? 'bg-sethi-gray100 text-sethi-gray500' : 'bg-green-100 text-green-700'}`}
          >
            {isHidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            {isHidden ? 'Hidden' : 'Live'}
          </button>
          <Link href={`/admin/products/edit/${p.id}`} className="text-sm text-sethi-gold underline">Edit</Link>
          <button onClick={() => setConfirm(p)} className="text-sm text-red-600 underline">Delete</button>
        </div>
      </div>
    </div>
    );
  };

  // Native checkbox (not the custom Square/CheckSquare buttons used
  // elsewhere) because "indeterminate" is a DOM property only settable via
  // a ref, not a JSX attribute.
  const GroupCheckbox = ({ checked, indeterminate, onChange, label }) => {
    const ref = useRef(null);
    useEffect(() => { if (ref.current) ref.current.indeterminate = indeterminate; }, [indeterminate]);
    return (
      <input
        ref={ref}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        aria-label={label}
        className="w-[18px] h-[18px] accent-sethi-gold cursor-pointer shrink-0"
      />
    );
  };

  const GroupHeaderRow = ({ groupKey, groupProducts }) => {
    const ids = groupProducts.map((p) => p.id);
    const allIn = ids.length > 0 && ids.every((id) => selected.has(id));
    const someIn = ids.some((id) => selected.has(id));
    const collapsed = collapsedGroups.has(groupKey);
    return (
      <tr className="bg-sethi-gray100 border-t border-sethi-gray200">
        <td className="px-4 py-2.5" colSpan={9}>
          <div className="flex items-center gap-3">
            <GroupCheckbox checked={allIn} indeterminate={!allIn && someIn} onChange={() => toggleGroupSelection(groupProducts)} label={`Select all in ${groupKey}`} />
            <button onClick={() => toggleGroupCollapse(groupKey)} className="flex items-center gap-2 font-semibold text-sethi-black">
              {collapsed ? <ChevronRight className="w-4 h-4 text-sethi-gray500" /> : <ChevronDown className="w-4 h-4 text-sethi-gray500" />}
              {groupKey}
              <span className="inline-flex items-center justify-center text-xs font-bold bg-sethi-gold/20 text-sethi-gold-dark rounded-full px-2 py-0.5">{groupProducts.length}</span>
            </button>
          </div>
        </td>
      </tr>
    );
  };

  const GroupHeaderMobile = ({ groupKey, groupProducts }) => {
    const ids = groupProducts.map((p) => p.id);
    const allIn = ids.length > 0 && ids.every((id) => selected.has(id));
    const someIn = ids.some((id) => selected.has(id));
    const collapsed = collapsedGroups.has(groupKey);
    return (
      <div className="px-4 py-3 flex items-center gap-3 bg-sethi-gray100">
        <GroupCheckbox checked={allIn} indeterminate={!allIn && someIn} onChange={() => toggleGroupSelection(groupProducts)} label={`Select all in ${groupKey}`} />
        <button onClick={() => toggleGroupCollapse(groupKey)} className="flex items-center gap-2 font-semibold text-sm flex-1 min-w-0">
          {collapsed ? <ChevronRight className="w-4 h-4 shrink-0 text-sethi-gray500" /> : <ChevronDown className="w-4 h-4 shrink-0 text-sethi-gray500" />}
          <span className="truncate">{groupKey}</span>
          <span className="inline-flex items-center justify-center text-xs font-bold bg-sethi-gold/20 text-sethi-gold-dark rounded-full px-2 py-0.5 shrink-0">{groupProducts.length}</span>
        </button>
      </div>
    );
  };

  // Renders one group (confident or unknownDuration) of the stale-hidden
  // preview list, each with its own "select all" toggle. `subtitle` renders
  // per-item — either a real day count or the honest "unknown" label.
  const StaleGroupList = ({ items, subtitle }) => (
    <div className="mb-3">
      <button onClick={() => toggleStaleGroup(items)} className="flex items-center gap-2 text-sm font-medium text-sethi-black mb-2">
        {items.length > 0 && items.every((p) => staleSelected.has(p.id))
          ? <CheckSquare className="w-4 h-4 text-sethi-gold" /> : <Square className="w-4 h-4 text-sethi-gray500" />}
        Select all ({items.length})
      </button>
      <div className="divide-y divide-sethi-gray200 border border-sethi-gray200 rounded-sm max-h-80 overflow-y-auto">
        {items.map((p) => (
          <label key={p.id} className="flex items-center gap-3 px-3 py-2 hover:bg-sethi-gray100/50 cursor-pointer">
            <input
              type="checkbox"
              checked={staleSelected.has(p.id)}
              onChange={() => toggleStaleOne(p.id)}
              className="w-4 h-4 accent-sethi-gold shrink-0"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.image_url || ''} alt="" className="w-10 h-10 object-cover rounded-sm bg-sethi-gray100 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="font-medium truncate">{p.name}</div>
              <div className="text-xs text-sethi-gray500">{p.category} • {subtitle(p)}</div>
            </div>
          </label>
        ))}
      </div>
    </div>
  );

  return (
    <AdminShell>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h2 className="font-serif text-2xl">All Products ({products.length})</h2>
        <Link href="/admin/products/add" className="btn-primary"><Plus className="w-4 h-4" /> Add New Product</Link>
      </div>

      {/* Manual hidden-image cleanup tool — on-demand only, nothing runs automatically */}
      <div className="bg-white border border-sethi-gray200 rounded-sm mb-4">
        <button
          onClick={() => setStaleOpen((v) => !v)}
          className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
        >
          <span className="flex items-center gap-2 font-semibold text-sethi-black">
            <ImageOff className="w-4 h-4 text-sethi-gray500" /> Clean Old Hidden Product Images
          </span>
          {staleOpen ? <ChevronDown className="w-4 h-4 text-sethi-gray500" /> : <ChevronRight className="w-4 h-4 text-sethi-gray500" />}
        </button>
        {staleOpen && (
          <div className="px-4 pb-4 border-t border-sethi-gray200 pt-4">
            <p className="text-sm text-sethi-gray500 mb-3">
              Reclaims storage space from long-hidden, one-off designs. Nothing is deleted automatically —
              check the list, tick what you want gone, and confirm. The product record (name, price, category,
              sold-history) always stays; only the image files and the row's image fields are cleared.
            </p>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <label className="text-sm text-sethi-gray500">Hidden for at least</label>
              <input
                type="number"
                min="1"
                value={staleDays}
                onChange={(e) => setStaleDays(e.target.value)}
                className="input-sethi w-24 !py-1.5"
              />
              <span className="text-sm text-sethi-gray500">days</span>
              <button
                onClick={checkStaleHidden}
                disabled={staleLoading}
                className="inline-flex items-center gap-2 border border-sethi-gold text-sethi-gold-dark px-3 py-1.5 rounded-sm text-sm font-semibold hover:bg-sethi-gold hover:text-sethi-black transition-colors disabled:opacity-60"
              >
                {staleLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Check for old hidden products
              </button>
            </div>

            {staleData !== null && (
              staleData.confident.length === 0 && staleData.unknownDuration.length === 0 ? (
                <p className="text-sm text-sethi-gray500">No hidden products found.</p>
              ) : (
                <>
                  {staleSelected.size > 0 && (
                    <div className="flex justify-end mb-3">
                      <button
                        onClick={() => setStaleConfirm(true)}
                        className="inline-flex items-center gap-2 bg-red-600 text-white px-3 py-1.5 rounded-sm text-sm font-semibold hover:bg-red-700 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" /> Clean selected images ({staleSelected.size})
                      </button>
                    </div>
                  )}

                  {staleData.confident.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-sethi-black mb-2">
                        Hidden for {staleDays}+ days ({staleData.confident.length})
                      </h4>
                      <StaleGroupList items={staleData.confident} subtitle={(p) => `hidden ${p.hidden_days} days`} />
                    </div>
                  )}

                  {staleData.unknownDuration.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-amber-700 mb-1">
                        Hidden before we started tracking dates — review these manually before cleaning ({staleData.unknownDuration.length})
                      </h4>
                      <p className="text-xs text-sethi-gray500 mb-2">
                        These were hidden before the hidden-since tracking was added, so we don&apos;t know how long they&apos;ve actually been hidden.
                      </p>
                      <StaleGroupList items={staleData.unknownDuration} subtitle={() => 'hidden since unknown'} />
                    </div>
                  )}

                  {staleData.confident.length === 0 && staleData.unknownDuration.length > 0 && (
                    <p className="text-sm text-sethi-gray500 mt-2">No hidden products confidently older than {staleDays} days — only unreviewed legacy ones above.</p>
                  )}
                </>
              )
            )}
          </div>
        )}
      </div>

      {/* Filters — category is the primary control, shown first and full-width */}
      <div className="bg-white border border-sethi-gray200 rounded-sm p-4 mb-4">
        <select
          value={cat}
          onChange={(e) => setCat(e.target.value)}
          className="input-sethi mb-3 font-semibold border-sethi-gold/40"
        >
          <option value="All">All ({products.length})</option>
          {categories.map((c) => (
            <option key={c.id} value={c.name}>{c.name} ({categoryCounts.get(c.name) || 0})</option>
          ))}
        </select>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sethi-gray500" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or brand..." className="input-sethi !pl-10" />
          </div>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="input-sethi">
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
          </select>
        </div>
        <label className="flex items-center gap-2 mt-3 text-sm text-sethi-gray500 cursor-pointer w-fit">
          <input type="checkbox" checked={hiddenOnly} onChange={(e) => setHiddenOnly(e.target.checked)} className="w-4 h-4 accent-sethi-gold" />
          Hidden only
        </label>
      </div>

      {/* View toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="inline-flex rounded-sm border border-sethi-gray200 overflow-hidden shrink-0">
          <button
            onClick={() => setView('list')}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold transition-colors ${view === 'list' ? 'bg-sethi-gold text-sethi-black' : 'bg-white text-sethi-gray500 hover:bg-sethi-gray100'}`}
          >
            <List className="w-3.5 h-3.5" /> List
          </button>
          <button
            onClick={() => setView('grouped')}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold transition-colors border-l border-sethi-gray200 ${view === 'grouped' ? 'bg-sethi-gold text-sethi-black' : 'bg-white text-sethi-gray500 hover:bg-sethi-gray100'}`}
          >
            <LayoutGrid className="w-3.5 h-3.5" /> Category-wise
          </button>
        </div>
        {view === 'grouped' && (
          <div className="flex items-center gap-3 text-sm">
            <button onClick={() => setCollapsedGroups(new Set())} className="font-semibold text-sethi-gold hover:underline">Expand all</button>
            <span className="text-sethi-gray300">|</span>
            <button onClick={() => setCollapsedGroups(new Set(grouped.map((g) => g.key)))} className="font-semibold text-sethi-gold hover:underline">Collapse all</button>
          </div>
        )}
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
              ) : view === 'list' ? (
                filtered.map((p) => <DesktopProductRow key={p.id} p={p} />)
              ) : (
                grouped.map(({ key, products: groupProducts }) => (
                  <Fragment key={key}>
                    <GroupHeaderRow groupKey={key} groupProducts={groupProducts} />
                    {!collapsedGroups.has(key) && groupProducts.map((p) => <DesktopProductRow key={p.id} p={p} />)}
                  </Fragment>
                ))
              )}
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
          ) : view === 'list' ? (
            filtered.map((p) => <MobileProductCard key={p.id} p={p} />)
          ) : (
            grouped.map(({ key, products: groupProducts }) => (
              <Fragment key={key}>
                <GroupHeaderMobile groupKey={key} groupProducts={groupProducts} />
                {!collapsedGroups.has(key) && groupProducts.map((p) => <MobileProductCard key={p.id} p={p} />)}
              </Fragment>
            ))
          )}
        </div>
      </div>

      {/* Single delete confirm */}
      <ConfirmDialog
        open={!!confirm}
        title="Delete product?"
        message={<>Are you sure you want to delete "<strong>{confirm?.name}</strong>"? This cannot be undone.</>}
        confirmLabel={<><Trash2 className="w-4 h-4" /> Delete</>}
        onConfirm={() => doDelete(confirm.id)}
        onCancel={() => setConfirm(null)}
      />

      {/* Bulk delete confirm */}
      <ConfirmDialog
        open={bulkConfirm}
        title={<span className="text-red-700">Delete {selectedCount} products?</span>}
        message={<>You are about to permanently delete <strong>{selectedCount} product{selectedCount > 1 ? 's' : ''}</strong>. This cannot be undone.</>}
        confirmLabel={bulkDeleting ? <><Loader2 className="w-4 h-4 animate-spin" /> Deleting...</> : <><Trash2 className="w-4 h-4" /> Delete {selectedCount}</>}
        loading={bulkDeleting}
        onConfirm={doBulkDelete}
        onCancel={() => setBulkConfirm(false)}
      />

      {/* Clean hidden-product images confirm */}
      <ConfirmDialog
        open={staleConfirm}
        title={<span className="text-red-700">Delete {staleSelected.size} product image{staleSelected.size > 1 ? 's' : ''}?</span>}
        message={<>You are about to permanently delete the image file{staleSelected.size > 1 ? 's' : ''} for <strong>{staleSelected.size}</strong> hidden product{staleSelected.size > 1 ? 's' : ''} from storage. This cannot be undone. The product record itself (name, price, category, history) will stay.</>}
        confirmLabel={staleCleaning ? <><Loader2 className="w-4 h-4 animate-spin" /> Cleaning...</> : <><Trash2 className="w-4 h-4" /> Delete {staleSelected.size} image{staleSelected.size > 1 ? 's' : ''}</>}
        loading={staleCleaning}
        onConfirm={doCleanImages}
        onCancel={() => setStaleConfirm(false)}
      />
    </AdminShell>
  );
}
