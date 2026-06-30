'use client';

import { useState } from 'react';
import AdminShell from '@/components/AdminShell';
import { Bell, Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';

const PRESETS = [
  { title: 'New arrivals', message: 'Fresh bags and luggage have just arrived at SETHI PURSE.', url: '/products' },
  { title: '50% off today', message: 'Today only: explore selected premium bags at special prices.', url: '/offers' },
  { title: 'Your cart is waiting', message: 'Your selected products are still waiting for you.', url: '/products' },
];

export default function NotificationsPage() {
  const [form, setForm] = useState(PRESETS[0]);
  const [busy, setBusy] = useState(false);

  const send = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      const res = await fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || 'Could not send notification');
        return;
      }
      toast.success(`Notification sent to ${data.sent || 0} subscribers`);
    } catch (error) {
      toast.error('Notification send failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminShell>
      <div className="max-w-3xl">
        <div className="mb-6">
          <h2 className="flex items-center gap-2 font-serif text-base font-medium"><Bell className="h-5 w-5 text-sethi-gold" /> Push notifications</h2>
          <p className="mt-2 text-sethi-gray500">Send powerful alerts like new arrivals, flash offers, and cart reminders. Requires VAPID keys in Vercel env.</p>
        </div>
        <div className="mb-5 grid gap-3 md:grid-cols-3">
          {PRESETS.map((preset) => (
            <button key={preset.title} type="button" onClick={() => setForm(preset)} className="rounded-sm border border-sethi-gray200 bg-white p-4 text-left shadow-sm transition hover:border-sethi-gold hover:-translate-y-0.5">
              <div className="font-bold text-sethi-black">{preset.title}</div>
              <div className="mt-1 text-sm text-sethi-gray500">{preset.message}</div>
            </button>
          ))}
        </div>
        <form onSubmit={send} className="grid gap-4 rounded-sm border border-sethi-gray200 bg-white p-5 md:p-7">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Title</label>
            <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="input-sethi" required />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Message</label>
            <textarea value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} className="input-sethi !min-h-[110px]" required />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Click URL</label>
            <input value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))} className="input-sethi" placeholder="/products" />
          </div>
          <button type="submit" disabled={busy} className="btn-primary w-full md:w-auto">
            {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</> : <><Send className="h-4 w-4" /> Send Notification</>}
          </button>
        </form>
      </div>
    </AdminShell>
  );
}
