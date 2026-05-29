import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { getCategories } from '@/lib/data';
import { categoryPath } from '@/lib/categoryUtils';

export const metadata = {
  title: 'Shop by Category | SETHI PURSE',
  description: 'Explore trolley bags, school bags, handbags, backpacks, wallets and more at SETHI PURSE Jalandhar.',
};

export default async function CategoriesPage() {
  const categories = await getCategories();
  return (
    <>
      <Navbar />
      <main className="section-pad">
        <div className="container-sethi">
          <div className="text-center mb-12">
            <h1 className="heading-section">Shop by Category</h1>
            <span className="gold-rule mx-auto mt-4" />
            <p className="mt-4 text-sethi-gray500">Find the perfect bag for every occasion.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
            {categories.map((c) => (
              <Link key={c.id} href={categoryPath(c.name)} className="group relative h-[250px] rounded-[4px] overflow-hidden bg-sethi-black">
                {c.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.image_url} alt={c.name} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-80 group-hover:scale-105 transition-all duration-500" />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-sethi-black to-sethi-gray800" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <div className="absolute inset-0 flex items-end justify-center pb-8">
                  <h3 className="font-serif text-white text-2xl md:text-3xl text-center px-4">{c.name}</h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
