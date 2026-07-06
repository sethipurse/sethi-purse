'use client';
import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { DEALS_ALERT_LABEL, DEALS_ALERT_ON_LABEL } from '@/lib/constants';

const STORAGE_KEY = 'sethi-deals-alert';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

// Optional `product` — when present (product detail page) also logs a
// lightweight demand signal so the owner knows which product's price people
// actually want alerts on; omitted on the offers page (general alert only).
export default function DealsAlertButton({ product }) {
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const ok = typeof window !== 'undefined'
      && 'serviceWorker' in navigator
      && 'PushManager' in window
      && 'Notification' in window;
    if (!ok || Notification.permission === 'denied') { setSupported(false); return; }
    setSupported(true);
    try {
      if (window.localStorage.getItem(STORAGE_KEY) === '1') setEnabled(true);
    } catch {}
  }, []);

  const logDemand = () => {
    if (!product) return;
    fetch('/api/inquiries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Deals Alert',
        phone: '0000000000',
        city: 'Jalandhar',
        productInterest: product.name,
        message: `Price/deal alert interest: ${product.name} (id ${product.id})`,
      }),
    }).catch(() => {});
  };

  const subscribe = async () => {
    if (busy || enabled) return;
    setBusy(true);
    logDemand(); // fire-and-forget — never blocks the subscribe flow

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') { setBusy(false); return; }

      // Reuses the service worker PWAInstall.js already registers on every
      // page — re-registering the same script/scope is a safe no-op, not a
      // duplicate worker.
      await navigator.serviceWorker.register('/sw.js').catch(() => {});
      const registration = await navigator.serviceWorker.ready;

      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!publicKey) { setBusy(false); return; }
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription }),
      });

      try { window.localStorage.setItem(STORAGE_KEY, '1'); } catch {}
      setEnabled(true);
    } catch {
      // silently fail — button just stays in the default state
    } finally {
      setBusy(false);
    }
  };

  if (!supported) return null;

  if (enabled) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f5f0e8] px-4 py-2 text-sm font-bold text-[#a07a28]">
        {DEALS_ALERT_ON_LABEL}
      </span>
    );
  }

  return (
    <button type="button" onClick={subscribe} disabled={busy}
      className="inline-flex items-center gap-1.5 rounded-full border border-[#c9a84c] bg-white px-4 py-2 text-sm font-bold text-[#a07a28] transition hover:bg-[#f5f0e8] disabled:opacity-60">
      <Bell className="h-4 w-4" /> {busy ? '…' : DEALS_ALERT_LABEL}
    </button>
  );
}
