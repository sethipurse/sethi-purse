'use client';
import { Star } from 'lucide-react';

export default function StarRating({ value = 0, onChange, size = 18, readOnly = true }) {
  const stars = [1, 2, 3, 4, 5];
  return (
    <div className="inline-flex items-center gap-0.5">
      {stars.map((n) => {
        const filled = n <= value;
        const cls = `transition-transform ${filled ? 'text-sethi-gold fill-sethi-gold' : 'text-sethi-gray200 fill-sethi-gray200'}`;
        if (readOnly) {
          return <Star key={n} className={cls} style={{ width: size, height: size }} />;
        }
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange?.(n)}
            className="hover:scale-110 transition-transform p-0.5"
            aria-label={`Rate ${n} star${n > 1 ? 's' : ''}`}
          >
            <Star className={cls} style={{ width: size, height: size }} />
          </button>
        );
      })}
    </div>
  );
}
