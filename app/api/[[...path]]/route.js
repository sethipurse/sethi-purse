import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { supabase, nowIST } from '@/lib/storage';
import { clearAdminCookie, makeAdminToken, rateLimit, requireAdmin, setAdminCookie } from '@/lib/security';
import { v4 as uuidv4 } from 'uuid';
import categoriesJson from '@/data/categories.json';
import { detectCategory, findBrandHit, findCategoryHit } from '@/lib/categoryMatch';
import { BRANDS, buildCategoryUpdatingReply } from '@/lib/constants';

export const maxDuration = 60;

const LOCAL_CATEGORIES = categoriesJson.map((c) => ({
  ...c,
  image_url: c.image_url || c.imageUrl || '',
  sort_order: c.sort_order ?? 0,
}));

// On-demand ISR revalidation after admin mutations — a failure here must
// never fail the mutation response, so each path is revalidated independently
// inside its own try/catch.
function revalidatePaths(paths) {
  for (const entry of paths) {
    try {
      if (Array.isArray(entry)) revalidatePath(entry[0], entry[1]);
      else revalidatePath(entry);
    } catch (err) {
      console.error('revalidatePath failed:', entry, err);
    }
  }
}

function revalidateProduct(id) {
  const paths = ['/', '/products', ['/category/[slug]', 'page']];
  if (id) paths.push(`/product/${id}`);
  revalidatePaths(paths);
}

function revalidateCategories() {
  revalidatePaths(['/', '/products', ['/category/[slug]', 'page']]);
}

function revalidateOffers() {
  revalidatePaths(['/offers', '/']);
}

function revalidateSlider() {
  revalidatePaths(['/']);
}

const VALID_STATUSES = ['new', 'contacted', 'converted', 'closed'];

const BUY_INTENT_KEYWORDS = [
  'buy', 'order', 'purchase', 'book', 'reserve',
  'available', 'in stock', 'price', 'cost', 'kitne', 'kitna',
  'how much', 'discount', 'cash on delivery', 'cod', 'pay', 'interested',
  'lena', 'chahiye', 'khareedna', 'mil jayega', 'khareed',
];

function hasBuyIntent(text) {
  const lower = (text || '').toLowerCase();
  return BUY_INTENT_KEYWORDS.some((kw) => lower.includes(kw));
}

function detectLanguage(messages) {
  const recentText = (messages || []).slice(-3).filter((m) => m.role === 'user').map((m) => m.content || '').join(' ');
  if (/[\u0900-\u097F]/.test(recentText)) return 'hindi';
  if (/[\u0A00-\u0A7F]/.test(recentText)) return 'punjabi';
  const hindiRomanized = ['kya','hai','nahi','kaise','kitna','kitne','chahiye','lena','dena','batao','bhai','yaar','agar','aur','mujhe','mere','mera','karo','kab','kahan','hoga','hain','toh','lekin','sahi','accha','theek','bilkul','zaroor'];
  const hindiMatches = hindiRomanized.filter((w) => recentText.toLowerCase().includes(w)).length;
  if (hindiMatches >= 2) return 'hindi';
  return 'english';
}

function extractPhone(text) {
  const match = String(text || '').match(/(?:\+?91[\s-]?)?([6-9]\d{9})\b/);
  return match ? match[1] : null;
}

