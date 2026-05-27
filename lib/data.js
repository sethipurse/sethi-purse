import { supabase } from '@/lib/storage';
import categoriesJson from '@/data/categories.json';
import productsJson from '@/data/products.json';

// Normalize local JSON categories to match Supabase schema (imageUrl → image_url)
const LOCAL_CATEGORIES = categoriesJson.map((c) => ({
  ...c,
  image_url: c.image_url || c.imageUrl || '',
  sort_order: c.sort_order ?? 0,
}));

const LOCAL_PRODUCTS = Array.isArray(productsJson) ? productsJson.map((p) => ({
  ...p,
  image_url: p.image_url || p.imageUrl || '',
  sale_price: p.sale_price ?? p.salePrice ?? p.price ?? 0,
  is_active: p.is_active !== false,
})) : [];

async function selectTable(table, order = 'created_at', ascending = false) {
  try {
    const { data, error } = await supabase.from(table).select('*').order(order, { ascending });
    if (error || !data || data.length === 0) return null; // signal "no data"
    return Array.isArray(data) ? data : [];
  } catch (e) {
    return null;
  }
}

export async function getProducts() {
  const products = await selectTable('products');
  if (!products) return LOCAL_PRODUCTS.filter((p) => p.is_active !== false);
  return products.filter((product) => product.is_active !== false);
}

export async function getProduct(id) {
  try {
    const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
    if (!error && data) return data;
  } catch (e) {
    /* not found */
  }
  // fallback to local JSON
  return LOCAL_PRODUCTS.find((p) => p.id === id) || null;
}

export async function getCategories() {
  const cats = await selectTable('categories', 'sort_order', true);
  if (!cats) return LOCAL_CATEGORIES;
  return cats;
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
