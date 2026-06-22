import { NextResponse } from 'next/server';
import { supabase, nowIST } from '@/lib/storage';
import { clearAdminCookie, makeAdminToken, rateLimit, requireAdmin, setAdminCookie } from '@/lib/security';
import { v4 as uuidv4 } from 'uuid';
import categoriesJson from '@/data/categories.json';

const LOCAL_CATEGORIES = categoriesJson.map((c) => ({
  ...c,
  image_url: c.image_url || c.imageUrl || '',
  sort_order: c.sort_order ?? 0,
}));

const VALID_STATUSES = ['new', 'contacted', 'converted', 'closed'];

const CATEGORY_KEYWORDS = {
  'Backpacks': ['backpack', 'bag pack', 'rucksack'],
  'Handbags': ['handbag', 'hand bag', 'ladies bag', 'purse'],
  'Luggage': ['luggage', 'trolley', 'suitcase', 'travel bag'],
  'Wallets': ['wallet', 'purse for cash'],
  'Slings': ['sling'],
  'School Bags': ['school bag'],
};

function detectCategory(text) {
  const lower = (text || '').toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) return category;
  }
  return 'Other';
}

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
  const recentText = (messages || [])
    .slice(-3)
    .filter((m) => m.role === 'user')
    .map((m) => m.content || '')
    .join(' ');
  if (/[\u0900-\u097F]/.test(recentText)) return 'hindi';
  if (/[\u0A00-\u0A7F]/.test(recentText)) return 'punjabi';
  const hindiRomanized = ['kya', 'hai', 'nahi', 'kaise', 'kitna', 'kitne', 'chahiye', 'lena', 'dena',
    'batao', 'bhai', 'yaar', 'agar', 'aur', 'mujhe', 'mere', 'mera', 'karo', 'kab', 'kahan',
    'hoga', 'hain', 'toh', 'lekin', 'sahi', 'accha', 'theek', 'bilkul', 'zaroor'];
  const lowerText = recentText.toLowerCase();
  const hindiMatches = hindiRomanized.filter((w) => lowerText.includes(w)).length;
  if (hindiMatches >= 2) return 'hindi';
  return 'english';
}

function extractPhone(text) {
  const match = String(text || '').match(/(?:\+?91[\s-]?)?([6-9]\d{9})\b/);
  return match ? match[1] : null;
}