function extractName(text) {
  const t = String(text || '').trim();
  const patterns = [/(?:my name is|i am|i'm|naam|mera naam)\s+([a-zA-Z\u0900-\u097F]{2,30})/i];
  for (const p of patterns) { const m = t.match(p); if (m) return m[1].trim(); }
  if (/^[a-zA-Z\u0900-\u097F\s]{2,30}$/.test(t) && t.split(' ').length <= 3) return t;
  return null;
}

function countUserMessages(messages) {
  return (messages || []).filter((m) => m.role === 'user').length;
}

function extractPriceRange(text) {
  const lower = (text || '').toLowerCase();
  const underMatch = lower.match(/(?:under|below|less than|upto|up to|se kam)\s*(?:rs\.?|₹)?\s*(\d{3,6})/);
  if (underMatch) return { max: parseInt(underMatch[1]) };
  const betweenMatch = lower.match(/(?:between|from)?\s*(?:rs\.?|₹)?\s*(\d{3,6})\s*(?:to|and|-)\s*(?:rs\.?|₹)?\s*(\d{3,6})/);
  if (betweenMatch) return { min: parseInt(betweenMatch[1]), max: parseInt(betweenMatch[2]) };
  const aboveMatch = lower.match(/(?:above|more than|over|se zyada)\s*(?:rs\.?|₹)?\s*(\d{3,6})/);
  if (aboveMatch) return { min: parseInt(aboveMatch[1]) };
  return null;
}

function json(data, status = 200) { return NextResponse.json(data, { status }); }

function normalizeForSimilarity(text) {
  return String(text || '').toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(Boolean);
}

function wordOverlapRatio(a, b) {
  const wordsA = new Set(normalizeForSimilarity(a));
  const wordsB = new Set(normalizeForSimilarity(b));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let shared = 0;
  for (const w of wordsA) if (wordsB.has(w)) shared++;
  return shared / Math.max(wordsA.size, wordsB.size);
}

function detectRepeatedFrustration(messages) {
  const userMsgs = (messages || []).filter((m) => m.role === 'user').map((m) => m.content || '');
  if (userMsgs.length < 3) return false;
  const last = userMsgs.slice(-3);
  return wordOverlapRatio(last[0], last[1]) >= 0.5 && wordOverlapRatio(last[1], last[2]) >= 0.5;
}

let offersCache = { data: null, expiresAt: 0 };
async function getCachedOffers() {
  if (offersCache.data && Date.now() < offersCache.expiresAt) return offersCache.data;
  const { data: offers } = await supabase.from('offers').select('*').eq('is_active', true).order('created_at', { ascending: false }).limit(5);
  const live = (offers || []).filter((o) => !o.expiry_date || new Date(o.expiry_date) >= new Date());
  offersCache = { data: live, expiresAt: Date.now() + 3 * 60 * 1000 };
  return live;
}

let reviewsCache = { data: null, expiresAt: 0 };
async function getCachedReviews() {
  if (reviewsCache.data && Date.now() < reviewsCache.expiresAt) return reviewsCache.data;
  const { data } = await supabase.from('reviews').select('customer_name, rating, review_text').eq('is_approved', true).order('created_at', { ascending: false }).limit(4);
  reviewsCache = { data: data || [], expiresAt: Date.now() + 10 * 60 * 1000 };
  return reviewsCache.data;
}

let categoriesCache = { data: null, expiresAt: 0 };
async function getCachedCategoryNames() {
  if (categoriesCache.data && Date.now() < categoriesCache.expiresAt) return categoriesCache.data;
  try {
    const { data, error } = await supabase.from('categories').select('name');
    const names = !error && Array.isArray(data) ? data.map((c) => c.name).filter(Boolean) : [];
    categoriesCache = {
      data: names.length > 0 ? names : LOCAL_CATEGORIES.map((c) => c.name).filter(Boolean),
      expiresAt: Date.now() + 5 * 60 * 1000,
    };
  } catch (e) {
    console.error('getCachedCategoryNames failed:', e);
    categoriesCache = { data: LOCAL_CATEGORIES.map((c) => c.name).filter(Boolean), expiresAt: Date.now() + 60 * 1000 };
  }
  return categoriesCache.data;
}

const catalogCache = new Map();
const CATALOG_TTL = 60 * 1000;
function pruneCatalogCache() {
  const now = Date.now();
  for (const [k, v] of catalogCache.entries()) { if (v.expiresAt < now) catalogCache.delete(k); }
}

function scoreAndSort(categoryFiltered, lower, priceRange, limit) {
  const scored = categoryFiltered.map((p) => {
    let score = 50;
    const price = p.sale_price || p.salePrice || p.price || 0;
    if (p.name.toLowerCase() === lower) score += 100;
    if (p.name.toLowerCase().includes(lower)) score += 40;
    if ((p.brand || '').toLowerCase().includes(lower)) score += 25;
    if (p.featured) score += 30;
    if (p.stock !== 0 && p.in_stock !== false) score += 20;
    if (priceRange) {
      if (priceRange.max && price <= priceRange.max) score += 25;
      if (priceRange.min && price >= priceRange.min) score += 15;
    }
    return { ...p, matchScore: score, price };
  });

  const matched = scored.filter((p) => p.matchScore > 0).sort((a, b) => b.matchScore - a.matchScore).slice(0, limit);

  let upsells = [];
  if (matched.length > 0 && priceRange?.max) {
    upsells = categoryFiltered
      .filter((p) => {
        const price = p.sale_price || p.salePrice || p.price || 0;
        return price > priceRange.max && price <= priceRange.max * 1.5 && p.featured && p.stock !== 0;
      })
      .sort((a, b) => (a.sale_price || 0) - (b.sale_price || 0))
      .slice(0, 2);
  }

  return { matched, upsells };
}

function matchProducts(query, products, priceRange, limit = 10, dbCategories = [], contextCategory = null) {
  if (!Array.isArray(products) || products.length === 0) return { matched: [], upsells: [], zeroInCategoryHit: false, categoryHit: null };

  const lower = (query || '').toLowerCase();

  // Category/brand-first matching (token overlap) — takes priority over the
  // legacy detectCategory() pass below, and is tolerant of spacing/singular-
  // plural mismatches between the categories table and product.category
  // (candidates pool BOTH sources, since a mismatch between them is exactly
  // what caused "party wear purse" to silently fall back to unrelated
  // featured products before).
  const categoryCandidates = [...new Set([...(dbCategories || []), ...products.map((p) => (p.category || '').trim())].filter(Boolean))];
  const categoryHit = findCategoryHit(query, categoryCandidates);
  const brandHit = !categoryHit ? findBrandHit(query, BRANDS) : null;

  if (categoryHit) {
    const categoryFiltered = products.filter((p) => (p.category || '').trim().toLowerCase() === categoryHit.toLowerCase() && p.is_active !== false);
    console.log(`📦 matchProducts: category hit "${categoryHit}" — ${categoryFiltered.length}/${products.length} products`);
    if (categoryFiltered.length === 0) {
      // The category is real (it exists in the categories table or on some
      // product) but genuinely has nothing active right now — honest
      // "updating" response, not a silent fallback to unrelated products.
      return { matched: [], upsells: [], zeroInCategoryHit: true, categoryHit };
    }
    const { matched, upsells } = scoreAndSort(categoryFiltered, lower, priceRange, limit);
    return { matched, upsells, zeroInCategoryHit: false, categoryHit };
  }

  if (brandHit) {
    const brandFiltered = products.filter((p) => (p.brand || '').trim().toLowerCase() === brandHit.toLowerCase() && p.is_active !== false);
    if (brandFiltered.length > 0) {
      const { matched, upsells } = scoreAndSort(brandFiltered, lower, priceRange, limit);
      return { matched, upsells, zeroInCategoryHit: false, categoryHit: null };
    }
  }

  // No category/brand hit (or the brand hit had zero active products) —
  // legacy detectCategory()-driven path, unchanged from before.
  let detectedCat = detectCategory(query, dbCategories);
  const usedPageContext = detectedCat === 'Other' && !!contextCategory;
  if (usedPageContext) detectedCat = contextCategory;

  console.log(`📦 matchProducts: query="${lower}" | detectedCategory="${detectedCat}"${usedPageContext ? ' (from page context)' : ''} | totalProducts=${products.length}`);

  let categoryFiltered = products;
  if (detectedCat !== 'Other') {
    categoryFiltered = products.filter((p) => (p.category || '').trim().toLowerCase() === detectedCat.toLowerCase());
    console.log(`  ✅ Category filtered: ${categoryFiltered.length}/${products.length} products match "${detectedCat}"`);
  } else {
    console.log(`  ⚠️ No category detected, using all products`);
  }

  if (categoryFiltered.length === 0) {
    console.log(`  ⚠️ No products in category "${detectedCat}", falling back to featured products`);
    const featured = products.filter((p) => p.featured && p.stock !== 0).slice(0, 5);
    return { matched: featured.map((p) => ({ ...p, matchScore: 10 })), upsells: [], zeroInCategoryHit: false, categoryHit: null };
  }

  const { matched, upsells } = scoreAndSort(categoryFiltered, lower, priceRange, limit);
  return { matched, upsells, zeroInCategoryHit: false, categoryHit: detectedCat !== 'Other' ? detectedCat : null };
}

const GROQ_MS = 10000;
const OPENROUTER_MS = 12000;
const CF_MS = 10000;
const GEMINI_MODEL = 'gemini-2.5-flash-lite';

function toOpenAI(messages) {
  return messages.map((m) => ({ role: m.role, content: String(m.content || '').slice(0, 800) }));
}

async function callGroq(messages, sys, key) {
  const models = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];
  for (const model of models) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), GROQ_MS);
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST', signal: ctrl.signal,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({ model, messages: [{ role: 'system', content: sys }, ...toOpenAI(messages)], temperature: 0.7, max_tokens: 400 }),
      });
      clearTimeout(t);
      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        console.error(`Groq HTTP error (${model}):`, res.status, errText.slice(0, 300));
        if (res.status === 401) return { ok: false, reason: `groq_http_${res.status}` };
        continue;
      }
      const data = await res.json().catch(() => null);
      const text = data?.choices?.[0]?.message?.content?.trim();
      if (text) { console.log(`✅ Groq success with model: ${model}`); return { ok: true, text }; }
      continue;
    } catch (e) {
      clearTimeout(t);
      if (e?.name === 'AbortError') { console.warn(`Groq timeout (${model})`); continue; }
      return { ok: false, reason: 'groq_error' };
    }
  }
  return { ok: false, reason: 'groq_all_models_failed' };
}

async function callOpenRouter(messages, sys, key) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), OPENROUTER_MS);
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST', signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}`, 'HTTP-Referer': 'https://sethi-purse.vercel.app', 'X-Title': 'Sethi Purse' },
      body: JSON.stringify({ model: 'openrouter/auto', messages: [{ role: 'system', content: sys }, ...toOpenAI(messages)], temperature: 0.7, max_tokens: 400 }),
    });
    clearTimeout(t);
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error('OpenRouter HTTP error:', res.status, errText.slice(0, 500));
      return { ok: false, reason: `openrouter_http_${res.status}` };
    }
    const data = await res.json().catch(() => null);
    const text = data?.choices?.[0]?.message?.content?.trim();
    return text ? { ok: true, text } : { ok: false, reason: 'openrouter_empty' };
  } catch (e) { clearTimeout(t); return { ok: false, reason: e?.name === 'AbortError' ? 'openrouter_timeout' : 'openrouter_error' }; }
}

