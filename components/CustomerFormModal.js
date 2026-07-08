'use client';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const STATUSES = ['subscribed', 'unsubscribed', 'blocked'];

function blankForm() {
  return { full_name: '', phone_number: '', whatsapp_number: '', phone_2: '', serial_no: '', city: '', country: 'India', tags: '', marketing_status: 'subscribed', notes: '' };
}

export default function CustomerFormModal({ open, customer, onClose, onSaved }) {
  const [form, setForm] = useState(blankForm());
  const [saving, setSaving] = useState(false);

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
    } : blankForm());
  }, [open, customer]);

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
      };
      const url = customer ? `/api/customers/${encodeURIComponent(customer.id)}` : '/api/customers';
      const res = await fetch(url, {
        method: customer ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error || 'Save failed'); setSaving(false); return; }
      toast.success(customer ? 'Customer updated' : 'Customer added');
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
            <input value={form.serial_no} onChange={set('serial_no')} placeholder="Sp1042" className="mt-1 w-full border border-sethi-gray200 rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-sethi-gold" />
          </label>
          <label className="text-xs text-sethi-gray500">
            City
            <input value={form.city} onChange={set('city')} className="mt-1 w-full border border-sethi-gray200 rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-sethi-gold" />
          </label>
          <label className="text-xs text-sethi-gray500">
            Country
            <input value={form.country} onChange={set('country')} className="mt-1 w-full border border-sethi-gray200 rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-sethi-gold" />
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
