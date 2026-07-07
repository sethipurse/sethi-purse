'use client';
import { useEffect, useMemo, useState } from 'react';
import AdminShell from '@/components/AdminShell';
import ConfirmDialog from '@/components/ConfirmDialog';
import { toast } from 'sonner';
import { Phone, MessageCircle, Trash2, ChevronDown, ChevronUp, Search, Square, CheckSquare, Loader2, Check, X } from 'lucide-react';
import { formatIST, GOOGLE_REVIEW_LINK, FOLLOWUP_TEMPLATE, REVIEW_REQUEST_TEMPLATE } from '@/lib/constants';

const STATUSES = ['new', 'contacted', 'converted', 'closed'];
const STATUS_STYLES = {
  new:       'bg-red-100 text-red-700 border-red-200',
  contacted: 'bg-blue-100 text-blue-700 border-blue-200',
  converted: 'bg-green-100 text-green-700 border-green-200',
  closed:    'bg-sethi-gray200 text-sethi-gray800 border-sethi-gray200',
};
const STATUS_ORDER = { new: 0, contacted: 1, converted: 2, closed: 3 };
const NEXT_STATUS = { new: 'contacted' };
const SORT_STORAGE_KEY = 'sethi-admin-inq-sort';
const SORT_VALUES = ['unread', 'newest', 'oldest', 'status'];
const REVIEW_HINT_DISMISSED_KEY = 'sethi-admin-inq-review-hint-dismissed';

// Deals-alert flow posts inquiries with this fixed name/phone convention
const isDealsAlert = (i) => i.name === 'Deals Alert' && i.phone === '0000000000';
const hasRealPhone = (i) => !!i.phone && i.phone !== '0000000000';

// Strips spaces/+/leading zeros and ensures the 91 country code so wa.me
// links work regardless of exactly how the phone was typed/stored.
function normalizePhoneForWa(phone) {
  let digits = String(phone || '').replace(/\D/g, '').replace(/^0+/, '');
  if (digits.length === 10) digits = `91${digits}`;
  return digits;
}

function fillTemplate(template, vars) {
  return Object.entries(vars).reduce((s, [k, v]) => s.split(`{${k}}`).join(v), template);
}

