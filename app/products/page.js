'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Search, Sparkles, X } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import { categoryPath } from '@/lib/categoryUtils';

function SkeletonCard() {
  return <div className="h-[360px] animate-pulse rounded bg-white shadow-sm ring-1 ring-[#ede8df]" />;
}

function ProductsContent() {
  const searchParams = useSearchParams();
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => {
    const cat = searchParams.get('category');
    if (cat) setActiveCategory(decodeURIComponent(cat));
  }, [searchParams]);

  useEffect(() => {
    let live = true;
    async function load() {
      setLoading(true);
      const [cats, prods] = await Promise.all([
        fetch('/api/categories', { cache: 'no-store' }).then((r) => r.json()).catch(() => []),
        fetch('/api/products', { cache: 'no-store' }).then((r) => r.json()).catch(() => []),
      ]);
      if (!live) return;
      setCategories(Array.isArray(cats) ? cats : []);
      setProducts(Array.isArray(prods) ? prods.filter((p) => p.is_active !== false) : []);
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

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <h1 className="text-4xl font-bold text-[#c9a84c] mb-6">Our Collection</h1>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8a7060]" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search bags, luggage, brands..."
          className="h-14 w-full rounded border border-[#ede8df] bg-white pl-12 pr-4 text-lg text-[#2c1f14] shadow-sm outline-none transition focus:border-[#c9a84c] focus:ring-2 focus:ring-[#e8d5a3]"
        />
        {query.length > 0 && (
          <button type="button" onClick={() => setQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8a7060] hover:text-[#2c1f14]">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
      {query.length > 0 && (
        <p className="mb-4 text-base text-[#8a7060]">
          {filteredProducts.length === 0 ? 'No products found' : `${filteredProducts.length} product${filteredProducts.length > 1 ? 's' : ''} found`}
        </p>
      )}

      {/* Category filters */}
      <div className="flex gap-3 overflow-x-auto pb-4 mb-6">
        {['All', ...categories.map((c) => c.name)].map((name) => (
          name === 'All' ? (
            <button
              key={name}
              type="button"
              onClick={() => setActiveCategory(name)}
              className={`shrink-0 rounded-full border px-5 py-2 text-base font-semibold transition ${activeCategory === name ? 'border-[#c9a84c] bg-[#c9a84c] text-white' : 'border-[#ede8df] bg-white text-[#6b5544] hover:border-[#c9a84c]'}`}
            >
              {name}
            </button>
          ) : (
            <Link
              key={name}
              href={categoryPath(name)}
              className="shrink-0 rounded-full border border-[#ede8df] bg-white px-5 py-2 text-base font-semibold text-[#6b5544] transition hover:border-[#c9a84c] hover:text-[#a07a28]"
            >
              {name}
            </Link>
          )
        ))}
      </div>

      {/* Products grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
        ) : filteredProducts.length === 0 ? (
          <div className="col-span-full rounded bg-white p-10 text-center ring-1 ring-[#ede8df]">
            <Sparkles className="mx-auto h-10 w-10 text-[#c9a84c]" />
            <h3 className="mt-3 text-2xl font-bold text-[#2c1f14]">No products found</h3>
            <p className="mt-1 text-[#8a7060]">Try another search or category.</p>
            {(query || activeCategory !== 'All') && (
              <button
                type="button"
                onClick={() => { setQuery(''); setActiveCategory('All'); }}
                className="mt-4 rounded bg-[#c9a84c] px-6 py-2 text-base font-semibold text-white hover:bg-[#a07a28]"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))
        )}
      </div>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <>
      <Navbar />
      <main className="bg-[#faf8f4] min-h-screen">
        {/* Suspense wrapper required by Next.js for useSearchParams */}
        <Suspense fallback={
          <div className="mx-auto w-full max-w-6xl px-4 py-10">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-[360px] animate-pulse rounded bg-white shadow-sm ring-1 ring-[#ede8df]" />
              ))}
            </div>
          </div>
        }>
          <ProductsContent />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
