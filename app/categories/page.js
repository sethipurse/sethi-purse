'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { ImageOff } from 'lucide-react';

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.json())
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => setCategories([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <Navbar />
      <main className="bg-[#faf8f4] min-h-screen py-10">
        <div className="container-sethi">
          {/* Header */}
          <div className="mb-10">
            <p className="text-xs font-bold tracking-[0.25em] text-[#c9a84c] uppercase mb-2">Shop By</p>
            <h1 className="font-serif text-2xl font-medium text-[#2c1f14]">Categories</h1>
            <div className="mt-3 w-14 h-0.5 bg-[#c9a84c]" />
          </div>

          {/* Grid */}
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-square animate-pulse rounded bg-white shadow-sm ring-1 ring-[#ede8df]" />
              ))}
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-20 text-[#8a7060]">
              <p className="text-lg">No categories found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {categories.map((cat) => {
                const img = cat.image_url || cat.imageUrl || '';
                const name = cat.name || '';
                return (
                  <Link
                    key={cat.id}
                    href={`/products?category=${encodeURIComponent(name)}`}
                    className="group block bg-white rounded border border-[#ede8df] overflow-hidden shadow-sm hover:shadow-md hover:border-[#c9a84c] transition-all duration-300"
                  >
                    {/* Image */}
                    <div className="aspect-square w-full overflow-hidden bg-[#f5f0e8] relative">
                      {img ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={img}
                          alt={name}
                          loading="lazy"
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageOff className="w-10 h-10 text-[#c9a84c]" />
                        </div>
                      )}
                    </div>
                    {/* Label */}
                    <div className="p-3 text-center">
                      <p className="font-serif font-semibold text-[#2c1f14] text-base group-hover:text-[#c9a84c] transition-colors">
                        {name}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
