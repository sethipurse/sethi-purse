'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessageCircle, ShoppingBag } from 'lucide-react';
import { getWALinkForPath } from '@/lib/constants';

export default function MobileStickyCTA() {
  const pathname = usePathname() || '';
  if (pathname.startsWith('/admin')) return null;
  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9997] grid grid-cols-2 border-t border-[#ede8df] bg-white p-2 shadow-[0_-8px_24px_rgba(44,31,20,0.12)] md:hidden">
      <Link href="/products" className="flex h-12 items-center justify-center gap-2 rounded bg-[#2c1f14] font-bold text-white">
        <ShoppingBag className="h-4 w-4" /> Products
      </Link>
      <a href={getWALinkForPath(pathname)} target="_blank" rel="noopener noreferrer" className="ml-2 flex h-12 items-center justify-center gap-2 rounded bg-[#25D366] font-bold text-white">
        <MessageCircle className="h-4 w-4" /> WhatsApp
      </a>
    </div>
  );
}
