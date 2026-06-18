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
  const [isDesktop, setIsDesktop] = useState(false);
  const animRef = useRef(false);

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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

  // ── Sticky Header ──
  const StickyHeader = () => (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
      background: '#faf8f4',
      borderBottom: scrolled ? '1px solid #ede8df' : '1px solid transparent',
      boxShadow: scrolled ? '0 2px 12px rgba(44,31,20,0.10)' : 'none',
      transition: 'box-shadow 0.3s ease, border-color 0.3s ease',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 20px',
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

  if (loading) {
    return (
      <>
        <StickyHeader />
        <div style={{ ...S.card(isDesktop), marginTop: 56 }}>
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
        <div style={{ ...S.card(isDesktop), marginTop: 56 }} />
      </>
    );
  }

  const slide = slides[current];
  const badgeLabels = Array.isArray(slide.badge_labels) && slide.badge_labels.length > 0
    ? slide.badge_labels : ['Free Delivery', 'Premium Quality', 'Easy Returns'];
  const categoryLink = slide.category ? categoryPath(slide.category) : '/products';

  return (
    <>
      <StickyHeader />
      <div style={{ ...S.card(isDesktop), marginTop: 56 }}>
        <div style={S.slideArea(isDesktop)}>
          {/* Text block */}
          <div style={S.textBlock(isDesktop)}>
            {slide.category && <p style={S.category}>{slide.category}</p>}
            <div style={S.goldRule} />
            <h1 style={S.headline(isDesktop)}>{slide.headline || 'Shop Now'}</h1>
            <Link href={categoryLink} style={{ textDecoration: 'none' }}>
              <div style={S.shopBtn(isDesktop)}>Shop Now →</div>
            </Link>
          </div>

          {/* Product image */}
          <Link href={categoryLink} style={{ textDecoration: 'none' }}>
            <div style={{
              ...S.imageWrap(isDesktop),
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
                <ChevronLeft size={isDesktop ? 18 : 13} color="#4a3728" />
              </button>
              <button onClick={next} style={{ ...S.arrow, ...S.arrowRight(isDesktop) }} aria-label="Next">
                <ChevronRight size={isDesktop ? 18 : 13} color="#fff" />
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
        <div style={S.badges(isDesktop)}>
          {badgeLabels.slice(0, 3).map((label, i) => (
            <div key={i} style={S.badgeItem(isDesktop)}>
              <span style={S.badgeIcon(isDesktop)}>{['🚚', '🛡️', '↩️'][i] || '✨'}</span>
              <span style={S.badgeLabel(isDesktop)}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

const S = {
  // ✅ Full width on desktop, mobile card style on mobile
  card: (isDesktop) => ({
    width: '100%',
    maxWidth: isDesktop ? '100%' : 390,
    margin: '0 auto',
    background: isDesktop ? 'linear-gradient(135deg, #faf8f4 0%, #f5f0e8 100%)' : '#faf8f4',
    borderRadius: isDesktop ? 0 : 28,
    overflow: 'hidden',
    boxShadow: isDesktop ? 'none' : '0 8px 40px rgba(74,55,40,0.13)',
    fontFamily: "'Cormorant Garamond','Georgia',serif",
    display: 'flex', flexDirection: 'column',
  }),

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

  slideArea: (isDesktop) => ({
    position: 'relative',
    minHeight: isDesktop ? 520 : 440,
    display: 'flex', flexDirection: 'column',
    padding: isDesktop ? '0 0 60px 0' : '0 0 52px 0',
    maxWidth: isDesktop ? 1200 : '100%',
    margin: isDesktop ? '0 auto' : 0,
    width: '100%',
  }),

  textBlock: (isDesktop) => ({
    padding: isDesktop ? '48px 0 0 48px' : '20px 0 0 22px',
    position: 'relative', zIndex: 2,
    width: isDesktop ? '45%' : '72%',
  }),

  category: {
    fontFamily: "'Cormorant Garamond','Georgia',serif",
    fontWeight: 700, fontSize: 14, letterSpacing: '0.25em',
    color: '#2c1f14', margin: '0 0 8px', textTransform: 'uppercase',
    opacity: 1,
    background: 'linear-gradient(90deg, #c9a84c, #a07a28)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  goldRule: { width: 40, height: 3, background: '#c9a84c', marginBottom: 12, borderRadius: 2 },

  headline: (isDesktop) => ({
    fontFamily: "'Cormorant Garamond','Georgia',serif",
    fontWeight: 700,
    fontSize: isDesktop ? 52 : 22,
    lineHeight: 1.1,
    color: '#2c1f14',
    margin: isDesktop ? '0 0 28px 0' : '0 0 16px 0',
    letterSpacing: '-0.01em',
    whiteSpace: 'pre-line',
  }),

  shopBtn: (isDesktop) => ({
    display: 'inline-block',
    background: '#c9a84c', color: '#fff',
    fontFamily: "'Cormorant Garamond','Georgia',serif",
    fontWeight: 700,
    fontSize: isDesktop ? 18 : 14,
    letterSpacing: '0.03em',
    padding: isDesktop ? '12px 32px' : '9px 20px',
    borderRadius: 24, cursor: 'pointer', whiteSpace: 'nowrap',
  }),

  imageWrap: (isDesktop) => ({
    position: 'absolute',
    bottom: isDesktop ? 40 : 44,
    left: isDesktop ? '42%' : '28%',
    right: isDesktop ? 48 : 0,
    height: isDesktop ? 440 : 300,
    zIndex: 1, cursor: 'pointer',
  }),

  arrow: {
    position: 'absolute', bottom: 68,
    width: 36, height: 36, borderRadius: '50%',
    border: 'none', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3,
  },
  arrowLeft: { left: 16, background: '#fff', boxShadow: '0 2px 6px rgba(74,55,40,0.15)' },
  arrowRight: (isDesktop) => ({ right: isDesktop ? 16 : 10, background: '#c9a84c' }),

  dots: {
    position: 'absolute', bottom: 20, left: 0, right: 0,
    display: 'flex', justifyContent: 'center', gap: 6, zIndex: 3,
  },
  dot: { width: 18, height: 4, borderRadius: 3, background: '#ddd0be', border: 'none', cursor: 'pointer', padding: 0 },
  dotActive: { background: '#c9a84c' },

  badges: (isDesktop) => ({
    display: 'flex', justifyContent: isDesktop ? 'center' : 'space-around',
    gap: isDesktop ? 80 : 0,
    padding: isDesktop ? '20px 48px 24px' : '14px 10px 18px',
    background: '#faf8f4',
    borderTop: '1px solid #ede8df',
  }),
  badgeItem: (isDesktop) => ({ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: isDesktop ? 0 : 1 }),
  badgeIcon: (isDesktop) => ({ fontSize: isDesktop ? 28 : 20 }),
  badgeLabel: (isDesktop) => ({ fontSize: isDesktop ? 13 : 10, color: '#6b5544', textAlign: 'center', lineHeight: 1.3, maxWidth: isDesktop ? 120 : 64 }),
};
