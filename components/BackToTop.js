'use client';
import { useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { ArrowUp } from 'lucide-react';

export default function BackToTop() {
  const pathname = usePathname() || '';
  const [show, setShow] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    const onScroll = () => {
      setShow(false);
      if (timerRef.current) clearTimeout(timerRef.current);
      // Show when stopped — hide when at very top (< 50px)
      timerRef.current = setTimeout(() => {
        setShow(true);
      }, 600);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (pathname.startsWith('/admin')) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Back to top"
      style={{
        position: 'fixed',
        // Mobile: above the sticky CTA bar (56px) + gap. Desktop: above WhatsApp (56px) + gap
        bottom: '80px',
        right: '16px',
        zIndex: 9997,
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
        transition: 'opacity 0.25s ease, transform 0.25s ease',
      }}
    >
      <ArrowUp style={{ width: '20px', height: '20px', strokeWidth: 2.5 }} />
    </button>
  );
}
