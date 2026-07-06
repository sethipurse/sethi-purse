import Link from 'next/link';
import { MessageCircle, Sparkles } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import { buildWhatsAppLink } from '@/lib/constants';
import { getCategories, getProducts } from '@/lib/data';
import { categoryPath, findCategoryBySlug, productMatchesCategorySlug, titleFromSlug, toTitleCase } from '@/lib/categoryUtils';

export const revalidate = 60;

function matchesCategory(product, category, slug) {
  if (productMatchesCategorySlug(product, slug)) return true;
  if (!category) return false;
  if (product.category_id === category.id) return true;
  return (product.category || '').toLowerCase() === (category.name || '').toLowerCase();
}

export async function generateMetadata({ params }) {
  const categories = await getCategories();
  const category = findCategoryBySlug(categories, params.slug);
  const title = toTitleCase(category?.name) || titleFromSlug(params.slug);

  return {
    title: `${title} | SETHI PURSE`,
    description: `Shop ${title} at SETHI PURSE Jalandhar.`,
    alternates: { canonical: `/category/${params.slug}` },
  };
}

export default async function CategoryPage({ params }) {
  const [categories, allProducts] = await Promise.all([getCategories(), getProducts()]);
  const category = findCategoryBySlug(categories, params.slug);
  const title = toTitleCase(category?.name) || titleFromSlug(params.slug);
  const products = allProducts.filter((product) => matchesCategory(product, category, params.slug));

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[#faf8f4] py-8 md:py-12">
        <div className="container-sethi">
          <nav className="mb-7 text-base text-[#8a7060] md:text-lg">
            <Link href="/" className="hover:text-[#c9a84c]">Home</Link>
            <span className="mx-2">/</span>
            <Link href="/#categories" className="hover:text-[#c9a84c]">Categories</Link>
            <span className="mx-2">/</span>
            <span className="font-semibold text-[#2c1f14]">{title}</span>
          </nav>

          <section className="mb-8">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#c9a84c]">Category</p>
            <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h1 className="text-4xl font-bold leading-tight text-[#2c1f14] md:text-6xl">{title}</h1>
                <p className="mt-2 text-lg text-[#8a7060]">
                  {products.length === 0
                    ? 'We are updating this collection. Message us for current stock.'
                    : `${products.length} product${products.length > 1 ? 's' : ''} available in this collection.`}
                </p>
              </div>
              <Link href="/products" className="inline-flex h-11 items-center justify-center rounded border border-[#c9a84c] px-5 font-semibold text-[#a07a28] transition hover:bg-[#f5f0e8]">
                View all products
              </Link>
            </div>
          </section>

          {categories.length > 0 && (
            <div className="mb-8 flex gap-3 overflow-x-auto pb-3">
              {categories.map((item) => {
                const active = item.id === category?.id || item.name === category?.name;
                return (
                  <Link
                    key={item.id || item.name}
                    href={categoryPath(item.name)}
                    className={`shrink-0 rounded-full border px-5 py-2 text-base font-semibold transition ${active ? 'border-[#c9a84c] bg-[#c9a84c] text-white' : 'border-[#ede8df] bg-white text-[#6b5544] hover:border-[#c9a84c] hover:text-[#a07a28]'}`}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </div>
          )}

          {products.length === 0 ? (
            <div className="rounded bg-white p-8 text-center ring-1 ring-[#ede8df] md:p-12">
              <Sparkles className="mx-auto h-10 w-10 text-[#c9a84c]" />
              <h2 className="mt-3 text-2xl font-bold text-[#2c1f14]">No products in {title} yet</h2>
              <p className="mx-auto mt-2 max-w-xl text-[#8a7060]">
                This category is empty right now. Browse all products or contact us on WhatsApp for the latest in-store arrivals.
              </p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                <Link href="/products" className="inline-flex h-11 items-center justify-center rounded bg-[#c9a84c] px-6 font-semibold text-white transition hover:bg-[#a07a28]">
                  Browse products
                </Link>
                <a
                  href={buildWhatsAppLink(`Hi! Mujhe ${title} mein options chahiye. Kya available hai?`)}
                  target="_blank"
                  rel="noopener"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded bg-[#25D366] px-6 font-semibold text-white transition hover:bg-[#1ebe5c]"
                >
                  <MessageCircle className="h-5 w-5" /> Ask stock on WhatsApp
                </a>
              </div>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
