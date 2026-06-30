import Link from 'next/link';
import { Instagram, Facebook, Youtube, MapPin, Phone, Clock } from 'lucide-react';
import { LOGO_URL, BUSINESS } from '@/lib/constants';

export default function Footer() {
  return (
    <footer className="bg-sethi-black text-white border-t-2 border-sethi-gold/60 mt-20">
      <div className="container-sethi py-12 md:py-16">
        <div className="grid gap-10 md:grid-cols-3">

          {/* Brand */}
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO_URL} alt={BUSINESS.name} className="h-14 object-contain bg-white p-1 rounded-sm" />
            <p className="mt-4 text-sethi-gold text-sm tracking-wide">{BUSINESS.tagline}</p>
            <p className="mt-3 text-white/60 text-sm">Original branded bags. Unbeatable deals. Visit us today.</p>

            {/* Social — visible on mobile below brand */}
            <div className="flex items-center gap-5 mt-6">
              <a href={BUSINESS.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram"
                className="w-11 h-11 flex items-center justify-center rounded-full border border-white/10 text-sethi-gold hover:bg-sethi-gold hover:text-sethi-black transition-all active:scale-95">
                <Instagram className="w-5 h-5" />
              </a>
              <a href={BUSINESS.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook"
                className="w-11 h-11 flex items-center justify-center rounded-full border border-white/10 text-sethi-gold hover:bg-sethi-gold hover:text-sethi-black transition-all active:scale-95">
                <Facebook className="w-5 h-5" />
              </a>
              <a href={BUSINESS.youtube} target="_blank" rel="noopener noreferrer" aria-label="YouTube"
                className="w-11 h-11 flex items-center justify-center rounded-full border border-white/10 text-sethi-gold hover:bg-sethi-gold hover:text-sethi-black transition-all active:scale-95">
                <Youtube className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-serif text-xl mb-4 text-white">Quick Links</h4>
            <ul className="space-y-1">
              {[
                { href: '/', label: 'Home' },
                { href: '/products', label: 'Products' },
                { href: '/categories', label: 'Categories' },
                { href: '/contact', label: 'Contact' },
              ].map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="flex items-center text-white/70 hover:text-sethi-gold py-2.5 border-b border-white/5 transition-colors active:text-sethi-gold"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-serif text-xl mb-4 text-white">Contact Info</h4>
            <div className="space-y-4 text-white/70 text-sm">
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent('Inside Mai Hiran Gate, Near Books Market, Jalandhar, Punjab 144001')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 hover:text-sethi-gold transition-colors active:text-sethi-gold"
              >
                <MapPin className="w-5 h-5 text-sethi-gold mt-0.5 shrink-0" />
                <span>Inside Mai Hiran Gate, Near Books Market, Jalandhar, Punjab 144001</span>
              </a>
              <a
                href={`tel:${BUSINESS.phone}`}
                className="flex items-center gap-3 hover:text-sethi-gold transition-colors active:text-sethi-gold"
              >
                <Phone className="w-5 h-5 text-sethi-gold shrink-0" />
                <span>{BUSINESS.phone}</span>
              </a>
              <p className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-sethi-gold shrink-0" />
                <span>{BUSINESS.timings}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-sethi py-5 text-center text-white/50 text-sm">
          © {new Date().getFullYear()} SETHI PURSE. All Rights Reserved.
        </div>
      </div>
    </footer>
  );
}
