import { supabase } from '@/lib/storage';
import categoriesJson from '@/data/categories.json';
import productsJson from '@/data/products.json';
import offersJson from '@/data/offers.json';
import reviewsJson from '@/data/reviews.json';

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

const VALID_THEMES = ['pure', 'horizon', 'obsidian', 'sand'];

export async function getActiveTheme() {
  try {
    const { data, error } = await supabase.from('settings').select('theme').single();
    if (error || !data) return 'pure';
    return VALID_THEMES.includes(data.theme) ? data.theme : 'pure';
  } catch {
    return 'pure';
  }
}

export async function getProducts() {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
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
      .single();
    if (!error && data) return data;
  } catch { /* not found */ }
  return LOCAL_PRODUCTS.find((p) => p.id === id) || null;
}

export async function getCategories() {
  try {
    // Use created_at ordering — sort_order column may not exist
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) {
      // Try without any ordering as last resort
      const { data: data2, error: error2 } = await supabase
        .from('categories')
        .select('*');
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
      .order('created_at', { ascending: false });
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
      .order('created_at', { ascending: false });
    if (error) return LOCAL_REVIEWS.filter((r) => r.is_approved !== false);
    const source = data && data.length > 0
      ? data.filter((r) => r.is_approved !== false)
      : LOCAL_REVIEWS.filter((r) => r.is_approved !== false);
    return source;
  } catch {
    return LOCAL_REVIEWS.filter((r) => r.is_approved !== false);
  }
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
  } catch {
    return [];
  }
}