function extractName(text) {
  const t = String(text || '').trim();
  const patterns = [
    /(?:my name is|i am|i'm|naam|mera naam)\s+([a-zA-Z\u0900-\u097F]{2,30})/i,
  ];
  for (const p of patterns) {
    const m = t.match(p);
    if (m) return m[1].trim();
  }
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

function json(data, status = 200) {
  return NextResponse.json(data, { status });
}

// ── IMPROVEMENT #8: lightweight repetition / frustration detector ──
// If the customer's last 3 user messages are highly similar, they're likely
// stuck getting the same unhelpful answer. Skip the AI and hand off directly.
function normalizeForSimilarity(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(Boolean);
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
  const lastThree = userMsgs.slice(-3);
  const sim1 = wordOverlapRatio(lastThree[0], lastThree[1]);
  const sim2 = wordOverlapRatio(lastThree[1], lastThree[2]);
  return sim1 >= 0.5 && sim2 >= 0.5;
}

let offersCache = { data: null, expiresAt: 0 };
async function getCachedOffers() {
  if (offersCache.data && Date.now() < offersCache.expiresAt) return offersCache.data;
  const { data: offers } = await supabase
    .from('offers')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(5);
  const liveOffers = (offers || []).filter((o) => {
    if (!o.expiry_date) return true;
    return new Date(o.expiry_date) >= new Date();
  });
  offersCache = { data: liveOffers, expiresAt: Date.now() + 3 * 60 * 1000 };
  return liveOffers;
}

// ── IMPROVEMENT #5: short-lived per-session catalog cache ──
// Avoids rebuilding/re-sending the full catalog text on every single turn of
// the same conversation when the topic hasn't changed.
const catalogCache = new Map(); // sessionId -> { key, catalogText, upsellText, topProductIds, expiresAt }
const CATALOG_CACHE_TTL_MS = 60 * 1000;

function pruneCatalogCache() {
  const now = Date.now();
  for (const [key, val] of catalogCache.entries()) {
    if (val.expiresAt < now) catalogCache.delete(key);
  }
}

function matchProducts(query, products, priceRange, limit = 10) {
  if (!Array.isArray(products) || products.length === 0) return { matched: [], upsells: [] };
  const lower = (query || '').toLowerCase();
  const scored = products.map((p) => {
    let score = 0;
    const price = p.sale_price || p.salePrice || p.price || 0;
    if (p.name.toLowerCase() === lower) score += 100;
    if (p.name.toLowerCase().includes(lower)) score += 50;
    if ((p.brand || '').toLowerCase().includes(lower)) score += 30;
    if (detectCategory(lower) === p.category) score += 20;
    if (p.featured) score += 15;
    if (p.stock !== 0 && p.in_stock !== false) score += 10;
    if (priceRange) {
      if (priceRange.max && price <= priceRange.max) score += 25;
      if (priceRange.min && price >= priceRange.min) score += 15;
      if (priceRange.max && price > priceRange.max && price <= priceRange.max * 1.4) score -= 5;
    }
    return { ...p, matchScore: score, price };
  });
  const matched = scored
    .filter((p) => p.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit);
  let upsells = [];
  if (matched.length > 0 && priceRange?.max) {
    const maxMatched = priceRange.max;
    upsells = products
      .filter((p) => {
        const price = p.sale_price || p.salePrice || p.price || 0;
        return price > maxMatched && price <= maxMatched * 1.5 && p.featured && p.stock !== 0;
      })
      .sort((a, b) => {
        const ap = a.sale_price || a.salePrice || a.price || 0;
        const bp = b.sale_price || b.salePrice || b.price || 0;
        return ap - bp;
      })
      .slice(0, 2);
  }
  return { matched, upsells };
}

// ── 4-TIER AI FALLBACK CHAIN: Groq -> Gemini -> OpenRouter -> Cloudflare Workers AI ──
// Each tier only runs if the previous one fails (timeout/error/rate-limit).
// Timeouts kept short (~7s) since up to 4 may run back-to-back in a worst case.
const TIER_TIMEOUT_MS = 7000;

function toOpenAIFormat(messages) {
  return messages.map((m) => ({ role: m.role, content: String(m.content || '').slice(0, 800) }));
}

async function callGroq(messages, systemPrompt, apiKey) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIER_TIMEOUT_MS);
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'system', content: systemPrompt }, ...toOpenAIFormat(messages)],
        temperature: 0.7,
        max_tokens: 500,
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      console.error('Groq HTTP error', res.status, (await res.text().catch(() => '')).slice(0, 300));
      return { ok: false, reason: 'groq_http_error', status: res.status };
    }
    const data = await res.json().catch(() => null);
    const text = data?.choices?.[0]?.message?.content?.trim();
    if (text) return { ok: true, text };
    return { ok: false, reason: 'groq_empty' };
  } catch (err) {
    clearTimeout(timer);
    return { ok: false, reason: err?.name === 'AbortError' ? 'groq_timeout' : 'groq_fetch_error' };
  }
}

const GEMINI_MODEL = 'gemini-2.5-flash-lite'; // gemini-1.5-flash / 2.0-flash are retired (404)

async function callGeminiChat(messages, systemPrompt, apiKey) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIER_TIMEOUT_MS);
  try {
    const geminiMessages = messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: String(m.content || '').slice(0, 800) }],
    }));
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: geminiMessages,
          generationConfig: { temperature: 0.7, maxOutputTokens: 500 },
        }),
        signal: controller.signal,
      }
    );
    clearTimeout(timer);
    if (!res.ok) {
      console.error('Gemini HTTP error', res.status, (await res.text().catch(() => '')).slice(0, 300));
      return { ok: false, reason: 'gemini_http_error', status: res.status };
    }
    const data = await res.json().catch(() => null);
    const text = data?.candidates?.[0]?.content?.parts?.map((p) => p?.text || '').join('').trim();
    if (text) return { ok: true, text };
    return { ok: false, reason: data?.candidates?.[0]?.finishReason || 'gemini_empty' };
  } catch (err) {
    clearTimeout(timer);
    return { ok: false, reason: err?.name === 'AbortError' ? 'gemini_timeout' : 'gemini_fetch_error' };
  }
}

