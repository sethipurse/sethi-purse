'use client';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { X } from 'lucide-react';
import DecideForMeModal from '@/components/DecideForMeModal';

// Same trigger rule as WhatsAppFloat and BackToTop (both use a 150px
// threshold) so all three floating widgets show/hide in sync: hidden at
// the top or while actively scrolling, and appear together once the user
// has scrolled past the threshold and paused.
const SCROLL_THRESHOLD = 150;
const SETTLE_DELAY_MS = 200;

export default function DecideForMeTeaser() {
  const pathname = usePathname() || '';
  const isAdmin = pathname.startsWith('/admin');
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const scrollTimerRef = useRef(null);

  useEffect(() => {
    if (isAdmin || dismissed) return;

    const onScroll = () => {
      if (window.scrollY < SCROLL_THRESHOLD) {
        setVisible(false);
        clearTimeout(scrollTimerRef.current);
        return;
      }
      setVisible(false);
      clearTimeout(scrollTimerRef.current);
      scrollTimerRef.current = setTimeout(() => {
        if (window.scrollY >= SCROLL_THRESHOLD) setVisible(true);
      }, SETTLE_DELAY_MS);
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
      clearTimeout(scrollTimerRef.current);
    };
  }, [isAdmin, dismissed]);

  if (isAdmin || dismissed) return null;

  return (
    <>
      <div
        role="button"
        tabIndex={visible ? 0 : -1}
        onClick={() => { setVisible(false); setModalOpen(true); }}
        onKeyDown={(e) => { if (e.key === 'Enter') { setVisible(false); setModalOpen(true); } }}
        aria-hidden={!visible}
        className="dfm-teaser"
        style={{
          position: 'fixed',
          left: '50%',
          top: visible ? 'max(14px, env(safe-area-inset-top))' : '-140px',
          transform: 'translateX(-50%)',
          zIndex: 99990,
          width: 'calc(100% - 32px)',
          maxWidth: 380,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: 'radial-gradient(ellipse at 25% 20%, #2a1152, #0c0520 70%)',
          border: '1px solid rgba(160,80,255,0.45)',
          borderRadius: 16,
          padding: '12px 12px 12px 14px',
          boxShadow: '0 14px 44px rgba(80,20,200,0.5), 0 0 0 1px rgba(140,60,255,0.1)',
          cursor: 'pointer',
          transition: 'top 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          pointerEvents: visible ? 'auto' : 'none',
        }}
      >
        <span style={{ fontSize: 24, flexShrink: 0, filter: 'drop-shadow(0 0 8px rgba(201,168,76,0.6))' }}>🤔</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 800, color: '#fff', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.3 }}>
            Confused? <span style={{
              background: 'linear-gradient(90deg,#c9a84c,#fff,#c9a84c)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>Bas best wala de do →</span>
          </div>
          <div style={{ fontSize: 11, color: 'rgba(190,160,255,0.7)', marginTop: 2, fontFamily: "'DM Sans', sans-serif" }}>
            3 sawaal — hum choose karenge aapke liye
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); setDismissed(true); }}
          aria-label="Dismiss"
          style={{
            background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: '50%',
            width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0, color: '#fff',
          }}
        >
          <X size={14} />
        </button>
      </div>

      {modalOpen && <DecideForMeModal onClose={() => setModalOpen(false)} />}
    </>
  );
}
