'use client';
import { useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { ArrowUp } from 'lucide-react';

export default function BackToTop() {
  const pathname = usePathname() || '';
  const [show, setShow] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    const onScroll = () => {
      setShow(false);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setShow(true), 100);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      clearTimeout(timer.current);
    };
  }, []);

  if (pathname.startsWith('/admin')) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Back to top"
      className="back-to-top-btn"
      style={{
        // TRUE FAB: fixed to viewport, never tied to scroll position or page layout.
        position: 'fixed',
        left: '16px',
        zIndex: 9996,
        width: '44px',
        height: '44px',
        borderRadius: '50%',
        background: '#c9a84c',
        color: '#2c1f14',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 16px rgba(201,168,76,0.45)',
        border: 'none',
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation',
        opacity: show ? 1 : 0,
        transform: show ? 'scale(1)' : 'scale(0.7)',
        pointerEvents: show ? 'auto' : 'none',
        transition: 'opacity 0.15s ease, transform 0.15s ease',
      }}
    >
      <ArrowUp style={{ width: '22px', height: '22px', strokeWidth: 2.5 }} />
      <style>{`
        /* Mobile: clear the MobileStickyCTA bar (~64px tall) */
        .back-to-top-btn {
          bottom: 76px;
        }
        /* Desktop: no sticky bar exists */
        @media (min-width: 768px) {
          .back-to-top-btn {
            bottom: 20px;
          }
        }
      `}</style>
    </button>
  );
}
