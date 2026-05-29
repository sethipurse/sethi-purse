import { supabase } from '@/lib/storage';
import categoriesJson from '@/data/categories.json';
import productsJson from '@/data/products.json';
import offersJson from '@/data/offers.json';
import reviewsJson from '@/data/reviews.json';

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

const LOCAL_OFFERS = Array.isArray(offersJson) ? offersJson.map((o) => ({
  ...o,
  banner_url: o.banner_url || o.bannerUrl || '',
  expiry_date: o.expiry_date || o.expiryDate || null,
  is_active: o.is_active ?? o.isActive ?? true,
})) : [];

const LOCAL_REVIEWS = Array.isArray(reviewsJson) ? reviewsJson.map((r) => ({
  ...r,
  customer_name: r.customer_name || r.customerName || '',
  customer_photo: r.customer_photo || r.customerPhoto || '',
  review_text: r.review_text || r.reviewText || r.comment || '',
  is_featured: r.is_featured ?? r.isFeatured ?? false,
  is_approved: r.is_approved ?? r.isApproved ?? true,
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
  if (!offers) return LOCAL_OFFERS.filter((offer) => offer.is_active !== false);
  return offers.filter((offer) => offer.is_active !== false);
}

export async function getReviews() {
  const reviews = await selectTable('reviews');
  if (!reviews) return LOCAL_REVIEWS.filter((review) => review.is_approved !== false);
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
