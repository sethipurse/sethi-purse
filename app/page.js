'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Award, RefreshCw, Search, ShieldCheck, ShoppingBag, Sparkles, Truck, X } from 'lucide-react';
import HeroSlider from '@/components/HeroSlider';
import ProductCard from '@/components/ProductCard';
import OfferCard from '@/components/OfferCard';
import ReviewCard from '@/components/ReviewCard';
import Footer from '@/components/Footer';
import { DEMO_CATEGORIES, DEMO_OFFERS, DEMO_PRODUCTS, DEMO_REVIEWS } from '@/lib/demo-data';

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
  const [slides, setSlides] = useState([]);
  const [categories, setCategories] = useState(DEMO_CATEGORIES);
  const [products, setProducts] = useState(DEMO_PRODUCTS);
  const [offers, setOffers] = useState(DEMO_OFFERS);
  const [reviews, setReviews] = useState(DEMO_REVIEWS);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [menuOpen, setMenuOpen] = useState(false);
  const [cart, setCart] = useState([]);

  useEffect(() => {
    const saved = window.localStorage.getItem('sethi-cart');
    if (saved) setCart(JSON.parse(saved));
  }, []);

  useEffect(() => {
    let live = true;
    async function load() {
      setLoading(true);
      const endpoints = ['slider-images', 'categories', 'products', 'offers', 'reviews'];
      const results = await Promise.all(endpoints.map((name) => fetch(`/api/${name}`, { cache: 'no-store' }).then((r) => r.json()).catch(() => [])));
      if (!live) return;
      const nextSlides = Array.isArray(results[0]) ? results[0].filter((s) => s.is_active !== false) : [];
      const nextCategories = Array.isArray(results[1]) ? results[1] : [];
      const nextProducts = Array.isArray(results[2]) ? results[2].filter((p) => p.is_active !== false) : [];
      const nextOffers = Array.isArray(results[3]) ? results[3].filter((o) => o.is_active !== false) : [];
      const nextReviews = Array.isArray(results[4]) ? results[4].filter((r) => r.is_approved !== false) : [];
      setSlides(nextSlides);
      setCategories(nextCategories.length ? nextCategories : DEMO_CATEGORIES);
      setProducts(nextProducts.length ? nextProducts : DEMO_PRODUCTS);
      setOffers(nextOffers.length ? nextOffers : DEMO_OFFERS);
      setReviews(nextReviews.length ? nextReviews : DEMO_REVIEWS);
      setLoading(false);
    }
    load();
    return () => { live = false; };
  }, []);

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((product) => {
      const productCategory = product.category || product.category_id || '';
      const categoryMatch = activeCategory === 'All' || productCategory === activeCategory;
      const text = `${product.name || ''} ${product.brand || ''} ${product.description || ''} ${productCategory}`.toLowerCase();
      return categoryMatch && (!q || text.includes(q));
    });
  }, [activeCategory, products, query]);
  const visibleProducts = filteredProducts.length ? filteredProducts : DEMO_PRODUCTS;

  const addToCart = (product) => {
    const next = [...cart, { id: product.id, name: product.name, price: priceOf(product), image: imageOf(product), qty: 1 }];
    setCart(next);
    window.localStorage.setItem('sethi-cart', JSON.stringify(next));
  };

  return (
    <main style={{ background: C.bg, color: C.brown }}>
      <HeroSlider slides={slides} cartCount={cart.length} onMenuClick={() => setMenuOpen(true)} onCartClick={() => setMenuOpen(true)} />

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

      <section className="mx-auto w-full max-w-6xl px-4 py-8">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8a7060]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search bags, luggage, brands..."
            className="h-14 w-full rounded border border-[#ede8df] bg-white pl-12 pr-4 text-lg text-[#2c1f14] shadow-sm outline-none transition focus:border-[#c9a84c] focus:ring-2 focus:ring-[#e8d5a3]"
          />
        </div>
      </section>

      {offers.length > 0 && (
        <section className="mx-auto grid w-full max-w-6xl gap-4 px-4 pb-8 md:grid-cols-3">
          {offers.slice(0, 3).map((offer) => <OfferCard key={offer.id} offer={offer} compact />)}
        </section>
      )}

      <section className="mx-auto w-full max-w-6xl px-4 pb-8">
        <div className="flex gap-3 overflow-x-auto pb-3">
          {['All', ...categories.map((c) => c.name)].map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setActiveCategory(name)}
              className={`shrink-0 rounded-full border px-5 py-2 text-base font-semibold transition ${activeCategory === name ? 'border-[#c9a84c] bg-[#c9a84c] text-white' : 'border-[#ede8df] bg-white text-[#6b5544]'}`}
            >
              {name}
            </button>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-12">
        <h2 className="text-4xl font-bold text-[#c9a84c]">Shop by Category</h2>
        <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">
          {categories.map((category) => (
            <button key={category.id || category.name} type="button" onClick={() => setActiveCategory(category.name)} className="group relative aspect-[4/5] overflow-hidden rounded bg-white text-left shadow-sm ring-1 ring-[#ede8df]">
              {imageOf(category) ? <img src={imageOf(category)} alt={category.name} className="h-full w-full object-cover transition group-hover:scale-105" /> : <div className="h-full w-full bg-[#f5f0e8]" />}
              <div className="absolute inset-0 bg-gradient-to-t from-[#2c1f14]/80 to-transparent" />
              <span className="absolute bottom-4 left-4 right-4 text-2xl font-bold text-white">{category.name}</span>
            </button>
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
          {loading ? Array.from({ length: 6 }).map((_, index) => <SkeletonCard key={index} />) : visibleProducts.length === 0 ? (
            <div className="col-span-full rounded bg-white p-10 text-center ring-1 ring-[#ede8df]">
              <Sparkles className="mx-auto h-10 w-10 text-[#c9a84c]" />
              <h3 className="mt-3 text-2xl font-bold">No products found</h3>
              <p className="mt-1 text-[#8a7060]">Try another search or category.</p>
            </div>
          ) : visibleProducts.slice(0, 9).map((product) => (
            <div key={product.id} className="relative">
              <ProductCard product={product} />
              <button type="button" onClick={() => addToCart(product)} className="absolute bottom-5 left-5 right-5 flex h-11 translate-y-[-54px] items-center justify-center gap-2 rounded bg-white/95 text-base font-bold text-[#2c1f14] shadow transition hover:bg-[#c9a84c] hover:text-white">
                <ShoppingBag className="h-4 w-4" /> Add to Cart
              </button>
            </div>
          ))}
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

      {menuOpen && (
        <div className="fixed inset-0 z-50 bg-[#2c1f14]/35" onClick={() => setMenuOpen(false)}>
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
              {categories.map((category) => <Link key={category.id || category.name} href={`/products?category=${encodeURIComponent(category.name)}`}>{category.name}</Link>)}
              <Link href="/offers">Offers</Link>
              <Link href="/reviews">Reviews</Link>
              <Link href="/contact">Contact</Link>
            </nav>
            <div className="mt-8 border-t border-[#ede8df] pt-5 text-lg text-[#6b5544]">Cart items: {cart.length}</div>
          </aside>
        </div>
      )}

      <Footer />
    </main>
  );
}
