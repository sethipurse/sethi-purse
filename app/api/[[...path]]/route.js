import { NextResponse } from 'next/server';
import { supabase, nowIST } from '@/lib/storage';
import { clearAdminCookie, makeAdminToken, rateLimit, requireAdmin, setAdminCookie } from '@/lib/security';
import { v4 as uuidv4 } from 'uuid';
import categoriesJson from '@/data/categories.json';
import productsJson from '@/data/products.json';

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

const VALID_STATUSES = ['new', 'contacted', 'converted', 'closed'];

function json(data, status = 200) {
  return NextResponse.json(data, { status });
}

async function handle(request, { params }) {
  const segments = (params?.path || []);
  const method = request.method;
  const limited = rateLimit(request, `${method}:${segments[0] || 'root'}`, method === 'GET' ? 180 : 45);
  if (limited) return limited;
  const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
  const publicMutation =
    (segments[0] === 'auth' && segments[1] === 'login') ||
    segments[0] === 'inquiries' ||
    segments[0] === 'reviews' ||
    segments[0] === 'push';

  // ===== Uploads — must be handled BEFORE body parsing =====
  if (segments[0] === 'upload' && method === 'POST') {
    const authError = requireAdmin(request);
    if (authError) return authError;
    try {
      const form = await request.formData();
      const file = form.get('file');
      const bucket = String(form.get('bucket') || 'products').replace(/[^a-z0-9_-]/gi, '').toLowerCase();
      if (!file || typeof file.arrayBuffer !== 'function') return json({ error: 'Image file is required' }, 400);
      if (!file.type?.startsWith('image/')) return json({ error: 'Only image uploads are allowed' }, 400);
      if (file.size > 4 * 1024 * 1024) return json({ error: 'Image must be under 4MB after compression' }, 400);
      const ext = file.type.includes('webp') ? 'webp' : file.type.includes('png') ? 'png' : 'jpg';
      const path = `${Date.now()}-${uuidv4()}.${ext}`;
      const bytes = await file.arrayBuffer();
      const buffer = new Uint8Array(bytes);
      const { error } = await supabase.storage.from(bucket).upload(path, buffer, {
        cacheControl: '31536000',
        contentType: file.type,
        upsert: false,
      });
      if (error) return json({ error: error.message }, 500);
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      return json({ url: data.publicUrl, path, bucket }, 201);
    } catch (error) {
      return json({ error: error.message || 'Upload failed' }, 500);
    }
  }

  if (isMutation && !publicMutation) {
    const authError = requireAdmin(request);
    if (authError) return authError;
  }

  let body = null;
  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    try { body = await request.json(); } catch (e) { body = null; }
  }

  // ===== Slider Images =====
  if (segments[0] === 'slider-images' || segments[0] === 'slider_images') {
    if (segments.length === 1) {
      if (method === 'GET') {
        const { data, error } = await supabase
          .from('slider_images')
          .select('*')
          .order('sort_order', { ascending: true });
        if (error) return json([]);
        return json(data || []);
      }
      if (method === 'POST') {
        const s = body || {};
        const slide = {
          id: uuidv4(),
          category: String(s.category || '').trim(),
          headline: String(s.headline || '').trim(),
          image_url: String(s.imageUrl || s.image_url || '').trim(),
          badge_icons: Array.isArray(s.badgeIcons || s.badge_icons) ? (s.badgeIcons || s.badge_icons) : [],
          badge_labels: Array.isArray(s.badgeLabels || s.badge_labels) ? (s.badgeLabels || s.badge_labels) : [],
          sort_order: Number(s.sortOrder ?? s.sort_order ?? 0),
          is_active: s.isActive === undefined && s.is_active === undefined ? true : !!(s.isActive ?? s.is_active),
          created_at: nowIST(),
        };
        const { data, error } = await supabase.from('slider_images').insert([slide]).select().single();
        if (error) return json({ error: error.message }, 500);
        return json(data, 201);
      }
    }
    if (segments.length === 2) {
      const id = segments[1];
      if (method === 'PUT' || method === 'PATCH') {
        const s = body || {};
        const updates = {};
        if (s.category !== undefined) updates.category = String(s.category).trim();
        if (s.headline !== undefined) updates.headline = String(s.headline).trim();
        if (s.imageUrl !== undefined || s.image_url !== undefined) updates.image_url = String(s.imageUrl ?? s.image_url).trim();
        if (s.badgeIcons !== undefined || s.badge_icons !== undefined) updates.badge_icons = Array.isArray(s.badgeIcons ?? s.badge_icons) ? (s.badgeIcons ?? s.badge_icons) : [];
        if (s.badgeLabels !== undefined || s.badge_labels !== undefined) updates.badge_labels = Array.isArray(s.badgeLabels ?? s.badge_labels) ? (s.badgeLabels ?? s.badge_labels) : [];
        if (s.sortOrder !== undefined || s.sort_order !== undefined) updates.sort_order = Number(s.sortOrder ?? s.sort_order);
        if (s.isActive !== undefined || s.is_active !== undefined) updates.is_active = !!(s.isActive ?? s.is_active);
        const { data, error } = await supabase.from('slider_images').update(updates).eq('id', id).select().single();
        if (error) return json({ error: error.message }, 500);
        return json(data);
      }
      if (method === 'DELETE') {
        const { data, error } = await supabase.from('slider_images').delete().eq('id', id).select().single();
        if (error) return json({ error: 'Not found' }, 404);
        return json({ success: true, removed: data });
      }
    }
  }

  // ===== Products =====
  if (segments[0] === 'products') {
    if (segments.length === 1) {
      if (method === 'GET') {
        // Returns real Supabase data, falls back to local JSON if DB is empty
        const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
        if (error) return json(LOCAL_PRODUCTS);
        return json(data && data.length > 0 ? data : LOCAL_PRODUCTS);
      }
      if (method === 'POST') {
        const p = body || {};
        const saleValue = p.salePrice ?? p.sale_price ?? p.price;
        if (!p.name || !(p.category || p.category_id) || !saleValue) return json({ error: 'Missing required fields' }, 400);
        const newProduct = {
          id: uuidv4(),
          name: String(p.name).trim(),
          brand: String(p.brand || '').trim(),
          category: String(p.category || p.category_id).trim(),
          category_id: p.category_id || null,
          mrp: Number(p.mrp ?? p.original_price) || 0,
          original_price: Number(p.original_price ?? p.mrp) || 0,
          sale_price: Number(saleValue),
          discount_percent: Number(p.discount_percent) || 0,
          description: String(p.description || '').trim(),
          image_url: String(p.imageUrl || p.image_url || '').trim(),
          image_type: p.imageType || 'url',
          gallery_images: Array.isArray(p.gallery_images || p.galleryImages) ? (p.gallery_images || p.galleryImages) : [],
          sizes: Array.isArray(p.sizes) ? p.sizes : [],
          colors: Array.isArray(p.colors) ? p.colors : [],
          stock: p.stock === '' || p.stock === null || p.stock === undefined ? null : Number(p.stock),
          featured: !!p.featured,
          is_active: p.isActive === undefined && p.is_active === undefined ? true : !!(p.isActive ?? p.is_active),
          created_at: nowIST(),
        };
        const { data, error } = await supabase.from('products').insert([newProduct]).select().single();
        if (error) return json({ error: error.message }, 500);
        return json(data, 201);
      }
    }
    if (segments.length === 2) {
      const id = segments[1];
      if (method === 'GET') {
        // ✅ FIXED: No longer falls back to DEMO_PRODUCTS
        const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
        if (error) return json({ error: 'Not found' }, 404);
        return json(data);
      }
      if (method === 'PUT') {
        const p = body || {};
        const updates = {};
        if (p.name !== undefined) updates.name = String(p.name).trim();
        if (p.brand !== undefined) updates.brand = String(p.brand).trim();
        if (p.category !== undefined) updates.category = String(p.category).trim();
        if (p.category_id !== undefined) updates.category_id = p.category_id;
        if (p.mrp !== undefined) updates.mrp = Number(p.mrp);
        if (p.original_price !== undefined) updates.original_price = Number(p.original_price);
        if (p.salePrice !== undefined || p.sale_price !== undefined || p.price !== undefined) {
          const value = p.salePrice ?? p.sale_price ?? p.price;
          updates.sale_price = Number(value);
        }
        if (p.discount_percent !== undefined) updates.discount_percent = Number(p.discount_percent);
        if (p.description !== undefined) updates.description = String(p.description).trim();
        if (p.imageUrl !== undefined || p.image_url !== undefined) updates.image_url = String(p.imageUrl ?? p.image_url).trim();
        if (p.imageType !== undefined) updates.image_type = p.imageType;
        if (p.gallery_images !== undefined || p.galleryImages !== undefined) updates.gallery_images = Array.isArray(p.gallery_images ?? p.galleryImages) ? (p.gallery_images ?? p.galleryImages) : [];
        if (p.sizes !== undefined) updates.sizes = Array.isArray(p.sizes) ? p.sizes : [];
        if (p.colors !== undefined) updates.colors = Array.isArray(p.colors) ? p.colors : [];
        if (p.stock !== undefined) updates.stock = p.stock === '' || p.stock === null ? null : Number(p.stock);
        if (p.featured !== undefined) updates.featured = !!p.featured;
        if (p.isActive !== undefined || p.is_active !== undefined) updates.is_active = !!(p.isActive ?? p.is_active);
        const { data, error } = await supabase.from('products').update(updates).eq('id', id).select().single();
        if (error) return json({ error: error.message }, 500);
        return json(data);
      }
      if (method === 'DELETE') {
        const { data, error } = await supabase.from('products').delete().eq('id', id).select().single();
        if (error) return json({ error: 'Not found' }, 404);
        return json({ success: true, removed: data });
      }
    }
  }

  // ===== Categories =====
  if (segments[0] === 'categories') {
    if (segments.length === 1) {
      if (method === 'GET') {
        // Returns real Supabase data, falls back to local JSON if DB is empty
        const { data, error } = await supabase.from('categories').select('*').order('created_at', { ascending: true });
        if (error) return json(LOCAL_CATEGORIES);
        return json(data && data.length > 0 ? data : LOCAL_CATEGORIES);
      }
      if (method === 'POST') {
        const c = body || {};
        if (!c.name) return json({ error: 'Name required' }, 400);
        const cat = {
          id: uuidv4(),
          name: String(c.name).trim(),
          image_url: String(c.imageUrl || '').trim(),
          created_at: nowIST(),
        };
        const { data, error } = await supabase.from('categories').insert([cat]).select().single();
        if (error) {
          if (error.code === '23505') return json({ error: 'Category already exists' }, 400);
          return json({ error: error.message }, 500);
        }
        return json(data, 201);
      }
    }
    if (segments.length === 2) {
      const id = segments[1];
      if (method === 'PUT') {
        const c = body || {};
        const updates = {};
        if (c.name !== undefined) updates.name = String(c.name).trim();
        if (c.imageUrl !== undefined) updates.image_url = String(c.imageUrl).trim();
        const { data, error } = await supabase.from('categories').update(updates).eq('id', id).select().single();
        if (error) return json({ error: error.message }, 500);
        return json(data);
      }
      if (method === 'DELETE') {
        const { data, error } = await supabase.from('categories').delete().eq('id', id).select().single();
        if (error) return json({ error: 'Not found' }, 404);
        return json({ success: true, removed: data });
      }
    }
  }

  // ===== Offers =====
  if (segments[0] === 'offers') {
    if (segments.length === 1) {
      if (method === 'GET') {
        // ✅ FIXED: No longer falls back to DEMO_OFFERS
        const { data, error } = await supabase.from('offers').select('*').order('created_at', { ascending: false });
        if (error) return json({ error: error.message }, 500);
        return json(data || []);
      }
      if (method === 'POST') {
        const o = body || {};
        if (!o.title) return json({ error: 'Title required' }, 400);
        const offer = {
          id: uuidv4(),
          title: String(o.title).trim(),
          description: String(o.description || '').trim(),
          banner_url: String(o.bannerUrl || '').trim(),
          expiry_date: o.expiryDate || null,
          is_active: o.isActive === undefined ? true : !!o.isActive,
          created_at: nowIST(),
        };
        const { data, error } = await supabase.from('offers').insert([offer]).select().single();
        if (error) return json({ error: error.message }, 500);
        return json(data, 201);
      }
    }
    if (segments.length === 2) {
      const id = segments[1];
      if (method === 'PUT') {
        const o = body || {};
        const updates = {};
        if (o.title !== undefined) updates.title = String(o.title).trim();
        if (o.description !== undefined) updates.description = String(o.description).trim();
        if (o.bannerUrl !== undefined) updates.banner_url = String(o.bannerUrl).trim();
        if (o.expiryDate !== undefined) updates.expiry_date = o.expiryDate;
        if (o.isActive !== undefined) updates.is_active = !!o.isActive;
        const { data, error } = await supabase.from('offers').update(updates).eq('id', id).select().single();
        if (error) return json({ error: error.message }, 500);
        return json(data);
      }
      if (method === 'DELETE') {
        const { data, error } = await supabase.from('offers').delete().eq('id', id).select().single();
        if (error) return json({ error: 'Not found' }, 404);
        return json({ success: true, removed: data });
      }
    }
  }

  // ===== Inquiries =====
  if (segments[0] === 'inquiries') {
    if (segments.length === 1) {
      if (method === 'GET') {
        const { data, error } = await supabase.from('inquiries').select('*').order('created_at', { ascending: false });
        if (error) return json({ error: error.message }, 500);
        return json(data || []);
      }
      if (method === 'POST') {
        const i = body || {};
        const phone = String(i.phone || '').replace(/\D/g, '');
        if (!i.name || !phone || !i.city || !i.productInterest || !i.message)
          return json({ error: 'All fields are required' }, 400);
        if (phone.length !== 10)
          return json({ error: 'Phone must be 10 digits' }, 400);
        const inquiry = {
          id: uuidv4(),
          name: String(i.name).trim(),
          phone,
          city: String(i.city).trim(),
          product_interest: String(i.productInterest).trim(),
          message: String(i.message).trim(),
          status: 'new',
          created_at: nowIST(),
        };
        const { data, error } = await supabase.from('inquiries').insert([inquiry]).select().single();
        if (error) return json({ error: error.message }, 500);
        return json(data, 201);
      }
    }
    if (segments.length === 2) {
      const id = segments[1];
      if (method === 'PUT') {
        const i = body || {};
        const updates = {};
        if (i.status !== undefined) {
          if (!VALID_STATUSES.includes(i.status)) return json({ error: 'Invalid status' }, 400);
          updates.status = i.status;
        }
        const { data, error } = await supabase.from('inquiries').update(updates).eq('id', id).select().single();
        if (error) return json({ error: error.message }, 500);
        return json(data);
      }
      if (method === 'DELETE') {
        const { data, error } = await supabase.from('inquiries').delete().eq('id', id).select().single();
        if (error) return json({ error: 'Not found' }, 404);
        return json({ success: true, removed: data });
      }
    }
  }

  // ===== Reviews =====
  if (segments[0] === 'reviews') {
    if (segments.length === 1) {
      if (method === 'GET') {
        // ✅ FIXED: No longer falls back to DEMO_REVIEWS
        const { data, error } = await supabase.from('reviews').select('*').order('created_at', { ascending: false });
        if (error) return json({ error: error.message }, 500);
        return json(data || []);
      }
      if (method === 'POST') {
        const r = body || {};
        if (!r.customerName || !r.reviewText) return json({ error: 'Name and review text required' }, 400);
        const rating = Math.max(1, Math.min(5, r.rating !== undefined && r.rating !== null && r.rating !== '' ? Number(r.rating) : 5));
        const review = {
          id: uuidv4(),
          customer_name: String(r.customerName).trim(),
          customer_photo: String(r.customerPhoto || '').trim(),
          rating,
          review_text: String(r.reviewText).trim(),
          is_featured: !!r.isFeatured,
          created_at: nowIST(),
        };
        const { data, error } = await supabase.from('reviews').insert([review]).select().single();
        if (error) return json({ error: error.message }, 500);
        return json(data, 201);
      }
    }
    if (segments.length === 2) {
      const id = segments[1];
      if (method === 'PUT') {
        const r = body || {};
        const updates = {};
        if (r.customerName !== undefined) updates.customer_name = String(r.customerName).trim();
        if (r.customerPhoto !== undefined) updates.customer_photo = String(r.customerPhoto).trim();
        if (r.rating !== undefined) updates.rating = Math.max(1, Math.min(5, Number(r.rating)));
        if (r.reviewText !== undefined) updates.review_text = String(r.reviewText).trim();
        if (r.isFeatured !== undefined) updates.is_featured = !!r.isFeatured;
        const { data, error } = await supabase.from('reviews').update(updates).eq('id', id).select().single();
        if (error) return json({ error: error.message }, 500);
        return json(data);
      }
      if (method === 'DELETE') {
        const { data, error } = await supabase.from('reviews').delete().eq('id', id).select().single();
        if (error) return json({ error: 'Not found' }, 404);
        return json({ success: true, removed: data });
      }
    }
  }

  // ===== Auth =====
  if (segments[0] === 'auth') {
    if (segments[1] === 'session' && method === 'GET') {
      return json({ authenticated: !!request.cookies.get('sethi_admin_session')?.value });
    }
    if (segments[1] === 'login' && method === 'POST') {
      const authLimited = rateLimit(request, 'admin-login', 8);
      if (authLimited) return authLimited;
      const { data: settings } = await supabase.from('settings').select('*').single();
      const { username, password } = body || {};
      const validUser = settings?.username || 'admin';
      const validPass = settings?.password || 'sethi2024';
      if (username === validUser && password === validPass) {
        const token = makeAdminToken();
        return setAdminCookie(json({ success: true, token }), token);
      }
      return json({ error: 'Invalid credentials' }, 401);
    }
    if (segments[1] === 'logout' && method === 'POST') return clearAdminCookie(json({ success: true }));
  }

  // ===== Push Notifications =====
  if (segments[0] === 'push') {
    if (segments[1] === 'subscribe' && method === 'POST') {
      const subscription = body?.subscription;
      if (!subscription?.endpoint) return json({ error: 'Subscription required' }, 400);
      const record = { id: uuidv4(), endpoint: subscription.endpoint, subscription, created_at: nowIST() };
      const { error } = await supabase.from('push_subscriptions').upsert([record], { onConflict: 'endpoint' });
      if (error) return json({ error: error.message }, 500);
      return json({ success: true }, 201);
    }
    if (segments[1] === 'send' && method === 'POST') {
      const authError = requireAdmin(request);
      if (authError) return authError;
      const title = String(body?.title || 'SETHI PURSE');
      const message = String(body?.message || 'New arrivals and offers are waiting for you.');
      const url = String(body?.url || '/');
      try {
        const webpush = await import('web-push');
        const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        const privateKey = process.env.VAPID_PRIVATE_KEY;
        if (!publicKey || !privateKey) return json({ error: 'VAPID keys are not configured' }, 400);
        webpush.default.setVapidDetails('mailto:admin@sethipurse.com', publicKey, privateKey);
        const { data: subscriptions, error } = await supabase.from('push_subscriptions').select('*');
        if (error) return json({ error: error.message }, 500);
        const payload = JSON.stringify({ title, body: message, url });
        const results = await Promise.allSettled((subscriptions || []).map((row) => webpush.default.sendNotification(row.subscription, payload)));
        return json({ success: true, sent: results.filter((r) => r.status === 'fulfilled').length, total: results.length });
      } catch (error) {
        return json({ error: 'Install web-push and configure VAPID keys to send push notifications.' }, 500);
      }
    }
  }

  // ===== Settings =====
  if (segments[0] === 'settings') {
    if (method === 'GET') {
      const { data: settings } = await supabase.from('settings').select('username').single();
      return json({ username: settings?.username || 'admin' });
    }
    if (method === 'PUT') {
      const { action, currentPassword, newPassword, confirmPassword, newUsername } = body || {};
      const { data: settings } = await supabase.from('settings').select('*').single();
      const currentSettings = settings || { username: 'admin', password: 'sethi2024' };
      if (action === 'change-password') {
        if (!currentPassword || !newPassword || !confirmPassword) return json({ error: 'All fields are required' }, 400);
        if (currentPassword !== currentSettings.password) return json({ error: 'Current password is incorrect' }, 400);
        if (newPassword.length < 6) return json({ error: 'New password must be at least 6 characters' }, 400);
        if (newPassword !== confirmPassword) return json({ error: 'New password and confirmation do not match' }, 400);
        await supabase.from('settings').update({ password: newPassword }).eq('id', currentSettings.id);
        return json({ success: true });
      }
      if (action === 'change-username') {
        if (!newUsername || !currentPassword) return json({ error: 'Username and current password are required' }, 400);
        if (currentPassword !== currentSettings.password) return json({ error: 'Current password is incorrect' }, 400);
        await supabase.from('settings').update({ username: String(newUsername).trim() }).eq('id', currentSettings.id);
        return json({ success: true, username: String(newUsername).trim() });
      }
      return json({ error: 'Unknown action' }, 400);
    }
  }

  return json({ error: 'Not found', path: segments, method }, 404);
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
