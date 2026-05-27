import { notFound } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ProductDetailClient from '@/components/ProductDetailClient';
import { getProduct, getProducts, getReviews } from '@/lib/data';

const OG_IMAGE =
  'https://bbdatviaaiqpfvwumkkd.supabase.co/storage/v1/object/public/products/og-default.jpg';

async function getProductBundle(id) {
  try {
    const [product, products, reviews] = await Promise.all([
      getProduct(id),
      getProducts(),
      getReviews(),
    ]);
    if (!product) return null;
    const category = product.category || product.category_id;
    const related = products
      .filter((p) => p.id !== product.id && (p.category === category || p.category_id === category))
      .slice(0, 3);
    const approvedReviews = reviews
      .filter((r) => !r.product_id || r.product_id === product.id)
      .slice(0, 6);
    return { product, related, reviews: approvedReviews };
  } catch (err) {
    console.error('getProductBundle failed:', err);
    return null;
  }
}

export async function generateMetadata({ params }) {
  try {
    const bundle = await getProductBundle(params.id);
    const product = bundle?.product;

    // If product not found — still return valid OG tags with store defaults
    if (!product) {
      return {
        title: 'Product | SETHI PURSE',
        openGraph: {
          title: 'SETHI PURSE | Premium Luggage Store',
          description: 'Shop branded bags, trolleys and more at SETHI PURSE Jalandhar.',
          images: [{ url: OG_IMAGE, width: 1200, height: 630 }],
        },
      };
    }

    const price = product.sale_price ?? product.salePrice ?? product.price;

    // Use product image — must be a full https:// URL for WhatsApp to load it
    const rawImage = product.image_url || product.imageUrl || '';
    const image =
      rawImage.startsWith('http') ? rawImage : OG_IMAGE;

    return {
      title: `${product.name} | SETHI PURSE`,
      description: `${product.name}${product.brand ? ` by ${product.brand}` : ''} at SETHI PURSE, Jalandhar.${price ? ` Price Rs.${price}.` : ''}`,
      alternates: { canonical: `/product/${product.id}` },
      openGraph: {
        title: `${product.name} | SETHI PURSE`,
        description: `${product.name}${product.brand ? ` by ${product.brand}` : ''} — available at SETHI PURSE Jalandhar.${price ? ` Rs.${price}.` : ''}`,
        url: `https://sethi-purse.vercel.app/product/${product.id}`,
        siteName: 'SETHI PURSE',
        type: 'website',
        images: [{ url: image, width: 1200, height: 630, alt: product.name }],
      },
      twitter: {
        card: 'summary_large_image',
        title: `${product.name} | SETHI PURSE`,
        description: price
          ? `Available at Rs.${price} — SETHI PURSE Jalandhar`
          : 'Available at SETHI PURSE Jalandhar',
        images: [image],
      },
    };
  } catch (err) {
    console.error('generateMetadata failed:', err);
    return {
      title: 'SETHI PURSE',
      openGraph: {
        images: [{ url: OG_IMAGE, width: 1200, height: 630 }],
      },
    };
  }
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
