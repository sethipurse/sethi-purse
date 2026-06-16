'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ArrowUp, Home } from 'lucide-react';
import Link from 'next/link';

export default function BackToTop() {
  const pathname = usePathname() || '';
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 300);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (pathname.startsWith('/admin')) return null;

  const isHome = pathname === '/';

  if (!show) return null;

  return (
    <div style={{
      position: 'fixed',
      right: '16px',
      top: '50%',
      transform: 'translateY(-50%)',
      zIndex: 9997,
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
    }}>
      {/* Home button — only on non-home pages */}
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
          <span style={{ fontSize: '8px', fontWeight: 700, letterSpacing: '0.05em' }}>HOME</span>
        </Link>
      )}

      {/* Scroll to top */}
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
        <span style={{ fontSize: '8px', fontWeight: 700, letterSpacing: '0.05em' }}>TOP</span>
      </button>
    </div>
  );
}
