'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Menu, X, MessageCircle } from 'lucide-react';
import { LOGO_URL, BUSINESS, getWALinkForPath } from '@/lib/constants';

const LINKS = [
  { href: '/', label: 'Home' },
  { href: '/products', label: 'Products' },
  { href: '/categories', label: 'Categories' },
  { href: '/offers', label: 'Offers' },
  { href: '/reviews', label: 'Reviews' },
  { href: '/contact', label: 'Contact' },
];

export default function Navbar() {
  const pathname = usePathname() || '/';
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

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

  return (
    <header className={`sticky top-0 z-40 bg-white border-b border-sethi-gray200 transition-shadow ${scrolled ? 'shadow-[0_2px_12px_rgba(0,0,0,0.06)]' : ''}`}>
      <div className="container-sethi h-16 md:h-20 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO_URL} alt={BUSINESS.name} className="h-10 md:h-12 object-contain" />
        </Link>

        <nav className="hidden lg:flex items-center gap-6 xl:gap-8">
          {LINKS.map((l) => {
            const active = pathname === l.href || (l.href !== '/' && pathname.startsWith(l.href));
            return (
              <Link key={l.href} href={l.href} className={`nav-link ${active ? '!text-sethi-gold' : ''}`}>{l.label}</Link>
            );
          })}
        </nav>

        <div className="hidden lg:flex items-center">
          <a href={waLink} target="_blank" rel="noopener noreferrer" className="btn-primary !min-h-[44px] !px-5 !py-2 text-sm">
            <MessageCircle className="w-4 h-4" /> WhatsApp Us
          </a>
        </div>

        <button aria-label="Open menu" onClick={() => setOpen(true)} className="lg:hidden inline-flex items-center justify-center w-11 h-11 text-sethi-gold">
          <Menu className="w-7 h-7" />
        </button>
      </div>

      <div className={`fixed inset-0 z-50 bg-sethi-black text-white transition-transform duration-300 lg:hidden ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between h-16 px-4 border-b border-white/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO_URL} alt={BUSINESS.name} className="h-9 object-contain bg-white p-0.5 rounded-sm" />
          <button aria-label="Close menu" onClick={() => setOpen(false)} className="w-11 h-11 inline-flex items-center justify-center text-sethi-gold">
            <X className="w-7 h-7" />
          </button>
        </div>
        <div className="px-6 pt-6 pb-10 flex flex-col gap-5 overflow-y-auto h-[calc(100vh-4rem)]">
          {LINKS.map((l) => {
            const active = pathname === l.href || (l.href !== '/' && pathname.startsWith(l.href));
            return (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className={`font-serif text-[26px] leading-tight ${active ? 'text-sethi-gold' : 'hover:text-sethi-gold'}`}>
                {l.label}
              </Link>
            );
          })}
          <a href={waLink} target="_blank" rel="noopener noreferrer" className="btn-primary mt-4">
            <MessageCircle className="w-5 h-5" /> WhatsApp Us
          </a>
        </div>
      </div>
    </header>
  );
}
