'use client';
import { useState } from 'react';
import { ImageOff, MessageCircle } from 'lucide-react';
import { buildWhatsAppLink, formatDateShort } from '@/lib/constants';

export default function OfferCard({ offer, compact = false }) {
  const [imgErr, setImgErr] = useState(false);
  const waMsg = `Hi SETHI PURSE, I am interested in your offer: ${offer.title}. Please share details.`;
  const bannerUrl = offer.banner_url || offer.bannerUrl;
  const expiryDate = offer.expiry_date || offer.expiryDate;

  return (
    <article className="card-sethi overflow-hidden flex flex-col h-full">
      <div className="relative aspect-[16/9] bg-sethi-black overflow-hidden">
        <span className="absolute top-3 left-3 z-10 inline-flex items-center bg-sethi-gold text-sethi-black text-[11px] font-bold px-2.5 py-1 rounded-sm tracking-wider">OFFER</span>
        {bannerUrl && !imgErr ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={bannerUrl} alt={offer.title} onError={() => setImgErr(true)} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-sethi-gold">
            <ImageOff className="w-12 h-12" />
          </div>
        )}
      </div>
      <div className="p-5 md:p-6 flex flex-col flex-1">
        <h3 className="font-serif text-xl md:text-2xl leading-snug">{offer.title}</h3>
        {!compact && offer.description && (
          <p className="mt-2 text-sethi-gray800/90 text-sm md:text-base line-clamp-3">{offer.description}</p>
        )}
        {expiryDate && (
          <p className="mt-3 text-sm text-sethi-gold font-medium">Valid till: {formatDateShort(expiryDate)}</p>
        )}
        <a
          href={buildWhatsAppLink(waMsg)}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary mt-5 w-full text-sm"
        >
          <MessageCircle className="w-4 h-4" /> Claim This Offer
        </a>
      </div>
    </article>
  );
}
