'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Award, RefreshCw, Search, ShieldCheck, Sparkles, Truck, X } from 'lucide-react';
import HeroSlider from '@/components/HeroSlider';
import ProductCard from '@/components/ProductCard';
import OfferCard from '@/components/OfferCard';
import ReviewCard from '@/components/ReviewCard';
import Footer from '@/components/Footer';
import InstagramSection from '@/components/InstagramSection';
import ProblemSearch from '@/components/ProblemSearch';
import Portal from '@/components/Portal';
import { categoryPath, toTitleCase } from '@/lib/categoryUtils';
import { detectCategory } from '@/lib/categoryMatch';

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

export default function HomePageClient({ categories, allProducts, featuredProducts, offers, reviews }) {
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [cart, setCart] = useState([]);

  useEffect(() => {
    const readCart = () => {
      try {
        const saved = window.localStorage.getItem('sethi-cart');
        setCart(saved ? JSON.parse(saved) : []);
      } catch { setCart([]); }
    };
    readCart();
    window.addEventListener('cart-updated', readCart);
    window.addEventListener('storage', readCart);
    return () => {
      window.removeEventListener('cart-updated', readCart);
      window.removeEventListener('storage', readCart);
    };
  }, []);

  // FIX: search across ALL products (not just featured)
  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const textMatches = allProducts.filter((product) => {
      const productCategory = product.category || product.category_id || '';
      const text = `${product.name || ''} ${product.brand || ''} ${product.description || ''} ${productCategory}`.toLowerCase();
      return text.includes(q);
    });
    // Also pull in the whole category the search term implies (e.g. "trolley"
    // -> LUGGAGE), even for products whose own name/description don't
    // literally contain that word, so category searches stay relevant
    // instead of only relying on exact substring matches.
    const detectedCategory = detectCategory(query, categories.map((c) => c.name));
    if (detectedCategory === 'Other') return textMatches;
    const categoryMatches = allProducts.filter(
      (product) => (product.category || product.category_id || '').toLowerCase() === detectedCategory.toLowerCase()
    );
    const merged = new Map();
    [...textMatches, ...categoryMatches].forEach((p) => merged.set(p.id, p));

    // A category match can pull in dozens of products that only match via
    // category, not the search text (e.g. many similarly-named backpacks for
    // "school bag") — rank the ones whose own name/description actually
    // mention a query word first, so the most relevant one isn't buried in
    // an arbitrary list of otherwise-identical results.
    const queryWords = q.split(/\s+/).filter((w) => w.length > 2);
    const mentionsQuery = (product) => {
      const text = `${product.name || ''} ${product.description || ''}`.toLowerCase();
      return queryWords.some((w) => text.includes(w));
    };
    return Array.from(merged.values()).sort((a, b) => {
      const ma = mentionsQuery(a), mb = mentionsQuery(b);
      if (ma !== mb) return mb ? 1 : -1;
      if (!!b.featured !== !!a.featured) return b.featured ? 1 : -1;
      return (b.discount_percent || 0) - (a.discount_percent || 0);
    });
  }, [allProducts, categories, query]);

  const isSearching = query.trim().length > 0;

  const addToCart = (product) => {
    const next = [...cart, { id: product.id, name: product.name, price: priceOf(product), image: imageOf(product), qty: 1 }];
    setCart(next);
    window.localStorage.setItem('sethi-cart', JSON.stringify(next));
  };

  return (
    <main style={{ background: C.bg, color: C.brown }}>
      <HeroSlider cartCount={cart.reduce((s, i) => s + Math.max(1, Number(i.qty || 1)), 0)} onMenuClick={() => setMenuOpen(true)} onCartClick={() => window.dispatchEvent(new Event('open-cart'))} />

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
                    {toTitleCase(name)}
                  </Link>
                )
              ))}
            </div>
          </section>

          {/* FIX: offers render below the (always-in-place) category row so nav doesn't shift when a promo is live */}
          {offers.length > 0 && (() => {
            const shownOffers = offers.slice(0, 3);
            const cardWidth = shownOffers.length === 1
              ? 'w-full max-w-sm'
              : shownOffers.length === 2
                ? 'w-full max-w-sm sm:w-[calc(50%-0.5rem)]'
                : 'w-full max-w-sm sm:w-[calc(50%-0.5rem)] md:w-[calc(33.333%-0.667rem)]';
            return (
              <section className="mx-auto flex w-full max-w-6xl flex-wrap justify-center gap-4 px-4 pb-8">
                {shownOffers.map((offer) => (
                  <div key={offer.id} className={cardWidth}>
                    <OfferCard offer={offer} compact />
                  </div>
                ))}
              </section>
            );
          })()}

          <ProblemSearch allProducts={allProducts} />

          <section className="mx-auto w-full max-w-6xl px-4 pb-12">
            <h2 className="text-4xl font-bold text-[#c9a84c]">Shop by Category</h2>
            <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">
              {categories.map((category) => (
                <Link key={category.id || category.name} href={categoryPath(category.name)} className="group relative aspect-[4/5] overflow-hidden rounded bg-white text-left shadow-sm ring-1 ring-[#ede8df]">
                  {imageOf(category) ? <img src={imageOf(category)} alt={category.name} className="h-full w-full object-cover transition group-hover:scale-105" /> : <div className="h-full w-full bg-[#f5f0e8]" />}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#2c1f14]/80 to-transparent" />
                  <span className="absolute bottom-4 left-4 right-4 text-2xl font-bold text-white">{toTitleCase(category.name)}</span>
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
              {featuredProducts.length === 0 ? (
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
              {categories.map((category) => <Link key={category.id || category.name} href={categoryPath(category.name)}>{toTitleCase(category.name)}</Link>)}
              <Link href="/offers">Offers</Link>
              <Link href="/reviews">Reviews</Link>
              <Link href="/contact">Contact</Link>
            </nav>
          </aside>
        </div>
        </Portal>
      )}
    </main>
  );
}
