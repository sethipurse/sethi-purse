import { supabase } from '@/lib/storage';
import { DEMO_CATEGORIES, DEMO_OFFERS, DEMO_PRODUCTS, DEMO_REVIEWS } from '@/lib/demo-data';

async function selectTable(table, fallback, order = 'created_at', ascending = false) {
  try {
    const { data, error } = await supabase.from(table).select('*').order(order, { ascending });
    if (error || !Array.isArray(data) || data.length === 0) return fallback;
    return data;
  } catch (e) {
    return fallback;
  }
}

export async function getProducts() {
  const products = await selectTable('products', DEMO_PRODUCTS);
  return products.filter((product) => product.is_active !== false);
}

export async function getProduct(id) {
  try {
    const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
    if (!error && data) return data;
  } catch (e) {
    /* use demo fallback */
  }
  return DEMO_PRODUCTS.find((product) => product.id === id) || null;
}

export async function getCategories() {
  return selectTable('categories', DEMO_CATEGORIES, 'sort_order', true);
}

export async function getOffers() {
  const offers = await selectTable('offers', DEMO_OFFERS);
  return offers.filter((offer) => offer.is_active !== false);
}

export async function getReviews() {
  const reviews = await selectTable('reviews', DEMO_REVIEWS);
  return reviews.filter((review) => review.is_approved !== false);
}

export async function getSliderImages() {
  try {
    const { data, error } = await supabase
      .from('slider_images')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    if (error || !Array.isArray(data)) return [];
    return data;
  } catch (e) {
    return [];
  }
}
