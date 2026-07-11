'use client';
import { useCallback, useEffect, useState } from 'react';
import AdminShell from '@/components/AdminShell';
import ConfirmDialog from '@/components/ConfirmDialog';
import CustomerFormModal from '@/components/CustomerFormModal';
import CustomerImportModal from '@/components/CustomerImportModal';
import { toast } from 'sonner';
import {
  ChevronLeft, ChevronRight, Upload, Search, Square, CheckSquare,
  Phone, MessageCircle, Pencil, Trash2, Loader2, Plus, Check,
} from 'lucide-react';

const PAGE_SIZE = 25;

const COUNTRY_FLAG = {
  India: '🇮🇳', USA: '🇺🇸', 'United States': '🇺🇸', Canada: '🇨🇦', Australia: '🇦🇺',
  England: '🇬🇧', UK: '🇬🇧', 'United Kingdom': '🇬🇧', Dubai: '🇦🇪', UAE: '🇦🇪',
};
function countryLabel(country) {
  const c = country || 'India';
  return `${COUNTRY_FLAG[c] || '🌍'} ${c}`;
}

// A customer counts as foreign if their phone isn't a 91 (India) number —
// this is independent of the (possibly still-blank or 'India') country
// field, which the fix-countries backfill fills in from the phone code.
function isForeignPhone(phone) {
  return !String(phone || '').startsWith('91');
}
function locationLabel(c) {
  const country = isForeignPhone(c.phone_number) && (!c.country || c.country === 'India') ? 'Foreign' : c.country;
  return countryLabel(country);
}

const CHIPS = [
  { k: 'All',            label: 'All' },
  { k: 'local',          label: 'Local',         kind: 'tag' },
  { k: 'foreign_or_nri', label: 'Foreign / NRI', kind: 'tag' },
  { k: 'business',       label: 'Business',      kind: 'tag' },
  { k: 'subscribed',     label: 'Subscribed',    kind: 'status' },
  { k: 'unsubscribed',   label: 'Unsubscribed',  kind: 'status' },
];

const SORTS = [
  { k: 'newest',          label: 'Newest first' },
  { k: 'name',            label: 'Name (A-Z)' },
  { k: 'serial',          label: 'Serial no.' },
  { k: 'last_purchase',   label: 'Needs win-back first' },
  { k: 'least_contacted', label: 'Least contacted first' },
];

const STATUS_OPTIONS = ['subscribed', 'unsubscribed', 'blocked'];

