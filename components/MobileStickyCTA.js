'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { MessageCircle, ShoppingBag, Home } from 'lucide-react';
import { cartTotal, getWALinkForPath } from '@/lib/constants';

function useCartSummary() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    const read = () => {
      try {
        const cart = JSON.parse(localStorage.getItem('sethi-cart') || '[]');
        setItems(Array.isArray(cart) ? cart : []);
      } catch { setItems([]); }
    };
    read();
    window.addEventListener('storage', read);
    window.addEventListener('cart-updated', read);
    return () => {
      window.removeEventListener('storage', read);
      window.removeEventListener('cart-updated', read);
    };
  }, []);
  const count = items.reduce((s, i) => s + Math.max(1, Number(i.qty || 1)), 0);
  return { count, total: cartTotal(items) };
}

export default function MobileStickyCTA() {
  const pathname = usePathname() || '';
  const { count, total } = useCartSummary();
  if (pathname.startsWith('/admin')) return null;

  const isHome = pathname === '/';
  const openCart = () => window.dispatchEvent(new Event('open-cart'));

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9997] grid gap-1 border-t border-[#ede8df] bg-white p-2 shadow-[0_-8px_24px_rgba(44,31,20,0.12)] md:hidden"
      style={{ gridTemplateColumns: isHome ? '1fr 1fr 1fr' : '1fr 1fr 1fr 1fr' }}>

      {/* Home — only on non-home pages */}
      {!isHome && (
        <Link href="/" className="flex h-12 items-center justify-center gap-1 rounded bg-[#f5f0e8] text-xs font-bold text-[#2c1f14]">
          <Home className="h-4 w-4 text-[#c9a84c]" /> Home
        </Link>
      )}

      <Link href="/products" className="flex h-12 items-center justify-center gap-1 rounded bg-[#2c1f14] text-xs font-bold text-white">
        <ShoppingBag className="h-4 w-4" /> Products
      </Link>

      <button type="button" onClick={openCart} aria-label="Open cart"
        className="relative flex h-12 items-center justify-center gap-1 rounded bg-[#f5f0e8] text-xs font-bold text-[#2c1f14]">
        <ShoppingBag className="h-4 w-4 text-[#c9a84c]" /> Cart
        {count > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#c9a84c] px-1 text-[10px] font-bold text-[#2c1f14]">
            {count}
          </span>
        )}
      </button>

      {count > 0 ? (
        <button type="button" onClick={openCart}
          className="flex h-12 flex-col items-center justify-center gap-0 rounded bg-[#25D366] px-1 font-bold leading-tight text-white">
          <span className="flex items-center gap-1 text-[11px]"><MessageCircle className="h-3.5 w-3.5" /> Order Now</span>
          <span className="text-[10px] opacity-90">Rs.{total.toLocaleString('en-IN')}</span>
        </button>
      ) : (
        <a href={getWALinkForPath(pathname)} target="_blank" rel="noopener noreferrer"
          className="flex h-12 items-center justify-center gap-1 rounded bg-[#25D366] text-xs font-bold text-white">
          <MessageCircle className="h-4 w-4" /> WhatsApp
        </a>
      )}
    </div>
  );
}
