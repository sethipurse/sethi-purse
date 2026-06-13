'use client';
import { useState } from 'react';
import { ImageOff, MessageCircle, Clock, ChevronDown, ChevronUp, Tag, ShoppingBag } from 'lucide-react';
import { buildWhatsAppLink, formatDateShort } from '@/lib/constants';

function getDaysLeft(expiryDate) {
  if (!expiryDate) return null;
  const diff = Math.ceil((new Date(expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
  return diff;
}

function UrgencyBadge({ daysLeft, expiryDate }) {
  if (daysLeft === null) return null;
  if (daysLeft < 0) return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-500">
      <Clock className="w-3 h-3" /> Expired
    </span>
  );
  if (daysLeft === 0) return (
    <span className="inline-flex items-center gap-1 text-xs font-bold text-red-500 animate-pulse">
      <Clock className="w-3 h-3" /> Expires Today!
    </span>
  );
  if (daysLeft <= 3) return (
    <span className="inline-flex items-center gap-1 text-xs font-bold text-orange-500">
      <Clock className="w-3 h-3" /> Only {daysLeft} day{daysLeft > 1 ? 's' : ''} left!
    </span>
  );
  if (daysLeft <= 7) return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#c9a84c]">
      <Clock className="w-3 h-3" /> {daysLeft} days left
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-xs text-[#8a7060]">
      <Clock className="w-3 h-3" /> Valid till {expiryDate ? formatDateShort(expiryDate) : ''}
    </span>
  );
}

export default function OfferCard({ offer, compact = false }) {
  const [imgErr, setImgErr] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);

  const bannerUrl = offer.banner_url || offer.bannerUrl;
  const expiryDate = offer.expiry_date || offer.expiryDate;
  const daysLeft = getDaysLeft(expiryDate);
  const isExpired = daysLeft !== null && daysLeft < 0;

  // ✅ Extract discount % from title or description
  const discountMatch = (offer.title + ' ' + (offer.description || '')).match(/(\d+)\s*%\s*off/i);
  const discountPercent = discountMatch ? discountMatch[1] : null;

  // ✅ Extract prices if available
  const originalPrice = offer.original_price || offer.mrp || null;
  const offerPrice = offer.offer_price || offer.sale_price || null;

  const waMsg = `Hi SETHI PURSE! 👋

I want to claim this offer:
*${offer.title}*${offer.description ? `\n\n${offer.description}` : ''}${expiryDate ? `\n\n📅 Valid till: ${formatDateShort(expiryDate)}` : ''}

Please confirm availability and help me avail this deal. Thank you!`;

  return (
    <article className={`card-sethi overflow-hidden flex flex-col h-full ${isExpired ? 'opacity-60' : ''}`}>

      {/* ✅ Banner Image — full 16:9, object-cover properly */}
      <div className="relative bg-[#f5f0e8] overflow-hidden" style={{ aspectRatio: '16/9' }}>

        {/* OFFER badge */}
        <span className="absolute top-3 left-3 z-10 inline-flex items-center gap-1 bg-[#c9a84c] text-white text-[11px] font-bold px-2.5 py-1 rounded-sm tracking-wider">
          <Tag className="w-3 h-3" /> OFFER
        </span>

        {/* ✅ Big discount % badge on image */}
        {discountPercent && (
          <span className="absolute top-3 right-3 z-10 bg-red-600 text-white text-sm font-black px-3 py-1.5 rounded-sm shadow-lg">
            {discountPercent}% OFF
          </span>
        )}

        {/* Urgency badge when no discount % */}
        {!discountPercent && daysLeft !== null && daysLeft <= 3 && daysLeft >= 0 && (
          <span className="absolute top-3 right-3 z-10 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-sm">
            {daysLeft === 0 ? 'LAST DAY' : `${daysLeft}D LEFT`}
          </span>
        )}

        {isExpired && (
          <div className="absolute inset-0 z-10 bg-black/40 flex items-center justify-center">
            <span className="bg-red-500 text-white text-sm font-bold px-4 py-2 rounded">EXPIRED</span>
          </div>
        )}

        {bannerUrl && !imgErr ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={bannerUrl}
            alt={offer.title}
            onError={() => setImgErr(true)}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-[#c9a84c] gap-2 bg-gradient-to-br from-[#2c1f14] to-[#6b5544]">
            <Tag className="w-12 h-12 text-[#c9a84c]" />
            <span className="text-[#c9a84c] text-sm font-semibold">{offer.title}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5 md:p-6 flex flex-col flex-1">

        <h3 className="font-serif text-xl md:text-2xl leading-snug text-[#2c1f14]">
          {offer.title}
        </h3>

        {!compact && offer.description && (
          <p className="mt-2 text-[#6b5544] text-sm md:text-base leading-relaxed line-clamp-3">
            {offer.description}
          </p>
        )}

        {/* ✅ Original price vs offer price */}
        {(originalPrice || offerPrice) && (
          <div className="mt-3 flex items-center gap-3">
            {offerPrice && (
              <span className="text-2xl font-bold text-[#2c1f14]">
                Rs.{Number(offerPrice).toLocaleString('en-IN')}
              </span>
            )}
            {originalPrice && (
              <span className="text-base text-[#8a7060] line-through">
                Rs.{Number(originalPrice).toLocaleString('en-IN')}
              </span>
            )}
            {originalPrice && offerPrice && (
              <span className="text-sm font-bold text-green-600">
                Save Rs.{(Number(originalPrice) - Number(offerPrice)).toLocaleString('en-IN')}
              </span>
            )}
          </div>
        )}

        {offer.discount_label && (
          <div className="mt-3 bg-[#faf8f4] border border-[#e8d5a3] rounded px-3 py-2 flex items-center gap-2">
            <Tag className="w-4 h-4 text-[#c9a84c] shrink-0" />
            <span className="text-sm font-semibold text-[#a07a28]">{offer.discount_label}</span>
          </div>
        )}

        <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
          <UrgencyBadge daysLeft={daysLeft} expiryDate={expiryDate} />
          {expiryDate && daysLeft !== null && daysLeft > 7 && (
            <span className="text-xs text-[#8a7060]">Valid till {formatDateShort(expiryDate)}</span>
          )}
        </div>

        {offer.terms && (
          <div className="mt-3 border-t border-[#ede8df] pt-3">
            <button type="button" onClick={() => setTermsOpen((p) => !p)}
              className="flex items-center gap-1 text-xs text-[#8a7060] hover:text-[#2c1f14] transition-colors">
              {termsOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              Terms & Conditions
            </button>
            {termsOpen && <p className="mt-2 text-xs text-[#8a7060] leading-relaxed">{offer.terms}</p>}
          </div>
        )}

        <div className="flex-1" />

        {/* ✅ Two buttons — Shop Now + WhatsApp */}
        <div className="mt-5 grid grid-cols-2 gap-2">
          <a
            href="/products"
            className="min-h-[48px] flex items-center justify-center gap-1.5 rounded border-2 border-[#c9a84c] text-[#c9a84c] text-sm font-bold hover:bg-[#c9a84c] hover:text-white transition-all active:scale-95"
          >
            <ShoppingBag className="w-4 h-4" /> Shop Now
          </a>
          <a
            href={isExpired ? undefined : buildWhatsAppLink(waMsg)}
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={isExpired}
            onClick={(e) => isExpired && e.preventDefault()}
            className={`min-h-[48px] flex items-center justify-center gap-1.5 rounded text-sm font-bold transition-all
              ${isExpired
                ? 'bg-[#ede8df] text-[#8a7060] cursor-not-allowed pointer-events-none'
                : 'bg-[#25D366] hover:bg-[#1ebe5c] active:scale-95 text-white'
              }`}
          >
            <MessageCircle className="w-4 h-4" />
            {isExpired ? 'Expired' : 'Claim →'}
          </a>
        </div>

        {!isExpired && (
          <p className="mt-2 text-center text-[11px] text-[#8a7060]">
            🔒 No payment needed • Just chat with us
          </p>
        )}
      </div>
    </article>
  );
}
