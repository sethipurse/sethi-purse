import { createClient } from '@supabase/supabase-js';
import categoriesJson from '@/data/categories.json';
import productsJson from '@/data/products.json';
import offersJson from '@/data/offers.json';
import reviewsJson from '@/data/reviews.json';

// ✅ Server-side Supabase client with caching via fetch options
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Normalize local JSON fallback data
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

// ✅ Cache durations
const CACHE_PRODUCTS = 60;      // 1 minute
const CACHE_CATEGORIES = 300;   // 5 minutes
const CACHE_OFFERS = 120;       // 2 minutes
const CACHE_REVIEWS = 300;      // 5 minutes

export async function getProducts() {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, brand, category, category_id, sale_price, mrp, price, stock, image_url, image_type, gallery_images, description, is_active, featured, discount_percent, created_at')
      .order('created_at', { ascending: false })
      .options({ fetch: (url, options) => fetch(url, { ...options, next: { revalidate: CACHE_PRODUCTS } }) });
    if (error) return LOCAL_PRODUCTS.filter((p) => p.is_active !== false);
    const source = data && data.length > 0 ? data : LOCAL_PRODUCTS;
    return source.filter((p) => p.is_active !== false);
  } catch {
    return LOCAL_PRODUCTS.filter((p) => p.is_active !== false);
  }
}

export async function getProduct(id) {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single()
      .options({ fetch: (url, options) => fetch(url, { ...options, next: { revalidate: CACHE_PRODUCTS } }) });
    if (!error && data) return data;
  } catch { /* not found */ }
  return LOCAL_PRODUCTS.find((p) => p.id === id) || null;
}

export async function getCategories() {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('created_at', { ascending: true })
      .options({ fetch: (url, options) => fetch(url, { ...options, next: { revalidate: CACHE_CATEGORIES } }) });
    if (error) {
      const { data: data2, error: error2 } = await supabase.from('categories').select('*');
      if (error2) return LOCAL_CATEGORIES;
      return data2 && data2.length > 0 ? data2 : LOCAL_CATEGORIES;
    }
    return data && data.length > 0 ? data : LOCAL_CATEGORIES;
  } catch {
    return LOCAL_CATEGORIES;
  }
}

export async function getOffers() {
  try {
    const { data, error } = await supabase
      .from('offers')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .options({ fetch: (url, options) => fetch(url, { ...options, next: { revalidate: CACHE_OFFERS } }) });
    if (error) return LOCAL_OFFERS.filter((o) => o.is_active !== false);
    const source = data && data.length > 0 ? data : LOCAL_OFFERS;
    return source.filter((o) => o.is_active !== false);
  } catch {
    return LOCAL_OFFERS.filter((o) => o.is_active !== false);
  }
}

export async function getReviews() {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .order('created_at', { ascending: false })
      .options({ fetch: (url, options) => fetch(url, { ...options, next: { revalidate: CACHE_REVIEWS } }) });
    if (error) return LOCAL_REVIEWS.filter((r) => r.is_approved !== false);
    const source = data && data.length > 0 ? data : LOCAL_REVIEWS;
    return source;
  } catch {
    return LOCAL_REVIEWS;
  }
}

export async function getSliderImages() {
  try {
    const { data, error } = await supabase
      .from('slider_images')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .options({ fetch: (url, options) => fetch(url, { ...options, next: { revalidate: 300 } }) });
    if (error || !Array.isArray(data)) return [];
    return data;
  } catch {
    return [];
  }
}
