'use client';
import { useEffect, useRef, useState } from 'react';
import Papa from 'papaparse';
import { toast } from 'sonner';
import { Upload, Download, Loader2, CheckCircle2, AlertTriangle, Users, X } from 'lucide-react';
import { normalizePhone, isValidNormalizedPhone } from '@/lib/phone';
import ConfirmDialog from './ConfirmDialog';

const CHUNK_SIZE = 500;

// Owner's real CSV header -> our field name. A few common synonyms are
// included so a slightly different export still auto-maps.
const FIELD_ALIASES = {
  full_name: ['full_name', 'name', 'customer_name', 'fullname'],
  phone_number: ['phone_number', 'phone', 'mobile', 'number', 'primary_phone'],
  whatsapp_number: ['whatsapp_number', 'whatsapp', 'wa_number'],
  city: ['city'],
  country: ['country'],
  serial_no: ['serial_no', 'serial', 'code', 'sr_no', 'serialno'],
  tags: ['tags', 'tag'],
  phone_2: ['phone_2', 'phone2', 'alternate_phone', 'alt_phone', 'secondary_phone'],
};
const FIELD_ORDER = ['full_name', 'phone_number', 'whatsapp_number', 'city', 'country', 'serial_no', 'tags', 'phone_2'];

function normalizeHeader(h) {
  return String(h || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
}

function buildColumnMap(headers) {
  const map = {}; // field -> csv header
  const unmapped = [];
  headers.forEach((h) => {
    const norm = normalizeHeader(h);
    const field = FIELD_ORDER.find((f) => FIELD_ALIASES[f].includes(norm));
    if (field && !map[field]) map[field] = h;
    else if (!field) unmapped.push(h);
  });
  return { map, unmapped };
}

function validateRows(rawRows, colMap) {
  const valid = [];
  const invalid = [];
  rawRows.forEach((raw, idx) => {
    const get = (field) => (colMap[field] ? String(raw[colMap[field]] ?? '').trim() : '');
    const phone = normalizePhone(get('phone_number'));
    if (!isValidNormalizedPhone(phone)) {
      invalid.push({ row: raw, reason: 'Invalid or missing phone number' });
      return;
    }
    valid.push({
      full_name: get('full_name'),
      phone_number: get('phone_number'),
      whatsapp_number: get('whatsapp_number'),
      city: get('city'),
      country: get('country'),
      serial_no: get('serial_no'),
      tags: get('tags'),
      phone_2: get('phone_2'),
    });
  });
  return { valid, invalid };
}

function downloadCsv(filename, rows) {
  const csv = Papa.unparse(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function downloadTemplate() {
  downloadCsv('customers-import-template.csv', [
    { full_name: 'Ramesh Kumar', phone_number: '9876543210', whatsapp_number: '9876543210', city: 'Jalandhar', country: 'India', serial_no: 'Sp1', tags: 'local', phone_2: '' },
    { full_name: 'Priya Sharma', phone_number: '14155551234', whatsapp_number: '14155551234', city: 'California', country: 'USA', serial_no: 'Sp2', tags: 'foreign;nri', phone_2: '' },
  ]);
}

const emptySummary = { inserted: 0, merged: 0, skipped: 0, failed: [] };

export default function CustomerImportModal({ open, onClose, onImported }) {
  const [tab, setTab] = useState('csv'); // 'csv' | 'enquiries'
  const [step, setStep] = useState('pick'); // pick | preview | uploading | done
  const [fileName, setFileName] = useState('');
  const [colMap, setColMap] = useState({});
  const [unmapped, setUnmapped] = useState([]);
  const [validRows, setValidRows] = useState([]);
  const [invalidRows, setInvalidRows] = useState([]);
  const [mode, setMode] = useState('skip');
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [summary, setSummary] = useState(emptySummary);
  const [enquiryConfirm, setEnquiryConfirm] = useState(false);
  const [enquiryRunning, setEnquiryRunning] = useState(false);
  const [fixingCountries, setFixingCountries] = useState(false);
  const [migratingForeign, setMigratingForeign] = useState(false);
  const [migratingWa, setMigratingWa] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setTab('csv'); setStep('pick'); setFileName(''); setColMap({}); setUnmapped([]);
    setValidRows([]); setInvalidRows([]); setMode('skip'); setProgress({ done: 0, total: 0 }); setSummary(emptySummary);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => { if (e.key === 'Escape' && step !== 'uploading') onClose?.(); };
    document.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKeyDown); document.body.style.overflow = prevOverflow; };
  }, [open, onClose, step]);

  if (!open) return null;

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields || [];
        const { map, unmapped: um } = buildColumnMap(headers);
        if (!map.phone_number) {
          toast.error('Could not find a phone number column in this file');
          return;
        }
        const { valid, invalid } = validateRows(results.data, map);
        setColMap(map);
        setUnmapped(um);
        setValidRows(valid);
        setInvalidRows(invalid);
        setStep('preview');
      },
      error: (err) => toast.error(err.message || 'Could not read this file'),
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function startUpload() {
    setStep('uploading');
    setProgress({ done: 0, total: validRows.length });
    const acc = { inserted: 0, merged: 0, skipped: 0, failed: [] };
    for (let i = 0; i < validRows.length; i += CHUNK_SIZE) {
      const chunk = validRows.slice(i, i + CHUNK_SIZE);
      try {
        const res = await fetch('/api/customers/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rows: chunk, mode }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          chunk.forEach((row) => acc.failed.push({ row, reason: data.error || 'Upload failed' }));
        } else {
          acc.inserted += data.inserted || 0;
          acc.merged += data.merged || 0;
          acc.skipped += data.skipped || 0;
          acc.failed.push(...(data.failed || []));
        }
      } catch (err) {
        chunk.forEach((row) => acc.failed.push({ row, reason: 'Network error' }));
      }
      setProgress({ done: Math.min(i + CHUNK_SIZE, validRows.length), total: validRows.length });
    }
    invalidRows.forEach((r) => acc.failed.push(r));
    setSummary(acc);
    setStep('done');
    onImported?.();
  }

  async function runEnquiryImport() {
    setEnquiryRunning(true);
    try {
      const res = await fetch('/api/customers/import-from-inquiries', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error || 'Import failed'); setEnquiryRunning(false); setEnquiryConfirm(false); return; }
      setSummary({ inserted: data.inserted || 0, merged: data.merged || 0, skipped: data.skipped || 0, failed: data.failed || [] });
      setStep('done');
      onImported?.();
    } catch (err) {
      toast.error('Network error');
    } finally {
      setEnquiryRunning(false);
      setEnquiryConfirm(false);
    }
  }

  async function runFixCountries() {
    setFixingCountries(true);
    try {
      const res = await fetch('/api/customers/fix-countries', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error || 'Fix failed'); return; }
      const breakdown = Object.entries(data.byCountry || {}).map(([k, v]) => `${k}: ${v}`).join(', ');
      toast.success(`Checked ${data.scanned}, updated ${data.updated}${breakdown ? ' — ' + breakdown : ''}`);
      onImported?.();
    } catch (err) {
      toast.error('Network error');
    } finally {
      setFixingCountries(false);
    }
  }

  async function runMigration(endpoint, setRunning) {
    setRunning(true);
    try {
      const res = await fetch(`/api/customers/${endpoint}`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error || 'Migration failed'); return; }
      const failedCount = Array.isArray(data.skipped) ? data.skipped.filter((s) => s.reason !== 'already migrated').length : 0;
      toast.success(`Scanned ${data.scanned}, migrated ${data.updated}${failedCount ? `, ${failedCount} failed` : ''}`);
      onImported?.();
    } catch (err) {
      toast.error('Network error');
    } finally {
      setRunning(false);
    }
  }

  const closeable = step !== 'uploading';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 md:pl-[260px]" onClick={(e) => { if (closeable && e.target === e.currentTarget) onClose?.(); }}>
      <div className="bg-white rounded-sm p-6 max-w-2xl w-full max-h-[88vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif text-xl">Import customers</h3>
          {closeable && <button onClick={onClose} className="text-sethi-gray500 hover:text-sethi-black"><X className="w-5 h-5" /></button>}
        </div>

        {step !== 'uploading' && step !== 'done' && (
          <div className="flex gap-2 mb-5">
            <button onClick={() => setTab('csv')} className={`px-4 py-2 rounded-full text-sm font-medium border ${tab === 'csv' ? 'bg-sethi-gold text-sethi-black border-sethi-gold' : 'bg-white border-sethi-gray200'}`}>CSV Import</button>
            <button onClick={() => setTab('enquiries')} className={`px-4 py-2 rounded-full text-sm font-medium border ${tab === 'enquiries' ? 'bg-sethi-gold text-sethi-black border-sethi-gold' : 'bg-white border-sethi-gray200'}`}>Enquiries se le aao</button>
          </div>
        )}

        {step === 'done' ? (
          <div>
            <div className="flex items-center gap-2 text-green-700 mb-4">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-semibold">Import complete</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="bg-sethi-gray100 rounded-sm p-3 text-center">
                <div className="text-2xl font-serif text-green-600">{summary.inserted}</div>
                <div className="text-[11px] text-sethi-gray500 uppercase">Naye add hue</div>
              </div>
              <div className="bg-sethi-gray100 rounded-sm p-3 text-center">
                <div className="text-2xl font-serif text-blue-600">{summary.merged}</div>
                <div className="text-[11px] text-sethi-gray500 uppercase">Merge hue</div>
              </div>
              <div className="bg-sethi-gray100 rounded-sm p-3 text-center">
                <div className="text-2xl font-serif text-sethi-gray800">{summary.skipped}</div>
                <div className="text-[11px] text-sethi-gray500 uppercase">Skip hue</div>
              </div>
              <div className="bg-sethi-gray100 rounded-sm p-3 text-center">
                <div className="text-2xl font-serif text-red-600">{summary.failed.length}</div>
                <div className="text-[11px] text-sethi-gray500 uppercase">Fail hue</div>
              </div>
            </div>
            {summary.failed.length > 0 && (
              <button
                onClick={() => downloadCsv('customers-import-failed.csv', summary.failed.map((f) => ({ ...f.row, failure_reason: f.reason })))}
                className="inline-flex items-center gap-2 text-sm text-sethi-gold hover:underline mb-4"
              >
                <Download className="w-4 h-4" /> Download failed rows ({summary.failed.length}) — kuch bhi miss nahi hoga
              </button>
            )}
            <div className="flex justify-end">
              <button onClick={onClose} className="btn-primary min-h-[48px] px-6 font-semibold rounded-sm">Done</button>
            </div>
          </div>
        ) : tab === 'enquiries' ? (
          <div>
            <p className="text-sm text-sethi-gray500 mb-5">Jin enquiries mein real phone number hai, unse naye customers ban jayenge. Jo pehle se customer hain unhe dobara nahi banaya jayega — jitni baar chalao, safe hai.</p>
            <div className="flex justify-end">
              <button onClick={() => setEnquiryConfirm(true)} className="inline-flex items-center gap-2 btn-primary min-h-[48px] px-6 font-semibold rounded-sm">
                <Users className="w-4 h-4" /> Enquiries se le aao
              </button>
            </div>
          </div>
        ) : step === 'pick' ? (
          <div>
            <label className="block border-2 border-dashed border-sethi-gray200 rounded-sm p-8 text-center cursor-pointer hover:border-sethi-gold transition-colors">
              <Upload className="w-8 h-8 mx-auto text-sethi-gray500 mb-2" />
              <div className="text-sm text-sethi-black font-medium">CSV file chuno ya yahan drop karo</div>
              <div className="text-xs text-sethi-gray500 mt-1">Columns: full_name, phone_number, whatsapp_number, city, country, serial_no, tags, phone_2</div>
              <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFile} className="hidden" />
            </label>
            <button onClick={downloadTemplate} className="inline-flex items-center gap-2 text-sm text-sethi-gold hover:underline mt-4">
              <Download className="w-4 h-4" /> Blank template CSV download karo
            </button>
          </div>
        ) : step === 'preview' ? (
          <div>
            <p className="text-sm text-sethi-gray800 mb-1"><strong>{fileName}</strong></p>
            <div className="flex items-center gap-4 text-sm mb-3">
              <span className="text-green-700">✓ {validRows.length} valid</span>
              {invalidRows.length > 0 && <span className="text-red-600 inline-flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> {invalidRows.length} invalid</span>}
            </div>
            {unmapped.length > 0 && (
              <p className="text-xs text-amber-700 mb-3">Ye columns pehchane nahi gaye aur ignore honge: {unmapped.join(', ')}</p>
            )}
            <div className="overflow-x-auto border border-sethi-gray200 rounded-sm mb-4">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-sethi-gray100">
                    {FIELD_ORDER.map((f) => <th key={f} className="text-left px-2 py-1.5 font-semibold text-sethi-gray500">{f}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-sethi-gray200">
                  {validRows.slice(0, 5).map((r, i) => (
                    <tr key={i}>
                      {FIELD_ORDER.map((f) => <td key={f} className="px-2 py-1.5 whitespace-nowrap">{r[f] || '—'}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {invalidRows.length > 0 && (
              <p className="text-xs text-sethi-gray500 mb-4">Invalid rows import nahi honge — download karke fix kar sakte ho, dobara try karo.</p>
            )}

            <div className="mb-5">
              <div className="text-sm font-semibold text-sethi-black mb-2">Pehle se maujood phone number mile to?</div>
              <label className="flex items-center gap-2 text-sm mb-1.5">
                <input type="radio" checked={mode === 'skip'} onChange={() => setMode('skip')} /> Skip — purana data waisa hi rahega
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" checked={mode === 'merge'} onChange={() => setMode('merge')} /> Merge — khaali fields bhar do, tags jod do (kabhi overwrite nahi)
              </label>
            </div>

            <div className="flex justify-between">
              <button onClick={() => setStep('pick')} className="btn-ghost">Back</button>
              <button onClick={startUpload} disabled={validRows.length === 0} className="btn-primary min-h-[48px] px-6 font-semibold rounded-sm disabled:opacity-60">
                Import {validRows.length} customer{validRows.length === 1 ? '' : 's'}
              </button>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center">
            <Loader2 className="w-8 h-8 mx-auto text-sethi-gold animate-spin mb-3" />
            <p className="text-sm text-sethi-gray800">{progress.done} / {progress.total} rows uploaded…</p>
            <div className="w-full bg-sethi-gray100 rounded-full h-2 mt-3 overflow-hidden">
              <div className="bg-sethi-gold h-2 transition-all" style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }} />
            </div>
          </div>
        )}

        {step === 'pick' && (
          <div className="mt-6 flex flex-col gap-1.5">
            <button onClick={runFixCountries} disabled={fixingCountries} className="block text-left text-[11px] text-sethi-gray500 hover:text-sethi-gold underline decoration-dotted disabled:opacity-60">
              {fixingCountries ? 'Fixing foreign countries…' : 'Maintenance: fix foreign customer countries'}
            </button>
            <button onClick={() => runMigration('migrate-foreign-nri', setMigratingForeign)} disabled={migratingForeign} className="block text-left text-[11px] text-sethi-gray500 hover:text-sethi-gold underline decoration-dotted disabled:opacity-60">
              {migratingForeign ? 'Migrating foreign customers…' : 'Maintenance: migrate foreign → NRI'}
            </button>
            <button onClick={() => runMigration('migrate-wa-serials', setMigratingWa)} disabled={migratingWa} className="block text-left text-[11px] text-sethi-gray500 hover:text-sethi-gold underline decoration-dotted disabled:opacity-60">
              {migratingWa ? 'Migrating WhatsApp batch…' : 'Maintenance: migrate WhatsApp batch → Sp'}
            </button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={enquiryConfirm}
        title="Enquiries se customers banayein?"
        message="Real phone number wali sabhi enquiries se naye customers ban jayenge — jo pehle se maujood hain unhe skip kar diya jayega."
        confirmLabel={enquiryRunning ? <><Loader2 className="w-4 h-4 animate-spin" /> Le aa rahe hain…</> : 'Haan, le aao'}
        danger={false}
        loading={enquiryRunning}
        onConfirm={runEnquiryImport}
        onCancel={() => setEnquiryConfirm(false)}
      />
    </div>
  );
}
