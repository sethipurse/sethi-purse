'use client';

import { useEffect, useState } from 'react';
import { Bell, Download } from 'lucide-react';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export default function PWAInstall() {
  const [prompt, setPrompt] = useState(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => null);
    }
    const onPrompt = (event) => {
      event.preventDefault();
      setPrompt(event);
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  const install = async () => {
    if (!prompt) return;
    prompt.prompt();
    await prompt.userChoice.catch(() => null);
    setShow(false);
  };

  const enablePush = async () => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const registration = await navigator.serviceWorker.ready;
    if (vapidKey && registration.pushManager) {
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription }),
      }).catch(() => null);
    } else {
      new Notification('SETHI PURSE', { body: 'Notifications enabled for new arrivals and offers.' });
    }
  };

  if (!show) {
    return (
      <button type="button" onClick={enablePush} className="fixed bottom-24 right-5 z-[9998] hidden rounded-full bg-white p-3 text-[#c9a84c] shadow-lg ring-1 ring-[#ede8df] md:inline-flex" title="Enable notifications">
        <Bell className="h-5 w-5" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-24 left-4 right-4 z-[9998] mx-auto max-w-sm rounded bg-white p-4 shadow-xl ring-1 ring-[#ede8df] md:left-auto md:right-5">
      <div className="text-lg font-bold text-[#2c1f14]">Install SETHI PURSE</div>
      <p className="mt-1 text-sm text-[#6b5544]">Shop faster, get new arrivals, offer alerts, and cart reminders.</p>
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={install} className="inline-flex flex-1 items-center justify-center gap-2 rounded bg-[#c9a84c] px-4 py-2 font-bold text-white">
          <Download className="h-4 w-4" /> Install
        </button>
        <button type="button" onClick={() => setShow(false)} className="rounded border border-[#ede8df] px-4 py-2 font-semibold text-[#6b5544]">Later</button>
      </div>
    </div>
  );
}
