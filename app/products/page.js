'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Search, Sparkles, X, SlidersHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import { categoryPath } from '@/lib/categoryUtils';

const PRICE_RANGES = [
  { label: '₹500 – ₹2,000', min: 500, max: 2000 },
  { label: '₹2,000 – ₹5,000', min: 2000, max: 5000 },
  { label: '₹5,000+', min: 5000, max: Infinity },
];

const BRANDS = ['American Tourister', 'Safari', 'Genie', 'Arctic Fox'];
const PRODUCTS_PER_PAGE = 12;

function SkeletonCard() {
  return <div className="h-[360px] animate-pulse rounded bg-white shadow-sm ring-1 ring-[#ede8df]" />;
}

function FilterPanel({ selectedPrice, selectedBrands, onPriceClick, onBrandClick, onClear, hasFilters }) {
  return (
    <div className="bg-white border border-[#ede8df] rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-[#c9a84c]" />
          <h3 className="font-semibold text-[#2c1f14] text-base">Filters</h3>
        </div>
        {hasFilters && (
          <button onClick={onClear} className="text-sm text-red-500 hover:text-red-700 font-medium">Clear All</button>
        )}
      </div>
      <div className="mb-5">
        <p className="text-xs font-semibold text-[#8a7060] uppercase tracking-wider mb-2">Price Range</p>
        <div className="flex flex-col gap-2">
          {PRICE_RANGES.map((range) => (
            <button key={range.label} onClick={() => onPriceClick(range)}
              className={`text-left px-3 py-2 rounded-lg text-sm border transition-all ${selectedPrice?.label === range.label ? 'bg-[#c9a84c] text-white border-[#c9a84c] font-semibold' : 'bg-[#faf8f4] text-[#6b5544] border-[#ede8df] hover:border-[#c9a84c] hover:bg-[#fdf4e3]'}`}>
              {range.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold text-[#8a7060] uppercase tracking-wider mb-2">Brand</p>
        <div className="flex flex-col gap-2">
          {BRANDS.map((brand) => (
            <button key={brand} onClick={() => onBrandClick(brand)}
              className={`text-left px-3 py-2 rounded-lg text-sm border transition-all ${selectedBrands.includes(brand) ? 'bg-[#c9a84c] text-white border-[#c9a84c] font-semibold' : 'bg-[#faf8f4] text-[#6b5544] border-[#ede8df] hover:border-[#c9a84c] hover:bg-[#fdf4e3]'}`}>
              {brand}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;
  const pages = [];
  const delta = 1;
  const left = Math.max(1, currentPage - delta);
  const right = Math.min(totalPages, currentPage + delta);
  if (left > 1) { pages.push(1); if (left > 2) pages.push('...'); }
  for (let i = left; i <= right; i++) pages.push(i);
  if (right < totalPages) { if (right < totalPages - 1) pages.push('...'); pages.push(totalPages); }

  return (
    <div className="flex items-center justify-center gap-2 mt-10 flex-wrap">
      <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}
        className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-[#ede8df] bg-white text-sm font-medium text-[#6b5544] hover:border-[#c9a84c] disabled:opacity-40 disabled:pointer-events-none transition-colors">
        <ChevronLeft className="w-4 h-4" /> Prev
      </button>
      {pages.map((page, idx) =>
        page === '...' ? (
          <span key={`dots-${idx}`} className="px-2 text-[#8a7060]">…</span>
        ) : (
          <button key={page} onClick={() => onPageChange(page)}
            className={`w-10 h-10 rounded-lg border text-sm font-semibold transition-all ${page === currentPage ? 'bg-[#c9a84c] border-[#c9a84c] text-white shadow-sm' : 'bg-white border-[#ede8df] text-[#6b5544] hover:border-[#c9a84c] hover:bg-[#fdf4e3]'}`}>
            {page}
          </button>
        )
      )}
      <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}
        className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-[#ede8df] bg-white text-sm font-medium text-[#6b5544] hover:border-[#c9a84c] disabled:opacity-40 disabled:pointer-events-none transition-colors">
        Next <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

function ProductsContent() {
  const searchParams = useSearchParams();
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedPrice, setSelectedPrice] = useState(null);
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const cat = searchParams.get('category');
    if (cat) setActiveCategory(decodeURIComponent(cat));
  }, [searchParams]);

  useEffect(() => {
    let live = true;
    async function load() {
      setLoading(true);
      // FIX: use revalidate cache instead of no-store — much faster
      const [cats, prods] = await Promise.all([
        fetch('/api/categories', { next: { revalidate: 300 } }).then((r) => r.json()).catch(() => []),
        fetch('/api/products', { next: { revalidate: 60 } }).then((r) => r.json()).catch(() => []),
      ]);
      if (!live) return;
      setCategories(Array.isArray(cats) ? cats : []);
      setProducts(Array.isArray(prods) ? prods.filter((p) => p.is_active !== false) : []);
      setLoading(false);
    }
    load();
    return () => { live = false; };
  }, []);

  useEffect(() => { setCurrentPage(1); }, [query, activeCategory, selectedPrice, selectedBrands]);

  const handlePriceClick = (range) => setSelectedPrice((prev) => prev?.label === range.label ? null : range);
  const handleBrandClick = (brand) => setSelectedBrands((prev) => prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]);
  const clearFilters = () => { setSelectedPrice(null); setSelectedBrands([]); };
  const hasFilters = selectedPrice !== null || selectedBrands.length > 0;

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((product) => {
      const productCategory = product.category || product.category_id || '';
      const categoryMatch = activeCategory === 'All' || productCategory === activeCategory;
      const text = `${product.name || ''} ${product.brand || ''} ${product.description || ''} ${productCategory}`.toLowerCase();
      const searchMatch = !q || text.includes(q);
      const price = product.salePrice ?? product.sale_price ?? product.price ?? product.mrp ?? 0;
      const priceMatch = !selectedPrice || (price >= selectedPrice.min && price < selectedPrice.max);
      const brandMatch = selectedBrands.length === 0 || selectedBrands.includes(product.brand);
      return categoryMatch && searchMatch && priceMatch && brandMatch;
    });
  }, [activeCategory, products, query, selectedPrice, selectedBrands]);

  const totalPages = Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * PRODUCTS_PER_PAGE,
    currentPage * PRODUCTS_PER_PAGE
  );

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <h1 className="text-4xl font-bold text-[#c9a84c] mb-6">Our Collection</h1>

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

      <div className="flex gap-3 overflow-x-auto pb-4 mb-6">
        {['All', ...categories.map((c) => c.name)].map((name) => (
          name === 'All' ? (
            <button key={name} type="button" onClick={() => setActiveCategory(name)}
              className={`shrink-0 rounded-full border px-5 py-2 text-base font-semibold transition ${activeCategory === name ? 'border-[#c9a84c] bg-[#c9a84c] text-white' : 'border-[#ede8df] bg-white text-[#6b5544] hover:border-[#c9a84c]'}`}>
              {name}
            </button>
          ) : (
            <Link key={name} href={categoryPath(name)}
              className="shrink-0 rounded-full border border-[#ede8df] bg-white px-5 py-2 text-base font-semibold text-[#6b5544] transition hover:border-[#c9a84c] hover:text-[#a07a28]">
              {name}
            </Link>
          )
        ))}
      </div>

      <div className="flex items-center justify-between mb-4 md:hidden">
        <p className="text-sm text-[#8a7060]">
          {loading ? '' : `${filteredProducts.length} product${filteredProducts.length !== 1 ? 's' : ''}`}
        </p>
        <button onClick={() => setShowMobileFilters((v) => !v)}
          className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition ${hasFilters ? 'border-[#c9a84c] bg-[#c9a84c] text-white' : 'border-[#ede8df] bg-white text-[#6b5544]'}`}>
          <SlidersHorizontal className="h-4 w-4" />
          Filters {hasFilters && `(${(selectedPrice ? 1 : 0) + selectedBrands.length})`}
        </button>
      </div>

      {showMobileFilters && (
        <div className="mb-6 md:hidden">
          <FilterPanel selectedPrice={selectedPrice} selectedBrands={selectedBrands}
            onPriceClick={handlePriceClick} onBrandClick={handleBrandClick}
            onClear={clearFilters} hasFilters={hasFilters} />
        </div>
      )}

      <div className="flex gap-8">
        <aside className="hidden md:block w-56 shrink-0">
          <FilterPanel selectedPrice={selectedPrice} selectedBrands={selectedBrands}
            onPriceClick={handlePriceClick} onBrandClick={handleBrandClick}
            onClear={clearFilters} hasFilters={hasFilters} />
        </aside>

        <div className="flex-1">
          {hasFilters && (
            <div className="flex flex-wrap gap-2 mb-4">
              {selectedPrice && (
                <span className="flex items-center gap-1 rounded-full bg-[#fdf4e3] border border-[#c9a84c] px-3 py-1 text-sm text-[#a07a28] font-medium">
                  {selectedPrice.label}
                  <button onClick={() => setSelectedPrice(null)} className="ml-1 hover:text-red-500"><X className="h-3 w-3" /></button>
                </span>
              )}
              {selectedBrands.map((b) => (
                <span key={b} className="flex items-center gap-1 rounded-full bg-[#fdf4e3] border border-[#c9a84c] px-3 py-1 text-sm text-[#a07a28] font-medium">
                  {b}
                  <button onClick={() => handleBrandClick(b)} className="ml-1 hover:text-red-500"><X className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
          )}

          {!loading && filteredProducts.length > 0 && (
            <p className="hidden md:block text-sm text-[#8a7060] mb-4">
              Showing {(currentPage - 1) * PRODUCTS_PER_PAGE + 1}–{Math.min(currentPage * PRODUCTS_PER_PAGE, filteredProducts.length)} of {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''}
            </p>
          )}

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
            ) : filteredProducts.length === 0 ? (
              <div className="col-span-full rounded bg-white p-10 text-center ring-1 ring-[#ede8df]">
                <Sparkles className="mx-auto h-10 w-10 text-[#c9a84c]" />
                <h3 className="mt-3 text-2xl font-bold text-[#2c1f14]">No products found</h3>
                <p className="mt-1 text-[#8a7060]">Try another search or adjust your filters.</p>
                {(query || activeCategory !== 'All' || hasFilters) && (
                  <button type="button" onClick={() => { setQuery(''); setActiveCategory('All'); clearFilters(); }}
                    className="mt-4 rounded bg-[#c9a84c] px-6 py-2 text-base font-semibold text-white hover:bg-[#a07a28]">
                    Clear all filters
                  </button>
                )}
              </div>
            ) : (
              paginatedProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))
            )}
          </div>

          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
        </div>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <>
      <Navbar />
      <main className="bg-[#faf8f4] min-h-screen">
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
