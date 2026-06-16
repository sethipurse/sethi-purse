'use client';
import { useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { ArrowUp, Home } from 'lucide-react';
import Link from 'next/link';

export default function BackToTop() {
  const pathname = usePathname() || '';
  const [show, setShow] = useState(false);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(() => {
        const currentY = window.scrollY;
        const scrollingDown = currentY > lastScrollY.current;
        const pastTop = currentY > 200;

        // Show only when scrolling DOWN and past 200px
        // Hide when scrolling UP or near top
        if (scrollingDown && pastTop) {
          setShow(true);
        } else {
          setShow(false);
        }

        lastScrollY.current = currentY;
        ticking.current = false;
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (pathname.startsWith('/admin')) return null;

  const isHome = pathname === '/';

  return (
    <div style={{
      position: 'fixed',
      right: '16px',
      bottom: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      zIndex: 9997,
      transform: show ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.85)',
      opacity: show ? 1 : 0,
      pointerEvents: show ? 'auto' : 'none',
      transition: 'opacity 0.3s ease, transform 0.3s ease',
    }}>
      {/* Home button — only on non-home pages */}
      {!isHome && (
        <Link href="/" title="Go to Home" style={{
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          background: '#2c1f14',
          color: '#c9a84c',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          textDecoration: 'none',
          gap: '2px',
          WebkitTapHighlightColor: 'transparent',
          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          <Home style={{ width: '20px', height: '20px' }} />
          <span style={{ fontSize: '8px', fontWeight: 800, letterSpacing: '0.05em' }}>HOME</span>
        </Link>
      )}

      {/* Back to top button */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Back to top"
        title="Back to top"
        style={{
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          background: '#c9a84c',
          color: '#2c1f14',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(201,168,76,0.5)',
          border: 'none',
          cursor: 'pointer',
          gap: '2px',
          WebkitTapHighlightColor: 'transparent',
          touchAction: 'manipulation',
          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'scale(1.1)';
          e.currentTarget.style.boxShadow = '0 6px 24px rgba(201,168,76,0.7)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 4px 20px rgba(201,168,76,0.5)';
        }}
      >
        <ArrowUp style={{ width: '20px', height: '20px', strokeWidth: 2.5 }} />
        <span style={{ fontSize: '8px', fontWeight: 800, letterSpacing: '0.05em' }}>TOP</span>
      </button>
    </div>
  );
}
