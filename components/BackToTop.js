'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ArrowUp, Home, ArrowLeft } from 'lucide-react';
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
  if (pathname === '/') return (
    // On home page — only show scroll to top, no home bar
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Back to top"
      className={`fixed bottom-20 md:bottom-5 left-5 z-[9997] w-11 h-11 rounded-full bg-sethi-gold text-sethi-black flex items-center justify-center shadow-[0_4px_16px_rgba(0,0,0,0.18)] transition-all duration-300 hover:bg-sethi-gold-dark hover:scale-110 ${show ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-2 pointer-events-none'}`}
    >
      <ArrowUp className="w-5 h-5" strokeWidth={2.5} />
    </button>
  );

  return (
    <>
      {/* ── Sticky "Go to Home" bar — appears at top when scrolled down ── */}
      <div
        className={`fixed top-0 left-0 right-0 z-[9996] transition-all duration-300 ${
          show ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full pointer-events-none'
        }`}
      >
        <div className="flex items-center justify-between bg-[#2c1f14] px-4 py-2.5 shadow-lg">
          <Link
            href="/"
            className="flex items-center gap-2 text-[#c9a84c] font-semibold text-sm hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <Home className="w-4 h-4" />
            <span>Back to Home</span>
          </Link>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-1.5 text-white/70 text-sm hover:text-[#c9a84c] transition-colors"
          >
            <ArrowUp className="w-4 h-4" />
            <span>Top</span>
          </button>
        </div>
      </div>

      {/* ── Fixed scroll to top button (bottom left) ── */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Back to top"
        className={`fixed bottom-20 md:bottom-5 left-5 z-[9997] w-11 h-11 rounded-full bg-sethi-gold text-sethi-black flex items-center justify-center shadow-[0_4px_16px_rgba(0,0,0,0.18)] transition-all duration-300 hover:bg-sethi-gold-dark hover:scale-110 ${
          show ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-2 pointer-events-none'
        }`}
      >
        <ArrowUp className="w-5 h-5" strokeWidth={2.5} />
      </button>
    </>
  );
}