function timeAgoHint(iso) {
  if (!iso) return 'kabhi message nahi bheja';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return 'aaj message bheja';
  if (days === 1) return '1 din pehle';
  if (days < 30) return `${days} din pehle`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} mahine pehle`;
  return `${Math.floor(months / 12)} saal pehle`;
}
function recentlyContacted(iso) {
  if (!iso) return false;
  return Date.now() - new Date(iso).getTime() < 3 * 86400000;
}

// Runs `worker` over `list` with at most `limit` in flight at once — same
// pattern as app/admin/inquiries/page.js, so a bulk action on hundreds of
// selected customers doesn't fire hundreds of parallel requests at once.
async function runWithConcurrency(list, limit, worker) {
  const results = new Array(list.length);
  let next = 0;
  async function lane() {
    while (next < list.length) {
      const i = next++;
      results[i] = await worker(list[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, list.length) }, lane));
  return results;
}

export default function AdminCustomersPage() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [chip, setChip] = useState('All');
  const [sort, setSort] = useState('newest');
  const [searchInput, setSearchInput] = useState('');
  const [q, setQ] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [cityOptions, setCityOptions] = useState([]);
  const [countryOptions, setCountryOptions] = useState([]);

  const [selected, setSelected] = useState(new Set());
  const [confirm, setConfirm] = useState(null);
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkStatusRunning, setBulkStatusRunning] = useState(null);
  const [bulkTagInput, setBulkTagInput] = useState('');
  const [bulkTagRunning, setBulkTagRunning] = useState(false);

  const [formModal, setFormModal] = useState({ open: false, customer: null });
  const [importOpen, setImportOpen] = useState(false);

  const loadFacets = useCallback(async () => {
    try {
      const res = await fetch('/api/customers/facets');
      if (!res.ok) return;
      const data = await res.json();
      setCityOptions(data.cities || []);
      setCountryOptions(data.countries || []);
    } catch { /* dropdowns just stay empty — not fatal */ }
  }, []);
  useEffect(() => { loadFacets(); }, [loadFacets]);

  useEffect(() => {
    const t = setTimeout(() => { setQ(searchInput.trim()); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const chipDef = CHIPS.find((c) => c.k === chip) || CHIPS[0];
  const tagParam = chipDef.kind === 'tag' ? chipDef.k : '';
  const statusParam = chipDef.kind === 'status' ? chipDef.k : '';

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE), sort });
      if (q) params.set('q', q);
      if (city) params.set('city', city);
      if (country) params.set('country', country);
      if (tagParam) params.set('tag', tagParam);
      if (statusParam) params.set('status', statusParam);
      const res = await fetch(`/api/customers?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setRows(Array.isArray(data.rows) ? data.rows : []);
      setTotal(data.total || 0);
      setStats(data.stats || null);
    } catch (err) {
      console.error('Load customers failed:', err);
      setError(true);
      toast.error('Could not load customers. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, [page, sort, q, city, country, tagParam, statusParam]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const jumpTo = (chipKey, sortKey) => {
    setChip(chipKey ?? 'All');
    setSort(sortKey ?? 'newest');
    setSearchInput('');
    setCity('');
    setCountry('');
    setPage(1);
  };

  const rowIds = rows.map((r) => r.id);
  const allSelected = rowIds.length > 0 && rowIds.every((id) => selected.has(id));
  const someSelected = rowIds.some((id) => selected.has(id));
  const selectedCount = selected.size;
  const clearSelection = () => setSelected(new Set());
  const toggleSelect = (id) => setSelected((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const toggleAll = () => {
    if (allSelected) setSelected((prev) => { const next = new Set(prev); rowIds.forEach((id) => next.delete(id)); return next; });
    else setSelected((prev) => { const next = new Set(prev); rowIds.forEach((id) => next.add(id)); return next; });
  };

  async function markContacted(id) {
    const now = new Date().toISOString();
    setRows((curr) => curr.map((c) => (c.id === id ? { ...c, last_contacted_at: now } : c)));
    try {
      await fetch(`/api/customers/${encodeURIComponent(id)}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ last_contacted_at: now }),
      });
    } catch { /* optimistic — a failed timestamp bump isn't worth surfacing */ }
  }

  const doDelete = async (id) => {
    if (!id) { setConfirm(null); return; }
    try {
      const res = await fetch(`/api/customers/${encodeURIComponent(id)}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error || 'Failed to delete'); return; }
      toast.success('Customer deleted');
      setConfirm(null);
      load();
    } catch (err) {
      console.error(err);
      toast.error('Network error');
      setConfirm(null);
    }
  };

  const doBulkDelete = async () => {
    setBulkDeleting(true);
    const ids = [...selected];
    const results = await Promise.allSettled(ids.map((id) => fetch(`/api/customers/${encodeURIComponent(id)}`, { method: 'DELETE' })));
    const failed = results.filter((r) => r.status === 'rejected' || !r.value?.ok).length;
    setBulkDeleting(false);
    setBulkConfirm(false);
    clearSelection();
    if (failed > 0) toast.error(`${failed} deletion${failed > 1 ? 's' : ''} failed`);
    else toast.success(`${ids.length} customer${ids.length > 1 ? 's' : ''} deleted`);
    load();
  };

  const doBulkStatus = async (status) => {
    const ids = [...selected];
    if (ids.length === 0) return;
    setBulkStatusRunning(status);
    const oks = await runWithConcurrency(ids, 4, async (id) => {
      try {
        const res = await fetch(`/api/customers/${encodeURIComponent(id)}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ marketing_status: status }),
        });
        return res.ok;
      } catch { return false; }
    });
    const failedCount = oks.filter((ok) => !ok).length;
    setBulkStatusRunning(null);
    clearSelection();
    if (failedCount === 0) toast.success(`${ids.length} marked ${status}`);
    else toast.error(`${ids.length - failedCount} marked ${status}, ${failedCount} failed`);
    load();
  };

  const doBulkAddTag = async () => {
    const tag = bulkTagInput.trim();
    const ids = [...selected];
    if (!tag || ids.length === 0) return;
    setBulkTagRunning(true);
    const oks = await runWithConcurrency(ids, 4, async (id) => {
      try {
        const res = await fetch(`/api/customers/${encodeURIComponent(id)}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ add_tag: tag }),
        });
        return res.ok;
      } catch { return false; }
    });
    const failedCount = oks.filter((ok) => !ok).length;
    setBulkTagRunning(false);
    setBulkTagInput('');
    clearSelection();
    if (failedCount === 0) toast.success(`Tag "${tag}" added to ${ids.length} customer${ids.length > 1 ? 's' : ''}`);
    else toast.error(`${ids.length - failedCount} tagged, ${failedCount} failed`);
    load();
  };

  const firstRun = !loading && !error && stats && stats.total === 0 && !q && !city && !country && chip === 'All';

  return (
    <AdminShell>
      {firstRun ? (
        <div className="bg-white border border-sethi-gray200 rounded-sm p-10 text-center">
          <p className="font-serif text-2xl mb-2">Abhi koi customer nahi 👋</p>
          <p className="text-sm text-sethi-gray500 mb-6">Apni customer list CSV se upload karke shuru karo.</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button onClick={() => setImportOpen(true)} className="inline-flex items-center gap-2 bg-sethi-gold text-sethi-black px-5 py-3 rounded-sm font-semibold hover:opacity-90">
              <Upload className="w-4 h-4" /> CSV Import karo
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* ── Command Center: stat cards ── */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {[
                { label: 'Total',          n: stats.total,        cls: 'text-sethi-black',    onClick: () => jumpTo('All') },
                { label: 'New this month', n: stats.newThisMonth, cls: 'text-green-600',       onClick: () => jumpTo('All', 'newest') },
                { label: 'Foreign / NRI',  n: stats.foreign,      cls: 'text-blue-600',        onClick: () => jumpTo('foreign_or_nri') },
                { label: 'Subscribed',     n: stats.subscribed,   cls: 'text-sethi-gold-dark', onClick: () => jumpTo('subscribed') },
              ].map((s) => (
                <button key={s.label} onClick={s.onClick} className="bg-white border border-sethi-gray200 rounded-sm p-4 text-left hover:border-sethi-gold/50 transition-colors">
                  <div className="text-xs uppercase tracking-wider text-sethi-gray500">{s.label}</div>
                  <div className={`font-serif text-3xl mt-1 ${s.cls}`}>{s.n}</div>
                </button>
              ))}
            </div>
          )}

          {/* ── Aaj kya karein? ── */}
          {stats && (
            <div className="mb-6">
              <h2 className="font-serif text-lg mb-3">Aaj kya karein?</h2>
              <div className="grid md:grid-cols-3 gap-3">
                <button onClick={() => jumpTo('All', 'last_purchase')} className="text-left bg-white border border-sethi-gray200 rounded-sm p-4 hover:border-sethi-gold/50 transition-colors">
                  <div className="text-sm font-semibold text-sethi-black">🔄 Wapas laane layak</div>
                  {stats.withPurchaseDate === 0 ? (
                    <p className="text-xs text-sethi-gray500 mt-1">Abhi purchase history track nahi hui — jaise purchases add karoge, yahan customers dikhne lagenge.</p>
                  ) : (
                    <p className="text-xs text-sethi-gray500 mt-1"><span className="text-sethi-gold-dark font-bold">{stats.stalePurchase}</span> customers ne 6 mahine+ se kuch nahi khareeda — ek follow-up unhe wapas la sakta hai.</p>
                  )}
                </button>
                <button onClick={() => jumpTo('All', 'newest')} className="text-left bg-white border border-sethi-gray200 rounded-sm p-4 hover:border-sethi-gold/50 transition-colors">
                  <div className="text-sm font-semibold text-sethi-black">🆕 Naye customers is mahine</div>
                  <p className="text-xs text-sethi-gray500 mt-1"><span className="text-sethi-gold-dark font-bold">{stats.newThisMonth}</span> naye customers judhe hain — welcome karo.</p>
                </button>
                <button onClick={() => jumpTo('foreign_or_nri', 'newest')} className="text-left bg-white border border-sethi-gray200 rounded-sm p-4 hover:border-sethi-gold/50 transition-colors">
                  <div className="text-sm font-semibold text-sethi-black">🌍 Foreign customers</div>
                  <p className="text-xs text-sethi-gray500 mt-1"><span className="text-sethi-gold-dark font-bold">{stats.foreign}</span> foreign/NRI customers — personal WhatsApp touch se rishta majboot hota hai.</p>
                </button>
              </div>
            </div>
          )}

          {/* ── Toolbar ── */}
          <div className="flex flex-col gap-3 mb-4">
            <div className="flex flex-wrap items-center gap-2 justify-between">
              <div className="flex flex-nowrap sm:flex-wrap items-center gap-2 overflow-x-auto pb-1">
                {CHIPS.map((c) => (
                  <button
                    key={c.k}
                    onClick={() => { setChip(c.k); setPage(1); }}
                    className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium border transition-colors ${chip === c.k ? 'bg-sethi-gold text-sethi-black border-sethi-gold' : 'bg-white border-sethi-gray200 hover:border-sethi-gold'}`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setImportOpen(true)} className="inline-flex items-center gap-1.5 text-sm border border-sethi-gray200 px-3 py-2 rounded-sm hover:border-sethi-gold">
                  <Upload className="w-4 h-4" /> Import
                </button>
                <button onClick={() => setFormModal({ open: true, customer: null })} className="inline-flex items-center gap-1.5 text-sm bg-sethi-gold text-sethi-black px-3 py-2 rounded-sm font-semibold hover:opacity-90">
                  <Plus className="w-4 h-4" /> Add customer
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-sethi-gray500 pointer-events-none" />
                <input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Name, phone or serial…"
                  className="pl-8 pr-3 py-2 text-sm border border-sethi-gray200 rounded-sm bg-white w-52 focus:outline-none focus:border-sethi-gold"
                />
              </div>
              <select value={city} onChange={(e) => { setCity(e.target.value); setPage(1); }} className="text-sm border border-sethi-gray200 rounded-sm px-3 py-2 bg-white focus:outline-none focus:border-sethi-gold">
                <option value="">All cities</option>
                {cityOptions.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={country} onChange={(e) => { setCountry(e.target.value); setPage(1); }} className="text-sm border border-sethi-gray200 rounded-sm px-3 py-2 bg-white focus:outline-none focus:border-sethi-gold">
                <option value="">All countries</option>
                {countryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }} className="text-sm border border-sethi-gray200 rounded-sm px-3 py-2 bg-white focus:outline-none focus:border-sethi-gold">
                {SORTS.map((s) => <option key={s.k} value={s.k}>{s.label}</option>)}
              </select>
            </div>
          </div>

          {/* ── Bulk action bar ── */}
          {selectedCount > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 bg-sethi-black text-white rounded-sm px-4 py-3 mb-4">
              <span className="text-sm font-medium">{selectedCount} selected</span>
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={clearSelection} className="text-sm text-white/70 hover:text-white mr-1">Deselect all</button>
                <div className="flex items-center gap-1">
                  <input
                    value={bulkTagInput}
                    onChange={(e) => setBulkTagInput(e.target.value)}
                    placeholder="tag name"
                    className="text-sm px-2 py-1.5 rounded-sm bg-white/10 border border-white/30 text-white placeholder:text-white/40 w-28 focus:outline-none"
                  />
                  <button onClick={doBulkAddTag} disabled={!bulkTagInput.trim() || bulkTagRunning} className="inline-flex items-center gap-1 border border-white/30 text-white px-3 py-2 rounded-sm text-sm font-semibold hover:bg-white/10 disabled:opacity-60">
                    {bulkTagRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Add tag
                  </button>
                </div>
                {STATUS_OPTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => doBulkStatus(s)}
                    disabled={!!bulkStatusRunning}
                    className="inline-flex items-center gap-2 border border-white/30 text-white px-3 py-2 rounded-sm text-sm font-semibold hover:bg-white/10 transition-colors disabled:opacity-60"
                  >
                    {bulkStatusRunning === s ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Set {s}
                  </button>
                ))}
                <button onClick={() => setBulkConfirm(true)} disabled={!!bulkStatusRunning} className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-sm text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-60">
                  <Trash2 className="w-4 h-4" /> Delete {selectedCount}
                </button>
              </div>
            </div>
          )}

          {/* ── List ── */}
          {loading ? (
            <div className="grid gap-3">
              {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-white border border-sethi-gray200 rounded-sm animate-pulse" />)}
            </div>
          ) : error ? (
            <div className="bg-white border border-sethi-gray200 rounded-sm p-10 text-center text-sethi-gray500">
              <p className="font-serif text-xl mb-2">Could not load customers</p>
              <button onClick={load} className="text-sethi-gold hover:underline text-sm">Try again</button>
            </div>
          ) : rows.length === 0 ? (
            <div className="bg-white border border-sethi-gray200 rounded-sm p-10 text-center text-sethi-gray500">
              <p className="font-serif text-xl mb-2">No customers found</p>
              <p className="text-sm">Try a different search or filter.</p>
            </div>
          ) : (
            <>
              {/* DESKTOP TABLE */}
              <div className="hidden md:block bg-white border border-sethi-gray200 rounded-sm overflow-x-auto">
                <table className="w-full text-sm min-w-[860px]">
                  <thead>
                    <tr className="border-b border-sethi-gray200 bg-sethi-gray100">
                      <th className="px-4 py-3 w-[44px]">
                        <button onClick={toggleAll} className="text-sethi-gray500 hover:text-sethi-black">
                          {allSelected ? <CheckSquare className="w-4 h-4 text-sethi-gold" /> : <Square className="w-4 h-4" />}
                        </button>
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-sethi-gray500">Customer</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-sethi-gray500">Phone</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-sethi-gray500">Location</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-sethi-gray500">Tags</th>
                      <th className="px-4 py-3 w-[160px]" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sethi-gray200">
                    {rows.map((c) => {
                      const isSel = selected.has(c.id);
                      const waNumber = c.whatsapp_number || c.phone_number;
                      const nudged = recentlyContacted(c.last_contacted_at);
                      return (
                        <tr key={c.id} className={isSel ? 'bg-sethi-gold/5' : 'hover:bg-sethi-gray100/40'}>
                          <td className="px-4 py-3 align-top">
                            <button onClick={() => toggleSelect(c.id)} className="text-sethi-gray500 hover:text-sethi-black">
                              {isSel ? <CheckSquare className="w-4 h-4 text-sethi-gold" /> : <Square className="w-4 h-4" />}
                            </button>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <div className="font-semibold text-sethi-black">
                              {c.full_name || c.serial_no || 'Customer'}
                              {c.birthday && <span className="ml-1.5 font-normal text-xs text-sethi-gray500">🎂 {c.birthday}</span>}
                            </div>
                            <div className="text-[11px] text-sethi-gray500 mt-0.5">{timeAgoHint(c.last_contacted_at)}</div>
                          </td>
                          <td className="px-4 py-3 align-top font-mono text-xs">{c.phone_number}</td>
                          <td className="px-4 py-3 align-top text-xs text-sethi-gray500">{c.city ? `${c.city} · ` : ''}{locationLabel(c)}</td>
                          <td className="px-4 py-3 align-top">
                            <div className="flex flex-wrap gap-1 max-w-[160px]">
                              {(c.tags || []).map((t) => <span key={t} className="text-[10px] bg-sethi-gold/15 text-sethi-black px-1.5 py-0.5 rounded-sm">{t}</span>)}
                            </div>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <div className="flex items-center gap-2 flex-wrap justify-end">
                              <a href={`tel:+${c.phone_number}`} title="Call" className="inline-flex items-center justify-center w-8 h-8 border border-sethi-gray200 rounded-sm text-sethi-gold hover:border-sethi-gold"><Phone className="w-3.5 h-3.5" /></a>
                              <a href={`https://wa.me/${waNumber}`} target="_blank" rel="noopener noreferrer" onClick={() => markContacted(c.id)} title="WhatsApp" className="inline-flex items-center justify-center w-8 h-8 border border-[#25D366]/40 rounded-sm text-[#25D366] hover:bg-[#25D366] hover:text-white"><MessageCircle className="w-3.5 h-3.5" /></a>
                              <button onClick={() => setFormModal({ open: true, customer: c })} title="Edit" className="inline-flex items-center justify-center w-8 h-8 border border-sethi-gray200 rounded-sm text-sethi-gray800 hover:border-sethi-gold"><Pencil className="w-3.5 h-3.5" /></button>
                              <button onClick={() => setConfirm(c)} title="Delete" className="inline-flex items-center justify-center w-8 h-8 border border-red-300 text-red-500 rounded-sm hover:bg-red-500 hover:text-white"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                            {nudged && <div className="text-[10px] text-amber-700 mt-1 text-right">⚠ haal hi mein message bheja tha</div>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* MOBILE CARDS */}
              <div className="md:hidden">
                <div className="flex items-center gap-2 mb-3">
                  <button onClick={toggleAll} className="inline-flex items-center gap-1.5 text-sm text-sethi-gray500 hover:text-sethi-black">
                    {allSelected ? <CheckSquare className="w-4 h-4 text-sethi-gold" /> : <Square className="w-4 h-4" />}
                    {allSelected ? 'Deselect page' : 'Select page'}
                  </button>
                  {someSelected && <span className="text-sm text-sethi-gold font-semibold">{selectedCount} selected</span>}
                </div>
                <div className="grid gap-3">
                  {rows.map((c) => {
                    const isSel = selected.has(c.id);
                    const waNumber = c.whatsapp_number || c.phone_number;
                    const nudged = recentlyContacted(c.last_contacted_at);
                    return (
                      <div key={c.id} className={`bg-white border rounded-sm p-4 ${isSel ? 'border-sethi-gold bg-sethi-gold/5' : 'border-sethi-gray200'}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0">
                            <button onClick={() => toggleSelect(c.id)} className="mt-1 shrink-0 text-sethi-gray500 hover:text-sethi-black">
                              {isSel ? <CheckSquare className="w-5 h-5 text-sethi-gold" /> : <Square className="w-5 h-5" />}
                            </button>
                            <div className="min-w-0">
                              <div className="font-semibold text-sethi-black">
                                {c.full_name || c.serial_no || 'Customer'}
                                {c.birthday && <span className="ml-1.5 font-normal text-xs text-sethi-gray500">🎂 {c.birthday}</span>}
                              </div>
                              <div className="font-mono text-xs text-sethi-gray500 mt-0.5">{c.phone_number}</div>
                              <div className="text-xs text-sethi-gray500 mt-0.5">{c.city ? `${c.city} · ` : ''}{locationLabel(c)}</div>
                              <div className="text-[11px] text-sethi-gray500 mt-0.5">{timeAgoHint(c.last_contacted_at)}</div>
                            </div>
                          </div>
                        </div>
                        {(c.tags || []).length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {c.tags.map((t) => <span key={t} className="text-[10px] bg-sethi-gold/15 text-sethi-black px-1.5 py-0.5 rounded-sm">{t}</span>)}
                          </div>
                        )}
                        <div className="flex items-center gap-2 flex-wrap mt-3">
                          <a href={`tel:+${c.phone_number}`} className="inline-flex items-center gap-1.5 text-sethi-gold font-medium text-sm hover:underline"><Phone className="w-4 h-4" /> Call</a>
                          <a href={`https://wa.me/${waNumber}`} target="_blank" rel="noopener noreferrer" onClick={() => markContacted(c.id)} className="inline-flex items-center gap-1.5 text-[#25D366] font-medium text-sm hover:underline"><MessageCircle className="w-4 h-4" /> WhatsApp</a>
                          <button onClick={() => setFormModal({ open: true, customer: c })} className="inline-flex items-center gap-1.5 text-sethi-gray800 font-medium text-sm hover:underline"><Pencil className="w-4 h-4" /> Edit</button>
                          <button onClick={() => setConfirm(c)} className="inline-flex items-center gap-1.5 text-red-600 font-medium text-sm hover:underline"><Trash2 className="w-4 h-4" /> Delete</button>
                        </div>
                        {nudged && <div className="text-[11px] text-amber-700 mt-1.5">⚠ haal hi mein message bheja tha</div>}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between mt-4">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="inline-flex items-center gap-1 text-sm text-sethi-gold disabled:opacity-40 disabled:cursor-not-allowed">
                  <ChevronLeft className="w-4 h-4" /> Prev
                </button>
                <span className="text-xs text-sethi-gray500">Page {page} of {totalPages} · {total} customers</span>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="inline-flex items-center gap-1 text-sm text-sethi-gold disabled:opacity-40 disabled:cursor-not-allowed">
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </>
      )}

      <CustomerFormModal
        open={formModal.open}
        customer={formModal.customer}
        onClose={() => setFormModal({ open: false, customer: null })}
        onSaved={() => { setFormModal({ open: false, customer: null }); load(); loadFacets(); }}
      />

      <CustomerImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => { load(); loadFacets(); }}
      />

      <ConfirmDialog
        open={!!confirm}
        title="Delete customer?"
        message={<>Are you sure you want to delete <strong>{confirm?.full_name || confirm?.phone_number}</strong>? This cannot be undone.</>}
        confirmLabel="Delete"
        onConfirm={() => doDelete(confirm.id)}
        onCancel={() => setConfirm(null)}
      />

      <ConfirmDialog
        open={bulkConfirm}
        title={<span className="text-red-700">Delete {selectedCount} customer{selectedCount > 1 ? 's' : ''}?</span>}
        message={<>You are about to permanently delete <strong>{selectedCount} customer{selectedCount > 1 ? 's' : ''}</strong>. This cannot be undone.</>}
        confirmLabel={bulkDeleting ? <><Loader2 className="w-4 h-4 animate-spin" /> Deleting…</> : <><Trash2 className="w-4 h-4" /> Delete {selectedCount}</>}
        loading={bulkDeleting}
        onConfirm={doBulkDelete}
        onCancel={() => setBulkConfirm(false)}
      />
    </AdminShell>
  );
}
