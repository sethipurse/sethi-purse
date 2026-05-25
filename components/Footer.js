import Link from 'next/link';
import { Instagram, Facebook, Youtube, MapPin, Phone, Clock } from 'lucide-react';
import { LOGO_URL, BUSINESS } from '@/lib/constants';

export default function Footer() {
  return (
    <footer className="bg-sethi-black text-white border-t-2 border-sethi-gold/60 mt-20">
      <div className="container-sethi py-14 md:py-16">
        <div className="grid gap-10 md:grid-cols-3">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO_URL} alt={BUSINESS.name} className="h-14 object-contain bg-white p-1 rounded-sm" />
            <p className="mt-4 text-sethi-gold text-sm tracking-wide">{BUSINESS.tagline}</p>
            <p className="mt-3 text-white/60 text-sm">Original branded bags. Unbeatable deals. Visit us today.</p>
          </div>
          <div>
            <h4 className="font-serif text-xl mb-4 text-white">Quick Links</h4>
            <ul className="space-y-2 text-white/70">
              <li><Link href="/" className="hover:text-sethi-gold">Home</Link></li>
              <li><Link href="/products" className="hover:text-sethi-gold">Products</Link></li>
              <li><Link href="/categories" className="hover:text-sethi-gold">Categories</Link></li>
              <li><Link href="/contact" className="hover:text-sethi-gold">Contact</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-serif text-xl mb-4 text-white">Contact Info</h4>
            <div className="space-y-3 text-white/70 text-sm">
              <p className="flex items-start gap-2"><MapPin className="w-4 h-4 text-sethi-gold mt-0.5 shrink-0" /> Inside Mai Hiran Gate, Near Books Market, Jalandhar, Punjab 144001</p>
              <p className="flex items-center gap-2"><Phone className="w-4 h-4 text-sethi-gold" /> {BUSINESS.phone}</p>
              <p className="flex items-center gap-2"><Clock className="w-4 h-4 text-sethi-gold" /> {BUSINESS.timings}</p>
            </div>
            <h4 className="font-serif text-xl mt-6 mb-3 text-white">Follow Us</h4>
            <div className="flex items-center gap-4">
              <a href={BUSINESS.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="text-sethi-gold hover:text-sethi-gold-light"><Instagram className="w-6 h-6" /></a>
              <a href={BUSINESS.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="text-sethi-gold hover:text-sethi-gold-light"><Facebook className="w-6 h-6" /></a>
              <a href={BUSINESS.youtube} target="_blank" rel="noopener noreferrer" aria-label="YouTube" className="text-sethi-gold hover:text-sethi-gold-light"><Youtube className="w-6 h-6" /></a>
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
