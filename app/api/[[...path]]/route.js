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

// ── Category keyword map for inquiry auto-tagging ──
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

// ── Buy-intent detection ──
const BUY_INTENT_KEYWORDS = [
  'buy', 'order', 'purchase', 'book', 'reserve',
  'available', 'in stock', 'price', 'cost', 'kitne', 'kitna',
  'how much', 'discount', 'cash on delivery', 'cod', 'pay', 'interested',
];

function hasBuyIntent(text) {
  const lower = (text || '').toLowerCase();
  return BUY_INTENT_KEYWORDS.some((kw) => lower.includes(kw));
}

// ── Extract phone number ──
function extractPhone(text) {
  const match = String(text || '').match(/(?:\+?91[\s-]?)?([6-9]\d{9})\b/);
  return match ? match[1] : null;
}

// ── Extract name ──
function extractName(text) {
  const t = String(text || '').trim();
  const patterns = [
    /(?:my name is|i am|i'm|naam)\s+([a-zA-Z\u0900-\u097F]{2,30})/i,
  ];
  for (const p of patterns) {
    const m = t.match(p);
    if (m) return m[1].trim();
  }
  if (/^[a-zA-Z\u0900-\u097F\s]{2,30}$/.test(t) && t.split(' ').length <= 3) return t;
  return null;
}

function json(data, status = 200) {
  return NextResponse.json(data, { status });
}

// ── Offers cache (3 minutes) ──
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

// ── SMART PRODUCT MATCHER ──
function matchProducts(query, products, limit = 5) {
  if (!Array.isArray(products) || products.length === 0) return [];

  const lower = (query || '').toLowerCase();
  const scored = products.map((p) => {
    let score = 0;

    // Exact name match
    if (p.name.toLowerCase() === lower) score += 100;
    // Name contains query
    if (p.name.toLowerCase().includes(lower)) score += 50;
    // Brand match
    if (p.brand.toLowerCase().includes(lower)) score += 30;
    // Category match
    if (detectCategory(lower) === p.category) score += 20;
    // Popular/featured boost
    if (p.featured) score += 15;
    // In-stock boost
    if (p.stock !== 0 && p.in_stock !== false) score += 10;

    return { ...p, matchScore: score };
  });

  return scored
    .filter((p) => p.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit);
}

// ── SMART PRICE COMPARISON ──
function getPriceInsight(products) {
  if (!Array.isArray(products) || products.length === 0) return null;

  const prices = products.map((p) => p.sale_price || p.salePrice || 0).filter(p => p > 0);
  if (prices.length === 0) return null;

  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const avg = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);

  return { min, max, avg, range: `Rs.${min} - Rs.${max}` };
}

// ── DUAL API CALLER (QWEN PRIMARY, Gemini FALLBACK) ──
async function callAI(messages, systemPrompt, apiChoice = 'qwen') {
  const puterKey = process.env.PUTER_API_KEY; // Qwen via Puter (FREE - PRIMARY)
  const geminiKey = process.env.GEMINI_API_KEY; // Gemini (Fallback)

  // ── Try QWEN First (PRIMARY - FREE & FAST) ──
  if (apiChoice === 'auto' || apiChoice === 'qwen') {
    if (puterKey) {
      try {
        const result = await callQwen(messages, systemPrompt, puterKey);
        if (result.ok) {
          return { ...result, usedAPI: 'qwen', cost: 'free' };
        }
      } catch (e) {
        console.error('Qwen failed:', e);
      }
    }
  }

  // ── Fallback to GEMINI (Secondary - Paid but Reliable) ──
  if ((apiChoice === 'auto' || apiChoice === 'qwen') && geminiKey) {
    try {
      const result = await callGemini(messages, systemPrompt, geminiKey);
      if (result.ok) {
        return { ...result, usedAPI: 'gemini', cost: 'paid' };
      }
    } catch (e) {
      console.error('Gemini failed:', e);
    }
  }

  // ── If both fail, return error ──
  return {
    ok: false,
    reason: 'both_apis_failed',
    text: "I'm having trouble connecting right now — please WhatsApp us at +91 7986161633!",
    usedAPI: 'none',
  };
}

