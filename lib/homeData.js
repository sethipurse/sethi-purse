import { supabase } from '@/lib/storage';
import categoriesJson from '@/data/categories.json';

const LOCAL_CATEGORIES = categoriesJson.map((c) => ({
  ...c,
  image_url: c.image_url || c.imageUrl || '',
  sort_order: c.sort_order ?? 0,
}));

async function fetchCategories() {
  try {
    const { data, error } = await supabase.from('categories').select('*').order('created_at', { ascending: true });
    if (error) throw error;
    const source = data && data.length > 0 ? data : LOCAL_CATEGORIES;
    return source.filter((c) => c.is_active !== false);
  } catch (e) {
    console.error('getHomePageData: categories fetch failed', e);
    return LOCAL_CATEGORIES.filter((c) => c.is_active !== false);
  }
}

async function fetchProducts() {
  try {
    const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return Array.isArray(data) ? data.filter((p) => p.is_active !== false) : [];
  } catch (e) {
    console.error('getHomePageData: products fetch failed', e);
    return [];
  }
}

async function fetchOffers() {
  try {
    const { data, error } = await supabase.from('offers').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return Array.isArray(data) ? data.filter((o) => o.is_active !== false) : [];
  } catch (e) {
    console.error('getHomePageData: offers fetch failed', e);
    return [];
  }
}

async function fetchReviews() {
  try {
    const { data, error } = await supabase.from('reviews').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return Array.isArray(data) ? data.filter((r) => r.is_approved !== false) : [];
  } catch (e) {
    console.error('getHomePageData: reviews fetch failed', e);
    return [];
  }
}

export async function getHomePageData() {
  const [categories, allProducts, offers, reviews] = await Promise.all([
    fetchCategories(),
    fetchProducts(),
    fetchOffers(),
    fetchReviews(),
  ]);

  const featuredOnly = allProducts.filter((p) => p.featured === true || p.featured === 1);
  const featuredProducts = featuredOnly.length > 0 ? featuredOnly : allProducts;

  return { categories, allProducts, featuredProducts, offers, reviews };
}
