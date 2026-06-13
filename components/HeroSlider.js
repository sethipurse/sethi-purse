'use client';
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ShoppingBag, Menu, ChevronLeft, ChevronRight } from 'lucide-react';
import { categoryPath } from '@/lib/categoryUtils';

export default function HeroSlider({ cartCount = 0, onMenuClick, onCartClick }) {
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [direction, setDirection] = useState('right');
  const animRef = useRef(false);

  // FIX 4: Add 4s timeout so loading never hangs forever on desktop
  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    fetch('/api/slider-images', { signal: controller.signal })
      .then((res) => res.ok ? res.json() : [])
      .then((data) => {
        const active = Array.isArray(data) ? data.filter((s) => s.is_active !== false) : [];
        setSlides(active);
      })
      .catch(() => setSlides([]))
      .finally(() => {
        clearTimeout(timeout);
        setLoading(false);
      });

    return () => { clearTimeout(timeout); controller.abort(); };
  }, []);

  function go(index, dir = 'right') {
    if (animRef.current) return;
    animRef.current = true;
    setDirection(dir);
    setAnimating(true);
    setTimeout(() => {
      setCurrent(index);
      setAnimating(false);
      animRef.current = false;
    }, 350);
  }

  const prev = () => go((current - 1 + slides.length) % slides.length, 'left');
  const next = () => go((current + 1) % slides.length, 'right');

  useEffect(() => {
    if (slides.length <= 1) return;
    const t = setInterval(() => {
      setCurrent((c) => {
        const n = (c + 1) % slides.length;
        if (!animRef.current) {
          animRef.current = true;
          setDirection('right');
          setAnimating(true);
          setTimeout(() => { setAnimating(false); animRef.current = false; }, 350);
        }
        return n;
      });
    }, 4000);
    return () => clearInterval(t);
  }, [slides.length]);

  // FIX 4: Loading — show header + skeleton bar instead of "Loading..." text forever
  if (loading) {
    return (
      <div style={S.card}>
        <div style={S.header}>
          <button onClick={onMenuClick} style={S.iconBtn} aria-label="Menu">
            <Menu size={22} color="#4a3728" />
          </button>
          <div style={S.brand}>
            <span style={S.brandName}>SETHI PURSE</span>
            <span style={S.brandSub}>JALANDHAR</span>
          </div>
          <button onClick={onCartClick} style={S.cartBtn} aria-label="Cart">
            <ShoppingBag size={22} color="#4a3728" />
            {cartCount > 0 && <span style={S.badge}>{cartCount}</span>}
          </button>
        </div>
        {/* Skeleton shimmer instead of "Loading..." text */}
        <div style={{ minHeight: 320, background: 'linear-gradient(90deg, #f0ebe3 25%, #e8e0d4 50%, #f0ebe3 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
        <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
      </div>
    );
  }

  // No slides — show header only
  if (slides.length === 0) {
    return (
      <div style={S.card}>
        <div style={S.header}>
          <button onClick={onMenuClick} style={S.iconBtn} aria-label="Menu">
            <Menu size={22} color="#4a3728" />
          </button>
          <div style={S.brand}>
            <span style={S.brandName}>SETHI PURSE</span>
            <span style={S.brandSub}>JALANDHAR</span>
          </div>
          <button onClick={onCartClick} style={S.cartBtn} aria-label="Cart">
            <ShoppingBag size={22} color="#4a3728" />
            {cartCount > 0 && <span style={S.badge}>{cartCount}</span>}
          </button>
        </div>
      </div>
    );
  }

  const slide = slides[current];

  // FIX 1: Join all headline lines into ONE line (no line breaks)
  const headlineText = (slide.headline || 'Shop Now').replace(/\n/g, ' ').trim();

  const badgeLabels = Array.isArray(slide.badge_labels) && slide.badge_labels.length > 0
    ? slide.badge_labels
    : ['Free Delivery', 'Premium Quality', 'Easy Returns'];

  const categoryLink = slide.category
    ? categoryPath(slide.category)
    : '/products';

  return (
    <div style={S.card}>
      {/* Header */}
      <div style={S.header}>
        <button onClick={onMenuClick} style={S.iconBtn} aria-label="Menu">
          <Menu size={22} color="#4a3728" />
        </button>
        <div style={S.brand}>
          <span style={S.brandName}>SETHI PURSE</span>
          <span style={S.brandSub}>JALANDHAR</span>
        </div>
        <button onClick={onCartClick} style={S.cartBtn} aria-label="Cart">
          <ShoppingBag size={22} color="#4a3728" />
          {cartCount > 0 && <span style={S.badge}>{cartCount}</span>}
        </button>
      </div>

      {/* Slide */}
      <div style={S.slideArea}>

        {/* Text block — left side, sits above image */}
        <div style={S.textBlock}>
          {slide.category && <p style={S.category}>{slide.category}</p>}
          <div style={S.goldRule} />

          {/* FIX 1: Single line headline — smaller font, nowrap, ellipsis if too long */}
          <h1 style={S.headline}>{headlineText}</h1>

          {/* FIX 2: Shop Now button repositioned directly under headline */}
          <Link href={categoryLink} style={{ textDecoration: 'none' }}>
            <div style={S.shopBtn}>Shop Now →</div>
          </Link>
        </div>

        {/* Product image */}
        <Link href={categoryLink} style={{ textDecoration: 'none' }}>
          <div style={{
            ...S.imageWrap,
            opacity: animating ? 0 : 1,
            transform: animating
              ? `translateX(${direction === 'right' ? '40px' : '-40px'})`
              : 'translateX(0)',
            transition: 'opacity 0.35s ease, transform 0.35s ease',
          }}>
            {slide.image_url && (
              <Image
                src={slide.image_url}
                alt={slide.category || slide.headline || 'Slide'}
                fill
                style={{ objectFit: 'contain', objectPosition: 'center bottom' }}
                priority={current === 0}
                unoptimized
              />
            )}
          </div>
        </Link>

        {slides.length > 1 && (
          <>
            {/* FIX 3: Smaller arrows — 30×30 instead of 40×40, icon 14 instead of 20 */}
            <button onClick={prev} style={{ ...S.arrow, ...S.arrowLeft }} aria-label="Previous">
              <ChevronLeft size={14} color="#4a3728" />
            </button>
            <button onClick={next} style={{ ...S.arrow, ...S.arrowRight }} aria-label="Next">
              <ChevronRight size={14} color="#fff" />
            </button>

            <div style={S.dots}>
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => go(i, i > current ? 'right' : 'left')}
                  style={{ ...S.dot, ...(i === current ? S.dotActive : {}) }}
                  aria-label={`Slide ${i + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Badges */}
      <div style={S.badges}>
        {badgeLabels.slice(0, 3).map((label, i) => (
          <div key={i} style={S.badgeItem}>
            <span style={S.badgeIcon}>{['🚚', '🛡️', '↩️'][i] || '✨'}</span>
            <span style={S.badgeLabel}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const S = {
  card: {
    width: '100%', maxWidth: 390, margin: '0 auto', background: '#faf8f4',
    borderRadius: 28, overflow: 'hidden',
    boxShadow: '0 8px 40px rgba(74,55,40,0.13)',
    fontFamily: "'Cormorant Garamond','Georgia',serif",
    display: 'flex', flexDirection: 'column',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '18px 20px 10px', background: '#faf8f4',
  },
  iconBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' },
  brand: { display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1 },
  brandName: {
    fontFamily: "'Cormorant Garamond','Georgia',serif",
    fontWeight: 700, fontSize: 18, letterSpacing: '0.18em', color: '#2c1f14',
  },
  brandSub: {
    fontFamily: "'Cormorant Garamond','Georgia',serif",
    fontWeight: 400, fontSize: 9, letterSpacing: '0.28em', color: '#8a7060', marginTop: 2,
  },
  cartBtn: {
    background: 'none', border: 'none', cursor: 'pointer', padding: 4,
    display: 'flex', alignItems: 'center', position: 'relative',
  },
  badge: {
    position: 'absolute', top: 0, right: 0, background: '#c9a84c', color: '#fff',
    borderRadius: '50%', width: 16, height: 16, fontSize: 10, fontWeight: 700,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  slideArea: {
    position: 'relative', minHeight: 420,
    display: 'flex', flexDirection: 'column',
    padding: '0 0 48px 0',
  },
  textBlock: {
    // FIX 2: positioned top-left, takes only left half so image shows on right
    padding: '18px 0 0 22px',
    position: 'relative', zIndex: 2,
    width: '55%',
  },
  category: {
    fontFamily: "'Cormorant Garamond','Georgia',serif",
    fontWeight: 600, fontSize: 11, letterSpacing: '0.22em',
    color: '#c9a84c', margin: '0 0 6px', textTransform: 'uppercase',
  },
  goldRule: { width: 28, height: 1.5, background: '#c9a84c', marginBottom: 8 },

  // FIX 1: Smaller font (34→fits one line), nowrap + ellipsis as safety net
  headline: {
    fontFamily: "'Cormorant Garamond','Georgia',serif",
    fontWeight: 700, fontSize: 30, lineHeight: 1.12,
    color: '#2c1f14', margin: '0 0 14px 0',
    letterSpacing: '-0.01em',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },

  // FIX 2: Shop Now button — gold pill, sits right under headline
  shopBtn: {
    display: 'inline-block',
    background: '#c9a84c',
    color: '#fff',
    fontFamily: "'Cormorant Garamond','Georgia',serif",
    fontWeight: 700,
    fontSize: 13,
    letterSpacing: '0.04em',
    padding: '8px 16px',
    borderRadius: 20,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },

  imageWrap: {
    position: 'absolute', bottom: 40,
    left: '30%', right: 0,          // FIX 2: right side only, doesn't overlap text
    height: 280, zIndex: 1, cursor: 'pointer',
  },

  // FIX 3: Arrows 30×30 (was 40×40)
  arrow: {
    position: 'absolute', bottom: 55,
    width: 30, height: 30, borderRadius: '50%',
    border: 'none', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3,
  },
  arrowLeft: { left: 12, background: '#fff', boxShadow: '0 2px 8px rgba(74,55,40,0.12)' },
  arrowRight: { right: 12, background: '#c9a84c' },

  dots: {
    position: 'absolute', bottom: 14, left: 0, right: 0,
    display: 'flex', justifyContent: 'center', gap: 6, zIndex: 3,
  },
  dot: { width: 20, height: 4, borderRadius: 3, background: '#ddd0be', border: 'none', cursor: 'pointer', padding: 0 },
  dotActive: { background: '#c9a84c' },

  badges: {
    display: 'flex', justifyContent: 'space-around',
    padding: '14px 10px 18px', background: '#faf8f4',
    borderTop: '1px solid #ede8df',
  },
  badgeItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 },
  badgeIcon: { fontSize: 20 },
  badgeLabel: { fontSize: 10, color: '#6b5544', textAlign: 'center', lineHeight: 1.3, maxWidth: 64 },
};
