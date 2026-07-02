import { getCategories, getProducts, getOffers, getReviews, getSliderImages } from '@/lib/data';
import HomeClient from '@/components/HomeClient';

// Data is fetched server-side and revalidated in the background every 30s
// (stale-while-revalidate), so the homepage renders with real content on
// first paint instead of a blank page that waits for client JS to load and
// then fetch — while still staying reasonably fresh for admin edits.
export const revalidate = 30;

export default async function Page() {
  const [categories, products, offers, reviews, slides] = await Promise.all([
    getCategories(),
    getProducts(),
    getOffers(),
    getReviews(),
    getSliderImages(),
  ]);

  return (
    <HomeClient
      initialCategories={categories}
      initialProducts={products}
      initialOffers={offers}
      initialReviews={reviews}
      initialSlides={slides}
    />
  );
}
