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

  const isHome = pathname === '/';

  return (
    <div
      className={`fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-[9997] flex items-center gap-2 transition-all duration-300 ${
        show ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'
      }`}
    >
      {/* Home pill — only on non-home pages */}
      {!isHome && (
        <Link
          href="/"
          className="flex items-center gap-1.5 bg-[#2c1f14] text-[#c9a84c] px-4 py-2.5 rounded-full shadow-lg text-sm font-semibold hover:bg-[#c9a84c] hover:text-[#2c1f14] transition-all duration-200 active:scale-95"
        >
          <Home className="w-4 h-4" />
          <span>Home</span>
        </Link>
      )}

      {/* Scroll to top pill */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Back to top"
        className="flex items-center gap-1.5 bg-[#c9a84c] text-[#2c1f14] px-4 py-2.5 rounded-full shadow-lg text-sm font-semibold hover:bg-[#a07a28] hover:text-white transition-all duration-200 active:scale-95"
      >
        <ArrowUp className="w-4 h-4" strokeWidth={2.5} />
        <span>Top</span>
      </button>
    </div>
  );
}
