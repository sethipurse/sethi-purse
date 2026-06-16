'use client';
import { useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { ArrowUp, Home } from 'lucide-react';
import Link from 'next/link';

export default function BackToTop() {
  const pathname = usePathname() || '';
  const [show, setShow] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    const onScroll = () => {
      // Hide immediately when scrolling starts
      setShow(false);

      // Clear previous timer
      if (timerRef.current) clearTimeout(timerRef.current);

      // Show after user stops scrolling for 800ms
      // Only show if scrolled past 300px
      timerRef.current = setTimeout(() => {
        if (window.scrollY > 300) setShow(true);
      }, 800);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (pathname.startsWith('/admin')) return null;

  const isHome = pathname === '/';

  return (
    <div style={{
      position: 'fixed',
      right: '16px',
      top: '50%',
      transform: show ? 'translateY(-50%) scale(1)' : 'translateY(-50%) scale(0.7)',
      opacity: show ? 1 : 0,
      pointerEvents: show ? 'auto' : 'none',
      zIndex: 9997,
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      transition: 'opacity 0.25s ease, transform 0.25s ease',
    }}>
      {/* Home — only on non-home pages */}
      {!isHome && (
        <Link href="/" style={{
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          background: '#2c1f14',
          color: '#c9a84c',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
          textDecoration: 'none',
          gap: '2px',
        }}>
          <Home style={{ width: '18px', height: '18px' }} />
          <span style={{ fontSize: '8px', fontWeight: 700 }}>HOME</span>
        </Link>
      )}

      {/* Top */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Back to top"
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          background: '#c9a84c',
          color: '#2c1f14',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
          border: 'none',
          cursor: 'pointer',
          gap: '2px',
        }}>
        <ArrowUp style={{ width: '18px', height: '18px', strokeWidth: 2.5 }} />
        <span style={{ fontSize: '8px', fontWeight: 700 }}>TOP</span>
      </button>
    </div>
  );
}
