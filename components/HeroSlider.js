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
  const [scrolled, setScrolled] = useState(false);
  const animRef = useRef(false);

  // Detect scroll to add shadow to sticky header
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // 4s timeout so loading never hangs forever
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
      .finally(() => { clearTimeout(timeout); setLoading(false); });
    return () => { clearTimeout(timeout); controller.abort(); };
  }, []);

  function go(index, dir = 'right') {
    if (animRef.current) return;
    animRef.current = true;
    setDirection(dir);
    setAnimating(true);
    setTimeout(() => { setCurrent(index); setAnimating(false); animRef.current = false; }, 350);
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

  // ── Sticky Header — fixed to top of screen, full width ──
  const StickyHeader = () => (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      background: '#faf8f4',
      borderBottom: scrolled ? '1px solid #ede8df' : '1px solid transparent',
      boxShadow: scrolled ? '0 2px 12px rgba(44,31,20,0.10)' : 'none',
      transition: 'box-shadow 0.3s ease, border-color 0.3s ease',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '14px 20px',
      maxWidth: '100%',
    }}>
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
  );

  // Shimmer skeleton
  if (loading) {
    return (
      <>
        <StickyHeader />
        <div style={{ ...S.card, marginTop: 56 }}>
          <div style={S.shimmer} />
          <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
        </div>
      </>
    );
  }

  if (slides.length === 0) {
    return (
      <>
        <StickyHeader />
        <div style={{ ...S.card, marginTop: 56 }} />
      </>
    );
  }

  const slide = slides[current];
  const badgeLabels = Array.isArray(slide.badge_labels) && slide.badge_labels.length > 0
    ? slide.badge_labels : ['Free Delivery', 'Premium Quality', 'Easy Returns'];
  const categoryLink = slide.category ? categoryPath(slide.category) : '/products';

  return (
    <>
      {/* Sticky header always on top */}
      <StickyHeader />

      {/* Push content down so it's not hidden behind sticky header */}
      <div style={{ ...S.card, marginTop: 56 }}>
        <div style={S.slideArea}>
          {/* Text block */}
          <div style={S.textBlock}>
            {slide.category && <p style={S.category}>{slide.category}</p>}
            <div style={S.goldRule} />
            <h1 style={S.headline}>{slide.headline || 'Shop Now'}</h1>
            <Link href={categoryLink} style={{ textDecoration: 'none' }}>
              <div style={S.shopBtn}>Shop Now →</div>
            </Link>
          </div>

          {/* Product image */}
          <Link href={categoryLink} style={{ textDecoration: 'none' }}>
            <div style={{
              ...S.imageWrap,
              opacity: animating ? 0 : 1,
              transform: animating ? `translateX(${direction === 'right' ? '40px' : '-40px'})` : 'translateX(0)',
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

          {/* Arrows + Dots */}
          {slides.length > 1 && (
            <>
              <button onClick={prev} style={{ ...S.arrow, ...S.arrowLeft }} aria-label="Previous">
                <ChevronLeft size={13} color="#4a3728" />
              </button>
              <button onClick={next} style={{ ...S.arrow, ...S.arrowRight }} aria-label="Next">
                <ChevronRight size={13} color="#fff" />
              </button>
              <div style={S.dots}>
                {slides.map((_, i) => (
                  <button key={i} onClick={() => go(i, i > current ? 'right' : 'left')}
                    style={{ ...S.dot, ...(i === current ? S.dotActive : {}) }}
                    aria-label={`Slide ${i + 1}`} />
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
    </>
  );
}

const S = {
  card: {
    width: '100%', maxWidth: 390, margin: '0 auto',
    background: '#faf8f4', borderRadius: 28, overflow: 'hidden',
    boxShadow: '0 8px 40px rgba(74,55,40,0.13)',
    fontFamily: "'Cormorant Garamond','Georgia',serif",
    display: 'flex', flexDirection: 'column',
  },
  iconBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' },
  brand: { display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1 },
  brandName: { fontFamily: "'Cormorant Garamond','Georgia',serif", fontWeight: 700, fontSize: 18, letterSpacing: '0.18em', color: '#2c1f14' },
  brandSub: { fontFamily: "'Cormorant Garamond','Georgia',serif", fontWeight: 400, fontSize: 9, letterSpacing: '0.28em', color: '#8a7060', marginTop: 2 },
  cartBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', position: 'relative' },
  badge: { position: 'absolute', top: 0, right: 0, background: '#c9a84c', color: '#fff', borderRadius: '50%', width: 16, height: 16, fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' },

  shimmer: {
    minHeight: 320,
    background: 'linear-gradient(90deg,#f0ebe3 25%,#e8e0d4 50%,#f0ebe3 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite',
  },

  slideArea: {
    position: 'relative', minHeight: 440,
    display: 'flex', flexDirection: 'column',
    padding: '0 0 52px 0',
  },

  textBlock: {
    padding: '20px 0 0 22px',
    position: 'relative', zIndex: 2,
    width: '72%',
  },

  category: {
    fontFamily: "'Cormorant Garamond','Georgia',serif",
    fontWeight: 600, fontSize: 11, letterSpacing: '0.22em',
    color: '#c9a84c', margin: '0 0 6px', textTransform: 'uppercase',
  },
  goldRule: { width: 28, height: 1.5, background: '#c9a84c', marginBottom: 10 },

  headline: {
    fontFamily: "'Cormorant Garamond','Georgia',serif",
    fontWeight: 700,
    fontSize: 22,
    lineHeight: 1.1,
    color: '#2c1f14',
    margin: '0 0 16px 0',
    letterSpacing: '-0.01em',
    whiteSpace: 'nowrap',
  },

  shopBtn: {
    display: 'inline-block',
    background: '#c9a84c',
    color: '#fff',
    fontFamily: "'Cormorant Garamond','Georgia',serif",
    fontWeight: 700,
    fontSize: 14,
    letterSpacing: '0.03em',
    padding: '9px 20px',
    borderRadius: 24,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },

  imageWrap: {
    position: 'absolute',
    bottom: 44,
    left: '28%',
    right: 0,
    height: 300,
    zIndex: 1,
    cursor: 'pointer',
  },

  arrow: {
    position: 'absolute', bottom: 58,
    width: 28, height: 28, borderRadius: '50%',
    border: 'none', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3,
  },
  arrowLeft:  { left: 10,  background: '#fff', boxShadow: '0 2px 6px rgba(74,55,40,0.15)' },
  arrowRight: { right: 10, background: '#c9a84c' },

  dots: {
    position: 'absolute', bottom: 16, left: 0, right: 0,
    display: 'flex', justifyContent: 'center', gap: 6, zIndex: 3,
  },
  dot:       { width: 18, height: 4, borderRadius: 3, background: '#ddd0be', border: 'none', cursor: 'pointer', padding: 0 },
  dotActive: { background: '#c9a84c' },

  badges: {
    display: 'flex', justifyContent: 'space-around',
    padding: '14px 10px 18px', background: '#faf8f4',
    borderTop: '1px solid #ede8df',
  },
  badgeItem:  { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 },
  badgeIcon:  { fontSize: 20 },
  badgeLabel: { fontSize: 10, color: '#6b5544', textAlign: 'center', lineHeight: 1.3, maxWidth: 64 },
};
