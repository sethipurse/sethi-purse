'use client';
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ShoppingBag, Menu, ChevronLeft, ChevronRight } from 'lucide-react';

export default function HeroSlider({ cartCount = 0, onMenuClick, onCartClick }) {
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [direction, setDirection] = useState('right');
  const animRef = useRef(false);

  // Fetch slides from admin (Supabase)
  useEffect(() => {
    fetch('/api/slider-images')
      .then((res) => res.ok ? res.json() : [])
      .then((data) => {
        const active = Array.isArray(data) ? data.filter((s) => s.is_active !== false) : [];
        setSlides(active);
      })
      .catch(() => setSlides([]))
      .finally(() => setLoading(false));
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

  // ── Loading state ──
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
        <div style={{ ...S.slideArea, minHeight: 300, alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: '#c9a84c', fontFamily: "'Cormorant Garamond','Georgia',serif" }}>Loading...</div>
        </div>
      </div>
    );
  }

  // ── No slides — show header only ──
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
  const headlineLines = (slide.headline || '').split('\n').filter(Boolean);
  const badgeLabels = Array.isArray(slide.badge_labels) && slide.badge_labels.length > 0
    ? slide.badge_labels
    : ['Free Delivery', 'Premium Quality', 'Easy Returns'];

  // Build category link
  const categoryLink = slide.category
    ? `/products?category=${encodeURIComponent(slide.category)}`
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
        <Link href={categoryLink} style={{ textDecoration: 'none', display: 'block' }}>
          <div style={S.textBlock}>
            {slide.category && <p style={S.category}>{slide.category}</p>}
            <div style={S.goldRule} />
            {headlineLines.length > 0 ? (
              <h1 style={S.headline}>
                {headlineLines.map((line, i) => <span key={i}>{line}<br /></span>)}
              </h1>
            ) : (
              <h1 style={S.headline}>Shop Now</h1>
            )}
            <div style={S.goldRuleShort} />
          </div>
        </Link>

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

        {slides.length > 1 && (
          <>
            <button onClick={prev} style={{ ...S.arrow, ...S.arrowLeft }} aria-label="Previous">
              <ChevronLeft size={20} color="#4a3728" />
            </button>
            <button onClick={next} style={{ ...S.arrow, ...S.arrowRight }} aria-label="Next">
              <ChevronRight size={20} color="#fff" />
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
            <span style={S.badgeIcon}>{['🚚','🛡️','↩️'][i] || '✨'}</span>
            <span style={S.badgeLabel}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const S = {
  card: { width: '100%', maxWidth: 390, margin: '0 auto', background: '#faf8f4', borderRadius: 28, overflow: 'hidden', boxShadow: '0 8px 40px rgba(74,55,40,0.13)', fontFamily: "'Cormorant Garamond','Georgia',serif", display: 'flex', flexDirection: 'column' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 10px', background: '#faf8f4' },
  iconBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' },
  brand: { display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1 },
  brandName: { fontFamily: "'Cormorant Garamond','Georgia',serif", fontWeight: 700, fontSize: 18, letterSpacing: '0.18em', color: '#2c1f14' },
  brandSub: { fontFamily: "'Cormorant Garamond','Georgia',serif", fontWeight: 400, fontSize: 9, letterSpacing: '0.28em', color: '#8a7060', marginTop: 2 },
  cartBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', position: 'relative' },
  badge: { position: 'absolute', top: 0, right: 0, background: '#c9a84c', color: '#fff', borderRadius: '50%', width: 16, height: 16, fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  slideArea: { position: 'relative', minHeight: 460, display: 'flex', flexDirection: 'column', padding: '0 0 52px 0' },
  textBlock: { padding: '16px 26px 0', position: 'relative', zIndex: 2, cursor: 'pointer' },
  category: { fontFamily: "'Cormorant Garamond','Georgia',serif", fontWeight: 600, fontSize: 11, letterSpacing: '0.22em', color: '#c9a84c', margin: '0 0 6px' },
  goldRule: { width: 32, height: 1.5, background: '#c9a84c', marginBottom: 10 },
  goldRuleShort: { width: 24, height: 1.5, background: '#c9a84c', marginTop: 14 },
  headline: { fontFamily: "'Cormorant Garamond','Georgia',serif", fontWeight: 600, fontSize: 46, lineHeight: 1.08, color: '#2c1f14', margin: 0, letterSpacing: '-0.01em' },
  imageWrap: { position: 'absolute', bottom: 44, left: 0, right: 0, height: 300, zIndex: 1, cursor: 'pointer' },
  arrow: { position: 'absolute', bottom: 60, width: 40, height: 40, borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3 },
  arrowLeft: { left: 16, background: '#fff', boxShadow: '0 2px 8px rgba(74,55,40,0.12)' },
  arrowRight: { right: 16, background: '#c9a84c' },
  dots: { position: 'absolute', bottom: 16, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 6, zIndex: 3 },
  dot: { width: 22, height: 5, borderRadius: 3, background: '#ddd0be', border: 'none', cursor: 'pointer', padding: 0 },
  dotActive: { background: '#c9a84c' },
  badges: { display: 'flex', justifyContent: 'space-around', padding: '16px 10px 20px', background: '#faf8f4', borderTop: '1px solid #ede8df' },
  badgeItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 },
  badgeIcon: { fontSize: 22 },
  badgeLabel: { fontSize: 10, color: '#6b5544', textAlign: 'center', lineHeight: 1.3, maxWidth: 64 },
};
