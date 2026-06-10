'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BriefcaseBusiness,
  Diamond,
  Droplets,
  Feather,
  Heart,
  Layers,
  LockKeyhole,
  Menu,
  Package,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Tag,
  Truck,
  Umbrella,
  WalletCards,
} from 'lucide-react';

const DEFAULT_SLIDES = [
  {
    id: 'luggage',
    category: 'LUGGAGE',
    headline: 'Travel\nBeyond',
    link: '/category/luggage',
    image_url: 'https://images.unsplash.com/photo-1565026057447-bc90a3dceb87?auto=format&fit=crop&w=1200&q=90',
    badge_icons: ['truck', 'shield', 'refresh'],
    badge_labels: ['Free Delivery', '10 Year Warranty', 'Easy Returns'],
  },
  {
    id: 'handbags',
    category: 'HANDBAGS',
    headline: 'Elegance\nEveryday',
    link: '/category/handbags',
    image_url: 'https://images.unsplash.com/photo-1594223274512-ad4803739b7c?auto=format&fit=crop&w=1200&q=90',
    badge_icons: ['diamond', 'lock', 'heart'],
    badge_labels: ['Premium Quality', 'Secure Checkout', 'Timeless Design'],
  },
  {
    id: 'school-bags',
    category: 'SCHOOL BAGS',
    headline: 'Ready\nFor More',
    link: '/category/school-bags',
    image_url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1200&q=90',
    badge_icons: ['package', 'shield', 'droplet'],
    badge_labels: ['Spacious Storage', 'Durable Build', 'Water Resistant'],
  },
  {
    id: 'wallets',
    category: 'WALLETS',
    headline: 'Style In\nYour Pocket',
    link: '/category/wallets',
    image_url: 'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=1200&q=90',
    badge_icons: ['wallet', 'layers', 'shield'],
    badge_labels: ['Genuine Leather', 'Slim Design', 'RFID Protected'],
  },
  {
    id: 'travel-bags',
    category: 'TRAVEL BAGS',
    headline: 'Pack Your\nDreams',
    link: '/category/travel-bags',
    image_url: 'https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=1200&q=90',
    badge_icons: ['feather', 'umbrella', 'briefcase'],
    badge_labels: ['Lightweight', 'Waterproof', 'Extra Compartments'],
  },
  {
    id: 'accessories',
    category: 'ACCESSORIES',
    headline: 'Finish The\nLook',
    link: '/category/accessories',
    image_url: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=1200&q=90',
    badge_icons: ['sparkles', 'award', 'tag'],
    badge_labels: ['Trendy Design', 'Premium Quality', 'Best Price'],
  },
];

const ICONS = {
  truck: Truck,
  shield: ShieldCheck,
  refresh: RefreshCw,
  diamond: Diamond,
  sparkles: Sparkles,
  lock: LockKeyhole,
  heart: Heart,
  briefcase: BriefcaseBusiness,
  umbrella: Umbrella,
  package: Package,
  wallet: WalletCards,
  layers: Layers,
  droplet: Droplets,
  feather: Feather,
  award: Award,
  tag: Tag,
};

const SERIF = "'Playfair Display', Georgia, serif";
const SANS = "'Montserrat', system-ui, sans-serif";
const GOLD = '#c9a84c';
const GOLD_TEXT = '#b88124';

function normalizeSlide(slide, fallback) {
  const labels = Array.isArray(slide?.badge_labels) ? slide.badge_labels : [];
  const icons = Array.isArray(slide?.badge_icons) ? slide.badge_icons : [];
  return {
    id: slide?.id || fallback.id,
    category: slide?.category || fallback.category,
    headline: (slide?.headline || fallback.headline).replace(/\\n/g, '\n'),
    link: slide?.link || fallback.link,
    image_url: slide?.image_url || slide?.imageUrl || fallback.image_url,
    badge_labels: labels.length >= 3 ? labels.slice(0, 3) : fallback.badge_labels,
    badge_icons: icons.length >= 3 ? icons.slice(0, 3) : fallback.badge_icons,
  };
}

