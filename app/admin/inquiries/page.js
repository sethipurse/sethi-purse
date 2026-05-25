'use client';
import { useEffect, useMemo, useState } from 'react';
import AdminShell from '@/components/AdminShell';
import { toast } from 'sonner';
import { Phone, MessageCircle, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { formatIST } from '@/lib/constants';

const STATUSES = ['new', 'contacted', 'converted', 'closed'];
const STATUS_STYLES = {
  new: 'bg-red-100 text-red-700 border-red-200',
  contacted: 'bg-blue-100 text-blue-700 border-blue-200',
  converted: 'bg-green-100 text-green-700 border-green-200',
  closed: 'bg-sethi-gray200 text-sethi-gray800 border-sethi-gray200',
};

export default function AdminInquiriesPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [expanded, setExpanded] = useState({});
  const [confirm, setConfirm] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/inquiries');
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

  const counts = useMemo(() => {
    const c = { new: 0, contacted: 0, converted: 0, closed: 0 };
    items.forEach((i) => { if (c[i.status] !== undefined) c[i.status]++; });
    return c;
  }, [items]);

  const filtered = filter === 'All' ? items : items.filter((i) => i.status === filter);

  const changeStatus = async (id, status) => {
    try {
      const res = await fetch(`/api/inquiries/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error || 'Failed to update'); return; }
      toast.success('Status updated');
      setItems((curr) => curr.map((i) => i.id === id ? { ...i, status } : i));
    } catch (err) {
      console.error(err);
      toast.error('Network error');
    }
  };

  const doDelete = async (id) => {
    if (!id) { setConfirm(null); return; }
    try {
      const res = await fetch(`/api/inquiries/${encodeURIComponent(id)}`, { method: 'DELETE' });
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

  const toggleExpand = (id) => setExpanded((e) => ({ ...e, [id]: !e[id] }));

  return (
    <AdminShell>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { k: 'new', label: 'New', cls: 'text-red-600' },
          { k: 'contacted', label: 'Contacted', cls: 'text-blue-600' },
          { k: 'converted', label: 'Converted', cls: 'text-green-600' },
          { k: 'closed', label: 'Closed', cls: 'text-sethi-gray500' },
        ].map((s) => (
          <div key={s.k} className="bg-white border border-sethi-gray200 rounded-sm p-4">
            <div className="text-xs uppercase tracking-wider text-sethi-gray500">{s.label}</div>
            <div className={`font-serif text-3xl mt-1 ${s.cls}`}>{counts[s.k]}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-5">
        {['All', ...STATUSES].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${filter === s ? 'bg-sethi-gold text-sethi-black border-sethi-gold' : 'bg-white border-sethi-gray200 hover:border-sethi-gold'}`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-sethi-gray500">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-sethi-gray200 rounded-sm p-10 text-center text-sethi-gray500">
          <p className="font-serif text-xl mb-2">No inquiries{filter !== 'All' ? ` with status "${filter}"` : ' yet'}</p>
          <p className="text-sm">When customers fill the contact form, they’ll appear here.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((i) => {
            const isOpen = expanded[i.id];
            const waLink = `https://wa.me/91${i.phone}`;
            const telLink = `tel:+91${i.phone}`;
            return (
              <div key={i.id} className="bg-white border border-sethi-gray200 rounded-sm p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-lg">{i.name}</h3>
                      <span className="text-sm text-sethi-gray500">• {i.city}</span>
                    </div>
                    <div className="text-xs text-sethi-gray500 mt-0.5">{formatIST(i.createdAt)}</div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-block px-2.5 py-0.5 rounded-sm text-[11px] font-semibold tracking-wide border ${STATUS_STYLES[i.status] || ''}`}>{(i.status || 'new').toUpperCase()}</span>
                    <select value={i.status} onChange={(e) => changeStatus(i.id, e.target.value)} className="text-xs border border-sethi-gray200 rounded-sm px-2 py-1 bg-white">
                      {STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                    </select>
                    <button onClick={() => setConfirm(i)} className="inline-flex items-center gap-1 border border-red-500 text-red-600 px-2.5 py-1 rounded-sm hover:bg-red-500 hover:text-white text-xs"><Trash2 className="w-3 h-3" /> Delete</button>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-3 flex-wrap">
                  <a href={telLink} className="inline-flex items-center gap-1.5 text-sethi-gold font-medium hover:underline"><Phone className="w-4 h-4" /> Call +91 {i.phone}</a>
                  <a href={waLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sethi-gold font-medium hover:underline"><MessageCircle className="w-4 h-4" /> WhatsApp</a>
                  <span className="inline-block bg-sethi-gold/15 text-sethi-gold-dark text-[11px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-sm">{i.productInterest}</span>
                </div>

                <p className={`mt-3 text-sethi-gray800 ${isOpen ? '' : 'line-clamp-2'}`}>{i.message}</p>
                {i.message && i.message.length > 120 && (
                  <button onClick={() => toggleExpand(i.id)} className="mt-1 text-xs text-sethi-gold inline-flex items-center gap-1 hover:underline">
                    {isOpen ? <>Show less <ChevronUp className="w-3 h-3" /></> : <>Read more <ChevronDown className="w-3 h-3" /></>}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-sm p-6 max-w-md w-full">
            <h3 className="font-serif text-xl mb-2">Delete inquiry?</h3>
            <p className="text-sethi-gray500 text-sm mb-5">Are you sure you want to delete inquiry from “{confirm.name}”?</p>
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
