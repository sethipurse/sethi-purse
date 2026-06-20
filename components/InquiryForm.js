'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, MessageCircle, Send, CheckCircle2 } from 'lucide-react';
import { WHATSAPP_URL } from '@/lib/constants';

const PRODUCT_OPTIONS = [
  'Trolley Bags',
  'Travel Bags',
  'School Bags',
  'Handbags',
  'Backpacks',
  'Wallets',
  'Laptop Bags',
  'Accessories',
  'General Inquiry',
];

const INITIAL = { name: '', phone: '', city: '', productInterest: '', message: '', whatsappConsent: false };

export default function InquiryForm() {
  const [form, setForm] = useState(INITIAL);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const update = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((er) => ({ ...er, [k]: undefined }));
  };

  const validate = () => {
    const er = {};
    if (!form.name.trim()) er.name = 'Name is required';
    const digits = form.phone.replace(/\D/g, '');
    if (!digits) er.phone = 'Phone is required';
    else if (digits.length !== 10) er.phone = 'Phone must be exactly 10 digits';
    if (!form.city.trim()) er.city = 'City is required';
    if (!form.productInterest) er.productInterest = 'Please select an option';
    if (!form.message.trim()) er.message = 'Message is required';
    setErrors(er);
    return Object.keys(er).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setBusy(true);
    try {
      const payload = { ...form, phone: form.phone.replace(/\D/g, '') };
      const res = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || 'Failed to send. Please try again.');
        return;
      }
      toast.success("Thank you! We'll contact you soon.");
      setForm(INITIAL);
      setDone(true);
      setTimeout(() => setDone(false), 6000);
    } catch (err) {
      console.error('Inquiry submit failed:', err);
      toast.error('Network error. Please try again or WhatsApp us directly.');
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="card-sethi p-8 md:p-10 text-center">
        <CheckCircle2 className="w-14 h-14 text-sethi-gold mx-auto mb-4" />
        <h3 className="font-serif text-2xl mb-2">Thank you!</h3>
        <p className="text-sethi-gray500">We&apos;ll contact you soon.</p>
        <button onClick={() => setDone(false)} className="btn-ghost mt-6">Send another inquiry</button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card-sethi p-6 md:p-8 grid gap-5 md:grid-cols-2">
      <div>
        <label className="block text-sm font-medium mb-1.5">Full Name *</label>
        <input value={form.name} onChange={(e) => update('name', e.target.value)} className="input-sethi" placeholder="e.g. Rajbir Singh" />
        {errors.name && <p className="text-red-600 text-xs mt-1">{errors.name}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium mb-1.5">Phone Number *</label>
        <input type="tel" value={form.phone} onChange={(e) => update('phone', e.target.value.replace(/\D/g, '').slice(0, 10))} className="input-sethi" placeholder="10-digit mobile number" inputMode="numeric" maxLength={10} />
        {errors.phone && <p className="text-red-600 text-xs mt-1">{errors.phone}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium mb-1.5">City *</label>
        <input value={form.city} onChange={(e) => update('city', e.target.value)} className="input-sethi" placeholder="e.g. Jalandhar" />
        {errors.city && <p className="text-red-600 text-xs mt-1">{errors.city}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium mb-1.5">I&apos;m interested in *</label>
        <select value={form.productInterest} onChange={(e) => update('productInterest', e.target.value)} className="input-sethi">
          <option value="">Select an option</option>
          {PRODUCT_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        {errors.productInterest && <p className="text-red-600 text-xs mt-1">{errors.productInterest}</p>}
      </div>
      <div className="md:col-span-2">
        <label className="block text-sm font-medium mb-1.5">Message *</label>
        <textarea value={form.message} onChange={(e) => update('message', e.target.value)} rows={4} className="input-sethi !min-h-[120px] py-3" placeholder="Tell us what you're looking for..." />
        {errors.message && <p className="text-red-600 text-xs mt-1">{errors.message}</p>}
      </div>

      <div className="md:col-span-2">
        <label className="flex items-start gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={form.whatsappConsent}
            onChange={(e) => update('whatsappConsent', e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-sethi-gold shrink-0"
          />
          <span className="text-sm text-sethi-gray500">I agree to be contacted on WhatsApp regarding this inquiry.</span>
        </label>
      </div>

      <div className="md:col-span-2">
        <div className="flex items-center gap-4 my-2">
          <div className="flex-1 h-px bg-sethi-gray200" />
          <span className="text-xs uppercase tracking-[0.2em] text-sethi-gray500">Prefer to chat directly?</span>
          <div className="flex-1 h-px bg-sethi-gray200" />
        </div>
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full inline-flex items-center justify-center gap-2 min-h-[52px] px-8 py-3 bg-[#25D366] hover:bg-[#1fb858] text-white font-semibold rounded-[2px] transition-all hover:scale-[1.01]"
        >
          <MessageCircle className="w-5 h-5" /> WhatsApp Us Now
        </a>
        <div className="flex items-center gap-4 my-4">
          <div className="flex-1 h-px bg-sethi-gray200" />
          <span className="text-xs uppercase tracking-[0.2em] text-sethi-gray500">— or —</span>
          <div className="flex-1 h-px bg-sethi-gray200" />
        </div>
        <button type="submit" disabled={busy} className="btn-primary w-full">
          {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</> : <><Send className="w-4 h-4" /> Send Inquiry</>}
        </button>
      </div>
    </form>
  );
}
