'use client';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import ProductCard from '@/components/ProductCard';

export default function ProductsClient({ initialProducts, categories }) {
  const sp = useSearchParams();
  const initialCat = sp.get('category') || 'All';
  const [active, setActive] = useState(initialCat);
  const [q, setQ] = useState('');

  useEffect(() => {
    const c = sp.get('category');
    if (c) setActive(c);
  }, [sp]);

  const cats = ['All', ...categories.map((c) => c.name)];

  const filtered = useMemo(() => {
    let list = initialProducts;
    if (active !== 'All') list = list.filter((p) => p.category === active);
    if (q.trim()) {
      const t = q.trim().toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(t) || (p.brand || '').toLowerCase().includes(t));
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
            className="input-sethi !pl-12"
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3 mb-10">
        {cats.map((c) => (
          <button
            key={c}
            onClick={() => setActive(c)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${active === c ? 'bg-sethi-gold text-sethi-black border-sethi-gold' : 'bg-white text-sethi-black border-sethi-gray200 hover:border-sethi-gold'}`}
          >
            {c}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="font-serif text-2xl mb-2">No products found{q ? ` for "${q}"` : ''}</p>
          <p className="text-sethi-gray500">Try a different search or category.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </>
  );
}
