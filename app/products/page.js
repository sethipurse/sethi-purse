import { Suspense } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ProductsClient from '@/components/ProductsClient';
import { getCategories, getProducts } from '@/lib/data';

export const metadata = {
  title: 'All Bags, Luggage & Accessories | SETHI PURSE Jalandhar',
  description: 'Browse premium luggage, handbags, school bags, backpacks and accessories at SETHI PURSE, Jalandhar.',
  alternates: { canonical: '/products' },
};

export default async function ProductsPage() {
  const [products, categories] = await Promise.all([getProducts(), getCategories()]);
  const sorted = [...products].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  return (
    <>
      <Navbar />
      <main className="section-pad bg-[#faf8f4]">
        <div className="container-sethi">
          <div className="text-center mb-10">
            <h1 className="heading-section text-[#c9a84c]">All Products</h1>
            <span className="gold-rule mx-auto mt-4" />
            <p className="mt-3 text-[#8a7060]">Original branded bags, luggage and everyday carry essentials.</p>
          </div>
          <Suspense fallback={<div className="text-center text-sethi-gray500 py-10">Loading products...</div>}>
            <ProductsClient initialProducts={sorted} categories={categories} />
          </Suspense>
        </div>
      </main>
      <Footer />
    </>
  );
}
