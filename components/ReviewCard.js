'use client';
import { useState } from 'react';
import StarRating from '@/components/StarRating';
import { getInitials } from '@/lib/constants';

// Fixed, shared across every review card — not per-review data, so no DB
// column/admin field needed. Distinct from the GOOGLE_REVIEW_LINK in
// lib/constants.js (a different URL, used for the admin's "ask for a
// review" WhatsApp template) — kept separate rather than reused so this
// change can't silently affect that other feature.
const GOOGLE_REVIEW_LINK = 'https://g.page/r/CecQQraLXlfqEAE/review';

export default function ReviewCard({ review }) {
  const [imgErr, setImgErr] = useState(false);
  const customerName = review.customer_name || review.customerName;
  const customerPhoto = review.customer_photo || review.customerPhoto;
  const reviewText = review.review_text || review.reviewText || review.comment;
  const isFeatured = review.is_featured ?? review.isFeatured;

  return (
    <article className="card-sethi p-6 md:p-7 flex flex-col h-full">
      <div className="flex items-center gap-4">
        <div className="w-[60px] h-[60px] rounded-full overflow-hidden flex-shrink-0 border-2 border-sethi-gold bg-sethi-gold flex items-center justify-center">
          {customerPhoto && !imgErr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={customerPhoto} alt={customerName} onError={() => setImgErr(true)} className="w-full h-full object-cover" />
          ) : (
            <span className="font-serif text-xl text-sethi-black font-bold">{getInitials(customerName)}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-base">{customerName}</h3>
            {isFeatured && <span className="inline-block bg-sethi-gold text-sethi-black text-[10px] font-bold px-2 py-0.5 rounded-sm tracking-wide">FEATURED</span>}
          </div>
          <StarRating value={review.rating} size={16} />
        </div>
      </div>
      <p className="mt-4 text-sethi-gray800/90 italic leading-relaxed">&ldquo;{reviewText}&rdquo;</p>
      <a href={GOOGLE_REVIEW_LINK} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-xs font-medium text-sethi-gold hover:underline">
        Google pe dekho →
      </a>
    </article>
  );
}