async function callOpenRouter(messages, systemPrompt, apiKey) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIER_TIMEOUT_MS);
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://sethi-purse.vercel.app',
        'X-Title': 'Sethi Purse Chatbot',
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.3-70b-instruct:free',
        messages: [{ role: 'system', content: systemPrompt }, ...toOpenAIFormat(messages)],
        temperature: 0.7,
        max_tokens: 500,
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      console.error('OpenRouter HTTP error', res.status, (await res.text().catch(() => '')).slice(0, 300));
      return { ok: false, reason: 'openrouter_http_error', status: res.status };
    }
    const data = await res.json().catch(() => null);
    const text = data?.choices?.[0]?.message?.content?.trim();
    if (text) return { ok: true, text };
    return { ok: false, reason: 'openrouter_empty' };
  } catch (err) {
    clearTimeout(timer);
    return { ok: false, reason: err?.name === 'AbortError' ? 'openrouter_timeout' : 'openrouter_fetch_error' };
  }
}

async function callCloudflare(messages, systemPrompt, accountId, apiToken) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIER_TIMEOUT_MS);
  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/meta/llama-3.1-8b-instruct`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken}` },
        body: JSON.stringify({
          messages: [{ role: 'system', content: systemPrompt }, ...toOpenAIFormat(messages)],
          max_tokens: 500,
        }),
        signal: controller.signal,
      }
    );
    clearTimeout(timer);
    if (!res.ok) {
      console.error('Cloudflare HTTP error', res.status, (await res.text().catch(() => '')).slice(0, 300));
      return { ok: false, reason: 'cloudflare_http_error', status: res.status };
    }
    const data = await res.json().catch(() => null);
    const text = data?.result?.response?.trim();
    if (text) return { ok: true, text };
    return { ok: false, reason: 'cloudflare_empty' };
  } catch (err) {
    clearTimeout(timer);
    return { ok: false, reason: err?.name === 'AbortError' ? 'cloudflare_timeout' : 'cloudflare_fetch_error' };
  }
}

async function callAI(messages, systemPrompt) {
  const groqKey = process.env.GROQ_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  const openrouterKey = process.env.OPENROUTER_API_KEY;
  const cfAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const cfApiToken = process.env.CLOUDFLARE_API_TOKEN;

  if (groqKey) {
    const result = await callGroq(messages, systemPrompt, groqKey);
    if (result.ok) return { ...result, usedAPI: 'groq' };
    console.warn('Groq failed, trying Gemini:', result.reason);
  }
  if (geminiKey) {
    const result = await callGeminiChat(messages, systemPrompt, geminiKey);
    if (result.ok) return { ...result, usedAPI: 'gemini' };
    console.warn('Gemini failed, trying OpenRouter:', result.reason);
  }
  if (openrouterKey) {
    const result = await callOpenRouter(messages, systemPrompt, openrouterKey);
    if (result.ok) return { ...result, usedAPI: 'openrouter' };
    console.warn('OpenRouter failed, trying Cloudflare:', result.reason);
  }
  if (cfAccountId && cfApiToken) {
    const result = await callCloudflare(messages, systemPrompt, cfAccountId, cfApiToken);
    if (result.ok) return { ...result, usedAPI: 'cloudflare' };
    console.error('Cloudflare failed, all tiers exhausted:', result.reason);
  }
  return { ok: false, reason: 'all_providers_failed', usedAPI: 'none' };
}

