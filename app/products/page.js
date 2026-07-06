import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ProductsPageClient from '@/components/ProductsPageClient';
import { getCategories, getProducts } from '@/lib/data';

export const revalidate = 60;

export const metadata = {
  title: 'All Products — Luggage, Bags & More | SETHI PURSE',
  description: 'Browse trolley bags, backpacks, handbags and more from American Tourister, Safari, Genie and Arctic Fox at SETHI PURSE, Jalandhar.',
};

export default async function ProductsPage() {
  const [categories, products] = await Promise.all([getCategories(), getProducts()]);

  return (
    <>
      <Navbar />
      <main className="bg-[#faf8f4] min-h-screen">
        <ProductsPageClient categories={categories} products={products} />
      </main>
      <Footer />
    </>
  );
}
