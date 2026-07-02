'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Menu, X, MessageCircle, ShoppingBag } from 'lucide-react';
import { LOGO_URL, BUSINESS, getWALinkForPath } from '@/lib/constants';
import Portal from '@/components/Portal';

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
        setCount(Array.isArray(cart) ? cart.reduce((s, i) => s + Math.max(1, Number(i.qty || 1)), 0) : 0);
      } catch { setCount(0); }
    };
    read();
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

  // Lock body scroll when menu open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
    } else {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    };
  }, [open]);

  const waLink = getWALinkForPath(pathname);
  const isHome = pathname === '/';

  return (
    <>
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

          {/* Desktop right */}
          <div className="hidden lg:flex items-center gap-3">
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

          {/* Mobile right */}
          <div className="flex items-center gap-1 lg:hidden">
            <a href={waLink} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"
              className="inline-flex items-center justify-center w-12 h-12 rounded-full text-sethi-gold active:bg-sethi-gold/10">
              <MessageCircle className="w-6 h-6" />
            </a>
            {!isHome && (
              <Link href="/#products" aria-label="Cart"
                className="relative inline-flex items-center justify-center w-12 h-12 rounded-full text-sethi-gold active:bg-sethi-gold/10">
                <ShoppingBag className="w-6 h-6" />
                {cartCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-sethi-gold text-[#2c1f14] text-[11px] font-bold flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </Link>
            )}
            <button aria-label="Open menu" onClick={() => setOpen(true)}
              className="inline-flex items-center justify-center w-12 h-12 rounded-full text-sethi-gold active:bg-sethi-gold/10">
              <Menu className="w-7 h-7" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu — portaled to document.body so it always renders above the WhatsApp FAB, back-to-top button, and sticky bottom nav */}
      {open && (
        <Portal>
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 99998,
            backgroundColor: '#2c1f14',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64, padding: '0 16px', borderBottom: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO_URL} alt={BUSINESS.name} style={{ height: 36, objectFit: 'contain', background: 'white', padding: 2, borderRadius: 2 }} />
            <button
              onClick={() => setOpen(false)}
              style={{ width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c9a84c', borderRadius: '50%', background: 'transparent', border: 'none', cursor: 'pointer' }}
              aria-label="Close menu"
            >
              <X style={{ width: 28, height: 28 }} />
            </button>
          </div>

          {/* Nav links */}
          <nav style={{ flex: 1, padding: '32px 24px', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
            {LINKS.map((l) => {
              const active = pathname === l.href || (l.href !== '/' && pathname.startsWith(l.href)) || (l.href === '/categories' && pathname.startsWith('/category'));
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  style={{
                    fontSize: 28,
                    fontFamily: 'Georgia, serif',
                    fontWeight: 600,
                    padding: '16px 0',
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    color: active ? '#c9a84c' : '#ffffff',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  {l.label}
                  {active && <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#c9a84c', flexShrink: 0 }} />}
                </Link>
              );
            })}
          </nav>

          {/* Bottom CTA */}
          <div style={{ padding: '24px', flexShrink: 0 }}>
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                width: '100%',
                minHeight: 56,
                backgroundColor: '#c9a84c',
                color: '#2c1f14',
                fontWeight: 700,
                fontSize: 16,
                borderRadius: 2,
                textDecoration: 'none',
              }}
            >
              <MessageCircle style={{ width: 20, height: 20 }} /> WhatsApp Us Now
            </a>
            <p style={{ marginTop: 16, textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>{BUSINESS.phone}</p>
          </div>
        </div>
        </Portal>
      )}
    </>
  );
}
