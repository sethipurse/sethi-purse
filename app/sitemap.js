import { supabase } from '@/lib/storage';

const BASE_URL = 'https://sethi-purse.vercel.app';

export default async function sitemap() {
  // Static pages
  const staticPages = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${BASE_URL}/products`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/categories`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/offers`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${BASE_URL}/reviews`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.6 },
    { url: `${BASE_URL}/contact`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
  ];

  // Dynamic product pages
  let productPages = [];
  try {
    const { data: products } = await supabase
      .from('products')
      .select('id, created_at')
      .eq('is_active', true);
    if (products) {
      productPages = products.map((p) => ({
        url: `${BASE_URL}/product/${p.id}`,
        lastModified: p.created_at ? new Date(p.created_at) : new Date(),
        changeFrequency: 'weekly',
        priority: 0.7,
      }));
    }
  } catch { /* fallback to static only */ }

  // Dynamic category pages
  let categoryPages = [];
  try {
    const { data: categories } = await supabase
      .from('categories')
      .select('name, created_at');
    if (categories) {
      categoryPages = categories.map((c) => ({
        url: `${BASE_URL}/category/${encodeURIComponent(c.name.toLowerCase().replace(/\s+/g, '-'))}`,
        lastModified: c.created_at ? new Date(c.created_at) : new Date(),
        changeFrequency: 'weekly',
        priority: 0.75,
      }));
    }
  } catch { /* fallback to static only */ }

  return [...staticPages, ...productPages, ...categoryPages];
}