function mergeSlides(apiSlides) {
  return DEFAULT_SLIDES.map((fallback, index) => {
    const fromApi = apiSlides[index];
    return fromApi ? normalizeSlide(fromApi, fallback) : fallback;
  });
}

function formatBadgeLabel(label) {
  const words = String(label).split(' ');
  if (words.length < 2) return label;
  const mid = Math.ceil(words.length / 2);
  return `${words.slice(0, mid).join(' ')}\n${words.slice(mid).join(' ')}`;
}

const SWIPE_THRESHOLD = 48;
const AUTO_MS = 4000;

export default function HeroSlider({ slides = [], cartCount = 0, onMenuClick, onCartClick }) {
  const router = useRouter();
  const items = useMemo(() => mergeSlides(slides.length ? slides.slice(0, 6) : []), [slides]);
  const [active, setActive] = useState(0);
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const paused = useRef(false);
  const isDragging = useRef(false);

  const go = useCallback(
    (delta) => setActive((current) => (current + delta + items.length) % items.length),
    [items.length],
  );

  useEffect(() => {
    const id = 'hero-slider-fonts';
    if (document.getElementById(id)) return undefined;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Montserrat:wght@500;600;700&display=swap';
    document.head.appendChild(link);
    return undefined;
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      if (!paused.current) setActive((current) => (current + 1) % items.length);
    }, AUTO_MS);
    return () => clearInterval(timer);
  }, [items.length]);

  const slide = items[active] || DEFAULT_SLIDES[0];

  const onTouchStart = (event) => {
    touchStartX.current = event.touches[0].clientX;
    touchStartY.current = event.touches[0].clientY;
    isDragging.current = false;
    paused.current = true;
  };

  const onTouchMove = (event) => {
    if (touchStartX.current == null) return;
    const dx = Math.abs(event.touches[0].clientX - touchStartX.current);
    const dy = Math.abs(event.touches[0].clientY - touchStartY.current);
    if (dx > 10 || dy > 10) isDragging.current = true;
  };

  const onTouchEnd = (event) => {
    if (touchStartX.current == null) return;
    const delta = touchStartX.current - event.changedTouches[0].clientX;
    if (Math.abs(delta) > SWIPE_THRESHOLD) {
      go(delta > 0 ? 1 : -1);
    }
    touchStartX.current = null;
    window.setTimeout(() => { paused.current = false; }, AUTO_MS);
  };

  const handleSlideClick = () => {
    if (!isDragging.current) {
      router.push(slide.link || '/products');
    }
  };

  return (
    <section className="hero-slider-v3 w-full bg-[#faf8f4] pb-[72px] md:pb-8" data-hero="v3">
      <div
        className="relative mx-auto w-full max-w-[430px] overflow-hidden bg-[#f8f4ed] shadow-[0_18px_55px_rgba(44,31,20,0.14)] ring-1 ring-[#ede8df] md:rounded-[20px]"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Clickable hero image panel */}
        <div
          className="relative h-[min(78vh,680px)] min-h-[600px] max-h-[700px] overflow-hidden bg-[#faf8f4] sm:h-[690px] sm:min-h-[690px] sm:max-h-[690px] cursor-pointer"
          onClick={handleSlideClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && handleSlideClick()}
          aria-label={`Shop ${slide.category}`}
        >
          {items.map((item, index) => (
            <div
              key={`scene-${item.id}-${index}`}
              className={`absolute inset-x-0 bottom-[96px] top-[188px] z-[15] overflow-hidden transition-opacity duration-700 ${index === active ? 'opacity-100' : 'opacity-0'}`}
            >
              {item.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.image_url}
                  alt={item.category}
                  className="mx-auto h-full w-full max-w-[340px] object-contain object-bottom drop-shadow-[0_22px_48px_rgba(44,31,20,0.28)]"
                />
              ) : null}
            </div>
          ))}

          {/* Cream wash */}
          <div
            className="pointer-events-none absolute inset-0 z-10"
            style={{
              background:
                'linear-gradient(180deg, #faf8f4 0%, #faf8f4 26%, rgba(250,248,244,0.85) 40%, rgba(250,248,244,0.25) 62%, rgba(250,248,244,0.65) 100%)',
            }}
          />

          {/* Header — stop propagation so menu/cart buttons don't trigger slide click */}
          <header className="relative z-30 flex items-start justify-between px-7 pb-0 pt-7">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onMenuClick?.(); }}
              aria-label="Open menu"
              className="mt-2 text-[#111]"
            >
              <Menu className="h-7 w-7 stroke-[1.8]" />
            </button>
            <div className="text-center">
              <div
                className="text-[24px] font-bold uppercase leading-none tracking-[0.17em] text-black sm:text-[27px]"
                style={{ fontFamily: SERIF }}
              >
                SETHI PURSE
              </div>
              <div
                className="mt-3 text-[10px] font-semibold uppercase tracking-[0.56em] text-black"
                style={{ fontFamily: SANS }}
              >
                JALANDHAR
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onCartClick?.(); }}
              aria-label="Open cart"
              className="relative mt-1 text-[#111]"
            >
              <ShoppingBag className="h-8 w-8 stroke-[1.6]" />
              <span
                className="absolute -right-2 top-5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[12px] font-bold leading-none text-white"
                style={{ backgroundColor: GOLD }}
              >
                {cartCount || 0}
              </span>
            </button>
          </header>

          {/* Category + headline */}
          <div className="relative z-30 px-8 pt-2">
            <p
              className="text-[17px] font-bold uppercase tracking-[0.13em]"
              style={{ fontFamily: SANS, color: GOLD_TEXT }}
            >
              {slide.category}
            </p>
            <h1
              className="mt-4 whitespace-pre-line text-[32px] font-bold leading-[1.05] text-black sm:text-[38px]"
              style={{ fontFamily: SERIF }}
            >
              {slide.headline}
            </h1>
            <div className="mt-6 h-px w-10" style={{ backgroundColor: GOLD }} />
            {/* Shop Now hint */}
            <div className="mt-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white" style={{ backgroundColor: GOLD }}>
              Shop Now →
            </div>
          </div>

          {/* Arrows — stop propagation so they don't trigger slide click */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); go(-1); }}
            aria-label="Previous slide"
            className="absolute bottom-[118px] left-7 z-40 flex h-[62px] w-[62px] items-center justify-center rounded-full bg-white text-[#a07a28] shadow-[0_8px_24px_rgba(44,31,20,0.16)]"
          >
            <ArrowLeft className="h-6 w-6 stroke-[2]" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); go(1); }}
            aria-label="Next slide"
            className="absolute bottom-[118px] right-6 z-40 flex h-[62px] w-[62px] items-center justify-center rounded-full text-white shadow-[0_8px_24px_rgba(44,31,20,0.2)]"
            style={{ backgroundColor: GOLD }}
          >
            <ArrowRight className="h-6 w-6 stroke-[2]" />
          </button>

          {/* Dots */}
          <div className="absolute bottom-8 left-0 right-0 z-40 flex items-center justify-center gap-2">
            {items.map((item, index) => (
              <button
                key={`dot-${item.id}-${index}`}
                type="button"
                onClick={(e) => { e.stopPropagation(); setActive(index); }}
                aria-label={`Go to slide ${index + 1}`}
                aria-current={index === active ? 'true' : undefined}
                className="rounded-full transition-all duration-300"
                style={{
                  height: 8,
                  width: index === active ? 22 : 8,
                  backgroundColor: index === active ? GOLD : '#d8d6d2',
                }}
              />
            ))}
          </div>
        </div>

        {/* Badge strip */}
        <div className="grid grid-cols-3 bg-white px-2 py-7">
          {slide.badge_labels.map((label, index) => {
            const Icon = ICONS[slide.badge_icons[index]] || ShieldCheck;
            return (
              <div
                key={`${slide.id}-badge-${index}`}
                className={`flex flex-col items-center px-1 text-center ${index > 0 ? 'border-l border-[#ede8df]' : ''}`}
              >
                <Icon className="h-8 w-8 stroke-[1.55] text-[#2c1f14]" />
                <span
                  className="mt-3 whitespace-pre-line text-[15px] font-semibold leading-[1.2] text-black sm:text-[17px]"
                  style={{ fontFamily: SANS }}
                >
                  {formatBadgeLabel(label)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
