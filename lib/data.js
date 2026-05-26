import { supabase } from '@/lib/storage';

async function selectTable(table, order = 'created_at', ascending = false) {
  try {
    const { data, error } = await supabase.from(table).select('*').order(order, { ascending });
    if (error) return [];
    return Array.isArray(data) ? data : [];
  } catch (e) {
    return [];
  }
}

export async function getProducts() {
  const products = await selectTable('products');
  return products.filter((product) => product.is_active !== false);
}

export async function getProduct(id) {
  try {
    const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
    if (!error && data) return data;
  } catch (e) {
    /* not found */
  }
  return null;
}

export async function getCategories() {
  return selectTable('categories', 'sort_order', true);
}

export async function getOffers() {
  const offers = await selectTable('offers');
  return offers.filter((offer) => offer.is_active !== false);
}

export async function getReviews() {
  const reviews = await selectTable('reviews');
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