// ── QWEN API CALL (via Puter.js - FREE) ──
async function callQwen(messages, systemPrompt, apiKey) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);

  try {
    const puterMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m) => ({
        role: m.role,
        content: String(m.content || '').slice(0, 800),
      })),
    ];

    const res = await fetch('https://api.puter.com/llm/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        messages: puterMessages,
        model: 'qwen/qwen3.6-plus',
        temperature: 0.7,
        max_tokens: 500,
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!res.ok) {
      return { ok: false, reason: 'qwen_http_error', status: res.status };
    }

    const data = await res.json().catch(() => null);
    if (!data) return { ok: false, reason: 'qwen_bad_json' };

    const text = data?.choices?.[0]?.message?.content?.trim();

    if (text) {
      return { ok: true, text };
    }

    return { ok: false, reason: 'qwen_empty' };
  } catch (err) {
    clearTimeout(timer);
    if (err?.name === 'AbortError') {
      return { ok: false, reason: 'qwen_timeout' };
    }
    return { ok: false, reason: 'qwen_fetch_error' };
  }
}

// ── GEMINI API CALL (FALLBACK) ──
async function callGemini(messages, systemPrompt, apiKey) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);

  try {
    const geminiMessages = messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: String(m.content || '').slice(0, 800) }],
    }));

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
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
      return { ok: false, reason: 'gemini_http_error', status: res.status };
    }

    const data = await res.json().catch(() => null);
    if (!data) return { ok: false, reason: 'gemini_bad_json' };

    const text = data?.candidates?.[0]?.content?.parts?.map((p) => p?.text || '').join('').trim();

    if (text) {
      return { ok: true, text };
    }

    return { ok: false, reason: 'gemini_empty' };
  } catch (err) {
    clearTimeout(timer);
    if (err?.name === 'AbortError') {
      return { ok: false, reason: 'gemini_timeout' };
    }
    return { ok: false, reason: 'gemini_fetch_error' };
  }
}

