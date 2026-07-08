'use client';
import { useCallback, useEffect, useState } from 'react';
import AdminShell from '@/components/AdminShell';
import { toast } from 'sonner';
import { Users, ChevronLeft, ChevronRight, Upload } from 'lucide-react';

const PAGE_SIZE = 25;

const COUNTRY_FLAG = {
  India: '🇮🇳', USA: '🇺🇸', 'United States': '🇺🇸', Canada: '🇨🇦', Australia: '🇦🇺',
  England: '🇬🇧', UK: '🇬🇧', 'United Kingdom': '🇬🇧', Dubai: '🇦🇪', UAE: '🇦🇪',
};

function countryLabel(country) {
  const c = country || 'India';
  return `${COUNTRY_FLAG[c] || '🌍'} ${c}`;
}

export default function AdminCustomersPage() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Command Center taps set these, and the list below reads them —
  // Command Center and list are the same page/state, per spec.
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('newest');
  const [importOpen, setImportOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE), sort });
      if (status) params.set('status', status);
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
  }, [page, status, sort]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const jumpTo = (nextStatus, nextSort) => {
    setStatus(nextStatus ?? '');
    setSort(nextSort ?? 'newest');
    setPage(1);
  };

  const firstRun = !loading && !error && stats && stats.total === 0;

  return (
    <AdminShell>
      {firstRun ? (
        <div className="bg-white border border-sethi-gray200 rounded-sm p-10 text-center">
          <p className="font-serif text-2xl mb-2">Abhi koi customer nahi 👋</p>
          <p className="text-sm text-sethi-gray500 mb-6">Apni list upload karo ya enquiries se le aao — dono se shuru ho sakta hai.</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button onClick={() => setImportOpen(true)} className="inline-flex items-center gap-2 bg-sethi-gold text-sethi-black px-5 py-3 rounded-sm font-semibold hover:opacity-90">
              <Upload className="w-4 h-4" /> CSV Import karo
            </button>
            <button onClick={() => setImportOpen(true)} className="inline-flex items-center gap-2 border border-sethi-gold text-sethi-gold px-5 py-3 rounded-sm font-semibold hover:bg-sethi-gold hover:text-sethi-black transition-colors">
              <Users className="w-4 h-4" /> Enquiries se le aao
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* ── Command Center: stat cards ── */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {[
                { k: '',            label: 'Total',           n: stats.total,      cls: 'text-sethi-black' },
                { k: 'newThisMonth',label: 'New this month',  n: stats.newThisMonth, cls: 'text-green-600' },
                { k: 'foreign',     label: 'Foreign / NRI',   n: stats.foreign,    cls: 'text-blue-600' },
                { k: 'subscribed',  label: 'Subscribed',      n: stats.subscribed, cls: 'text-sethi-gold-dark' },
              ].map((s) => (
                <button
                  key={s.label}
                  onClick={() => {
                    if (s.k === 'subscribed') jumpTo('subscribed');
                    else jumpTo('');
                  }}
                  className="bg-white border border-sethi-gray200 rounded-sm p-4 text-left hover:border-sethi-gold/50 transition-colors"
                >
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
                <button onClick={() => jumpTo('', 'last_purchase')} className="text-left bg-white border border-sethi-gray200 rounded-sm p-4 hover:border-sethi-gold/50 transition-colors">
                  <div className="text-sm font-semibold text-sethi-black">🔄 Wapas laane layak</div>
                  {stats.withPurchaseDate === 0 ? (
                    <p className="text-xs text-sethi-gray500 mt-1">Abhi purchase history track nahi hui — jaise aap purchases add karoge, yahan customers dikhne lagenge.</p>
                  ) : (
                    <p className="text-xs text-sethi-gray500 mt-1"><span className="text-sethi-gold-dark font-bold">{stats.stalePurchase}</span> customers ne 6 mahine+ se kuch nahi khareeda — ek follow-up message unhe wapas la sakta hai.</p>
                  )}
                </button>
                <button onClick={() => jumpTo('', 'newest')} className="text-left bg-white border border-sethi-gray200 rounded-sm p-4 hover:border-sethi-gold/50 transition-colors">
                  <div className="text-sm font-semibold text-sethi-black">🆕 Naye customers is mahine</div>
                  <p className="text-xs text-sethi-gray500 mt-1"><span className="text-sethi-gold-dark font-bold">{stats.newThisMonth}</span> naye customers judhe hain — welcome karo, achha first impression banega.</p>
                </button>
                <button onClick={() => jumpTo('', 'newest')} className="text-left bg-white border border-sethi-gray200 rounded-sm p-4 hover:border-sethi-gold/50 transition-colors">
                  <div className="text-sm font-semibold text-sethi-black">🌍 Foreign customers</div>
                  <p className="text-xs text-sethi-gray500 mt-1"><span className="text-sethi-gold-dark font-bold">{stats.foreign}</span> foreign/NRI customers hain — personal WhatsApp touch se rishta majboot hota hai.</p>
                </button>
              </div>
            </div>
          )}

          {/* ── Customer list (Task 3 fills this in with search/filters/bulk actions) ── */}
          {loading ? (
            <div className="text-center py-12 text-sethi-gray500">Loading…</div>
          ) : error ? (
            <div className="bg-white border border-sethi-gray200 rounded-sm p-10 text-center text-sethi-gray500">
              <p className="font-serif text-xl mb-2">Could not load customers</p>
              <button onClick={load} className="text-sethi-gold hover:underline text-sm">Try again</button>
            </div>
          ) : rows.length === 0 ? (
            <div className="bg-white border border-sethi-gray200 rounded-sm p-10 text-center text-sethi-gray500">
              <p className="font-serif text-xl mb-2">No customers found</p>
            </div>
          ) : (
            <>
              <div className="hidden md:block bg-white border border-sethi-gray200 rounded-sm overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-sethi-gray200 bg-sethi-gray100">
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-sethi-gray500">Customer</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-sethi-gray500">Phone</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-sethi-gray500">Location</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-sethi-gray500">Tags</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sethi-gray200">
                    {rows.map((c) => (
                      <tr key={c.id}>
                        <td className="px-4 py-3 font-semibold text-sethi-black">{c.full_name || c.serial_no || 'Customer'}</td>
                        <td className="px-4 py-3 font-mono text-xs">{c.phone_number}</td>
                        <td className="px-4 py-3 text-xs text-sethi-gray500">{c.city ? `${c.city} · ` : ''}{countryLabel(c.country)}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {(c.tags || []).map((t) => (
                              <span key={t} className="text-[10px] bg-sethi-gold/15 text-sethi-black px-1.5 py-0.5 rounded-sm">{t}</span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden grid gap-3">
                {rows.map((c) => (
                  <div key={c.id} className="bg-white border border-sethi-gray200 rounded-sm p-4">
                    <div className="font-semibold text-sethi-black">{c.full_name || c.serial_no || 'Customer'}</div>
                    <div className="font-mono text-xs text-sethi-gray500 mt-0.5">{c.phone_number}</div>
                    <div className="text-xs text-sethi-gray500 mt-0.5">{c.city ? `${c.city} · ` : ''}{countryLabel(c.country)}</div>
                    {(c.tags || []).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {c.tags.map((t) => <span key={t} className="text-[10px] bg-sethi-gold/15 text-sethi-black px-1.5 py-0.5 rounded-sm">{t}</span>)}
                      </div>
                    )}
                  </div>
                ))}
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
    </AdminShell>
  );
}