async function handleChat(body, incomingCookieSessionId) {
  const { messages, products, sessionId: incomingSessionId, contactCaptured } = body || {};
  // IMPROVEMENT #8 (partial): fall back to a cookie-based session id so a page
  // refresh doesn't fragment the same customer into a new "AI Chat Visitor" lead.
  const sessionId = incomingSessionId || incomingCookieSessionId || uuidv4();
  const lastUserMsg = [...(messages || [])].reverse().find((m) => m.role === 'user');
  const userMessageCount = countUserMessages(messages);
  const buyIntentNow = hasBuyIntent(lastUserMsg?.content);
  const phoneInThisMessage = extractPhone(lastUserMsg?.content);
  const nameInThisMessage = extractName(lastUserMsg?.content);
  const priceRange = extractPriceRange(lastUserMsg?.content);
  const language = detectLanguage(messages);

  // ── IMPROVEMENT #6: frustration / repetition detector ──
  // If the customer is clearly stuck (3 very similar messages in a row), skip
  // the AI entirely and hand off to a human instead of trying a 4th time.
  if (detectRepeatedFrustration(messages)) {
    const handoffMsg = language === 'hindi'
      ? "Lagta hai aapko sahi jawab nahi mil pa raha — sorry! Hamari team se seedha baat karein: +91 7986161633 (call/WhatsApp), hum turant help karenge! 🙏"
      : "Looks like I'm not getting this quite right for you — sorry about that! Please call or WhatsApp our team directly at +91 7986161633, they'll help you right away. 🙏";
    try {
      if (lastUserMsg) {
        const { data: existing } = await supabase
          .from('inquiries')
          .select('id')
          .eq('session_id', sessionId)
          .maybeSingle();
        if (existing) {
          await supabase.from('inquiries').update({
            demand_type: 'priority_followup',
            message: `[AI CHAT - ESCALATED] User repeated similar queries without resolution. Last: "${lastUserMsg.content}"`,
            updated_at: nowIST(),
          }).eq('id', existing.id);
        }
      }
    } catch (e) { console.error('Escalation logging failed:', e); }
    const resp = json({ reply: handoffMsg, sessionId, contactCaptured: !!contactCaptured, aiModel: 'none', language, escalated: true });
    resp.cookies.set('sethi_chat_session', sessionId, { maxAge: 60 * 60 * 24 * 30, httpOnly: true, sameSite: 'lax' });
    return resp;
  }

  const shouldAskForContact = !contactCaptured && !phoneInThisMessage && (
    (buyIntentNow && userMessageCount >= 2) ||
    (userMessageCount >= 4)
  );

  // ── IMPROVEMENT #5: short-lived per-session catalog cache ──
  pruneCatalogCache();
  const detectedCategoryForCache = detectCategory(lastUserMsg?.content || '');
  const cacheKey = `${detectedCategoryForCache}|${priceRange?.min || ''}|${priceRange?.max || ''}`;
  const cached = catalogCache.get(sessionId);

  let catalogText = 'No products loaded.';
  let upsellText = '';
  let upsellProducts = [];
  let topProductIds = new Set();
  let noDirectMatch = false;

  if (cached && cached.key === cacheKey && cached.expiresAt > Date.now()) {
    catalogText = cached.catalogText;
    upsellText = cached.upsellText;
    topProductIds = cached.topProductIds;
  } else if (Array.isArray(products) && products.length > 0) {
    const { matched, upsells } = matchProducts(lastUserMsg?.content || '', products, priceRange, 10);
    upsellProducts = upsells;

    // ── IMPROVEMENT #2: explicit no-match signal instead of a random 60-item dump ──
    if (matched.length === 0) {
      noDirectMatch = true;
      const featured = products.filter((p) => p.featured && p.stock !== 0 && p.in_stock !== false).slice(0, 5);
      topProductIds = new Set(featured.map((p) => String(p.id)));
      catalogText = `NO DIRECT MATCH FOUND for this query in the catalog.\n` +
        `Do NOT invent a product. Ask the customer a short clarifying question (e.g. budget, category, or use-case) instead.\n` +
        (featured.length > 0
          ? `If genuinely relevant, you may mention these popular items as alternatives (verify name/price before stating them):\n` +
            featured.map((p) => {
              const price = p.sale_price || p.salePrice || p.price || 0;
              return `- ID:${p.id} | ${p.name} | Rs.${price}`;
            }).join('\n')
          : '');
    } else {
      const topProducts = matched;
      topProductIds = new Set(topProducts.map((p) => String(p.id)));
      // ── IMPROVEMENT #7: include sizes/colors so the AI can answer accurately instead of guessing ──
      catalogText = topProducts.map((p) => {
        const price = p.sale_price || p.salePrice || p.price || 0;
        const category = p.category_name || p.category || '';
        const brand = p.brand || '';
        const stock = p.stock === 0 ? 'Out of Stock' : (p.in_stock === false ? 'Out of Stock' : 'In Stock');
        const discount = p.discount_percent ? ` | ${p.discount_percent}% OFF` : '';
        const featured = p.featured ? ' | ⭐ Best Seller' : '';
        const sizes = Array.isArray(p.sizes) && p.sizes.length > 0 ? ` | Sizes: ${p.sizes.join(', ')}` : '';
        const colors = Array.isArray(p.colors) && p.colors.length > 0 ? ` | Colors: ${p.colors.join(', ')}` : '';
        return `- ID:${p.id} | ${p.name} | Brand: ${brand} | Category: ${category} | Price: Rs.${price}${discount}${featured} | ${stock}${sizes}${colors}`;
      }).join('\n');
    }

    if (upsellProducts.length > 0) {
      upsellText = `\n\n🔼 UPSELL OPTIONS (slightly above budget but much better value):\n` +
        upsellProducts.map((p) => {
          const price = p.sale_price || p.salePrice || p.price || 0;
          return `- ID:${p.id} | ${p.name} | Rs.${price} | ⭐ Featured`;
        }).join('\n');
      for (const p of upsellProducts) topProductIds.add(String(p.id));
    }

    catalogCache.set(sessionId, { key: cacheKey, catalogText, upsellText, topProductIds, expiresAt: Date.now() + CATALOG_CACHE_TTL_MS });
  }

  let offersText = 'No active offers right now.';
  try {
    const liveOffers = await getCachedOffers();
    if (liveOffers.length > 0) {
      offersText = liveOffers.map((o) =>
        `- ${o.title}${o.description ? ': ' + o.description : ''}${o.expiry_date ? ' (expires ' + o.expiry_date + ')' : ''}`
      ).join('\n');
    }
  } catch (e) { /* optional */ }

  const languageInstruction = language === 'hindi'
    ? `🌐 LANGUAGE: Customer is writing in Hindi/Hinglish. Reply in friendly Hinglish. Use words like: bilkul, zaroor, bahut accha, sahi choice, ji haan.`
    : language === 'punjabi'
    ? `🌐 LANGUAGE: Customer is writing in Punjabi. Reply in friendly Punjabi/Hinglish. Use words like: bilkul, zaroor, bahut wadiya, sahi choice.`
    : `🌐 LANGUAGE: Reply in clear, friendly English. Sprinkle Hindi words naturally (bilkul, zaroor, bahut accha).`;

  const leadCaptureInstruction = shouldAskForContact
    ? language === 'hindi'
      ? `📞 LEAD CAPTURE: After answering, add ONE warm line: "Aapka naam aur number share karein — hamare team aapko personally help karenge! 😊"`
      : `📞 LEAD CAPTURE: After answering, add ONE warm line: "Could I get your name and number? Our team will personally assist you! 😊"`
    : '';

  const upsellInstruction = upsellProducts.length > 0
    ? `💡 UPSELL: Naturally mention 1 upsell option if customer seems budget-focused. Include its ID in PRODUCTS line.`
    : '';

  const systemPrompt = `You are a FRIENDLY, EXPERT sales assistant for SETHI PURSE, Punjab's trusted premium luggage destination in Jalandhar.

🏪 STORE:
- Name: SETHI PURSE | Location: Mai Hiran Gate, Near Books Market, Jalandhar, Punjab 144001
- Phone: +91 7986161633 | Hours: 10 AM - 8 PM Daily
- Brands: American Tourister, Safari, Genie, Arctic Fox
- Categories: Luggage, Backpacks, Handbags, Slings, School Bags, Wallets

${languageInstruction}

🎯 PRODUCT CATALOG:
${catalogText}${upsellText}

🎁 ACTIVE OFFERS:
${offersText}

💡 YOUR SMART RULES:
1. ANSWER ACCURATELY — Only use products from the catalog above. Never invent prices, specs, sizes, or colors that aren't listed.
2. KEEP IT SHORT — 2-4 sentences max. Customers are on mobile, scrolling fast.
3. OUT OF STOCK — Always suggest 2-3 similar IN-STOCK alternatives from the catalog above only.
4. MENTION OFFERS — If customer interest matches an active offer, mention it naturally.
5. DELIVERY — "We offer in-store pickup. For delivery arrangements, WhatsApp karein!"
6. NEVER SHOW RAW IDs — Product IDs only go in the PRODUCTS line, never in visible text.
7. PRODUCT CARDS — When mentioning specific products, end reply with EXACTLY:
PRODUCTS: [id1, id2, id3]
(Max 3 IDs, and ONLY IDs that appear in the catalog above. Hidden from customer — used to show product cards.)
8. SIZE/COLOR — If the customer asks about a specific size or color, check the Sizes/Colors fields above before answering. If not listed, say you'll confirm with the team rather than guessing.
${upsellInstruction}
${leadCaptureInstruction}

💬 CONVERSATION STARTERS:
- If customer says hi/hello → "Hey! Welcome to SETHI PURSE 👜 Luggage, bags, ya kuch aur dhundh rahe hain? Batao!"
- If customer asks price without context → Ask what type of bag first.
- If customer asks for "best" → Ask budget first, then show top 2-3 options.

Remember: You're their trusted friend who knows bags — not a formal chatbot! 😊`;

  const result = await callAI((messages || []).slice(-12), systemPrompt);

  if (result.ok) {
    let reply = result.text;
    let productIds = [];
    const match = reply.match(/PRODUCTS:\s*\[([^\]]*)\]/i);
    if (match) {
      productIds = match[1].split(',').map((s) => s.trim().replace(/['"]/g, '')).filter(Boolean).slice(0, 3);
      reply = reply.replace(/PRODUCTS:\s*\[([^\]]*)\]/i, '').trim();
    }
    reply = reply
      .replace(/\(?\s*ID:?\s*[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\s*\)?/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim();

    // ── IMPROVEMENT #1 (anti-hallucination guard): only trust product IDs that
    // were actually shown to the model in this turn's catalog text. Drops any
    // ID the AI invented or pulled from outside what it was given. ──
    const verifiedProductIds = productIds.filter((id) => topProductIds.has(String(id)));
    const matchedProducts = Array.isArray(products)
      ? products.filter((p) => verifiedProductIds.includes(String(p.id)))
      : [];
    const outOfStockMatches = matchedProducts.filter((p) => p.stock === 0 || p.in_stock === false);

    try {
      if (lastUserMsg) {
        const detectedCategory = detectCategory(`${lastUserMsg.content} ${reply}`);
        const { data: existing } = await supabase
          .from('inquiries')
          .select('id, message, name, phone, product_interest')
          .eq('session_id', sessionId)
          .maybeSingle();
        const interestList = Array.from(new Set([
          ...(existing?.product_interest ? existing.product_interest.split(', ').filter(Boolean) : []),
          ...matchedProducts.map((p) => p.name),
        ])).join(', ') || 'General enquiry';
        const transcriptLine = `User: "${lastUserMsg.content}" | AI (${result.usedAPI}): "${reply.slice(0, 250)}"`;

        // ── IMPROVEMENT #4: flag high-intent leads that still haven't converted ──
        const isPriorityLead = buyIntentNow && (phoneInThisMessage || contactCaptured) && userMessageCount >= 3;
        let demandType = outOfStockMatches.length > 0 ? 'out_of_stock_interest' : null;
        if (noDirectMatch) demandType = demandType || 'no_catalog_match';
        if (isPriorityLead) demandType = 'priority_followup';

        if (existing) {
          const updates = {
            message: `[AI CHAT] ${transcriptLine}`,
            product_interest: interestList,
            category: detectedCategory,
            demand_type: demandType,
            updated_at: nowIST(),
            ai_model: result.usedAPI,
          };
          if (nameInThisMessage && (!existing.name || existing.name === 'AI Chat Visitor')) updates.name = nameInThisMessage;
          if (phoneInThisMessage && (!existing.phone || existing.phone === '0000000000')) updates.phone = phoneInThisMessage;
          if (buyIntentNow) updates.status = 'new';
          await supabase.from('inquiries').update(updates).eq('id', existing.id);
        } else {
          await supabase.from('inquiries').insert([{
            id: uuidv4(),
            session_id: sessionId,
            name: nameInThisMessage || 'AI Chat Visitor',
            phone: phoneInThisMessage || '0000000000',
            city: 'Jalandhar',
            product_interest: interestList,
            message: `[AI CHAT] ${transcriptLine}`,
            status: 'new',
            category: detectedCategory,
            demand_type: demandType,
            ai_model: result.usedAPI,
            created_at: nowIST(),
          }]);
        }
      }
    } catch (e) {
      console.error('Inquiry logging failed:', e);
    }

    const resp = json({
      reply,
      products: matchedProducts,
      sessionId,
      contactCaptured: !!contactCaptured || !!phoneInThisMessage,
      aiModel: result.usedAPI,
      language,
    });
    // IMPROVEMENT #8 (partial): persist sessionId in a cookie so a refresh
    // doesn't create a brand-new lead for the same returning customer.
    resp.cookies.set('sethi_chat_session', sessionId, { maxAge: 60 * 60 * 24 * 30, httpOnly: true, sameSite: 'lax' });
    return resp;
  }

  const fallbackMsg = language === 'hindi'
    ? "Sorry, abhi thodi problem aa rahi hai — please WhatsApp karein: +91 7986161633!"
    : "Sorry, having trouble right now — please WhatsApp us at +91 7986161633!";
  const resp = json({ reply: fallbackMsg, sessionId, aiModel: 'none', error: result.reason });
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
  const publicMutation =
    (segments[0] === 'auth' && segments[1] === 'login') ||
    segments[0] === 'inquiries' ||
    segments[0] === 'reviews' ||
    segments[0] === 'push' ||
    segments[0] === 'chat';

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
        cacheControl: '31536000', contentType: file.type, upsert: false,
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

  // ===== AI Description Generation =====
  if (segments[0] === 'generate-description' && method === 'POST') {
    const authError = requireAdmin(request);
    if (authError) return authError;
    const { name, brand, category } = body || {};
    if (!name) return json({ error: 'Product name is required' }, 400);
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return json({ error: 'GEMINI_API_KEY is not configured on the server' }, 500);
    const prompt = `Write a concise, persuasive product description (2-3 sentences, no markdown, no headings) for an e-commerce listing.
Product name: ${name}
${brand ? `Brand: ${brand}` : ''}
${category ? `Category: ${category}` : ''}
Focus on quality, style, and everyday usefulness. Do not invent specific measurements, materials, or prices. Return only the description text, nothing else.`;
    try {
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
          body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }] }),
        }
      );
      const geminiData = await geminiRes.json().catch(() => ({}));
      if (!geminiRes.ok) return json({ error: geminiData?.error?.message || `Gemini error (${geminiRes.status})` }, 500);
      const description = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (!description) return json({ error: 'Gemini returned an empty response' }, 502);
      return json({ description });
    } catch (error) {
      return json({ error: error.message || 'Failed to reach Gemini API' }, 500);
    }
  }

  // ===== AI Chat =====
  if (segments[0] === 'chat' && method === 'POST') {
    try {
      const cookieSessionId = request.cookies.get('sethi_chat_session')?.value || null;
      return await handleChat(body, cookieSessionId);
    } catch (err) {
      console.error('Chat error:', err);
      return json({ reply: "Sorry, something went wrong — please WhatsApp us at +91 7986161633!", error: 'unhandled_error' });
    }
  }

  // ===== Slider Images =====
  if (segments[0] === 'slider-images' || segments[0] === 'slider_images') {
    if (segments.length === 1) {
      if (method === 'GET') {
        const { data, error } = await supabase.from('slider_images').select('*').order('sort_order', { ascending: true });
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
        const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
        if (error) return json([]);
        return json(data || []);
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
          updates.sale_price = Number(p.salePrice ?? p.sale_price ?? p.price);
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
        if (phone.length !== 10) return json({ error: 'Phone must be 10 digits' }, 400);
        const detectedCategory = detectCategory(`${i.productInterest} ${i.message}`);
        const inquiry = {
          id: uuidv4(),
          name: String(i.name).trim(),
          phone,
          city: String(i.city).trim(),
          product_interest: String(i.productInterest).trim(),
          message: String(i.message).trim(),
          status: 'new',
          category: detectedCategory,
          whatsapp_consent: !!i.whatsappConsent,
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