// ── MAIN CHAT HANDLER ──
async function handleChat(body) {
  const { messages, products, sessionId: incomingSessionId, contactCaptured } = body || {};
  const sessionId = incomingSessionId || uuidv4();

  const lastUserMsg = [...(messages || [])].reverse().find((m) => m.role === 'user');
  const buyIntentNow = hasBuyIntent(lastUserMsg?.content);

  const phoneInThisMessage = extractPhone(lastUserMsg?.content);
  const nameInThisMessage = extractName(lastUserMsg?.content);
  const shouldAskForContact = buyIntentNow && !contactCaptured && !phoneInThisMessage;

  // ── BUILD SMART CATALOG ──
  let catalogText = 'No products loaded.';
  let matchedRecommendations = [];

  if (Array.isArray(products) && products.length > 0) {
    // Smart product matching
    const userQuery = `${lastUserMsg?.content || ''}`;
    matchedRecommendations = matchProducts(userQuery, products, 10);

    const topProducts = matchedRecommendations.slice(0, 60);
    catalogText = topProducts
      .map((p) => {
        const price = p.sale_price || p.salePrice || p.price || 0;
        const category = p.category_name || p.category || '';
        const brand = p.brand || '';
        const stock = p.stock === 0 ? 'Out of Stock' : (p.in_stock === false || p.inStock === false ? 'Out of Stock' : 'In Stock');
        const discount = p.discount_percent ? ` | ${p.discount_percent}% OFF` : '';
        return `- ID:${p.id} | ${p.name} | Brand: ${brand} | Category: ${category} | Price: Rs.${price}${discount} | ${stock}`;
      })
      .join('\n');
  }

  // ── GET OFFERS ──
  let offersText = 'No active offers right now.';
  try {
    const liveOffers = await getCachedOffers();
    if (liveOffers.length > 0) {
      offersText = liveOffers
        .map((o) => `- ${o.title}${o.description ? ': ' + o.description : ''}${o.expiry_date ? ' (expires ' + o.expiry_date + ')' : ''}`)
        .join('\n');
    }
  } catch (e) {
    // Offers are optional
  }

  // ── SMART SYSTEM PROMPT ──
  const systemPrompt = `You are a FRIENDLY, EXPERT sales assistant for SETHI PURSE, Punjab's trusted premium luggage destination.

🏪 STORE DETAILS:
- Name: SETHI PURSE
- Location: Mai Hiran Gate, Near Books Market, Jalandhar, Punjab 144001
- Phone: +91 7986161633
- Hours: 10 AM - 8 PM Daily
- Website: https://sethi-purse.vercel.app
- Brands: American Tourister, Safari, Genie, Arctic Fox

📦 CATEGORIES: Luggage, Backpacks, Handbags, Slings, School Bags, Wallets

🎯 SMART CATALOG WITH RECOMMENDATIONS:
${catalogText}

🎁 ACTIVE OFFERS:
${offersText}

💡 YOUR SMARTER RULES:

1. BE GENUINELY HELPFUL - Answer product questions accurately using the catalog.
2. USE LOCAL WARMTH - Mix in Hindi words naturally (bilkul, zaroor, bilkul sahi, bahut accha).
3. MATCH PRODUCTS SMARTLY:
   - If customer asks "best bag under 5000" → show products in that range
   - If customer asks "comparison" → show 2-3 products side-by-side with prices
   - If out of stock → suggest 2-3 similar IN-STOCK alternatives
4. SUGGEST BASED ON CONTEXT:
   - Budget-focused → highlight price & discounts
   - Quality-focused → highlight durability & warranty
   - Fashion → highlight design & colors
5. KEEP IT SHORT - 2-4 sentences max (customers are busy!)
6. NEVER INVENT - Don't make up prices, materials, or specs not in catalog.
7. FOR DELIVERY - Say: "We offer in-store pickup. For special arrangements, WhatsApp us!"
8. MENTION OFFERS NATURALLY - If an offer matches their interest, include it in your reply.
9. IF SOMETHING'S OUT OF STOCK - Say "That one's currently out, but I have these great alternatives you might love:"
10. BUILD CONFIDENCE - Use phrases like "Best seller ⭐", "Top choice for...", "Customers love..."
11. NEVER SHOW RAW IDs IN YOUR MESSAGE - Only in the PRODUCTS line (stripped before customer sees it).
12. SMART PRODUCT CARDS - End with this IF you mention specific products:
PRODUCTS: [id1, id2, id3]
(This line is hidden from customers, only used to show product cards in the app)

${shouldAskForContact ? `13. CONTACT CAPTURE - Customer is interested in buying! After answering, add one warm line asking for their name & number (e.g., "By the way, could I get your name and number so our team can help you directly? 😊"). Ask only once, naturally.` : ''}

🚀 CONVERSATION STARTERS:
If customer just says "hi" or "hello":
"Hey there! Welcome to SETHI PURSE 👜 Looking for luggage, bags, or something special? Tell me what you need!"

If customer asks price without context:
"Great! To give you the best price, tell me what type of bag you're looking for? Travel trolley, school bag, handbag, or backpack?"

REMEMBER: You're not a bot—you're their friend who knows bags inside out! 😊`;

  // ── CALL DUAL AI SYSTEM (QWEN PRIMARY) ──
  let result;
  try {
    result = await callAI(messages, systemPrompt, 'qwen');
  } catch (err) {
    console.error('AI call error:', err);
    result = {
      ok: false,
      text: "Sorry, I'm having trouble right now — please WhatsApp us at +91 7986161633!",
      usedAPI: 'none',
    };
  }

  // ── PROCESS RESPONSE ──
  if (result.ok) {
    let reply = result.text;

    // Extract product IDs
    let productIds = [];
    const match = reply.match(/PRODUCTS:\s*\[([^\]]*)\]/i);
    if (match) {
      productIds = match[1]
        .split(',')
        .map((s) => s.trim().replace(/['"]/g, ''))
        .filter(Boolean)
        .slice(0, 3);
      reply = reply.replace(/PRODUCTS:\s*\[([^\]]*)\]/i, '').trim();
    }

    // Clean IDs from visible text
    reply = reply
      .replace(/\(?\s*ID:?\s*[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\s*\)?/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim();

    const matchedProducts = Array.isArray(products)
      ? products.filter((p) => productIds.includes(String(p.id)))
      : [];

    // ── SAVE INQUIRY ──
    try {
      if (lastUserMsg) {
        const detectedCategory = detectCategory(`${lastUserMsg.content} ${reply}`);
        const capturedPhone = phoneInThisMessage;
        const capturedName = nameInThisMessage;
        let contactNowCaptured = !!contactCaptured || !!capturedPhone;

        const { data: existing } = await supabase
          .from('inquiries')
          .select('id, message, name, phone, product_interest')
          .eq('session_id', sessionId)
          .maybeSingle();

        const interestList = Array.from(new Set([
          ...(existing?.product_interest ? existing.product_interest.split(', ').filter(Boolean) : []),
          ...matchedProducts.map((p) => p.name),
        ])).join(', ') || existing?.product_interest || 'General enquiry';

        const transcriptLine = `User: "${lastUserMsg.content}" | AI (${result.usedAPI}): "${reply.slice(0, 250)}"`;

        if (existing) {
          const updates = {
            message: `[AI CHAT] ${transcriptLine}`,
            product_interest: interestList,
            category: detectedCategory,
            updated_at: nowIST(),
            ai_model: result.usedAPI,
          };
          if (capturedName && (!existing.name || existing.name === 'AI Chat Visitor')) updates.name = capturedName;
          if (capturedPhone && (!existing.phone || existing.phone === '0000000000')) updates.phone = capturedPhone;
          if (buyIntentNow) updates.status = 'new';
          await supabase.from('inquiries').update(updates).eq('id', existing.id);
        } else {
          await supabase.from('inquiries').insert([{
            id: uuidv4(),
            session_id: sessionId,
            name: capturedName || 'AI Chat Visitor',
            phone: capturedPhone || '0000000000',
            city: 'Jalandhar',
            product_interest: interestList,
            message: `[AI CHAT] ${transcriptLine}`,
            status: 'new',
            category: detectedCategory,
            ai_model: result.usedAPI,
            created_at: nowIST(),
          }]);
        }
      }
    } catch (e) {
      console.error('Inquiry logging failed:', e);
    }

    return json({
      reply,
      products: matchedProducts,
      sessionId,
      contactCaptured: shouldAskForContact ? false : contactCaptured,
      aiModel: result.usedAPI,
      cost: result.cost,
    });
  }

  // ── FALLBACK IF BOTH FAIL ──
  return json({
    reply: "Sorry, I'm having trouble connecting right now — please WhatsApp us at +91 7986161633!",
    sessionId,
    aiModel: 'none',
    error: result.reason,
  }, 200);
}

// ── MAIN ROUTE HANDLER ──
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

  if (isMutation && !publicMutation) {
    const authError = requireAdmin(request);
    if (authError) return authError;
  }

  let body = null;
  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    try { body = await request.json(); } catch (e) { body = null; }
  }

  // ===== ENHANCED AI CHAT (QWEN PRIMARY + GEMINI FALLBACK) =====
  if (segments[0] === 'chat' && method === 'POST') {
    try {
      return await handleChat(body);
    } catch (err) {
      console.error('Chat error:', err);
      return json({
        reply: "Sorry, something went wrong — please try again or WhatsApp us at +91 7986161633!",
        error: 'unhandled_error',
      }, 200);
    }
  }

  // ===== Keep all other routes from original file =====
  // [All other routes: Upload, Categories, Products, Offers, Inquiries, Reviews, Auth, Push, Settings]
  // Add your existing routes here if needed

  return json({ error: 'Not found', path: segments, method }, 404);
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