async function callCloudflare(messages, sys, accountId, token) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), CF_MS);
  try {
    const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/meta/llama-3.1-8b-instruct`, {
      method: 'POST', signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ messages: [{ role: 'system', content: sys }, ...toOpenAI(messages)], max_tokens: 500 }),
    });
    clearTimeout(t);
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error('Cloudflare HTTP error:', res.status, errText.slice(0, 300));
      return { ok: false, reason: `cf_http_${res.status}` };
    }
    const data = await res.json().catch(() => null);
    const text = data?.result?.response?.trim();
    return text ? { ok: true, text } : { ok: false, reason: 'cf_empty' };
  } catch (e) { clearTimeout(t); return { ok: false, reason: e?.name === 'AbortError' ? 'cf_timeout' : 'cf_error' }; }
}

async function callAI(messages, sys) {
  const groqKey = (process.env.GROQ_API_KEY || '').trim();
  const orKey = (process.env.OPENROUTER_API_KEY || '').trim();
  const cfId = (process.env.CLOUDFLARE_ACCOUNT_ID || '').trim();
  const cfToken = (process.env.CLOUDFLARE_API_TOKEN || '').trim();

  if (groqKey) {
    const r = await callGroq(messages, sys, groqKey);
    if (r.ok) return { ...r, usedAPI: 'groq' };
    console.warn('Groq failed:', r.reason);
  }
  if (orKey) {
    const r = await callOpenRouter(messages, sys, orKey);
    if (r.ok) return { ...r, usedAPI: 'openrouter' };
    console.warn('OpenRouter failed:', r.reason);
  }
  if (cfId && cfToken) {
    const r = await callCloudflare(messages, sys, cfId, cfToken);
    if (r.ok) return { ...r, usedAPI: 'cloudflare' };
    console.warn('Cloudflare failed:', r.reason);
  }

  console.error('❌ All AI tiers failed');
  return { ok: false, reason: 'all_failed', usedAPI: 'none' };
}

async function handleChat(body, cookieSessionId) {
  const { messages, products, sessionId: incomingId, contactCaptured, pageContext } = body || {};
  const contextCategory = pageContext?.category || null;
  const sessionId = incomingId || cookieSessionId || uuidv4();
  const lastUserMsg = [...(messages || [])].reverse().find((m) => m.role === 'user');
  const userMsgCount = countUserMessages(messages);
  const buyIntentNow = hasBuyIntent(lastUserMsg?.content);
  const phoneFound = extractPhone(lastUserMsg?.content);
  const nameFound = extractName(lastUserMsg?.content);
  const priceRange = extractPriceRange(lastUserMsg?.content);
  const language = detectLanguage(messages);

  if (detectRepeatedFrustration(messages)) {
    const msg = language === 'hindi'
      ? "Lagta hai sahi jawab nahi mil pa raha — sorry! Seedha baat karein: +91 7986161633 🙏"
      : "Looks like I'm not getting this right — sorry! Please WhatsApp our team directly: +91 7986161633 🙏";
    try {
      if (lastUserMsg) {
        const { data: ex } = await supabase.from('inquiries').select('id').eq('session_id', sessionId).maybeSingle();
        if (ex) await supabase.from('inquiries').update({ demand_type: 'priority_followup', updated_at: nowIST() }).eq('id', ex.id);
      }
    } catch (e) {}
    const resp = json({ reply: msg, sessionId, contactCaptured: !!contactCaptured, aiModel: 'none', language, escalated: true });
    resp.cookies.set('sethi_chat_session', sessionId, { maxAge: 60 * 60 * 24 * 30, httpOnly: true, sameSite: 'lax' });
    return resp;
  }

  const shouldAskContact = !contactCaptured && !phoneFound && ((buyIntentNow && userMsgCount >= 2) || userMsgCount >= 4);

  const dbCategories = await getCachedCategoryNames();

  pruneCatalogCache();
  const msgCategory = detectCategory(lastUserMsg?.content || '', dbCategories);
  // Include contextCategory in the cache key too — otherwise a generic
  // message like "price?" sent from two different product pages in the same
  // session could incorrectly reuse the other page's cached catalog.
  const cacheKey = `${msgCategory === 'Other' ? (contextCategory || 'Other') : msgCategory}|${priceRange?.min || ''}|${priceRange?.max || ''}`;
  const cached = catalogCache.get(sessionId);
  let catalogText = 'No products loaded.';
  let upsellText = '';
  let upsellProducts = [];
  let topProductIds = new Set();
  let noDirectMatch = false;
  let outOfStockAsked = [];
  let fallbackProducts = [];

  if (Array.isArray(products) && products.length > 0) {
    // A category/brand hit resolving to zero active products is a cheap,
    // deterministic check that must reflect THIS message, not a stale
    // cached catalog from an earlier, differently-scoped question — so it's
    // always computed fresh, before ever consulting the session cache.
    const gate = matchProducts(lastUserMsg?.content || '', products, priceRange, 8, dbCategories, contextCategory);

    if (gate.zeroInCategoryHit) {
      const resp = json({ reply: buildCategoryUpdatingReply(gate.categoryHit), products: [], isFallback: false, sessionId, contactCaptured: !!contactCaptured, aiModel: 'none', language });
      resp.cookies.set('sethi_chat_session', sessionId, { maxAge: 60 * 60 * 24 * 30, httpOnly: true, sameSite: 'lax' });
      return resp;
    }

    if (cached && cached.key === cacheKey && cached.expiresAt > Date.now()) {
      catalogText = cached.catalogText; upsellText = cached.upsellText; topProductIds = cached.topProductIds; fallbackProducts = cached.fallbackProducts || [];
    } else {
      const { matched, upsells } = gate;
      upsellProducts = upsells;
      if (matched.length === 0) {
        noDirectMatch = true;
        const featured = products.filter((p) => p.featured && p.stock !== 0).slice(0, 5);
        topProductIds = new Set(featured.map((p) => String(p.id)));
        fallbackProducts = featured.slice(0, 5);
        catalogText = `NO DIRECT MATCH. Ask a clarifying question.\n` +
          (featured.length > 0 ? `Popular alternatives:\n` + featured.map((p) => `- ID:${p.id} | ${p.name} | Rs.${p.sale_price || p.price || 0}`).join('\n') : '');
      } else {
        outOfStockAsked = matched.filter((p) => p.stock === 0 || p.in_stock === false);
        topProductIds = new Set(matched.map((p) => String(p.id)));
        fallbackProducts = matched.slice(0, 5);
        catalogText = matched.map((p) => {
          const price = p.sale_price || p.salePrice || p.price || 0;
          const stock = p.stock === 0 || p.in_stock === false ? 'Out of Stock' : 'In Stock';
          const disc = p.discount_percent ? ` | ${p.discount_percent}% OFF` : '';
          const feat = p.featured ? ' | ⭐ Best Seller' : '';
          const sizes = Array.isArray(p.sizes) && p.sizes.length > 0 ? ` | Sizes: ${p.sizes.join(', ')}` : '';
          const colors = Array.isArray(p.colors) && p.colors.length > 0 ? ` | Colors: ${p.colors.join(', ')}` : '';
          return `- ID:${p.id} | ${p.name} | Brand: ${p.brand || ''} | Category: ${p.category || ''} | Price: Rs.${price}${disc}${feat} | ${stock}${sizes}${colors}`;
        }).join('\n');
      }
      if (upsells.length > 0) {
        upsellText = `\n\n🔼 UPSELL (slightly above budget but better value):\n` +
          upsells.map((p) => `- ID:${p.id} | ${p.name} | Rs.${p.sale_price || p.price || 0} | ⭐`).join('\n');
        for (const p of upsells) topProductIds.add(String(p.id));
      }
      catalogCache.set(sessionId, { key: cacheKey, catalogText, upsellText, topProductIds, fallbackProducts, expiresAt: Date.now() + CATALOG_TTL });
    }
  }

  let offersText = 'No active offers.';
  try { const o = await getCachedOffers(); if (o.length > 0) offersText = o.map((x) => `- ${x.title}${x.description ? ': ' + x.description : ''}`).join('\n'); } catch (e) {}

  let reviewsText = '';
  try {
    const reviews = await getCachedReviews();
    if (reviews.length > 0) reviewsText = `\n\n⭐ REAL CUSTOMER REVIEWS (use naturally when customer hesitates):\n` + reviews.map((r) => `- "${r.review_text}" — ${r.customer_name} (${'⭐'.repeat(r.rating || 5)})`).join('\n');
  } catch (e) {}

  const waitlistInstruction = outOfStockAsked.length > 0
    ? `\n\n🔔 WAITLIST: These are Out of Stock: ${outOfStockAsked.map((p) => p.name).join(', ')}. Say: "Yeh abhi out of stock hai, lekin main waitlist mein add kar sakta hoon! Jab available hoga, aapko pehle WhatsApp karenge 😊 Apna naam aur number dein?" Then end with: WAITLIST: [productId]`
    : '';

  const referralInstruction = (contactCaptured || phoneFound) && userMsgCount >= 3
    ? `\n\n🎁 REFERRAL: If conversation is wrapping up positively, naturally add: "Apne dost ko bhi refer karo — dono ko special discount milega! Link: https://sethi-purse.vercel.app 😊"`
    : '';

  const langInstr = language === 'hindi' ? '🌐 Reply in friendly Hinglish.' : language === 'punjabi' ? '🌐 Reply in friendly Punjabi/Hinglish.' : '🌐 Reply in clear English with natural Hindi words.';
  const leadInstr = shouldAskContact ? (language === 'hindi' ? '📞 LEAD: After answering, add: "Aapka naam aur number share karein! 😊"' : '📞 LEAD: After answering, add: "Could I get your name and number? Our team will assist you! 😊"') : '';
  const upsellInstr = upsellProducts.length > 0 ? '💡 UPSELL: Mention 1 upsell naturally if customer is budget-focused. Include its ID in PRODUCTS line.' : '';
  const viewingInstr = pageContext?.productName
    ? `\n\n👀 CUSTOMER IS CURRENTLY VIEWING: "${pageContext.productName}" (${pageContext.category}). If they use words like "this" or "iska", assume they mean this product unless they clearly ask about something else.`
    : pageContext?.category
      ? `\n\n👀 CUSTOMER IS CURRENTLY BROWSING: ${pageContext.category} category.`
      : '';

  const systemPrompt = `You are a FRIENDLY, EXPERT sales assistant for SETHI PURSE, Punjab's trusted premium luggage store in Jalandhar.

🏪 STORE: SETHI PURSE | Mai Hiran Gate, Near Books Market, Jalandhar, Punjab 144001
Phone: +91 7986161633 | Hours: 10 AM - 8 PM Daily
Brands: American Tourister, Safari, Genie, Arctic Fox
Payment: Cash, UPI, Online Transfer | Delivery: In-store pickup (WhatsApp for special delivery)

📱 SOCIAL MEDIA (share these when asked):
Instagram: https://www.instagram.com/sethipurse
Facebook: https://www.facebook.com/sethipurse
YouTube: https://www.youtube.com/@sethipurse

${langInstr}
${viewingInstr}

🎯 PRODUCT CATALOG:
${catalogText}${upsellText}

🎁 ACTIVE OFFERS:
${offersText}
${reviewsText}
${waitlistInstruction}
${referralInstruction}

💡 RULES:
1. ACCURACY — Only use products from catalog. Never invent prices, specs, sizes, colors.
2. SHORT — 2-4 sentences max.
3. OUT OF STOCK — Suggest 2-3 IN-STOCK alternatives + offer waitlist.
4. DELIVERY — "In-store pickup. For delivery WhatsApp: +91 7986161633!"
5. PAYMENT — "Cash, UPI, Online Transfer. COD via WhatsApp orders!"
6. NEVER show raw IDs in visible text — only in PRODUCTS/WAITLIST/WHATSAPP lines.
7. PRODUCT CARDS — When mentioning products, end with: PRODUCTS: [id1, id2, id3]
8. WHATSAPP PREFILL — When customer clearly wants to buy a specific product, end with: WHATSAPP: Hi SETHI PURSE! I'm interested in [product name] (Rs.[price]). Please confirm availability.
9. SIZES/COLORS — Use catalog fields. If not listed say "Team se confirm karta hoon!"
10. SOCIAL MEDIA — When asked about Instagram, Facebook, YouTube, or social media, always share the actual links from the SOCIAL MEDIA section above. Never say you don't have them.
10. REVIEWS — Use naturally when customer hesitates.
${upsellInstr}
${leadInstr}

Be their trusted friend who knows bags — warm, helpful, local! 😊`;

  const result = await callAI((messages || []).slice(-12), systemPrompt);

  if (result.ok) {
    let reply = result.text;
    let productIds = [];
    let whatsappPrefill = null;
    let waitlistProductId = null;

    const productsMatch = reply.match(/products:\s*\[?\s*([0-9a-f-]+(?:\s*,\s*[0-9a-f-]+)*)\s*\]?/i);
    if (productsMatch) {
      productIds = productsMatch[1].split(',').map((s) => s.trim().replace(/['"]/g, '')).filter(Boolean).slice(0, 3);
      reply = reply.replace(/products:\s*\[?\s*([0-9a-f-]+(?:\s*,\s*[0-9a-f-]+)*)\s*\]?/gi, '').trim();
    }
    const waMatch = reply.match(/WHATSAPP:\s*(.+?)(\n|$)/i);
    if (waMatch) { whatsappPrefill = waMatch[1].trim(); reply = reply.replace(/WHATSAPP:\s*(.+?)(\n|$)/gi, '').trim(); }
    const wlMatch = reply.match(/WAITLIST:\s*\[?\s*([0-9a-f-]+)\s*\]?/i);
    if (wlMatch) { waitlistProductId = wlMatch[1].trim(); reply = reply.replace(/WAITLIST:\s*\[?\s*([0-9a-f-]+)\s*\]?/gi, '').trim(); }

    reply = reply.replace(/\(?\s*ID:?\s*[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\s*\)?/gi, '').replace(/\s{2,}/g, ' ').trim();

    const verifiedIds = productIds.filter((id) => topProductIds.has(String(id)));
    let matchedProducts = Array.isArray(products) ? products.filter((p) => verifiedIds.includes(String(p.id))) : [];
    // True whenever the products shown are NOT a confident catalog match —
    // either the search itself found nothing relevant (noDirectMatch), or the
    // AI's reply failed to cite real matches and we substituted top picks.
    let isFallback = noDirectMatch;
    if (matchedProducts.length === 0 && fallbackProducts.length > 0) {
      matchedProducts = fallbackProducts.slice(0, 3);
      isFallback = true;
      console.log(`ℹ️ AI reply had no valid PRODUCTS: line — falling back to top ${matchedProducts.length} matched products`);
    }
    const outOfStockMatches = matchedProducts.filter((p) => p.stock === 0 || p.in_stock === false);

    try {
      if (lastUserMsg) {
        const detCat = detectCategory(`${lastUserMsg.content} ${reply}`, dbCategories);
        const { data: ex } = await supabase.from('inquiries').select('id, product_interest, name, phone').eq('session_id', sessionId).maybeSingle();
        const interest = Array.from(new Set([...(ex?.product_interest ? ex.product_interest.split(', ').filter(Boolean) : []), ...matchedProducts.map((p) => p.name)])).join(', ') || 'General enquiry';
        const transcript = `User: "${lastUserMsg.content}" | AI (${result.usedAPI}): "${reply.slice(0, 250)}"`;
        let demandType = outOfStockMatches.length > 0 ? 'out_of_stock_interest' : null;
        if (noDirectMatch) demandType = demandType || 'no_catalog_match';
        if (buyIntentNow && (phoneFound || contactCaptured) && userMsgCount >= 3) demandType = 'priority_followup';
        if (ex) {
          const upd = { message: `[AI CHAT] ${transcript}`, product_interest: interest, category: detCat, demand_type: demandType, updated_at: nowIST(), ai_model: result.usedAPI };
          if (nameFound && (!ex.name || ex.name === 'AI Chat Visitor')) upd.name = nameFound;
          if (phoneFound && (!ex.phone || ex.phone === '0000000000')) upd.phone = phoneFound;
          if (buyIntentNow) upd.status = 'new';
          await supabase.from('inquiries').update(upd).eq('id', ex.id);
        } else {
          await supabase.from('inquiries').insert([{ id: uuidv4(), session_id: sessionId, name: nameFound || 'AI Chat Visitor', phone: phoneFound || '0000000000', city: 'Jalandhar', product_interest: interest, message: `[AI CHAT] ${transcript}`, status: 'new', category: detCat, demand_type: demandType, ai_model: result.usedAPI, created_at: nowIST() }]);
        }
      }
    } catch (e) { console.error('Inquiry logging failed:', e); }

    const resp = json({ reply, products: matchedProducts, isFallback, sessionId, contactCaptured: !!contactCaptured || !!phoneFound, aiModel: result.usedAPI, language, whatsappPrefill, waitlistProductId });
    resp.cookies.set('sethi_chat_session', sessionId, { maxAge: 60 * 60 * 24 * 30, httpOnly: true, sameSite: 'lax' });
    return resp;
  }

  const fallback = language === 'hindi' ? "Sorry, abhi problem — WhatsApp karein: +91 7986161633!" : "Sorry, having trouble — please WhatsApp us: +91 7986161633!";
  const resp = json({ reply: fallback, sessionId, aiModel: 'none', error: result.reason });
  resp.cookies.set('sethi_chat_session', sessionId, { maxAge: 60 * 60 * 24 * 30, httpOnly: true, sameSite: 'lax' });
  return resp;
}

async function handle(request, { params }) {
  const segments = (params?.path || []);
  const method = request.method;
  const globalLimited = rateLimit(request, 'global', 60);
  if (globalLimited) return globalLimited;
  const limited = rateLimit(request, `${method}:${segments[0] || 'root'}`, method === 'GET' ? 180 : 45);
  if (limited) return limited;
  const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
  const publicMutation = (segments[0] === 'auth' && segments[1] === 'login') || segments[0] === 'inquiries' || segments[0] === 'reviews' || segments[0] === 'push' || segments[0] === 'chat' || segments[0] === 'waitlist';

  if (segments[0] === 'upload' && method === 'POST') {
    const authError = requireAdmin(request);
    if (authError) return authError;
    try {
      const form = await request.formData();
      const file = form.get('file');
      const bucket = String(form.get('bucket') || 'products').replace(/[^a-z0-9_-]/gi, '').toLowerCase();
      if (!file || typeof file.arrayBuffer !== 'function') return json({ error: 'File is required' }, 400);
      const isVideo = file.type?.startsWith('video/');
      const isImage = file.type?.startsWith('image/');
      if (!isImage && !isVideo) return json({ error: 'Only image or video files are allowed' }, 400);
      const maxSize = isVideo ? 50 * 1024 * 1024 : 4 * 1024 * 1024;
      if (file.size > maxSize) return json({ error: isVideo ? 'Video must be under 50MB' : 'Image must be under 4MB' }, 400);
      let ext;
      if (isVideo) ext = file.type.includes('webm') ? 'webm' : 'mp4';
      else ext = file.type.includes('webp') ? 'webp' : file.type.includes('png') ? 'png' : 'jpg';
      const path = `${Date.now()}-${uuidv4()}.${ext}`;
      const bytes = await file.arrayBuffer();
      const buffer = new Uint8Array(bytes);
      const { error } = await supabase.storage.from(bucket).upload(path, buffer, { cacheControl: '31536000', contentType: file.type, upsert: false });
      if (error) return json({ error: error.message }, 500);
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      return json({ url: data.publicUrl, path, bucket }, 201);
    } catch (error) { return json({ error: error.message || 'Upload failed' }, 500); }
  }

  if (segments[0] === 'upload-url' && method === 'POST') {
    const authError = requireAdmin(request);
    if (authError) return authError;
    try {
      const { contentType, bucket: bucketRaw } = await request.json();
      const bucket = String(bucketRaw || 'products').replace(/[^a-z0-9_-]/gi, '').toLowerCase();
      const isVideo = contentType?.startsWith('video/');
      const isImage = contentType?.startsWith('image/');
      if (!isImage && !isVideo) return json({ error: 'Only image or video files are allowed' }, 400);
      let ext;
      if (isVideo) ext = contentType.includes('webm') ? 'webm' : 'mp4';
      else ext = contentType.includes('webp') ? 'webp' : contentType.includes('png') ? 'png' : 'jpg';
      const path = `${Date.now()}-${uuidv4()}.${ext}`;
      const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(path);
      if (error) return json({ error: error.message }, 500);
      const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
      return json({ token: data.token, path: data.path, bucket, url: pub.publicUrl }, 201);
    } catch (error) { return json({ error: error.message || 'Could not start upload' }, 500); }
  }

  if (isMutation && !publicMutation) {
    const authError = requireAdmin(request);
    if (authError) return authError;
  }

  let body = null;
  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    try { body = await request.json(); } catch (e) { body = null; }
  }

  if (segments[0] === 'waitlist') {
    if (method === 'POST') {
      const w = body || {};
      if (!w.productId || !w.name || !w.phone) return json({ error: 'productId, name and phone required' }, 400);
      const phone = String(w.phone).replace(/\D/g, '');
      if (phone.length !== 10) return json({ error: 'Phone must be 10 digits' }, 400);
      const { data, error } = await supabase.from('waitlist').insert([{ id: uuidv4(), product_id: String(w.productId), product_name: String(w.productName || ''), name: String(w.name).trim(), phone, session_id: w.sessionId || null, created_at: nowIST() }]).select().single();
      if (error) return json({ error: error.message }, 500);
      return json({ success: true, data }, 201);
    }
    if (method === 'GET') {
      const authError = requireAdmin(request);
      if (authError) return authError;
      const { data, error } = await supabase.from('waitlist').select('*').order('created_at', { ascending: false });
      if (error) return json({ error: error.message }, 500);
      return json(data || []);
    }
  }

  if (segments[0] === 'generate-description' && method === 'POST') {
    const authError = requireAdmin(request);
    if (authError) return authError;
    const { name, brand, category, imageUrl } = body || {};
    if (!name) return json({ error: 'Product name is required' }, 400);

    const contextLine = [name, brand, category].filter(Boolean).join(' — ');
    const sys = 'You are a senior e-commerce copywriter. Write product descriptions exactly like top listings on Flipkart or Amazon India — short, benefit-first, no fluff, no markdown.';
    const textPrompt = `Write a 1–2 sentence product description for this item: ${contextLine}
Rules:
- Lead with the #1 customer benefit or standout feature
- Mention build quality, ideal use case, or convenience if relevant
- Tone: confident and clear, not salesy
- No markdown, no bullet points, no emojis
- Max 70 words
- Do NOT invent sizes, weights, or prices
Return only the description text, nothing else.`;

    // 1. Try open-source chain first: Groq → OpenRouter → Cloudflare
    const aiResult = await callAI([{ role: 'user', content: textPrompt }], sys);
    if (aiResult.ok && aiResult.text) {
      console.log(`✅ generate-description via ${aiResult.usedAPI}`);
      return json({ description: aiResult.text.trim(), usedAPI: aiResult.usedAPI });
    }
    console.warn('Open-source chain failed for description, trying Gemini...');

    // 2. Fallback: Gemini (with vision if imageUrl provided)
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return json({ error: 'AI generation failed — no API keys available' }, 500);

    const visionPrompt = `Write a 1–2 sentence e-commerce product description (like a top Flipkart listing) for: ${contextLine}${imageUrl ? '\nLook at the image — mention the visible color and material only if clearly visible.' : ''}
Rules: benefit-first, confident tone, no markdown, no emojis, max 70 words, no invented specs. Return only the description text.`;
    try {
      const parts = [{ text: visionPrompt }];
      if (imageUrl) {
        try {
          const imgRes = await fetch(imageUrl);
          if (imgRes.ok) {
            const ct = imgRes.headers.get('content-type') || 'image/jpeg';
            const ab = await imgRes.arrayBuffer();
            parts.push({ inline_data: { mime_type: ct, data: Buffer.from(ab).toString('base64') } });
          }
        } catch (e) { console.warn('generate-description: image fetch failed', e); }
      }
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({ contents: [{ role: 'user', parts }] }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return json({ error: data?.error?.message || `Gemini error (${res.status})` }, 500);
      const description = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (!description) return json({ error: 'Empty response from AI' }, 502);
      return json({ description, usedAPI: 'gemini' });
    } catch (error) { return json({ error: error.message || 'All AI providers failed' }, 500); }
  }

  if (segments[0] === 'chat' && method === 'POST') {
    try {
      const cookieSessionId = request.cookies.get('sethi_chat_session')?.value || null;
      return await handleChat(body, cookieSessionId);
    } catch (err) {
      console.error('Chat error:', err);
      return json({ reply: "Sorry, something went wrong — please WhatsApp us at +91 7986161633!", error: 'unhandled_error' });
    }
  }

  if (segments[0] === 'slider-images' || segments[0] === 'slider_images') {
    if (segments.length === 1) {
      if (method === 'GET') { const { data, error } = await supabase.from('slider_images').select('*').order('sort_order', { ascending: true }); if (error) return json([]); return json(data || []); }
      if (method === 'POST') {
        const s = body || {};
        const slide = { id: uuidv4(), category: String(s.category || '').trim(), headline: String(s.headline || '').trim(), image_url: String(s.imageUrl || s.image_url || '').trim(), badge_icons: Array.isArray(s.badgeIcons || s.badge_icons) ? (s.badgeIcons || s.badge_icons) : [], badge_labels: Array.isArray(s.badgeLabels || s.badge_labels) ? (s.badgeLabels || s.badge_labels) : [], sort_order: Number(s.sortOrder ?? s.sort_order ?? 0), is_active: s.isActive === undefined && s.is_active === undefined ? true : !!(s.isActive ?? s.is_active), created_at: nowIST() };
        const { data, error } = await supabase.from('slider_images').insert([slide]).select().single();
        if (error) return json({ error: error.message }, 500);
        revalidateSlider();
        return json(data, 201);
      }
    }
    if (segments.length === 2) {
      const id = segments[1];
      if (method === 'PUT' || method === 'PATCH') {
        const s = body || {}; const updates = {};
        if (s.category !== undefined) updates.category = String(s.category).trim();
        if (s.headline !== undefined) updates.headline = String(s.headline).trim();
        if (s.imageUrl !== undefined || s.image_url !== undefined) updates.image_url = String(s.imageUrl ?? s.image_url).trim();
        if (s.badgeIcons !== undefined || s.badge_icons !== undefined) updates.badge_icons = Array.isArray(s.badgeIcons ?? s.badge_icons) ? (s.badgeIcons ?? s.badge_icons) : [];
        if (s.badgeLabels !== undefined || s.badge_labels !== undefined) updates.badge_labels = Array.isArray(s.badgeLabels ?? s.badge_labels) ? (s.badgeLabels ?? s.badge_labels) : [];
        if (s.sortOrder !== undefined || s.sort_order !== undefined) updates.sort_order = Number(s.sortOrder ?? s.sort_order);
        if (s.isActive !== undefined || s.is_active !== undefined) updates.is_active = !!(s.isActive ?? s.is_active);
        const { data, error } = await supabase.from('slider_images').update(updates).eq('id', id).select().single();
        if (error) return json({ error: error.message }, 500);
        revalidateSlider();
        return json(data);
      }
      if (method === 'DELETE') {
        const { data, error } = await supabase.from('slider_images').delete().eq('id', id).select().single();
        if (error) return json({ error: 'Not found' }, 404);
        revalidateSlider();
        return json({ success: true, removed: data });
      }
    }
  }

  if (segments[0] === 'recommend' && method === 'GET') {
    const url = new URL(request.url);
    const budget = url.searchParams.get('budget') || '';
    const use = url.searchParams.get('use') || '';
    const category = url.searchParams.get('category') || '';

    const USE_TO_CATEGORY = {
      daily: ['Handbags', 'Slings', 'Backpacks'],
      travel: ['LUGGAGE', 'Backpacks'],
      school: ['School Bags', 'Backpacks'],
      gift: [],
      office: ['Handbags', 'Backpacks', 'Slings'],
      party: ['Party Wear Purse', 'Handbags'],
    };
    // Keywords used to nudge ranking toward products that actually fit the
    // stated purpose, since category+budget alone can't tell a laptop
    // backpack from a school backpack.
    const USE_KEYWORDS = {
      daily: ['daily', 'everyday', 'lightweight', 'office'],
      travel: ['travel', 'trip', 'trolley', 'spinner', 'cabin', 'international', 'flight'],
      school: ['school', 'student', 'college'],
      gift: ['gift', 'premium', 'elegant'],
      office: ['laptop', 'office', 'professional', 'formal'],
      party: ['party', 'stylish', 'trendy', 'elegant'],
    };
    const USE_REASON = {
      daily: 'Best for daily use — durable and lightweight',
      travel: 'Perfect for travel — spacious and easy to carry',
      school: 'Great for school — comfortable and sturdy',
      gift: 'A premium gift choice — stylish and practical',
      office: 'Ideal for office use — professional look with smart storage',
      party: 'Perfect for parties — stylish and elegant',
    };

    let priceMin = 0, priceMax = 999999;
    if (budget === 'under1500') priceMax = 1500;
    else if (budget === '1500to3000') { priceMin = 1500; priceMax = 3000; }
    else if (budget === 'above3000') priceMin = 3000;

    // Category from user selection takes priority over use-based mapping
    const targetCategories = category ? [category] : (USE_TO_CATEGORY[use] || []);

    // "Best" = a weighted score, not just admin-flagged + newest. Purpose
    // relevance dominates (it's literally what the customer told us they need
    // it for) — featured/discount/popularity/price-fit only break ties among
    // similarly-relevant products, never override a relevance mismatch.
    function scoreProduct(p) {
      const price = Number(p.sale_price) || 0;
      let score = 0;
      const text = `${p.name || ''} ${p.description || ''}`.toLowerCase();
      if ((USE_KEYWORDS[use] || []).some((k) => text.includes(k))) score += 10;
      if (p.featured) score += 1;
      score += Math.min(Number(p.discount_percent) || 0, 50) / 50; // up to +1
      score += Math.min(Math.log10((Number(p.view_count) || 0) + 1), 2); // up to +2, diminishing returns
      if (priceMax < 999999) {
        const bucketWidth = Math.max(priceMax - priceMin, 1);
        const mid = priceMin + bucketWidth / 2;
        score += Math.max(0, 1 - Math.abs(price - mid) / bucketWidth); // up to +1
      }
      return score;
    }

    async function fetchPool({ withCategory, withBudget }) {
      let q = supabase.from('products').select('*').eq('is_active', true).neq('stock', 0);
      if (withCategory && targetCategories.length > 0) q = q.in('category', targetCategories);
      if (withBudget) q = q.gte('sale_price', priceMin).lte('sale_price', priceMax);
      const { data } = await q.limit(30);
      return data || [];
    }

    try {
      // Fallback ladder — always excludes out-of-stock. Widen the budget
      // before ever dropping the category, so a trolley-bag request never
      // ends up recommending an unrelated wallet just because it's cheap.
      let pool = await fetchPool({ withCategory: true, withBudget: true });
      if (pool.length === 0 && targetCategories.length > 0) pool = await fetchPool({ withCategory: true, withBudget: false });
      if (pool.length === 0) pool = await fetchPool({ withCategory: false, withBudget: true });
      if (pool.length === 0) pool = await fetchPool({ withCategory: false, withBudget: false });
      if (pool.length === 0) return json({ product: null, alternatives: [] });

      pool = pool
        .map((p) => ({ p, s: scoreProduct(p) }))
        .sort((a, b) => b.s - a.s)
        .map(({ p }) => p);

      const top = pool[0];
      const alternatives = pool.slice(1, 3);
      const reason = USE_REASON[use] || 'Top pick for your budget';

      return json({ product: top, alternatives, reason });
    } catch (e) {
      return json({ error: e.message }, 500);
    }
  }

  if (segments[0] === 'products') {
    if (segments.length === 1) {
      if (method === 'GET') { const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false }); if (error) return json([]); return json(data || []); }
      if (method === 'POST') {
        const p = body || {};
        const saleValue = p.salePrice ?? p.sale_price ?? p.price;
        // Falsy check here would wrongly reject a legitimate Rs.0 sale price
        // (same bug class as the historical rating-0 bug) — check presence.
        if (!p.name || !(p.category || p.category_id) || saleValue === undefined || saleValue === null || saleValue === '') return json({ error: 'Missing required fields' }, 400);
        
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
          tags: Array.isArray(p.tags) ? p.tags : [],
          stock: p.stock === '' || p.stock === null || p.stock === undefined ? null : Number(p.stock), 
          featured: !!p.featured, 
          is_active: p.isActive === undefined && p.is_active === undefined ? true : !!(p.isActive ?? p.is_active),
          // ✅ SCARCITY FIELDS
          scarcity_mode: String(p.scarcity_mode || 'off').trim(),
          display_stock: p.display_stock === '' || p.display_stock === null ? null : Number(p.display_stock),
          stock_decay_speed: Number(p.stock_decay_speed) || 0,
          viewing_min: Number(p.viewing_min) || 3,
          viewing_max: Number(p.viewing_max) || 12,
          price_lock_hours: Number(p.price_lock_hours) || 0,
          local_scarcity: !!p.local_scarcity,
          scarcity_label: String(p.scarcity_label || '').trim() || null,
          demo_video_url: String(p.demo_video_url || '').trim() || null,
          created_at: nowIST()
        };
        const { data, error } = await supabase.from('products').insert([newProduct]).select().single();
        if (error) return json({ error: error.message }, 500);
        revalidateProduct(data.id);
        return json(data, 201);
      }
    }
    if (segments.length === 3 && segments[2] === 'view' && method === 'POST') {
      const id = segments[1];
      try {
        const { data: cur } = await supabase.from('products').select('view_count').eq('id', id).single();
        if (cur) await supabase.from('products').update({ view_count: (cur.view_count || 0) + 1 }).eq('id', id);
      } catch (e) {}
      return json({ ok: true });
    }

    if (segments.length === 2) {
      const id = segments[1];
      if (method === 'GET') { const { data, error } = await supabase.from('products').select('*').eq('id', id).single(); if (error) return json({ error: 'Not found' }, 404); return json(data); }
      if (method === 'PUT') {
        const p = body || {}; 
        const updates = {};
        if (p.name !== undefined) updates.name = String(p.name).trim();
        if (p.brand !== undefined) updates.brand = String(p.brand).trim();
        if (p.category !== undefined) updates.category = String(p.category).trim();
        if (p.category_id !== undefined) updates.category_id = p.category_id;
        if (p.mrp !== undefined) updates.mrp = Number(p.mrp);
        if (p.original_price !== undefined) updates.original_price = Number(p.original_price);
        if (p.salePrice !== undefined || p.sale_price !== undefined || p.price !== undefined) updates.sale_price = Number(p.salePrice ?? p.sale_price ?? p.price);
        if (p.discount_percent !== undefined) updates.discount_percent = Number(p.discount_percent);
        if (p.description !== undefined) updates.description = String(p.description).trim();
        if (p.imageUrl !== undefined || p.image_url !== undefined) updates.image_url = String(p.imageUrl ?? p.image_url).trim();
        if (p.imageType !== undefined) updates.image_type = p.imageType;
        if (p.gallery_images !== undefined || p.galleryImages !== undefined) updates.gallery_images = Array.isArray(p.gallery_images ?? p.galleryImages) ? (p.gallery_images ?? p.galleryImages) : [];
        if (p.sizes !== undefined) updates.sizes = Array.isArray(p.sizes) ? p.sizes : [];
        if (p.colors !== undefined) updates.colors = Array.isArray(p.colors) ? p.colors : [];
        if (p.tags !== undefined) updates.tags = Array.isArray(p.tags) ? p.tags : [];
        if (p.stock !== undefined) updates.stock = p.stock === '' || p.stock === null ? null : Number(p.stock);
        if (p.featured !== undefined) updates.featured = !!p.featured;
        if (p.isActive !== undefined || p.is_active !== undefined) updates.is_active = !!(p.isActive ?? p.is_active);
        // ✅ SCARCITY FIELDS IN PUT
        if (p.scarcity_mode !== undefined) updates.scarcity_mode = String(p.scarcity_mode || 'off').trim();
        if (p.display_stock !== undefined) updates.display_stock = p.display_stock === '' || p.display_stock === null ? null : Number(p.display_stock);
        if (p.stock_decay_speed !== undefined) updates.stock_decay_speed = Number(p.stock_decay_speed) || 0;
        if (p.viewing_min !== undefined) updates.viewing_min = Number(p.viewing_min) || 3;
        if (p.viewing_max !== undefined) updates.viewing_max = Number(p.viewing_max) || 12;
        if (p.price_lock_hours !== undefined) updates.price_lock_hours = Number(p.price_lock_hours) || 0;
        if (p.local_scarcity !== undefined) updates.local_scarcity = !!p.local_scarcity;
        if (p.scarcity_label !== undefined) updates.scarcity_label = String(p.scarcity_label || '').trim() || null;
        if (p.demo_video_url !== undefined) updates.demo_video_url = String(p.demo_video_url || '').trim() || null;

        const { data, error } = await supabase.from('products').update(updates).eq('id', id).select().single();
        if (error) return json({ error: error.message }, 500);
        revalidateProduct(id);
        return json(data);
      }
      if (method === 'DELETE') {
        const { data, error } = await supabase.from('products').delete().eq('id', id).select().single();
        if (error) return json({ error: 'Not found' }, 404);
        revalidateProduct(id);
        return json({ success: true, removed: data });
      }
    }
  }

  if (segments[0] === 'categories') {
    if (segments.length === 1) {
      if (method === 'GET') { const { data, error } = await supabase.from('categories').select('*').order('created_at', { ascending: true }); if (error) return json(LOCAL_CATEGORIES); return json(data && data.length > 0 ? data : LOCAL_CATEGORIES); }
      if (method === 'POST') {
        const c = body || {}; if (!c.name) return json({ error: 'Name required' }, 400);
        const cat = { id: uuidv4(), name: String(c.name).trim(), image_url: String(c.imageUrl || '').trim(), created_at: nowIST() };
        const { data, error } = await supabase.from('categories').insert([cat]).select().single();
        if (error) { if (error.code === '23505') return json({ error: 'Category already exists' }, 400); return json({ error: error.message }, 500); }
        categoriesCache = { data: null, expiresAt: 0 };
        revalidateCategories();
        return json(data, 201);
      }
    }
    if (segments.length === 2) {
      const id = segments[1];
      if (method === 'PUT') {
        const c = body || {}; const updates = {};
        if (c.name !== undefined) updates.name = String(c.name).trim();
        if (c.imageUrl !== undefined) updates.image_url = String(c.imageUrl).trim();
        const { data, error } = await supabase.from('categories').update(updates).eq('id', id).select().single();
        if (error) return json({ error: error.message }, 500);
        categoriesCache = { data: null, expiresAt: 0 };
        revalidateCategories();
        return json(data);
      }
      if (method === 'DELETE') {
        const { data, error } = await supabase.from('categories').delete().eq('id', id).select().single();
        if (error) return json({ error: 'Not found' }, 404);
        categoriesCache = { data: null, expiresAt: 0 };
        revalidateCategories();
        return json({ success: true, removed: data });
      }
    }
  }

  if (segments[0] === 'offers') {
    if (segments.length === 1) {
      if (method === 'GET') { const { data, error } = await supabase.from('offers').select('*').order('created_at', { ascending: false }); if (error) return json({ error: error.message }, 500); return json(data || []); }
      if (method === 'POST') {
        const o = body || {}; if (!o.title) return json({ error: 'Title required' }, 400);
        const offer = { id: uuidv4(), title: String(o.title).trim(), description: String(o.description || '').trim(), banner_url: String(o.bannerUrl || '').trim(), expiry_date: o.expiryDate || null, is_active: o.isActive === undefined ? true : !!o.isActive, created_at: nowIST() };
        const { data, error } = await supabase.from('offers').insert([offer]).select().single();
        if (error) return json({ error: error.message }, 500);
        revalidateOffers();
        return json(data, 201);
      }
    }
    if (segments.length === 2) {
      const id = segments[1];
      if (method === 'PUT') { const o = body || {}; const updates = {}; if (o.title !== undefined) updates.title = String(o.title).trim(); if (o.description !== undefined) updates.description = String(o.description).trim(); if (o.bannerUrl !== undefined) updates.banner_url = String(o.bannerUrl).trim(); if (o.expiryDate !== undefined) updates.expiry_date = o.expiryDate; if (o.isActive !== undefined) updates.is_active = !!o.isActive; const { data, error } = await supabase.from('offers').update(updates).eq('id', id).select().single(); if (error) return json({ error: error.message }, 500); revalidateOffers(); return json(data); }
      if (method === 'DELETE') { const { data, error } = await supabase.from('offers').delete().eq('id', id).select().single(); if (error) return json({ error: 'Not found' }, 404); revalidateOffers(); return json({ success: true, removed: data }); }
    }
  }

  if (segments[0] === 'inquiries') {
    if (segments.length === 1) {
      if (method === 'GET') { const authError = requireAdmin(request); if (authError) return authError; const { data, error } = await supabase.from('inquiries').select('*').order('created_at', { ascending: false }); if (error) return json({ error: error.message }, 500); return json(data || []); }
      if (method === 'POST') {
        const i = body || {}; const phone = String(i.phone || '').replace(/\D/g, '');
        if (!i.name || !phone || !i.city || !i.productInterest || !i.message) return json({ error: 'All fields are required' }, 400);
        if (phone.length !== 10) return json({ error: 'Phone must be 10 digits' }, 400);
        const dbCats = await getCachedCategoryNames();
        const detCat = detectCategory(`${i.productInterest} ${i.message}`, dbCats);
        const inquiry = { id: uuidv4(), name: String(i.name).trim(), phone, city: String(i.city).trim(), product_interest: String(i.productInterest).trim(), message: String(i.message).trim(), status: 'new', category: detCat, whatsapp_consent: !!i.whatsappConsent, created_at: nowIST() };
        const { data, error } = await supabase.from('inquiries').insert([inquiry]).select().single();
        if (error) return json({ error: error.message }, 500); return json(data, 201);
      }
    }
    if (segments.length === 2) {
      const id = segments[1];
      if (method === 'PUT') {
        const authError = requireAdmin(request);
        if (authError) return authError;
        const i = body || {};
        const updates = {};
        if (i.status !== undefined) {
          if (!VALID_STATUSES.includes(i.status)) return json({ error: 'Invalid status' }, 400);
          updates.status = i.status;
        }
        const { data, error } = await supabase.from('inquiries').update(updates).eq('id', id).select().single();
        if (error) return json({ error: error.message }, 500);
        if (i.status === 'converted' && data?.product_interest) {
          try {
            const names = data.product_interest.split(',').map((s) => s.trim()).filter(Boolean);
            for (const name of names) {
              const { data: p } = await supabase.from('products').select('id, purchase_count').ilike('name', `%${name}%`).limit(1).single();
              if (p) await supabase.from('products').update({ purchase_count: (p.purchase_count || 0) + 1 }).eq('id', p.id);
            }
          } catch (e) {}
        }
        return json(data);
      }
      if (method === 'DELETE') { const authError = requireAdmin(request); if (authError) return authError; const { data, error } = await supabase.from('inquiries').delete().eq('id', id).select().single(); if (error) return json({ error: 'Not found' }, 404); return json({ success: true, removed: data }); }
    }
  }

  if (segments[0] === 'reviews') {
    if (segments.length === 1) {
      if (method === 'GET') { const { data, error } = await supabase.from('reviews').select('*').order('created_at', { ascending: false }); if (error) return json({ error: error.message }, 500); return json(data || []); }
      if (method === 'POST') {
        const r = body || {}; if (!r.customerName || !r.reviewText) return json({ error: 'Name and review text required' }, 400);
        const rating = Math.max(1, Math.min(5, r.rating !== undefined && r.rating !== null && r.rating !== '' ? Number(r.rating) : 5));
        const review = { id: uuidv4(), customer_name: String(r.customerName).trim(), customer_photo: String(r.customerPhoto || '').trim(), rating, review_text: String(r.reviewText).trim(), is_featured: !!r.isFeatured, category: r.category ? String(r.category).trim() : null, created_at: nowIST() };
        const { data, error } = await supabase.from('reviews').insert([review]).select().single();
        if (error) return json({ error: error.message }, 500); return json(data, 201);
      }
    }
    if (segments.length === 2) {
      const id = segments[1];
      if (method === 'PUT') { const authError = requireAdmin(request); if (authError) return authError; const r = body || {}; const updates = {}; if (r.customerName !== undefined) updates.customer_name = String(r.customerName).trim(); if (r.customerPhoto !== undefined) updates.customer_photo = String(r.customerPhoto).trim(); if (r.rating !== undefined) updates.rating = Math.max(1, Math.min(5, Number(r.rating))); if (r.reviewText !== undefined) updates.review_text = String(r.reviewText).trim(); if (r.isFeatured !== undefined) updates.is_featured = !!r.isFeatured; if (r.category !== undefined) updates.category = r.category ? String(r.category).trim() : null; const { data, error } = await supabase.from('reviews').update(updates).eq('id', id).select().single(); if (error) return json({ error: error.message }, 500); return json(data); }
      if (method === 'DELETE') { const authError = requireAdmin(request); if (authError) return authError; const { data, error } = await supabase.from('reviews').delete().eq('id', id).select().single(); if (error) return json({ error: 'Not found' }, 404); return json({ success: true, removed: data }); }
    }
  }

  if (segments[0] === 'auth') {
    if (segments[1] === 'session' && method === 'GET') return json({ authenticated: !!request.cookies.get('sethi_admin_session')?.value });
    if (segments[1] === 'login' && method === 'POST') {
      const authLimited = rateLimit(request, 'admin-login', 8); if (authLimited) return authLimited;
      const { data: settings, error: settingsError } = await supabase.from('settings').select('*').single();
      if (settingsError) return json({ error: 'Auth service unavailable' }, 503);
      const { username, password } = body || {};
      const validUser = settings?.username || 'admin'; const validPass = settings?.password || 'sethi2024';
      if (username === validUser && password === validPass) { const token = makeAdminToken(); return setAdminCookie(json({ success: true, token }), token); }
      return json({ error: 'Invalid credentials' }, 401);
    }
    if (segments[1] === 'logout' && method === 'POST') return clearAdminCookie(json({ success: true }));
  }

  if (segments[0] === 'push') {
    if (segments[1] === 'subscribe' && method === 'POST') {
      const subscription = body?.subscription; if (!subscription?.endpoint) return json({ error: 'Subscription required' }, 400);
      const record = { id: uuidv4(), endpoint: subscription.endpoint, subscription, created_at: nowIST() };
      const { error } = await supabase.from('push_subscriptions').upsert([record], { onConflict: 'endpoint' });
      if (error) return json({ error: error.message }, 500); return json({ success: true }, 201);
    }
    if (segments[1] === 'send' && method === 'POST') {
      const authError = requireAdmin(request); if (authError) return authError;
      const title = String(body?.title || 'SETHI PURSE'); const message = String(body?.message || 'New arrivals!'); const url = String(body?.url || '/');
      try {
        const webpush = await import('web-push');
        const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY; const privateKey = process.env.VAPID_PRIVATE_KEY;
        if (!publicKey || !privateKey) return json({ error: 'VAPID keys not configured' }, 400);
        webpush.default.setVapidDetails('mailto:admin@sethipurse.com', publicKey, privateKey);
        const { data: subscriptions, error } = await supabase.from('push_subscriptions').select('*');
        if (error) return json({ error: error.message }, 500);
        const payload = JSON.stringify({ title, body: message, url });
        const results = await Promise.allSettled((subscriptions || []).map((row) => webpush.default.sendNotification(row.subscription, payload)));
        return json({ success: true, sent: results.filter((r) => r.status === 'fulfilled').length, total: results.length });
      } catch (error) { return json({ error: 'Install web-push and configure VAPID keys.' }, 500); }
    }
  }

  if (segments[0] === 'settings') {
    if (method === 'GET') { const { data: settings, error: settingsError } = await supabase.from('settings').select('username').single(); if (settingsError) return json({ error: 'Settings unavailable' }, 503); return json({ username: settings?.username || 'admin' }); }
    if (method === 'PUT') {
      const { action, currentPassword, newPassword, confirmPassword, newUsername } = body || {};
      const { data: settings, error: settingsError } = await supabase.from('settings').select('*').single();
      if (settingsError) return json({ error: 'Settings unavailable' }, 503);
      const cur = settings || { username: 'admin', password: 'sethi2024' };
      if (action === 'change-password') {
        if (!currentPassword || !newPassword || !confirmPassword) return json({ error: 'All fields required' }, 400);
        if (currentPassword !== cur.password) return json({ error: 'Current password incorrect' }, 400);
        if (newPassword.length < 6) return json({ error: 'Password must be at least 6 characters' }, 400);
        if (newPassword !== confirmPassword) return json({ error: 'Passwords do not match' }, 400);
        const { error: updateError } = await supabase.from('settings').update({ password: newPassword }).eq('id', cur.id);
        if (updateError) return json({ error: 'Failed to update password' }, 500);
        return json({ success: true });
      }
      if (action === 'change-username') {
        if (!newUsername || !currentPassword) return json({ error: 'Username and password required' }, 400);
        if (currentPassword !== cur.password) return json({ error: 'Current password incorrect' }, 400);
        const trimmed = String(newUsername).trim();
        const { error: updateError } = await supabase.from('settings').update({ username: trimmed }).eq('id', cur.id);
        if (updateError) return json({ error: 'Failed to update username' }, 500);
        return json({ success: true, username: trimmed });
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
