'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ArrowUp, Home } from 'lucide-react';
import Link from 'next/link';

export default function BackToTop() {
  const pathname = usePathname() || '';
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 400);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (pathname.startsWith('/admin')) return null;

  const scrollUp = () => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const isHome = pathname === '/';

  return (
    <div className={`fixed bottom-20 md:bottom-5 left-5 z-[9997] flex flex-col gap-2 transition-all duration-300 ${show ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-2 pointer-events-none'}`}>

      {/* Home button — only show on non-home pages */}
      {!isHome && (
        <Link
          href="/"
          aria-label="Go to home"
          title="Go to home"
          className="w-11 h-11 rounded-full bg-[#2c1f14] text-[#c9a84c] flex items-center justify-center shadow-[0_4px_16px_rgba(0,0,0,0.18)] transition-all duration-300 hover:bg-[#c9a84c] hover:text-[#2c1f14] hover:scale-110"
        >
          <Home className="w-5 h-5" strokeWidth={2} />
        </Link>
      )}

      {/* Back to top button */}
      <button
        onClick={scrollUp}
        aria-label="Back to top"
        title="Back to top"
        className="w-11 h-11 rounded-full bg-sethi-gold text-sethi-black flex items-center justify-center shadow-[0_4px_16px_rgba(0,0,0,0.18)] transition-all duration-300 hover:bg-sethi-gold-dark hover:scale-110"
      >
        <ArrowUp className="w-5 h-5" strokeWidth={2.5} />
      </button>

    </div>
  );
}
