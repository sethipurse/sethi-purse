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
      // User is scrolling — HIDE button
      setShow(false);

      // Clear previous timer
      if (timerRef.current) clearTimeout(timerRef.current);

      // User stopped scrolling — SHOW button after 600ms
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

  const isHome = pathname === '/';

  return (
    <div style={{
      position: 'fixed',
      right: '16px',
      bottom: '24px',
      zIndex: 9997,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      opacity: show ? 1 : 0,
      transform: show ? 'scale(1)' : 'scale(0.8)',
      pointerEvents: show ? 'auto' : 'none',
      transition: 'opacity 0.25s ease, transform 0.25s ease',
    }}>
      {!isHome && (
        <Link href="/" style={{
          width: '52px', height: '52px',
          borderRadius: '50%',
          background: '#2c1f14',
          color: '#c9a84c',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
          textDecoration: 'none', gap: '2px',
          WebkitTapHighlightColor: 'transparent',
        }}>
          <Home style={{ width: '20px', height: '20px' }} />
          <span style={{ fontSize: '8px', fontWeight: 800 }}>HOME</span>
        </Link>
      )}

      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Back to top"
        style={{
          width: '52px', height: '52px',
          borderRadius: '50%',
          background: '#c9a84c',
          color: '#2c1f14',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(201,168,76,0.5)',
          border: 'none', cursor: 'pointer', gap: '2px',
          WebkitTapHighlightColor: 'transparent',
          touchAction: 'manipulation',
        }}>
        <ArrowUp style={{ width: '20px', height: '20px', strokeWidth: 2.5 }} />
        <span style={{ fontSize: '8px', fontWeight: 800 }}>TOP</span>
      </button>
    </div>
  );
}
