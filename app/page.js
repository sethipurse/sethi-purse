'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Award, MessageCircle, RefreshCw, Search, ShieldCheck, ShoppingBag, Sparkles, Truck, X } from 'lucide-react';
import HeroSlider from '@/components/HeroSlider';
import ProductCard from '@/components/ProductCard';
import OfferCard from '@/components/OfferCard';
import ReviewCard from '@/components/ReviewCard';
import Footer from '@/components/Footer';
import InstagramSection from '@/components/InstagramSection';
import DecideForMeModal from '@/components/DecideForMeModal';
import ProblemSearch from '@/components/ProblemSearch';
import Portal from '@/components/Portal';
import { buildCartOrderMessage, buildWhatsAppLink, cartTotal } from '@/lib/constants';
import { categoryPath } from '@/lib/categoryUtils';

const C = {
  bg: '#faf8f4',
  bgCard: '#fff',
  ivory: '#f5f0e8',
  gold: '#c9a84c',
  goldDark: '#a07a28',
  brown: '#2c1f14',
  brownMid: '#6b5544',
  brownLight: '#8a7060',
  border: '#ede8df',
};

function priceOf(product) {
  return product.sale_price ?? product.salePrice ?? product.price ?? 0;
}

function imageOf(item) {
  return item?.image_url || item?.imageUrl || '';
}

function SkeletonCard() {
  return <div className="h-[360px] animate-pulse rounded bg-white shadow-sm ring-1 ring-[#ede8df]" />;
}

