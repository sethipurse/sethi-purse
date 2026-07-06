import HomePageClient from '@/components/HomePageClient';
import { getHomePageData } from '@/lib/homeData';

export const revalidate = 60;

export default async function HomePage() {
  const { categories, allProducts, featuredProducts, offers, reviews } = await getHomePageData();

  return (
    <HomePageClient
      categories={categories}
      allProducts={allProducts}
      featuredProducts={featuredProducts}
      offers={offers}
      reviews={reviews}
    />
  );
}
