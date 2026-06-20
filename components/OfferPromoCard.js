'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      style={{ width: 14, height: 14 }} aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

const SESSION_KEY = 'sethi_offer_dismissed';

export default function OfferPromoCard() {
  const pathname = usePathname() || '';
  const [offer, setOffer] = useState(null);
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY) === '1') {
      setDismissed(true);
      return;
    }
    fetch('/api/offers')
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        const active = list.find((o) => o.is_active);
        if (active) setOffer(active);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!offer || dismissed) return;
    const t = setTimeout(() => setShow(true), 1400);
    return () => clearTimeout(t);
  }, [offer, dismissed]);

  function handleClose() {
    setShow(false);
    sessionStorage.setItem(SESSION_KEY, '1');
    setTimeout(() => setDismissed(true), 300);
  }

  if (pathname.startsWith('/admin')) return null;
  if (!offer || dismissed) return null;

  return (
    <div
      style={{
        position: 'fixed',
        right: 16,
        bottom: 200,
        zIndex: 99990,
        width: 220,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: '#2c1f14',
        boxShadow: '0 10px 32px rgba(44,31,20,0.4)',
        opacity: show ? 1 : 0,
        transform: show ? 'translateY(0) scale(1)' : 'translateY(24px) scale(0.92)',
        transition: 'opacity 0.35s ease, transform 0.35s ease',
        pointerEvents: show ? 'auto' : 'none',
      }}
    >
      {/* Close button */}
      <button
        onClick={handleClose}
        aria-label="Dismiss offer"
        style={{
          position: 'absolute',
          top: -10,
          right: -10,
          width: 26,
          height: 26,
          borderRadius: '50%',
          backgroundColor: '#5a5048',
          color: '#fff',
          border: '2px solid #faf8f4',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          zIndex: 1,
        }}
      >
        <CloseIcon />
      </button>

      <a
        href="/offers"
        style={{ display: 'block', textDecoration: 'none' }}
      >
        {offer.banner_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={offer.banner_url}
            alt={offer.title}
            style={{ width: '100%', height: 110, objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div style={{
            width: '100%', height: 80,
            background: 'linear-gradient(135deg, #c9a84c 0%, #a8853a 100%)',
          }} />
        )}
        <div style={{ padding: '12px 14px 14px' }}>
          <div style={{
            color: '#c9a84c', fontWeight: 800, fontSize: 15,
            fontFamily: 'system-ui, sans-serif', lineHeight: 1.25,
          }}>
            {offer.title}
          </div>
          {offer.description && (
            <div style={{
              color: 'rgba(250,248,244,0.75)', fontSize: 12, marginTop: 4,
              fontFamily: 'system-ui, sans-serif', lineHeight: 1.4,
            }}>
              {offer.description}
            </div>
          )}
          <div style={{
            marginTop: 10, display: 'inline-block',
            backgroundColor: '#c9a84c', color: '#2c1f14',
            fontWeight: 700, fontSize: 11.5, padding: '6px 12px',
            borderRadius: 16, fontFamily: 'system-ui, sans-serif',
          }}>
            View Offer →
          </div>
        </div>
      </a>
    </div>
  );
}
