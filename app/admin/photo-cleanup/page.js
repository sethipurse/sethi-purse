'use client';
import { useState } from 'react';
import AdminShell from '@/components/AdminShell';
import ConfirmDialog from '@/components/ConfirmDialog';
import { toast } from 'sonner';
import { Trash2, Search, CheckSquare, Square, Loader2, ChevronDown, ChevronRight } from 'lucide-react';

// Quick-pick durations — plain-language Hinglish labels mapped to the day
// counts the stale-hidden API expects.
const STALE_DAY_PRESETS = [
  { label: '1 Mahina', days: '30' },
  { label: '3 Mahine', days: '90' },
  { label: '6 Mahine', days: '180' },
  { label: '1 Saal', days: '365' },
];

export default function PhotoCleanupPage() {
  // staleData stays null until the owner explicitly runs a check — nothing
  // is fetched or acted on automatically. It holds two separate groups:
  // `confident` (real hidden_at-based day counts) and `unknownDuration`
  // (hidden before hidden_at tracking started — no trustworthy duration).
  // staleOpen defaults open here (unlike its former home embedded in the
  // Products page) since this panel is now the page's sole content.
  const [staleOpen, setStaleOpen] = useState(true);
  const [staleDays, setStaleDays] = useState('180');
  const [staleCustomOpen, setStaleCustomOpen] = useState(false);
  const [staleLoading, setStaleLoading] = useState(false);
  const [staleData, setStaleData] = useState(null);
  const [staleSelected, setStaleSelected] = useState(new Set());
  const [staleConfirm, setStaleConfirm] = useState(false);
  const [staleCleaning, setStaleCleaning] = useState(false);

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
      toast.error('Purani photos dhoond nahi paye, dobara try karo.');
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
      if (data.cleaned > 0) toast.success(`${data.cleaned} photo${data.cleaned > 1 ? 's' : ''} hata di gayi, jagah bach gayi! 🎉`);
      if (failCount > 0) toast.error(`${failCount} photo${failCount > 1 ? 's' : ''} clean nahi ho payi. Dobara try karo.`);
      setStaleConfirm(false);
      setStaleSelected(new Set());
      checkStaleHidden();
    } catch (err) {
      console.error('Clean images failed:', err);
      toast.error('Kuch gadbad ho gayi, dobara try karo.');
      setStaleConfirm(false);
    } finally {
      setStaleCleaning(false);
    }
  };

  // Renders one group (confident or unknownDuration) of the stale-hidden
  // preview list, each with its own "select all" toggle. `subtitle` renders
  // per-item — either a real day count or the honest "unknown" label.
  const StaleGroupList = ({ items, subtitle }) => {
    const allIn = items.length > 0 && items.every((p) => staleSelected.has(p.id));
    return (
      <div className="mb-3">
        <button onClick={() => toggleStaleGroup(items)} className="flex items-center gap-2 text-sm font-medium text-sethi-black mb-2">
          {allIn ? <CheckSquare className="w-4 h-4 text-sethi-gold" /> : <Square className="w-4 h-4 text-sethi-gray500" />}
          {allIn ? 'Sab hatao' : 'Sab select karo'} ({items.length})
        </button>
        <div className="divide-y divide-sethi-gray200 border border-sethi-gray200 rounded-sm max-h-96 overflow-y-auto">
          {items.map((p) => {
            const price = p.salePrice ?? p.sale_price ?? p.price;
            return (
              <label key={p.id} className="flex items-center gap-3 px-3 py-3 hover:bg-sethi-gray100/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={staleSelected.has(p.id)}
                  onChange={() => toggleStaleOne(p.id)}
                  className="w-5 h-5 accent-sethi-gold shrink-0"
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.image_url || ''} alt="" className="w-14 h-14 sm:w-16 sm:h-16 object-cover rounded-sm bg-sethi-gray100 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-sethi-black truncate">{p.name}</div>
                  <div className="text-xs text-sethi-gray500 truncate">
                    {p.category}{price !== undefined && price !== null && price !== '' ? ` • Rs.${price}` : ''}
                  </div>
                  <div className="text-xs text-sethi-gray500 mt-0.5">{subtitle(p)}</div>
                </div>
              </label>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <AdminShell>
      {/* Manual hidden-image cleanup tool — on-demand only, nothing runs automatically */}
      <div className="bg-white border border-sethi-gray200 rounded-sm mb-4">
        <button
          onClick={() => setStaleOpen((v) => !v)}
          className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
        >
          <span className="font-semibold text-sethi-black">🧹 Purani Photos Saaf Karo</span>
          {staleOpen ? <ChevronDown className="w-4 h-4 text-sethi-gray500" /> : <ChevronRight className="w-4 h-4 text-sethi-gray500" />}
        </button>
        {staleOpen && (
          <div className="px-4 pb-4 border-t border-sethi-gray200 pt-4">
            <p className="text-sm text-sethi-gray500 mb-3">
              Jo products bik chuke hain aur ab kabhi nahi aayenge, unki photos hata ke jagah bacha lo. Kuch bhi
              apne aap delete nahi hota — aap khud dekh ke, tick karke, confirm karoge. Naam/price/category
              hamesha safe rehta hai, sirf photo jaati hai.
            </p>

            <div className="flex flex-wrap items-center gap-2 mb-1">
              {STALE_DAY_PRESETS.map((preset) => (
                <button
                  key={preset.days}
                  onClick={() => setStaleDays(preset.days)}
                  className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-colors ${staleDays === preset.days ? 'bg-sethi-gold text-sethi-black' : 'bg-sethi-gray100 text-sethi-gray500 hover:bg-sethi-gray200'}`}
                >
                  {preset.label}
                </button>
              ))}
              <button
                onClick={() => setStaleCustomOpen((v) => !v)}
                className="text-sm text-sethi-gold hover:underline"
              >
                ya khud number daalo
              </button>
            </div>

            {staleCustomOpen && (
              <div className="flex flex-wrap items-center gap-2 mb-3 mt-2">
                <input
                  type="number"
                  min="1"
                  value={staleDays}
                  onChange={(e) => setStaleDays(e.target.value)}
                  className="input-sethi w-24 !py-1.5"
                />
                <span className="text-sm text-sethi-gray500">din se hidden</span>
              </div>
            )}

            <div className="mt-3 mb-3">
              <button
                onClick={checkStaleHidden}
                disabled={staleLoading}
                className="inline-flex items-center gap-2 border border-sethi-gold text-sethi-gold-dark px-3 py-1.5 rounded-sm text-sm font-semibold hover:bg-sethi-gold hover:text-sethi-black transition-colors disabled:opacity-60"
              >
                {staleLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Purani photos dhoondo
              </button>
            </div>

            {staleData !== null && (
              staleData.confident.length === 0 && staleData.unknownDuration.length === 0 ? (
                <p className="text-sm text-sethi-gray500">Koi purani hidden photo nahi mili — sab saaf hai! 🎉</p>
              ) : (
                <>
                  {staleSelected.size > 0 && (
                    <div className="flex justify-end mb-3">
                      <button
                        onClick={() => setStaleConfirm(true)}
                        className="inline-flex items-center gap-2 bg-red-600 text-white px-3 py-1.5 rounded-sm text-sm font-semibold hover:bg-red-700 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" /> Photos saaf karo ({staleSelected.size})
                      </button>
                    </div>
                  )}

                  {staleData.confident.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-sethi-black mb-2">
                        {staleDays}+ din se hidden — pakka hai ({staleData.confident.length})
                      </h4>
                      <StaleGroupList items={staleData.confident} subtitle={(p) => `${p.hidden_days} din se hidden`} />
                    </div>
                  )}

                  {staleData.unknownDuration.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-amber-700 mb-1">
                        ⚠️ Purana data — kab hide hua pata nahi, dekh ke faisla karo ({staleData.unknownDuration.length})
                      </h4>
                      <p className="text-xs text-sethi-gray500 mb-2">
                        Ye tab hide hue the jab hide-hone-ki-date track nahi hoti thi, isliye exact din pata nahi.
                        Dhyan se dekh ke faisla karo.
                      </p>
                      <StaleGroupList items={staleData.unknownDuration} subtitle={() => 'kab hide hua pata nahi'} />
                    </div>
                  )}

                  {staleData.confident.length === 0 && staleData.unknownDuration.length > 0 && (
                    <p className="text-sm text-sethi-gray500 mt-2">{staleDays}+ din se pakka hidden koi nahi mila — bas neeche wale purane records dekho.</p>
                  )}
                </>
              )
            )}
          </div>
        )}
      </div>

      {/* Clean hidden-product images confirm */}
      <ConfirmDialog
        open={staleConfirm}
        title={<span className="text-red-700">{staleSelected.size} photo{staleSelected.size > 1 ? 's' : ''} delete karein?</span>}
        message={<><strong>{staleSelected.size}</strong> photo{staleSelected.size > 1 ? 's' : ''} hamesha ke liye delete ho jaayengi. Product ka naam/price/category safe rahega. Pakka?</>}
        confirmLabel={staleCleaning ? <><Loader2 className="w-4 h-4 animate-spin" /> Saaf ho raha hai...</> : <><Trash2 className="w-4 h-4" /> Haan, delete karo</>}
        loading={staleCleaning}
        onConfirm={doCleanImages}
        onCancel={() => setStaleConfirm(false)}
      />
    </AdminShell>
  );
}