export default function HomePage() {
  const [categories, setCategories] = useState([]);
  const [allProducts, setAllProducts] = useState([]); // FIX: store ALL products for search
  const [featuredProducts, setFeaturedProducts] = useState([]); // featured only for home display
  const [offers, setOffers] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [cart, setCart] = useState([]);
  const [decideOpen, setDecideOpen] = useState(false);
  const decideSectionRef = useRef(null);
  const [decideVisible, setDecideVisible] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('sethi-cart');
      if (saved) setCart(JSON.parse(saved));
    } catch {}
  }, []);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setDecideVisible(true); obs.disconnect(); } }, { threshold: 0.2 });
    if (decideSectionRef.current) obs.observe(decideSectionRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    let live = true;
    async function load() {
      setLoading(true);
      const endpoints = ['categories', 'products', 'offers', 'reviews'];
      const results = await Promise.all(
        endpoints.map((name) =>
          fetch(`/api/${name}`, { cache: 'no-store' })
            .then((r) => r.json())
            .catch(() => [])
        )
      );
      if (!live) return;
      const nextCategories = Array.isArray(results[0]) ? results[0] : [];
      const nextProducts = Array.isArray(results[1]) ? results[1].filter((p) => p.is_active !== false) : [];
      const nextOffers = Array.isArray(results[2]) ? results[2].filter((o) => o.is_active !== false) : [];
      const nextReviews = Array.isArray(results[3]) ? results[3].filter((r) => r.is_approved !== false) : [];

      setCategories(nextCategories);
      // FIX: store ALL products for search
      setAllProducts(nextProducts);
      // FIX: featured only for home display
      const featuredOnly = nextProducts.filter((p) => p.featured === true || p.featured === 1);
      setFeaturedProducts(featuredOnly.length > 0 ? featuredOnly : nextProducts);
      setOffers(nextOffers);
      setReviews(nextReviews);
      setLoading(false);
    }
    load();
    return () => { live = false; };
  }, []);

  // FIX: search across ALL products (not just featured)
  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return allProducts.filter((product) => {
      const productCategory = product.category || product.category_id || '';
      const text = `${product.name || ''} ${product.brand || ''} ${product.description || ''} ${productCategory}`.toLowerCase();
      return text.includes(q);
    });
  }, [allProducts, query]);

  const isSearching = query.trim().length > 0;

  const addToCart = (product) => {
    const next = [...cart, { id: product.id, name: product.name, price: priceOf(product), image: imageOf(product), qty: 1 }];
    setCart(next);
    window.localStorage.setItem('sethi-cart', JSON.stringify(next));
  };

  return (
    <main style={{ background: C.bg, color: C.brown }}>
      <HeroSlider cartCount={cart.reduce((s, i) => s + Math.max(1, Number(i.qty || 1)), 0)} onMenuClick={() => setMenuOpen(true)} onCartClick={() => setCartOpen(true)} />

      <section className="mx-auto grid w-full max-w-6xl gap-3 px-4 py-6 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: ShieldCheck, title: 'Original Brands', text: 'Trusted bags and luggage' },
          { icon: Truck, title: 'Fast Support', text: 'WhatsApp and store pickup' },
          { icon: Award, title: 'Premium Quality', text: 'Handpicked collection' },
          { icon: RefreshCw, title: 'Easy Guidance', text: 'We help you choose right' },
        ].map(({ icon: Icon, title, text }) => (
          <div key={title} className="rounded bg-white p-4 shadow-sm ring-1 ring-[#ede8df] transition hover:-translate-y-0.5 hover:shadow-md">
            <Icon className="h-7 w-7 text-[#c9a84c]" />
            <div className="mt-3 text-xl font-bold text-[#2c1f14]">{title}</div>
            <div className="text-base text-[#8a7060]">{text}</div>
          </div>
        ))}
      </section>

      {/* Decide for me CTA */}
      <section ref={decideSectionRef} className="mx-auto w-full max-w-6xl px-4 pb-6" style={{
        opacity: decideVisible ? 1 : 0,
        transform: decideVisible ? 'translateY(0)' : 'translateY(24px)',
        transition: 'opacity 0.6s ease, transform 0.6s ease',
      }}>
        {/* 3D Futuristic CTA */}
        <button
          type="button"
          onClick={() => setDecideOpen(true)}
          className="ftc3-scene w-full"
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'block' }}
        >
          <div className="ftc3-card">
            {/* All background effects inside clipped layer */}
            <div className="ftc3-bg">
              <div className="ftc3-grid" />
              <div className="ftc3-orb ftc3-orb1" />
              <div className="ftc3-orb ftc3-orb2" />
              <div className="ftc3-orb ftc3-orb3" />
              <div className="ftc3-scan" />
              <div className="ftc3-holo" />
            </div>
            {/* HUD corners */}
            <span className="ftc3-c ftc3-tl" />
            <span className="ftc3-c ftc3-tr" />
            <span className="ftc3-c ftc3-bl" />
            <span className="ftc3-c ftc3-br" />
            <div className="ftc3-top-rule" />
            {/* 3D content layers — each child floats at a different Z depth */}
            <div className="ftc3-content">
              <div className="ftc3-badge-wrap">
                <div className="ftc3-badge"><span className="ftc3-dot" />◈ AI · NEURAL SEARCH</div>
              </div>
              <div className="ftc3-emoji-wrap">
                <span className="ftc3-emoji">🤔</span>
              </div>
              <div className="ftc3-main-row">
                <span className="ftc3-confused">Confused?</span>
                <span className="ftc3-shimmer">Bas best wala de do</span>
                <span className="ftc3-arrow">→</span>
              </div>
              <p className="ftc3-sub">3 sawaal — hum aapke liye best product choose karenge</p>
            </div>
          </div>
        </button>
        <style>{`
          /* ── SCENE / PERSPECTIVE WRAPPER ── */
          .ftc3-scene {
            perspective: 900px;
            perspective-origin: 50% 45%;
            display: block;
          }
          .ftc3-scene:hover .ftc3-card { filter: brightness(1.13); }
          .ftc3-scene:active .ftc3-card { transform: rotateX(0deg) rotateY(0deg) scale(0.97) !important; animation: none !important; }

          /* ── CARD — rocks in 3D continuously ── */
          .ftc3-card {
            position: relative;
            border-radius: 20px;
            background: radial-gradient(ellipse at 25% 30%, #1e0d40, #0c0520 55%, #060210);
            padding: 34px 28px 26px;
            text-align: center;
            border: 1px solid rgba(140,60,255,0.35);
            transform-style: preserve-3d;
            animation: ftc3-rock 7s ease-in-out infinite;
            box-shadow:
              0 0 0 1px rgba(140,60,255,0.12),
              0 28px 80px rgba(80,20,200,0.55),
              0 0 140px rgba(100,30,220,0.2),
              inset 0 1px 0 rgba(255,255,255,0.06);
            transition: filter 0.3s ease;
          }
          @keyframes ftc3-rock {
            0%   { transform: rotateX(4deg)  rotateY(-2deg); }
            20%  { transform: rotateX(-1deg) rotateY(2.5deg); }
            40%  { transform: rotateX(3deg)  rotateY(1deg); }
            60%  { transform: rotateX(-2deg) rotateY(-1.5deg); }
            80%  { transform: rotateX(2.5deg) rotateY(-2.5deg); }
            100% { transform: rotateX(4deg)  rotateY(-2deg); }
          }

          /* ── BACKGROUND EFFECTS (clipped) ── */
          .ftc3-bg {
            position: absolute; inset: 0; border-radius: 19px;
            overflow: hidden; pointer-events: none;
          }

          /* perspective grid at base of card */
          .ftc3-grid {
            position: absolute;
            bottom: 0; left: -30%; right: -30%; height: 55%;
            background:
              linear-gradient(rgba(140,60,255,0.14) 1px, transparent 1px),
              linear-gradient(90deg, rgba(140,60,255,0.14) 1px, transparent 1px);
            background-size: 30px 30px;
            transform: perspective(180px) rotateX(58deg);
            transform-origin: bottom center;
            opacity: 0.7;
          }

          /* nebula orbs */
          .ftc3-orb { position: absolute; border-radius: 50%; filter: blur(65px); }
          .ftc3-orb1 { width:300px; height:300px; background:rgba(100,30,255,0.22); top:-110px; right:-80px; animation:ftc3-orb 8s ease-in-out infinite; }
          .ftc3-orb2 { width:220px; height:220px; background:rgba(201,168,76,0.13); bottom:-90px; left:-70px; animation:ftc3-orb 10s ease-in-out infinite reverse; }
          .ftc3-orb3 { width:170px; height:170px; background:rgba(0,180,255,0.1); top:10px; left:28%; animation:ftc3-orb 6s ease-in-out infinite 2s; }
          @keyframes ftc3-orb { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(22px,-16px) scale(1.08)} }

          /* scan line */
          .ftc3-scan {
            position: absolute; left:0; right:0; height:2px;
            background: linear-gradient(90deg, transparent, rgba(140,60,255,0.7), rgba(200,150,255,1), rgba(140,60,255,0.7), transparent);
            box-shadow: 0 0 18px rgba(140,60,255,0.9), 0 0 40px rgba(140,60,255,0.3);
            animation: ftc3-scan 3.5s ease-in-out infinite;
          }
          @keyframes ftc3-scan { 0%{top:0;opacity:0} 4%{opacity:1} 92%{opacity:1} 100%{top:100%;opacity:0} }

          /* holographic sheen */
          .ftc3-holo {
            position:absolute; inset:0;
            background: linear-gradient(125deg, transparent 20%, rgba(255,255,255,0.04) 40%, rgba(140,60,255,0.06) 60%, transparent 80%);
            animation: ftc3-holo 5s ease-in-out infinite;
          }
          @keyframes ftc3-holo { 0%,100%{opacity:0.5} 50%{opacity:1} }

          /* ── HUD CORNERS ── */
          .ftc3-c { position:absolute; width:18px; height:18px; border-color:rgba(160,80,255,0.85); border-style:solid; pointer-events:none; }
          .ftc3-tl { top:9px; left:9px; border-width:2px 0 0 2px; animation:ftc3-corner 4s ease-in-out infinite 0s; }
          .ftc3-tr { top:9px; right:9px; border-width:2px 2px 0 0; animation:ftc3-corner 4s ease-in-out infinite 1s; }
          .ftc3-bl { bottom:9px; left:9px; border-width:0 0 2px 2px; animation:ftc3-corner 4s ease-in-out infinite 2s; }
          .ftc3-br { bottom:9px; right:9px; border-width:0 2px 2px 0; animation:ftc3-corner 4s ease-in-out infinite 3s; }
          @keyframes ftc3-corner { 0%,100%{opacity:0.7} 50%{opacity:1;box-shadow:0 0 12px rgba(160,80,255,0.8)} }

          /* top rule */
          .ftc3-top-rule {
            position:absolute; top:0; left:50%; transform:translateX(-50%);
            width:50%; height:2px;
            background:linear-gradient(90deg,transparent,rgba(140,60,255,0.9),rgba(201,168,76,0.85),rgba(140,60,255,0.9),transparent);
            box-shadow:0 0 22px rgba(140,60,255,0.8),0 0 44px rgba(140,60,255,0.3);
            pointer-events:none;
          }

          /* ── 3D CONTENT ── */
          .ftc3-content { position:relative; transform-style:preserve-3d; }

          /* badge — Z+20 */
          .ftc3-badge-wrap { display:flex; justify-content:center; margin-bottom:14px; transform:translateZ(20px); }
          .ftc3-badge {
            display:inline-flex; align-items:center; gap:7px;
            font-size:9px; letter-spacing:0.35em; text-transform:uppercase;
            color:rgba(190,150,255,0.95); border:1px solid rgba(140,60,255,0.4);
            padding:5px 16px; border-radius:100px; background:rgba(100,30,255,0.12);
            font-family:monospace; font-weight:600;
            animation:ftc3-badge-glow 3s ease-in-out infinite;
          }
          @keyframes ftc3-badge-glow { 0%,100%{box-shadow:0 0 0 0 rgba(140,60,255,0)} 50%{box-shadow:0 0 0 3px rgba(140,60,255,0.18),0 0 22px rgba(140,60,255,0.22)} }
          .ftc3-dot { display:inline-block; width:5px; height:5px; border-radius:50%; background:#c9a84c; box-shadow:0 0 8px #c9a84c; animation:ftc3-blink 1.8s ease-in-out infinite; }
          @keyframes ftc3-blink { 0%,100%{opacity:1} 50%{opacity:0.1} }

          /* emoji — Z+30 */
          .ftc3-emoji-wrap { margin-bottom:6px; transform:translateZ(30px); }
          .ftc3-emoji {
            font-size:38px; display:inline-block;
            filter:drop-shadow(0 0 14px rgba(201,168,76,0.6)) drop-shadow(0 4px 12px rgba(100,30,255,0.5));
            animation:ftc3-emoji 4s ease-in-out infinite;
          }
          @keyframes ftc3-emoji {
            0%,100% { transform:translateY(0) scale(1) rotate(0deg); }
            30%  { transform:translateY(-12px) scale(1.12) rotate(-10deg); }
            65%  { transform:translateY(-6px) scale(1.06) rotate(6deg); }
          }

          /* main text row — Z+45 */
          .ftc3-main-row {
            display:flex; align-items:center; justify-content:center;
            gap:10px; flex-wrap:wrap; margin-bottom:10px;
            transform:translateZ(45px);
          }
          .ftc3-confused {
            font-size:21px; font-weight:900; color:#fff;
            font-family:'DM Sans',sans-serif; letter-spacing:-0.01em;
            animation:ftc3-white-pulse 4s ease-in-out infinite;
          }
          @keyframes ftc3-white-pulse { 0%,100%{text-shadow:0 0 18px rgba(255,255,255,0.2)} 50%{text-shadow:0 0 30px rgba(255,255,255,0.55),0 0 60px rgba(255,255,255,0.1)} }
          .ftc3-shimmer {
            font-size:21px; font-weight:900;
            background:linear-gradient(90deg,#c9a84c,#fff,#c9a84c,#b06aff,#fff,#c9a84c);
            background-size:400% auto;
            -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
            animation:ftc3-shimmer 2s linear infinite;
            font-family:'DM Sans',sans-serif;
          }
          @keyframes ftc3-shimmer { 0%{background-position:0% center} 100%{background-position:400% center} }

          /* arrow — Z+65 (most in front) */
          .ftc3-arrow {
            font-size:25px; color:#c9a84c; display:inline-block;
            transform:translateZ(65px);
            animation:ftc3-arrow 1.3s ease-in-out infinite;
          }
          @keyframes ftc3-arrow {
            0%,100% { transform:translateZ(65px) translateX(0) scale(1); text-shadow:0 0 20px rgba(201,168,76,1); }
            50%      { transform:translateZ(65px) translateX(10px) scale(1.25); text-shadow:0 0 30px rgba(201,168,76,1),0 0 60px rgba(201,168,76,0.6); }
          }

          /* sub text — Z+15 */
          .ftc3-sub {
            font-size:12px; color:rgba(190,160,255,0.45); letter-spacing:0.04em; margin:0;
            font-family:'DM Sans',sans-serif;
            transform:translateZ(15px);
            animation:ftc3-sub-pulse 5s ease-in-out infinite;
          }
          @keyframes ftc3-sub-pulse { 0%,100%{color:rgba(190,160,255,0.35)} 50%{color:rgba(190,160,255,0.65)} }
        `}</style>
      </section>

      {decideOpen && <DecideForMeModal onClose={() => setDecideOpen(false)} />}

      {/* FIX: Search bar + instant results shown RIGHT BELOW search */}
      <section className="mx-auto w-full max-w-6xl px-4 py-8">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8a7060]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search bags, luggage, brands, categories..."
            className="h-14 w-full rounded border border-[#ede8df] bg-white pl-12 pr-4 text-lg text-[#2c1f14] shadow-sm outline-none transition focus:border-[#c9a84c] focus:ring-2 focus:ring-[#e8d5a3]"
          />
          {query.length > 0 && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8a7060] hover:text-[#2c1f14]"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* FIX: Search results appear immediately below search bar */}
        {isSearching && (
          <div className="mt-4">
            <p className="mb-4 text-base text-[#8a7060]">
              {searchResults.length === 0
                ? 'No products found'
                : `${searchResults.length} product${searchResults.length > 1 ? 's' : ''} found for "${query}"`}
            </p>
            {searchResults.length > 0 && (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {searchResults.slice(0, 9).map((product) => (
                  <ProductCard key={product.id} product={product} onAddToCart={addToCart} />
                ))}
              </div>
            )}
            {searchResults.length === 0 && (
              <div className="rounded bg-white p-10 text-center ring-1 ring-[#ede8df]">
                <Sparkles className="mx-auto h-10 w-10 text-[#c9a84c]" />
                <h3 className="mt-3 text-2xl font-bold">No products found</h3>
                <p className="mt-1 text-[#8a7060]">Try another search term.</p>
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="mt-4 rounded bg-[#c9a84c] px-6 py-2 text-base font-semibold text-white hover:bg-[#a07a28]"
                >
                  Clear search
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* FIX: hide everything below when searching */}
      {!isSearching && (
        <>
          {offers.length > 0 && (
            <section className="mx-auto grid w-full max-w-6xl gap-4 px-4 pb-8 md:grid-cols-3">
              {offers.slice(0, 3).map((offer) => <OfferCard key={offer.id} offer={offer} compact />)}
            </section>
          )}

          <section className="mx-auto w-full max-w-6xl px-4 pb-8">
            <div className="flex gap-3 overflow-x-auto pb-3">
              {['All', ...categories.map((c) => c.name)].map((name) => (
                name === 'All' ? (
                  <Link key={name} href="/products"
                    className="shrink-0 rounded-full border border-[#ede8df] bg-white px-5 py-2 text-base font-semibold text-[#6b5544] transition hover:border-[#c9a84c] hover:text-[#a07a28]">
                    All
                  </Link>
                ) : (
                  <Link key={name} href={categoryPath(name)}
                    className="shrink-0 rounded-full border border-[#ede8df] bg-white px-5 py-2 text-base font-semibold text-[#6b5544] transition hover:border-[#c9a84c] hover:text-[#a07a28]">
                    {name}
                  </Link>
                )
              ))}
            </div>
          </section>

          <ProblemSearch allProducts={allProducts} />

          <section className="mx-auto w-full max-w-6xl px-4 pb-12">
            <h2 className="text-4xl font-bold text-[#c9a84c]">Shop by Category</h2>
            <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">
              {categories.map((category) => (
                <Link key={category.id || category.name} href={categoryPath(category.name)} className="group relative aspect-[4/5] overflow-hidden rounded bg-white text-left shadow-sm ring-1 ring-[#ede8df]">
                  {imageOf(category) ? <img src={imageOf(category)} alt={category.name} className="h-full w-full object-cover transition group-hover:scale-105" /> : <div className="h-full w-full bg-[#f5f0e8]" />}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#2c1f14]/80 to-transparent" />
                  <span className="absolute bottom-4 left-4 right-4 text-2xl font-bold text-white">{category.name}</span>
                </Link>
              ))}
            </div>
          </section>

          <section className="mx-auto w-full max-w-6xl px-4 pb-12">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-4xl font-bold text-[#c9a84c]">Featured Products</h2>
                <p className="mt-1 text-lg text-[#8a7060]">Premium picks from SETHI PURSE Jalandhar.</p>
              </div>
              <Link href="/products" className="hidden text-lg font-semibold text-[#a07a28] hover:underline md:inline">View all</Link>
            </div>
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {loading ? (
                Array.from({ length: 6 }).map((_, index) => <SkeletonCard key={index} />)
              ) : featuredProducts.length === 0 ? (
                <div className="col-span-full rounded bg-white p-10 text-center ring-1 ring-[#ede8df]">
                  <Sparkles className="mx-auto h-10 w-10 text-[#c9a84c]" />
                  <h3 className="mt-3 text-2xl font-bold">No products yet</h3>
                  <p className="mt-1 text-[#8a7060]">Check back soon!</p>
                </div>
              ) : (
                featuredProducts.slice(0, 9).map((product) => (
                  <ProductCard key={product.id} product={product} onAddToCart={addToCart} />
                ))
              )}
            </div>
          </section>

          {reviews.length > 0 && (
            <section className="bg-[#f5f0e8] py-12">
              <div className="mx-auto w-full max-w-6xl px-4">
                <h2 className="text-4xl font-bold text-[#c9a84c]">Customer Reviews</h2>
                <div className="mt-6 grid gap-5 md:grid-cols-3">
                  {reviews.slice(0, 3).map((review) => <ReviewCard key={review.id} review={review} />)}
                </div>
              </div>
            </section>
          )}

          <InstagramSection />
          <Footer />
        </>
      )}

      {menuOpen && (
        <Portal>
        <div className="fixed inset-0 bg-[#2c1f14]/35" style={{ zIndex: 100000 }} onClick={() => setMenuOpen(false)}>
          <aside className="h-full w-[310px] bg-white p-6 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold tracking-[0.16em]">SETHI PURSE</div>
                <div className="text-xs tracking-[0.42em]">JALANDHAR</div>
              </div>
              <button type="button" onClick={() => setMenuOpen(false)} aria-label="Close menu"><X className="h-6 w-6" /></button>
            </div>
            <nav className="mt-8 grid gap-3 text-xl font-semibold">
              <Link href="/products">All Products</Link>
              {categories.map((category) => <Link key={category.id || category.name} href={categoryPath(category.name)}>{category.name}</Link>)}
              <Link href="/offers">Offers</Link>
              <Link href="/reviews">Reviews</Link>
              <Link href="/contact">Contact</Link>
            </nav>
          </aside>
        </div>
        </Portal>
      )}

      {cartOpen && (
        <Portal>
        <div className="fixed inset-0 bg-[#2c1f14]/50" onClick={() => setCartOpen(false)} style={{ zIndex: 100000 }}>
          <aside
            className="fixed right-0 top-0 h-full w-full max-w-[380px] bg-white shadow-2xl flex flex-col"
            style={{ zIndex: 100001, position: 'fixed', top: 0, right: 0, height: '100dvh' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#ede8df] px-5 py-4 bg-[#2c1f14]">
              <div className="flex items-center gap-2 text-xl font-bold text-white">
                <ShoppingBag className="h-5 w-5 text-[#c9a84c]" /> Cart ({cart.reduce((s, i) => s + Math.max(1, Number(i.qty || 1)), 0)})
              </div>
              <button type="button" onClick={() => setCartOpen(false)} aria-label="Close cart" className="text-white hover:text-[#c9a84c] w-10 h-10 flex items-center justify-center">
                <X className="h-6 w-6" />
              </button>
            </div>

            {cart.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 text-[#8a7060] px-6">
                <ShoppingBag className="h-16 w-16 opacity-20" />
                <p className="text-xl font-bold text-[#2c1f14]">Your cart is empty</p>
                <p className="text-sm text-center">Browse our products and add items to your cart!</p>
                <button onClick={() => setCartOpen(false)} className="mt-2 rounded bg-[#c9a84c] px-6 py-2.5 text-sm font-bold text-[#2c1f14] hover:bg-[#a07a28]">
                  Browse Products
                </button>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto divide-y divide-[#ede8df]">
                  {cart.map((item, idx) => {
                    const buyMsg = `Hi SETHI PURSE, I want to buy: ${item.name} (Rs.${item.price?.toLocaleString('en-IN')}). Please confirm availability.`;
                    return (
                      <div key={idx} className="flex gap-3 px-4 py-4">
                        {item.image
                          ? <img src={item.image} alt={item.name} className="h-16 w-16 rounded-sm object-cover bg-[#f5f0e8] shrink-0" />
                          : <div className="h-16 w-16 rounded-sm bg-[#f5f0e8] shrink-0 flex items-center justify-center"><ShoppingBag className="h-6 w-6 text-[#c9a84c]" /></div>
                        }
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-[#2c1f14] text-sm leading-snug line-clamp-2">{item.name}</div>
                          <div className="text-[#c9a84c] font-bold text-sm mt-0.5">Rs.{item.price?.toLocaleString('en-IN')}</div>
                          <a href={buildWhatsAppLink(buyMsg)} target="_blank" rel="noopener noreferrer"
                            className="mt-2 inline-flex items-center gap-1.5 rounded bg-[#25D366] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#1ebe5c]">
                            <MessageCircle className="h-3.5 w-3.5" /> Buy Now
                          </a>
                        </div>
                        <button type="button" onClick={() => {
                          const next = cart.filter((_, i) => i !== idx);
                          setCart(next);
                          window.localStorage.setItem('sethi-cart', JSON.stringify(next));
                        }} className="text-[#8a7060] hover:text-red-500 p-1 self-start mt-1 shrink-0" aria-label="Remove">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
                <div className="border-t-2 border-[#ede8df] px-5 py-4 space-y-3 bg-[#faf8f4]">
                  <div className="flex justify-between font-bold text-[#2c1f14] text-lg">
                    <span>Total ({cart.length} item{cart.length > 1 ? 's' : ''})</span>
                    <span className="text-[#c9a84c]">Rs.{cartTotal(cart).toLocaleString('en-IN')}</span>
                  </div>
                  <a href={buildWhatsAppLink(buildCartOrderMessage(cart))} target="_blank" rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-2 rounded bg-[#25D366] py-3.5 text-base font-bold text-white hover:bg-[#1ebe5c] active:scale-95 transition-transform">
                    <MessageCircle className="h-5 w-5" /> Order All via WhatsApp
                  </a>
                  <button type="button" onClick={() => { setCart([]); window.localStorage.removeItem('sethi-cart'); }}
                    className="w-full text-sm text-[#8a7060] hover:text-red-500 py-1">
                    Clear cart
                  </button>
                </div>
              </>
            )}
          </aside>
        </div>
        </Portal>
      )}
    </main>
  );
}
