'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Menu, X, MessageCircle, ShoppingBag } from 'lucide-react';
import { LOGO_URL, BUSINESS, getWALinkForPath } from '@/lib/constants';

const LINKS = [
  { href: '/', label: 'Home' },
  { href: '/products', label: 'Products' },
  { href: '/categories', label: 'Categories' },
  { href: '/offers', label: 'Offers' },
  { href: '/reviews', label: 'Reviews' },
  { href: '/contact', label: 'Contact' },
];

function useCartCount() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const read = () => {
      try {
        const cart = JSON.parse(localStorage.getItem('sethi-cart') || '[]');
        setCount(Array.isArray(cart) ? cart.length : 0);
      } catch { setCount(0); }
    };
    read();
    // Update on storage change (other tabs) and custom event (same tab)
    window.addEventListener('storage', read);
    window.addEventListener('cart-updated', read);
    return () => {
      window.removeEventListener('storage', read);
      window.removeEventListener('cart-updated', read);
    };
  }, []);
  return count;
}

export default function Navbar() {
  const pathname = usePathname() || '/';
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const cartCount = useCartCount();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 6);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const waLink = getWALinkForPath(pathname);
  const isHome = pathname === '/';

  return (
    <header className={`sticky top-0 z-40 bg-white border-b border-sethi-gray200 transition-shadow ${scrolled ? 'shadow-[0_2px_12px_rgba(0,0,0,0.06)]' : ''}`}>
      <div className="container-sethi h-16 md:h-20 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO_URL} alt={BUSINESS.name} className="h-10 md:h-12 object-contain" />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-6 xl:gap-8">
          {LINKS.map((l) => {
            const active = pathname === l.href || (l.href !== '/' && pathname.startsWith(l.href)) || (l.href === '/categories' && pathname.startsWith('/category'));
            return (
              <Link key={l.href} href={l.href} className={`nav-link ${active ? '!text-sethi-gold' : ''}`}>{l.label}</Link>
            );
          })}
        </nav>

        {/* Desktop right side */}
        <div className="hidden lg:flex items-center gap-3">
          {/* Cart icon — only show on non-home pages since home has its own */}
          {!isHome && (
            <Link href="/#products" className="relative inline-flex items-center justify-center w-11 h-11 text-sethi-gold hover:text-[#a07a28] transition-colors">
              <ShoppingBag className="w-6 h-6" />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-sethi-gold text-[#2c1f14] text-[11px] font-bold flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>
          )}
          <a href={waLink} target="_blank" rel="noopener noreferrer" className="btn-primary !min-h-[44px] !px-5 !py-2 text-sm">
            <MessageCircle className="w-4 h-4" /> WhatsApp Us
          </a>
        </div>

        {/* Mobile right side */}
        <div className="flex items-center gap-1 lg:hidden">
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="WhatsApp"
            className="inline-flex items-center justify-center w-12 h-12 rounded-full text-sethi-gold active:bg-sethi-gold/10"
          >
            <MessageCircle className="w-6 h-6" />
          </a>
          {/* Cart icon on mobile — only non-home pages */}
          {!isHome && (
            <Link
              href="/#products"
              aria-label="Cart"
              className="relative inline-flex items-center justify-center w-12 h-12 rounded-full text-sethi-gold active:bg-sethi-gold/10"
            >
              <ShoppingBag className="w-6 h-6" />
              {cartCount > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-sethi-gold text-[#2c1f14] text-[11px] font-bold flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>
          )}
          <button
            aria-label="Open menu"
            onClick={() => setOpen(true)}
            className="inline-flex items-center justify-center w-12 h-12 rounded-full text-sethi-gold active:bg-sethi-gold/10"
          >
            <Menu className="w-7 h-7" />
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <div className={`fixed inset-0 z-50 bg-sethi-black text-white transition-transform duration-300 lg:hidden ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between h-16 px-4 border-b border-white/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO_URL} alt={BUSINESS.name} className="h-9 object-contain bg-white p-0.5 rounded-sm" />
          <button
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="w-12 h-12 inline-flex items-center justify-center text-sethi-gold active:bg-white/10 rounded-full"
          >
            <X className="w-7 h-7" />
          </button>
        </div>

        <div className="px-6 pt-8 pb-10 flex flex-col overflow-y-auto h-[calc(100vh-4rem)]">
          <nav className="flex flex-col">
            {LINKS.map((l) => {
              const active = pathname === l.href || (l.href !== '/' && pathname.startsWith(l.href)) || (l.href === '/categories' && pathname.startsWith('/category'));
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className={`font-serif text-[28px] leading-tight py-4 border-b border-white/10 flex items-center justify-between
                    ${active ? 'text-sethi-gold' : 'text-white active:text-sethi-gold'}`}
                >
                  {l.label}
                  {active && <span className="w-2 h-2 rounded-full bg-sethi-gold" />}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto pt-8">
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="btn-primary w-full !min-h-[56px] text-base"
            >
              <MessageCircle className="w-5 h-5" /> WhatsApp Us Now
            </a>
            <p className="mt-4 text-center text-white/40 text-sm">{BUSINESS.phone}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
