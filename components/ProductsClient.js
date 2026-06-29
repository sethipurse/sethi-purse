'use client';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, X } from 'lucide-react';
import ProductCard from '@/components/ProductCard';

export default function ProductsClient({ initialProducts, categories }) {
  const sp = useSearchParams();
  const initialCat = sp.get('category') || 'All';
  const [active, setActive] = useState(initialCat);
  const [q, setQ] = useState('');

  useEffect(() => {
    const c = sp.get('category');
    if (c) setActive(c);
    else setActive('All');
  }, [sp]);

  const cats = ['All', ...categories.map((c) => c.name)];

  const filtered = useMemo(() => {
    let list = initialProducts;

    if (active !== 'All') {
      list = list.filter((p) => {
        // ✅ FIXED: match against both category name and category_id, case-insensitive
        const cat = (p.category || p.category_id || '').toString().toLowerCase().trim();
        const activeLower = active.toLowerCase().trim();
        return cat === activeLower;
      });
    }

    if (q.trim()) {
      const t = q.trim().toLowerCase();
      list = list.filter(
        (p) =>
          (p.name || '').toLowerCase().includes(t) ||
          (p.brand || '').toLowerCase().includes(t) ||
          (p.description || '').toLowerCase().includes(t) ||
          (p.category || '').toLowerCase().includes(t)
      );
    }

    return list;
  }, [initialProducts, active, q]);

  return (
    <>
      <div className="max-w-2xl mx-auto mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-sethi-gray500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by product name or brand..."
            className="input-sethi !pl-12 !pr-12"
          />
          {q.length > 0 && (
            <button
              type="button"
              onClick={() => setQ('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-sethi-gray500 hover:text-sethi-black"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        {q.length > 0 && (
          <p className="mt-2 text-sm text-sethi-gray500 text-center">
            {filtered.length === 0 ? 'No products found' : `${filtered.length} product${filtered.length > 1 ? 's' : ''} found`}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3 mb-10">
        {cats.map((c) => (
          <button
            key={c}
            onClick={() => setActive(c)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${
              active === c
                ? 'bg-sethi-gold text-sethi-black border-sethi-gold'
                : 'bg-white text-sethi-black border-sethi-gray200 hover:border-sethi-gold'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="font-serif text-2xl mb-2">No products found{q ? ` for "${q}"` : active !== 'All' ? ` in "${active}"` : ''}</p>
          <p className="text-sethi-gray500 mb-4">Try a different search or category.</p>
          {(q || active !== 'All') && (
            <button
              type="button"
              onClick={() => { setQ(''); setActive('All'); }}
              className="px-6 py-2 rounded bg-sethi-gold text-white font-semibold hover:bg-sethi-gold-dark transition"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-6 md:gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </>
  );
}
