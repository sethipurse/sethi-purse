import HomePageClient from '@/components/HomePageClient';
import { getHomePageData } from '@/lib/homeData';
import { BRANDS, BUSINESS, SITE_URL, productPrice, resolveImage } from '@/lib/constants';

export const revalidate = 60;

const OG_IMAGE = 'https://bbdatviaaiqpfvwumkkd.supabase.co/storage/v1/object/public/products/og-default.jpg';

const HOME_TITLE = 'SETHI PURSE — Premium Luggage & Bags Store, Jalandhar';
const HOME_DESCRIPTION = `Shop premium luggage, trolley bags, backpacks and handbags at SETHI PURSE, Jalandhar, Punjab. Original ${BRANDS.join(', ')} collections at the best store price.`;

export const metadata = {
  title: HOME_TITLE,
  description: HOME_DESCRIPTION,
  openGraph: {
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    url: SITE_URL,
    siteName: BUSINESS.name,
    type: 'website',
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: 'SETHI PURSE Jalandhar' }],
  },
};

export default async function HomePage() {
  const { categories, allProducts, featuredProducts, offers, reviews } = await getHomePageData();

  const storeSchema = {
    '@context': 'https://schema.org',
    '@type': 'Store',
    name: BUSINESS.name,
    image: OG_IMAGE,
    url: SITE_URL,
    address: BUSINESS.address,
    telephone: BUSINESS.phone,
    sameAs: [BUSINESS.instagram, BUSINESS.facebook, BUSINESS.youtube].filter(Boolean),
  };

  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: featuredProducts.slice(0, 9).map((product, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Product',
        name: product.name,
        image: resolveImage(product),
        url: `${SITE_URL}/product/${product.id}`,
        offers: {
          '@type': 'Offer',
          priceCurrency: 'INR',
          price: String(productPrice(product)),
        },
      },
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(storeSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }} />
      <HomePageClient
        categories={categories}
        allProducts={allProducts}
        featuredProducts={featuredProducts}
        offers={offers}
        reviews={reviews}
      />
    </>
  );
}
