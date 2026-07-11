'use client';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { normalizePhone } from '@/lib/phone';

const STATUSES = ['subscribed', 'unsubscribed', 'blocked'];

function blankForm() {
  return { full_name: '', phone_number: '', whatsapp_number: '', phone_2: '', serial_no: '', city: '', country: 'India', tags: '', marketing_status: 'subscribed', notes: '', birthday: '' };
}

export default function CustomerFormModal({ open, customer, onClose, onSaved }) {
  const [form, setForm] = useState(blankForm());
  const [saving, setSaving] = useState(false);
  // Add-mode only — a live preview of the real next Sp/NRI serial. Never
  // auto-filled into the input; the actual assignment (and its taken/gap
  // handling) still happens server-side on save, so two tabs adding a
  // customer at once can never grab the same serial from a stale preview.
  const [serialPreview, setSerialPreview] = useState('Sp… / NRI…');

  useEffect(() => {
    if (!open) return;
    setForm(customer ? {
      full_name: customer.full_name || '',
      phone_number: customer.phone_number || '',
      whatsapp_number: customer.whatsapp_number || '',
      phone_2: customer.phone_2 || '',
      serial_no: customer.serial_no || '',
      city: customer.city || '',
      country: customer.country || 'India',
      tags: (customer.tags || []).join(', '),
      marketing_status: customer.marketing_status || 'subscribed',
      notes: customer.notes || '',
      birthday: customer.birthday || '',
    } : blankForm());
  }, [open, customer]);

  async function fetchSerialPreview(isForeign) {
    try {
      const res = await fetch(`/api/customers/next-serial?foreign=${isForeign ? '1' : '0'}`);
      if (!res.ok) throw new Error('failed');
      const data = await res.json();
      if (data.serial) setSerialPreview(data.serial);
    } catch {
      setSerialPreview(isForeign ? 'NRI…' : 'Sp…');
    }
  }

  // Default preview on opening the ADD form — most customers are local.
  useEffect(() => {
    if (!open || customer) return;
    setSerialPreview('Sp… / NRI…');
    fetchSerialPreview(false);
  }, [open, customer]);

  // Phone-aware: once they've typed a number, re-check after they pause
  // (400ms) whether it's local (91) or foreign, and preview the matching prefix.
  useEffect(() => {
    if (!open || customer || !form.phone_number.trim()) return;
    const t = setTimeout(() => {
      fetchSerialPreview(!normalizePhone(form.phone_number).startsWith('91'));
    }, 400);
    return () => clearTimeout(t);
  }, [form.phone_number, open, customer]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKeyDown); document.body.style.overflow = prevOverflow; };
  }, [open, onClose]);

  if (!open) return null;

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    if (!form.phone_number.trim()) { toast.error('Phone number is required'); return; }
    setSaving(true);
    try {
      const payload = {
        full_name: form.full_name.trim(),
        phone_number: form.phone_number.trim(),
        whatsapp_number: form.whatsapp_number.trim(),
        phone_2: form.phone_2.trim(),
        serial_no: form.serial_no.trim(),
        city: form.city.trim(),
        country: form.country.trim() || 'India',
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
        marketing_status: form.marketing_status,
        notes: form.notes.trim(),
        birthday: form.birthday.trim(),
      };
      const url = customer ? `/api/customers/${encodeURIComponent(customer.id)}` : '/api/customers';
      const res = await fetch(url, {
        method: customer ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error || 'Save failed'); setSaving(false); return; }
      toast.success(customer ? 'Customer updated' : `Customer added — serial ${data.serial_no}`);
      // Owner typed a serial that wasn't the natural next one (taken,
      // ahead, or wrong-prefix) — the API corrected it; tell them why.
      if (data.serialNote) toast(data.serialNote, { duration: 6000 });
      setSaving(false);
      onSaved?.(data);
    } catch (err) {
      console.error(err);
      toast.error('Network error');
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 md:pl-[260px]" onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <form onSubmit={submit} className="bg-white rounded-sm p-6 max-w-lg w-full max-h-[85vh] overflow-y-auto">
        <h3 className="font-serif text-xl mb-4">{customer ? 'Edit customer' : 'Add customer'}</h3>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs text-sethi-gray500 col-span-2">
            Name
            <input value={form.full_name} onChange={set('full_name')} placeholder="Customer name" className="mt-1 w-full border border-sethi-gray200 rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-sethi-gold" />
          </label>
          <label className="text-xs text-sethi-gray500">
            Phone *
            <input value={form.phone_number} onChange={set('phone_number')} required placeholder="9876543210" className="mt-1 w-full border border-sethi-gray200 rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-sethi-gold" />
          </label>
          <label className="text-xs text-sethi-gray500">
            WhatsApp number
            <input value={form.whatsapp_number} onChange={set('whatsapp_number')} placeholder="Same as phone if blank" className="mt-1 w-full border border-sethi-gray200 rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-sethi-gold" />
          </label>
          <label className="text-xs text-sethi-gray500">
            Alternate phone
            <input value={form.phone_2} onChange={set('phone_2')} className="mt-1 w-full border border-sethi-gray200 rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-sethi-gold" />
          </label>
          <label className="text-xs text-sethi-gray500">
            Serial no.
            <input value={form.serial_no} onChange={set('serial_no')} placeholder={serialPreview} className="mt-1 w-full border border-sethi-gray200 rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-sethi-gold" />
          </label>
          <label className="text-xs text-sethi-gray500">
            City
            <input value={form.city} onChange={set('city')} className="mt-1 w-full border border-sethi-gray200 rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-sethi-gold" />
          </label>
          <label className="text-xs text-sethi-gray500">
            Country
            <input value={form.country} onChange={set('country')} className="mt-1 w-full border border-sethi-gray200 rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-sethi-gold" />
          </label>
          <label className="text-xs text-sethi-gray500">
            Birthday (DD/MM)
            <input value={form.birthday} onChange={set('birthday')} placeholder="15/08 ya 15 Aug" className="mt-1 w-full border border-sethi-gray200 rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-sethi-gold" />
            <span className="block text-[11px] text-sethi-gray400 mt-0.5 normal-case">Optional — jaise 15/08 ya 15 Aug</span>
          </label>
          <label className="text-xs text-sethi-gray500 col-span-2">
            Tags (comma separated)
            <input value={form.tags} onChange={set('tags')} placeholder="local, business" className="mt-1 w-full border border-sethi-gray200 rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-sethi-gold" />
          </label>
          <label className="text-xs text-sethi-gray500">
            Marketing status
            <select value={form.marketing_status} onChange={set('marketing_status')} className="mt-1 w-full border border-sethi-gray200 rounded-sm px-3 py-2 text-sm bg-white focus:outline-none focus:border-sethi-gold">
              {STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </label>
          <label className="text-xs text-sethi-gray500 col-span-2">
            Notes
            <textarea value={form.notes} onChange={set('notes')} rows={2} className="mt-1 w-full border border-sethi-gray200 rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-sethi-gold" />
          </label>
        </div>
        <div className="flex justify-end gap-3 mt-5">
          <button type="button" onClick={onClose} disabled={saving} className="btn-ghost disabled:opacity-60">Cancel</button>
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 min-h-[48px] px-6 font-semibold rounded-sm btn-primary disabled:opacity-60">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null} {customer ? 'Save' : 'Add customer'}
          </button>
        </div>
      </form>
    </div>
  );
}
