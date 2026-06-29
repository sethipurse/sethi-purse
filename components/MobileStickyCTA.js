'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessageCircle, ShoppingBag, Home } from 'lucide-react';
import { getWALinkForPath } from '@/lib/constants';

export default function MobileStickyCTA() {
  const pathname = usePathname() || '';
  if (pathname.startsWith('/admin')) return null;

  const isHome = pathname === '/';

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9997] grid border-t border-sethi-gray200 bg-sethi-card p-2 shadow-[0_-8px_24px_rgba(44,31,20,0.12)] md:hidden"
      style={{ gridTemplateColumns: isHome ? '1fr 1fr' : '1fr 1fr 1fr' }}>

      {/* Home — only on non-home pages */}
      {!isHome && (
        <Link href="/" className="flex h-12 items-center justify-center gap-1.5 rounded bg-sethi-ivory font-bold text-sethi-black">
          <Home className="h-4 w-4 text-sethi-gold" /> Home
        </Link>
      )}

      <Link href="/products"
        className={`flex h-12 items-center justify-center gap-1.5 rounded bg-sethi-black font-bold text-white ${!isHome ? 'mx-1' : ''}`}>
        <ShoppingBag className="h-4 w-4" /> Products
      </Link>

      <a href={getWALinkForPath(pathname)} target="_blank" rel="noopener noreferrer"
        className="flex h-12 items-center justify-center gap-1.5 rounded bg-[#25D366] font-bold text-white">
        <MessageCircle className="h-4 w-4" /> WhatsApp
      </a>
    </div>
  );
}