export default function AdminInquiriesPage() {
  const [items,       setItems]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [filter,      setFilter]      = useState('All');
  const [search,      setSearch]      = useState('');
  const [sort,        setSort]        = useState('unread');
  const [expanded,    setExpanded]    = useState({});
  const [confirm,     setConfirm]     = useState(null);
  const [selected,    setSelected]    = useState(new Set());
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const [bulkDeleting,setBulkDeleting]= useState(false);
  const [bulkStatusRunning, setBulkStatusRunning] = useState(null);
  const [reviewHintDismissed, setReviewHintDismissed] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res  = await fetch('/api/inquiries');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Load inquiries failed:', err);
      toast.error('Could not load inquiries. Please refresh.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  useEffect(() => {
    const saved = window.localStorage.getItem(SORT_STORAGE_KEY);
    if (saved && SORT_VALUES.includes(saved)) setSort(saved);
  }, []);

  useEffect(() => {
    if (window.localStorage.getItem(REVIEW_HINT_DISMISSED_KEY) !== '1') setReviewHintDismissed(false);
  }, []);

  const dismissReviewHint = () => {
    setReviewHintDismissed(true);
    window.localStorage.setItem(REVIEW_HINT_DISMISSED_KEY, '1');
  };

  const handleSortChange = (value) => {
    setSort(value);
    window.localStorage.setItem(SORT_STORAGE_KEY, value);
  };

  const counts = useMemo(() => {
    const c = { new: 0, contacted: 0, converted: 0, closed: 0, human: 0, dealsAlert: 0 };
    items.forEach((i) => {
      if (c[i.status] !== undefined) c[i.status]++;
      if (isDealsAlert(i)) c.dealsAlert++; else c.human++;
    });
    return c;
  }, [items]);

  const displayed = useMemo(() => {
    let list = filter === 'All' ? items
      : filter === 'human' ? items.filter((i) => !isDealsAlert(i))
      : filter === 'dealsAlert' ? items.filter((i) => isDealsAlert(i))
      : items.filter((i) => i.status === filter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((i) =>
        (i.name  || '').toLowerCase().includes(q) ||
        (i.phone || '').includes(q)
      );
    }
    list = [...list];
    if (sort === 'unread') {
      list.sort((a, b) => {
        const au = a.status === 'new' ? 0 : 1;
        const bu = b.status === 'new' ? 0 : 1;
        if (au !== bu) return au - bu;
        return new Date(b.created_at ?? b.createdAt) - new Date(a.created_at ?? a.createdAt);
      });
    }
    else if (sort === 'newest') list.sort((a, b) => new Date(b.created_at ?? b.createdAt) - new Date(a.created_at ?? a.createdAt));
    else if (sort === 'oldest') list.sort((a, b) => new Date(a.created_at ?? a.createdAt) - new Date(b.created_at ?? b.createdAt));
    else if (sort === 'status') list.sort((a, b) => (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99));
    return list;
  }, [items, filter, search, sort]);

  const displayedIds  = displayed.map((i) => i.id);
  const allSelected   = displayedIds.length > 0 && displayedIds.every((id) => selected.has(id));
  const someSelected  = displayedIds.some((id) => selected.has(id));
  const selectedCount = selected.size;

  const clearSelection = () => setSelected(new Set());

  const toggleSelect = (id) => setSelected((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const toggleAll = () => {
    if (allSelected) {
      setSelected((prev) => { const next = new Set(prev); displayedIds.forEach((id) => next.delete(id)); return next; });
    } else {
      setSelected((prev) => { const next = new Set(prev); displayedIds.forEach((id) => next.add(id)); return next; });
    }
  };

  const changeStatus = async (id, status, { optimistic = false } = {}) => {
    const prevStatus = items.find((i) => i.id === id)?.status;
    if (optimistic) setItems((curr) => curr.map((i) => i.id === id ? { ...i, status } : i));
    try {
      const res  = await fetch(`/api/inquiries/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (optimistic) setItems((curr) => curr.map((i) => i.id === id ? { ...i, status: prevStatus } : i));
        toast.error(data.error || 'Failed to update');
        return;
      }
      toast.success('Status updated');
      setItems((curr) => curr.map((i) => i.id === id ? { ...i, status } : i));
    } catch (err) {
      console.error(err);
      if (optimistic) setItems((curr) => curr.map((i) => i.id === id ? { ...i, status: prevStatus } : i));
      toast.error('Network error');
    }
  };

  const doDelete = async (id) => {
    if (!id) { setConfirm(null); return; }
    try {
      const res  = await fetch(`/api/inquiries/${encodeURIComponent(id)}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error || 'Failed to delete'); return; }
      toast.success('Inquiry deleted');
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
    const results = await Promise.allSettled(
      ids.map((id) => fetch(`/api/inquiries/${encodeURIComponent(id)}`, { method: 'DELETE' }))
    );
    const failed = results.filter((r) => r.status === 'rejected' || !r.value?.ok).length;
    setBulkDeleting(false);
    setBulkConfirm(false);
    clearSelection();
    if (failed > 0) toast.error(`${failed} deletion${failed > 1 ? 's' : ''} failed`);
    else toast.success(`${ids.length} enquir${ids.length > 1 ? 'ies' : 'y'} deleted`);
    load();
  };

  // Runs `worker` over `list` with at most `limit` in flight at once —
  // avoids firing 100+ parallel PUTs on a large bulk selection.
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

  const doBulkStatus = async (status) => {
    const ids = [...selected];
    if (ids.length === 0) return;
    setBulkStatusRunning(status);
    const prevStatuses = new Map(ids.map((id) => [id, items.find((i) => i.id === id)?.status]));
    setItems((curr) => curr.map((i) => (selected.has(i.id) ? { ...i, status } : i)));

    const oks = await runWithConcurrency(ids, 4, async (id) => {
      try {
        const res = await fetch(`/api/inquiries/${encodeURIComponent(id)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        });
        return res.ok;
      } catch { return false; }
    });

    const failedIds = ids.filter((id, i) => !oks[i]);
    if (failedIds.length > 0) {
      setItems((curr) => curr.map((i) => (failedIds.includes(i.id) ? { ...i, status: prevStatuses.get(i.id) } : i)));
    }
    setBulkStatusRunning(null);
    clearSelection();
    const successCount = ids.length - failedIds.length;
    if (failedIds.length === 0) toast.success(`${successCount} marked ${status}`);
    else toast.error(`${successCount} marked ${status}, ${failedIds.length} failed`);
  };

  // The one workflow explicitly meant to be a two-tap sweep: tapping this
  // chip both filters to deals-alert noise AND selects all of it, so the very
  // next tap can be "Mark closed" with no separate select-all step.
  const clickDealsAlertChip = () => {
    setFilter('dealsAlert');
    setSearch('');
    setSelected(new Set(items.filter(isDealsAlert).map((i) => i.id)));
  };

  const toggleExpand = (id) => setExpanded((e) => ({ ...e, [id]: !e[id] }));

  return (
    <AdminShell>

      {/* ── Review link setup hint ── */}
      {!GOOGLE_REVIEW_LINK && !reviewHintDismissed && (
        <div className="flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-sm px-4 py-2.5 mb-4">
          <span>⭐ Google review link constants mein daalo to review button milega</span>
          <button onClick={dismissReviewHint} className="text-amber-700 hover:text-amber-900 shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { k: 'new',       label: 'New',      cls: 'text-red-600'       },
          { k: 'contacted', label: 'Contacted', cls: 'text-blue-600'      },
          { k: 'converted', label: 'Converted', cls: 'text-green-600'     },
          { k: 'closed',    label: 'Closed',    cls: 'text-sethi-gray500' },
        ].map((s) => (
          <button
            key={s.k}
            onClick={() => setFilter(filter === s.k ? 'All' : s.k)}
            className={`bg-white border rounded-sm p-4 text-left transition-colors ${filter === s.k ? 'border-sethi-gold' : 'border-sethi-gray200 hover:border-sethi-gold/50'}`}
          >
            <div className="text-xs uppercase tracking-wider text-sethi-gray500">{s.label}</div>
            <div className={`font-serif text-3xl mt-1 ${s.cls}`}>{counts[s.k]}</div>
          </button>
        ))}
      </div>

      {/* ── Filter chips + Search + Sort ── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex flex-nowrap sm:flex-wrap items-center gap-2 flex-1 overflow-x-auto sm:overflow-visible pb-1 sm:pb-0">
          {[
            { k: 'All',        label: 'All',                 n: items.length },
            { k: 'new',        label: 'New',                 n: counts.new },
            { k: 'human',      label: 'Human',                n: counts.human },
            { k: 'dealsAlert', label: '🔔 Price interest',    n: counts.dealsAlert },
            { k: 'contacted',  label: 'Contacted',            n: counts.contacted },
            { k: 'converted',  label: 'Converted',            n: counts.converted },
            { k: 'closed',     label: 'Closed',               n: counts.closed },
          ].map((c) => (
            <button
              key={c.k}
              onClick={() => c.k === 'dealsAlert' ? clickDealsAlertChip() : setFilter(c.k)}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium border transition-colors ${filter === c.k ? 'bg-sethi-gold text-sethi-black border-sethi-gold' : 'bg-white border-sethi-gray200 hover:border-sethi-gold'}`}
            >
              {c.label} ({c.n})
            </button>
          ))}
        </div>
        <div className="flex gap-2 shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-sethi-gray500 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name or phone…"
              className="pl-8 pr-3 py-2 text-sm border border-sethi-gray200 rounded-sm bg-white w-44 focus:outline-none focus:border-sethi-gold"
            />
          </div>
          <select
            value={sort}
            onChange={(e) => handleSortChange(e.target.value)}
            className="text-sm border border-sethi-gray200 rounded-sm px-3 py-2 bg-white focus:outline-none focus:border-sethi-gold"
          >
            <option value="unread">New first</option>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="status">By status</option>
          </select>
        </div>
      </div>

      {/* ── Bulk action bar ── */}
      {selectedCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-sethi-black text-white rounded-sm px-4 py-3 mb-4">
          <span className="text-sm font-medium">{selectedCount} enquir{selectedCount > 1 ? 'ies' : 'y'} selected</span>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={clearSelection} className="text-sm text-white/70 hover:text-white mr-1">Deselect all</button>
            <button
              onClick={() => doBulkStatus('contacted')}
              disabled={!!bulkStatusRunning}
              className="inline-flex items-center gap-2 border border-white/30 text-white px-3 py-2 rounded-sm text-sm font-semibold hover:bg-white/10 transition-colors disabled:opacity-60"
            >
              {bulkStatusRunning === 'contacted' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Mark contacted
            </button>
            <button
              onClick={() => doBulkStatus('closed')}
              disabled={!!bulkStatusRunning}
              className="inline-flex items-center gap-2 border border-white/30 text-white px-3 py-2 rounded-sm text-sm font-semibold hover:bg-white/10 transition-colors disabled:opacity-60"
            >
              {bulkStatusRunning === 'closed' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Mark closed
            </button>
            <button
              onClick={() => setBulkConfirm(true)}
              disabled={!!bulkStatusRunning}
              className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-sm text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-60"
            >
              <Trash2 className="w-4 h-4" /> Delete {selectedCount} selected
            </button>
          </div>
        </div>
      )}

      {/* ── Result count ── */}
      {!loading && (
        <p className="text-xs text-sethi-gray500 mb-3">
          {displayed.length} {displayed.length === 1 ? 'enquiry' : 'enquiries'}
          {filter !== 'All' ? ` · ${filter}` : ''}
          {search.trim() ? ` · "${search.trim()}"` : ''}
        </p>
      )}

      {loading ? (
        <div className="text-center py-12 text-sethi-gray500">Loading…</div>
      ) : displayed.length === 0 ? (
        <div className="bg-white border border-sethi-gray200 rounded-sm p-10 text-center text-sethi-gray500">
          <p className="font-serif text-xl mb-2">No enquiries found</p>
          <p className="text-sm">
            {search.trim()
              ? 'Try a different name or phone number.'
              : filter !== 'All'
              ? `No enquiries with status "${filter}".`
              : "When customers fill the contact form, they'll appear here."}
          </p>
        </div>
      ) : (
        <>
          {/* ── DESKTOP TABLE ── */}
          <div className="hidden md:block bg-white border border-sethi-gray200 rounded-sm overflow-x-auto">
            <table className="w-full text-sm min-w-[860px]">
              <thead>
                <tr className="border-b border-sethi-gray200 bg-sethi-gray100">
                  <th className="px-4 py-3 w-[44px]">
                    <button onClick={toggleAll} className="text-sethi-gray500 hover:text-sethi-black">
                      {allSelected ? <CheckSquare className="w-4 h-4 text-sethi-gold" /> : <Square className="w-4 h-4" />}
                    </button>
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-sethi-gray500 w-[170px]">Customer</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-sethi-gray500 w-[140px]">Phone</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-sethi-gray500 w-[130px]">Interest</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-sethi-gray500">Message</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-sethi-gray500 w-[155px]">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-sethi-gray500 w-[110px]">Date</th>
                  <th className="px-4 py-3 w-[48px]" />
                </tr>
              </thead>
              <tbody className="divide-y divide-sethi-gray200">
                {displayed.map((i) => {
                  const isOpen    = expanded[i.id];
                  const isSel     = selected.has(i.id);
                  const isUnread  = i.status === 'new';
                  const isDeals   = isDealsAlert(i);
                  const waLink   = `https://wa.me/91${i.phone}`;
                  const telLink  = `tel:+91${i.phone}`;
                  const interest = i.product_interest ?? i.productInterest ?? '—';
                  const msg      = i.message || '';
                  const canWa       = hasRealPhone(i);
                  const waNumber    = canWa ? normalizePhoneForWa(i.phone) : null;
                  const followUpLink = canWa ? `https://wa.me/${waNumber}?text=${encodeURIComponent(fillTemplate(FOLLOWUP_TEMPLATE, { product: interest !== '—' ? interest : 'aapke bag' }))}` : null;
                  const canReview   = canWa && !!GOOGLE_REVIEW_LINK && (i.status === 'contacted' || i.status === 'converted');
                  const reviewLink  = canReview ? `https://wa.me/${waNumber}?text=${encodeURIComponent(fillTemplate(REVIEW_REQUEST_TEMPLATE, { link: GOOGLE_REVIEW_LINK }))}` : null;
                  return (
                    <tr
                      key={i.id}
                      className={`align-top transition-colors ${isSel ? 'bg-sethi-gold/5' : isOpen ? 'bg-amber-50/40' : 'hover:bg-sethi-gray100/40'}`}
                    >
                      <td className="px-4 py-3">
                        <button onClick={() => toggleSelect(i.id)} className="text-sethi-gray500 hover:text-sethi-black">
                          {isSel ? <CheckSquare className="w-4 h-4 text-sethi-gold" /> : <Square className="w-4 h-4" />}
                        </button>
                      </td>

                      <td className={`px-4 py-3 ${isUnread ? 'border-l-4 border-l-sethi-gold rounded-l-none' : ''}`}>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`leading-tight ${isUnread ? 'font-bold text-sethi-black' : 'font-semibold text-sethi-black'}`}>{i.name}</span>
                          {isUnread && (
                            <span className="inline-block bg-sethi-gold text-sethi-black text-[9px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded-sm">New</span>
                          )}
                        </div>
                        <div className="text-xs text-sethi-gray500 mt-0.5">{i.city}</div>
                        {isDeals && (
                          <div className="text-[10px] text-amber-700 mt-0.5">🔔 Price interest</div>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <div className="font-mono text-xs text-sethi-black tracking-wide">{i.phone}</div>
                        <div className="flex gap-2.5 mt-1.5">
                          <a href={telLink} className="inline-flex items-center gap-0.5 text-[11px] text-sethi-gold hover:underline">
                            <Phone className="w-3 h-3" /> Call
                          </a>
                          <a href={waLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-[11px] text-sethi-gold hover:underline">
                            <MessageCircle className="w-3 h-3" /> WhatsApp
                          </a>
                        </div>
                        {canWa && (
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            <a
                              href={followUpLink}
                              target="_blank" rel="noopener"
                              onClick={() => { if (i.status === 'new') changeStatus(i.id, 'contacted', { optimistic: true }); }}
                              className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#25D366] border border-[#25D366]/40 px-1.5 py-0.5 rounded-sm hover:bg-[#25D366] hover:text-white transition-colors"
                            >
                              💬 Follow-up
                            </a>
                            {canReview && (
                              <a
                                href={reviewLink}
                                target="_blank" rel="noopener"
                                className="inline-flex items-center gap-1 text-[10px] font-semibold text-sethi-gold border border-sethi-gold/40 px-1.5 py-0.5 rounded-sm hover:bg-sethi-gold hover:text-sethi-black transition-colors"
                              >
                                ⭐ Review maango
                              </a>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <span className="inline-block bg-sethi-gold/15 text-sethi-black text-[11px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-sm leading-snug">
                          {interest}
                        </span>
                      </td>

                      <td className="px-4 py-3 max-w-[240px]">
                        <p className={`text-xs text-sethi-gray800 leading-relaxed ${isOpen ? '' : 'line-clamp-2'}`}>{msg}</p>
                        {msg.length > 90 && (
                          <button onClick={() => toggleExpand(i.id)} className="mt-1 text-[11px] text-sethi-gold inline-flex items-center gap-0.5 hover:underline">
                            {isOpen ? <>Less <ChevronUp className="w-3 h-3" /></> : <>More <ChevronDown className="w-3 h-3" /></>}
                          </button>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-sm text-[11px] font-semibold tracking-wide border mb-1.5 ${STATUS_STYLES[i.status] || ''}`}>
                          {(i.status || 'new').toUpperCase()}
                        </span>
                        <select
                          value={i.status}
                          onChange={(e) => changeStatus(i.id, e.target.value)}
                          className="block text-xs border border-sethi-gray200 rounded-sm px-2 py-1 bg-white w-full"
                        >
                          {STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                        </select>
                        {isUnread && NEXT_STATUS[i.status] && (
                          <button
                            onClick={() => changeStatus(i.id, NEXT_STATUS[i.status], { optimistic: true })}
                            className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-sethi-gold border border-sethi-gold px-2 py-1 rounded-sm hover:bg-sethi-gold hover:text-sethi-black transition-colors"
                          >
                            <Check className="w-3 h-3" /> Mark {NEXT_STATUS[i.status]}
                          </button>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <div className="text-xs text-sethi-gray500 whitespace-nowrap">{formatIST(i.created_at ?? i.createdAt)}</div>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => setConfirm(i)}
                          className="inline-flex items-center justify-center w-8 h-8 border border-red-300 text-red-500 rounded-sm hover:bg-red-500 hover:text-white transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── MOBILE CARDS ── */}
          <div className="md:hidden">
            <div className="flex items-center gap-2 mb-3">
              <button onClick={toggleAll} className="inline-flex items-center gap-1.5 text-sm text-sethi-gray500 hover:text-sethi-black">
                {allSelected ? <CheckSquare className="w-4 h-4 text-sethi-gold" /> : <Square className="w-4 h-4" />}
                {allSelected ? 'Deselect all' : 'Select all'}
              </button>
              {someSelected && <span className="text-sm text-sethi-gold font-semibold">{selectedCount} selected</span>}
            </div>
            <div className="grid gap-4">
              {displayed.map((i) => {
                const isOpen   = expanded[i.id];
                const isSel    = selected.has(i.id);
                const isUnread = i.status === 'new';
                const isDeals  = isDealsAlert(i);
                const waLink  = `https://wa.me/91${i.phone}`;
                const telLink = `tel:+91${i.phone}`;
                const mInterest   = i.product_interest ?? i.productInterest ?? '—';
                const canWa       = hasRealPhone(i);
                const waNumber    = canWa ? normalizePhoneForWa(i.phone) : null;
                const followUpLink = canWa ? `https://wa.me/${waNumber}?text=${encodeURIComponent(fillTemplate(FOLLOWUP_TEMPLATE, { product: mInterest !== '—' ? mInterest : 'aapke bag' }))}` : null;
                const canReview   = canWa && !!GOOGLE_REVIEW_LINK && (i.status === 'contacted' || i.status === 'converted');
                const reviewLink  = canReview ? `https://wa.me/${waNumber}?text=${encodeURIComponent(fillTemplate(REVIEW_REQUEST_TEMPLATE, { link: GOOGLE_REVIEW_LINK }))}` : null;
                return (
                  <div key={i.id} className={`bg-white border rounded-sm p-5 transition-colors ${isUnread ? 'border-l-4 border-l-sethi-gold rounded-l-none' : ''} ${isSel ? 'border-sethi-gold bg-sethi-gold/5' : 'border-sethi-gray200'}`}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <button onClick={() => toggleSelect(i.id)} className="mt-1 shrink-0 text-sethi-gray500 hover:text-sethi-black">
                          {isSel ? <CheckSquare className="w-5 h-5 text-sethi-gold" /> : <Square className="w-5 h-5" />}
                        </button>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className={`text-lg ${isUnread ? 'font-bold' : 'font-semibold'}`}>{i.name}</h3>
                            <span className="text-sm text-sethi-gray500">· {i.city}</span>
                            {isUnread && (
                              <span className="inline-block bg-sethi-gold text-sethi-black text-[9px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded-sm">New</span>
                            )}
                          </div>
                          <div className="text-xs text-sethi-gray500 mt-0.5">{formatIST(i.created_at ?? i.createdAt)}</div>
                          {isDeals && (
                            <div className="text-[10px] text-amber-700 mt-0.5">🔔 Price interest</div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-block px-2.5 py-0.5 rounded-sm text-[11px] font-semibold tracking-wide border ${STATUS_STYLES[i.status] || ''}`}>
                          {(i.status || 'new').toUpperCase()}
                        </span>
                        <select
                          value={i.status}
                          onChange={(e) => changeStatus(i.id, e.target.value)}
                          className="text-xs border border-sethi-gray200 rounded-sm px-2 py-1 bg-white"
                        >
                          {STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                        </select>
                        {isUnread && NEXT_STATUS[i.status] && (
                          <button
                            onClick={() => changeStatus(i.id, NEXT_STATUS[i.status], { optimistic: true })}
                            className="inline-flex items-center gap-1 text-sethi-gold border border-sethi-gold px-2.5 py-1 rounded-sm hover:bg-sethi-gold hover:text-sethi-black text-xs"
                          >
                            <Check className="w-3 h-3" /> Mark {NEXT_STATUS[i.status]}
                          </button>
                        )}
                        <button
                          onClick={() => setConfirm(i)}
                          className="inline-flex items-center gap-1 border border-red-500 text-red-600 px-2.5 py-1 rounded-sm hover:bg-red-500 hover:text-white text-xs"
                        >
                          <Trash2 className="w-3 h-3" /> Delete
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-3 flex-wrap">
                      <a href={telLink} className="inline-flex items-center gap-1.5 text-sethi-gold font-medium hover:underline">
                        <Phone className="w-4 h-4" /> Call +91 {i.phone}
                      </a>
                      <a href={waLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sethi-gold font-medium hover:underline">
                        <MessageCircle className="w-4 h-4" /> WhatsApp
                      </a>
                      <span className="inline-block bg-sethi-gold/15 text-sethi-black text-[11px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-sm">
                        {i.product_interest ?? i.productInterest}
                      </span>
                    </div>

                    {canWa && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        <a
                          href={followUpLink}
                          target="_blank" rel="noopener"
                          onClick={() => { if (i.status === 'new') changeStatus(i.id, 'contacted', { optimistic: true }); }}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[#25D366] border border-[#25D366]/40 px-2.5 py-1 rounded-sm hover:bg-[#25D366] hover:text-white transition-colors"
                        >
                          💬 Follow-up
                        </a>
                        {canReview && (
                          <a
                            href={reviewLink}
                            target="_blank" rel="noopener"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-sethi-gold border border-sethi-gold/40 px-2.5 py-1 rounded-sm hover:bg-sethi-gold hover:text-sethi-black transition-colors"
                          >
                            ⭐ Review maango
                          </a>
                        )}
                      </div>
                    )}

                    <p className={`mt-3 text-sethi-gray800 text-sm ${isOpen ? '' : 'line-clamp-2'}`}>{i.message}</p>
                    {i.message && i.message.length > 120 && (
                      <button onClick={() => toggleExpand(i.id)} className="mt-1 text-xs text-sethi-gold inline-flex items-center gap-1 hover:underline">
                        {isOpen ? <>Show less <ChevronUp className="w-3 h-3" /></> : <>Read more <ChevronDown className="w-3 h-3" /></>}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ── Single delete confirm ── */}
      <ConfirmDialog
        open={!!confirm}
        title="Delete inquiry?"
        message={<>Are you sure you want to delete the inquiry from <strong>{confirm?.name}</strong>? This cannot be undone.</>}
        confirmLabel="Delete"
        onConfirm={() => doDelete(confirm.id)}
        onCancel={() => setConfirm(null)}
      />

      {/* ── Bulk delete confirm ── */}
      <ConfirmDialog
        open={bulkConfirm}
        title={<span className="text-red-700">Delete {selectedCount} enquir{selectedCount > 1 ? 'ies' : 'y'}?</span>}
        message={<>You are about to permanently delete <strong>{selectedCount} enquir{selectedCount > 1 ? 'ies' : 'y'}</strong>. This cannot be undone.</>}
        confirmLabel={bulkDeleting ? <><Loader2 className="w-4 h-4 animate-spin" /> Deleting…</> : <><Trash2 className="w-4 h-4" /> Delete {selectedCount}</>}
        loading={bulkDeleting}
        onConfirm={doBulkDelete}
        onCancel={() => setBulkConfirm(false)}
      />
    </AdminShell>
  );
}
