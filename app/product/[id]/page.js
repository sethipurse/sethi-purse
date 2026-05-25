import { notFound } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ProductDetailClient from '@/components/ProductDetailClient';
import { getProduct, getProducts, getReviews } from '@/lib/data';

async function getProductBundle(id) {
  const [product, products, reviews] = await Promise.all([getProduct(id), getProducts(), getReviews()]);
  if (!product) return null;
  const category = product.category || product.category_id;
  const related = products.filter((p) => p.id !== product.id && (p.category === category || p.category_id === category)).slice(0, 3);
  const approvedReviews = reviews.filter((r) => !r.product_id || r.product_id === product.id).slice(0, 6);
  return { product, related, reviews: approvedReviews };
}

export async function generateMetadata({ params }) {
  const bundle = await getProductBundle(params.id);
  const product = bundle?.product;
  if (!product) return { title: 'Product Not Found | SETHI PURSE' };
  const price = product.sale_price ?? product.price ?? product.salePrice;
  const image = product.image_url || product.imageUrl;
  return {
    title: `${product.name} | SETHI PURSE`,
    description: `${product.name}${product.brand ? ` by ${product.brand}` : ''} at SETHI PURSE, Jalandhar. ${price ? `Price Rs.${price}.` : 'Message us for latest price.'}`,
    alternates: { canonical: `/product/${product.id}` },
    openGraph: {
      title: `${product.name} | SETHI PURSE`,
      description: 'Premium bags, luggage and accessories from SETHI PURSE Jalandhar.',
      type: 'website',
      images: image ? [{ url: image, width: 1200, height: 1600, alt: product.name }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${product.name} | SETHI PURSE`,
      description: price ? `Available at Rs.${price}` : 'Available at SETHI PURSE',
      images: image ? [image] : [],
    },
  };
}

export default async function ProductPage({ params }) {
  const bundle = await getProductBundle(params.id);
  if (!bundle) notFound();
  const { product, related, reviews } = bundle;

  return (
    <>
      <Navbar />
      <main className="bg-[#faf8f4] py-8 md:py-12">
        <div className="container-sethi">
          <nav className="mb-7 text-lg text-[#8a7060]">
            <Link href="/" className="hover:text-[#c9a84c]">Home</Link>
            <span className="mx-2">/</span>
            <Link href="/products" className="hover:text-[#c9a84c]">Products</Link>
            <span className="mx-2">/</span>
            <span className="font-semibold text-[#2c1f14]">{product.name}</span>
          </nav>
          <ProductDetailClient product={product} related={related} reviews={reviews} />
        </div>
      </main>
      <Footer />
    </>
  );
}
