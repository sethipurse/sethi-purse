'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Award, MessageCircle, RefreshCw, Search, ShieldCheck, ShoppingBag, Sparkles, Truck, X } from 'lucide-react';
import HeroSlider from '@/components/HeroSlider';
import ProductCard from '@/components/ProductCard';
import OfferCard from '@/components/OfferCard';
import ReviewCard from '@/components/ReviewCard';
import Footer from '@/components/Footer';
import InstagramSection from '@/components/InstagramSection';
import ProblemSearch from '@/components/ProblemSearch';
import Portal from '@/components/Portal';
import { buildCartOrderMessage, buildWhatsAppLink, cartTotal } from '@/lib/constants';
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

export default function HomeClient({
  initialCategories = [],
  initialProducts = [],
  initialOffers = [],
  initialReviews = [],
  initialSlides = [],
}) {
  // Data arrives already fetched server-side (see app/page.js), so the
  // homepage has real content on first paint instead of a blank/skeleton
  // page that only fills in after the client JS loads and fetches.
  const [categories] = useState(initialCategories);
  const [allProducts] = useState(initialProducts); // FIX: store ALL products for search
  const [offers] = useState(initialOffers);
  const [reviews] = useState(initialReviews);
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [cart, setCart] = useState([]);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('sethi-cart');
      if (saved) setCart(JSON.parse(saved));
    } catch {}
  }, []);

  const featuredProducts = useMemo(() => {
    const featuredOnly = allProducts.filter((p) => p.featured === true || p.featured === 1);
    return featuredOnly.length > 0 ? featuredOnly : allProducts;
  }, [allProducts]);

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
    return Array.from(merged.values());
  }, [allProducts, categories, query]);

  const isSearching = query.trim().length > 0;

  const addToCart = (product) => {
    const next = [...cart, { id: product.id, name: product.name, price: priceOf(product), image: imageOf(product), qty: 1 }];
    setCart(next);
    window.localStorage.setItem('sethi-cart', JSON.stringify(next));
  };

  return (
    <main style={{ background: C.bg, color: C.brown }}>
      <HeroSlider slides={initialSlides} cartCount={cart.reduce((s, i) => s + Math.max(1, Number(i.qty || 1)), 0)} onMenuClick={() => setMenuOpen(true)} onCartClick={() => setCartOpen(true)} />

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
                    {toTitleCase(name)}
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
