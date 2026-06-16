'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ArrowUp } from 'lucide-react';

export default function BackToTop() {
  const pathname = usePathname() || '';
  const [show, setShow] = useState(false);

  useEffect(() => {
    let lastY = window.scrollY;
    let lastTime = Date.now();
    let raf;

    const check = () => {
      const y = window.scrollY;
      const now = Date.now();

      if (y !== lastY) {
        // Still scrolling — hide
        lastY = y;
        lastTime = now;
        setShow(false);
      } else if (now - lastTime > 200 && y > 50) {
        // Scroll stopped 200ms ago and not at top — show
        setShow(true);
      } else if (y <= 50) {
        setShow(false);
      }

      raf = requestAnimationFrame(check);
    };

    raf = requestAnimationFrame(check);
    return () => cancelAnimationFrame(raf);
  }, []);

  if (pathname.startsWith('/admin')) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Back to top"
      style={{
        position: 'fixed',
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
        transition: 'opacity 0.2s ease, transform 0.2s ease',
      }}
    >
      <ArrowUp style={{ width: '22px', height: '22px', strokeWidth: 2.5 }} />
    </button>
  );
}
