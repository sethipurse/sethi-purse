import { detectCategory, findBrandHit, findCategoryHit } from './categoryMatch';
import { BRANDS, CATEGORY_FAMILIES, FAMILY_INTENT_TERMS, SHOP_INTENT_TERMS } from './constants';
import { tokenize, normalizeQuery } from './multiScript';

// Whether the query shows any genuine shopping intent at all — gates product
// cards off entirely for something like "ਬਿਸਕੁਟ ਮਿਲ ਜਾਣਗੇ" (biscuits),
// which would otherwise "match" every product because of the flat scoring
// baseline in scoreAndSort().
function hasShopIntent(normalizedQuery, products, categoryHit, brandHit) {
  if (categoryHit || brandHit) return true;
  if (SHOP_INTENT_TERMS.some((term) => normalizedQuery.includes(term.toLowerCase()))) return true;
  const queryTokens = tokenize(normalizedQuery).filter((t) => t.length >= 3);
  if (queryTokens.length === 0 || !Array.isArray(products)) return false;
  return products.some((p) => {
    const name = (p.name || '').toLowerCase();
    return queryTokens.some((t) => name.includes(t));
  });
}

// Infers a category "family" from whichever intent term(s) the query hit, so
// a fallback (nothing matched directly) stays within that family instead of
// the whole catalog — a purse query must never fall back to a backpack.
function inferFamily(normalizedQuery) {
  for (const [family, terms] of Object.entries(FAMILY_INTENT_TERMS)) {
    if (terms.some((t) => normalizedQuery.includes(t.toLowerCase()))) return family;
  }
  return null;
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

export function matchProducts(query, products, priceRange, limit = 10, dbCategories = [], contextCategory = null) {
  if (!Array.isArray(products) || products.length === 0) {
    return { matched: [], upsells: [], offTopic: false, zeroInCategoryHit: false, categoryHit: null, usedFamilyFallback: false, family: null };
  }

  const lower = normalizeQuery(query);

  // Category/brand-first matching (token overlap) — takes priority over the
  // legacy detectCategory() pass below, and is tolerant of spacing/singular-
  // plural mismatches between the categories table and product.category
  // (candidates pool BOTH sources, since a mismatch between them is exactly
  // what caused "party wear purse" to silently fall back to unrelated
  // featured products before).
  const categoryCandidates = [...new Set([...(dbCategories || []), ...products.map((p) => (p.category || '').trim())].filter(Boolean))];
  const categoryHit = findCategoryHit(query, categoryCandidates);
  const brandHit = !categoryHit ? findBrandHit(query, BRANDS) : null;

  // Relevance gate — an off-topic query must never show product cards.
  if (!hasShopIntent(lower, products, categoryHit, brandHit)) {
    console.log(`🚫 matchProducts: no shop intent detected in query="${lower}" — off-topic`);
    return { matched: [], upsells: [], offTopic: true, zeroInCategoryHit: false, categoryHit: null, usedFamilyFallback: false, family: null };
  }

  if (categoryHit) {
    const categoryFiltered = products.filter((p) => (p.category || '').trim().toLowerCase() === categoryHit.toLowerCase() && p.is_active !== false);
    console.log(`📦 matchProducts: category hit "${categoryHit}" — ${categoryFiltered.length}/${products.length} products`);
    if (categoryFiltered.length === 0) {
      // The category is real (it exists in the categories table or on some
      // product) but genuinely has nothing active right now — honest
      // "updating" response, not a silent fallback to unrelated products.
      return { matched: [], upsells: [], offTopic: false, zeroInCategoryHit: true, categoryHit, usedFamilyFallback: false, family: null };
    }
    const { matched, upsells } = scoreAndSort(categoryFiltered, lower, priceRange, limit);
    return { matched, upsells, offTopic: false, zeroInCategoryHit: false, categoryHit, usedFamilyFallback: false, family: null };
  }

  if (brandHit) {
    const brandFiltered = products.filter((p) => (p.brand || '').trim().toLowerCase() === brandHit.toLowerCase() && p.is_active !== false);
    if (brandFiltered.length > 0) {
      const { matched, upsells } = scoreAndSort(brandFiltered, lower, priceRange, limit);
      return { matched, upsells, offTopic: false, zeroInCategoryHit: false, categoryHit: null, usedFamilyFallback: false, family: null };
    }
  }

  // No category/brand hit (or the brand hit had zero active products) —
  // legacy detectCategory()-driven path, unchanged from before.
  let detectedCat = detectCategory(query, dbCategories);
  const usedPageContext = detectedCat === 'Other' && !!contextCategory;
  if (usedPageContext) detectedCat = contextCategory;

  console.log(`📦 matchProducts: query="${lower}" | detectedCategory="${detectedCat}"${usedPageContext ? ' (from page context)' : ''} | totalProducts=${products.length}`);

  let categoryFiltered = products;
  let usedFamilyForUndetectedCategory = false;
  if (detectedCat !== 'Other') {
    categoryFiltered = products.filter((p) => (p.category || '').trim().toLowerCase() === detectedCat.toLowerCase());
    console.log(`  ✅ Category filtered: ${categoryFiltered.length}/${products.length} products match "${detectedCat}"`);
  } else {
    // No category name/keyword matched (e.g. a Devanagari/Gurmukhi query with
    // no CATEGORY_KEYWORDS entry in that script) — narrow by family before
    // giving up and scoring the whole catalog, so "स्कूल बैग" still stays
    // within backpacks instead of surfacing purses/luggage too.
    const family = inferFamily(lower);
    const familyCats = family ? (CATEGORY_FAMILIES[family] || []) : [];
    const familyFiltered = familyCats.length > 0
      ? products.filter((p) => familyCats.some((c) => c.toLowerCase() === (p.category || '').trim().toLowerCase()))
      : [];
    if (familyFiltered.length > 0) {
      categoryFiltered = familyFiltered;
      usedFamilyForUndetectedCategory = true;
      console.log(`  ⚠️ No category detected — narrowed to family "${family}" (${familyFiltered.length}/${products.length} products)`);
    } else {
      console.log(`  ⚠️ No category detected, using all products`);
    }
  }

  if (categoryFiltered.length === 0) {
    // Family-aware fallback so a purse query never surfaces a backpack, and
    // vice versa. Only when no family can be inferred does this fall back
    // to the whole catalog's featured picks.
    const family = inferFamily(lower);
    const familyCats = family ? (CATEGORY_FAMILIES[family] || []) : [];
    const familyPool = familyCats.length > 0
      ? products.filter((p) => p.is_active !== false && p.stock !== 0 && familyCats.some((c) => c.toLowerCase() === (p.category || '').trim().toLowerCase()))
      : [];
    const pool = familyPool.length > 0 ? familyPool : products.filter((p) => p.featured && p.stock !== 0 && p.is_active !== false);
    console.log(`  ⚠️ No products in category "${detectedCat}" — ${familyPool.length > 0 ? `family "${family}" fallback` : 'featured fallback'} (${pool.length} products)`);
    return {
      matched: pool.slice(0, 5).map((p) => ({ ...p, matchScore: 10 })),
      upsells: [],
      offTopic: false,
      zeroInCategoryHit: false,
      categoryHit: null,
      usedFamilyFallback: true,
      family: familyPool.length > 0 ? family : null,
    };
  }

  const { matched, upsells } = scoreAndSort(categoryFiltered, lower, priceRange, limit);
  return {
    matched,
    upsells,
    offTopic: false,
    zeroInCategoryHit: false,
    categoryHit: detectedCat !== 'Other' ? detectedCat : null,
    usedFamilyFallback: usedFamilyForUndetectedCategory,
    family: usedFamilyForUndetectedCategory ? family : null,
  };
}

// Which identity a message's catalogCache entry should be keyed on —
// prefers the gate's own fresh resolution over the legacy detectCategory()
// pass, since a query the gate resolves differently from an earlier one
// must never share a cache entry with it (this is what let a correct
// "Party Wear Purse" gate.categoryHit get silently discarded by a cache
// entry keyed on the OLD detectCategory's "Handbags" collision).
export function deriveCacheCategory(gate, msgCategory, contextCategory) {
  if (gate?.categoryHit) return gate.categoryHit;
  if (gate?.usedFamilyFallback && gate.family) return `family:${gate.family}`;
  return msgCategory === 'Other' ? (contextCategory || 'Other') : msgCategory;
}

// Whether to skip the off-topic gate entirely and let the normal AI chat flow
// handle a message — the gate exists to stop a *first, substantive* message
// with zero shopping intent (e.g. asking about biscuits) from showing product
// cards, not to police every turn of an ongoing conversation. Skips when:
//  1. This isn't the customer's first turn in the session — a follow-up like
//     "aur dikhao" or "haan" naturally carries no shop-intent terms of its
//     own, but the conversation already established intent.
//  2. The chat opened from a product/category page (contextCategory) — the
//     customer is already browsing, so an off-topic canned reply is jarring.
//  3. The message is short/conversational (<=2 tokens) — greetings and
//     one-word replies ("hello", "haan ji", "ok", "price?") are chit-chat the
//     AI already handles warmly, not a product query to validate.
export function shouldSkipOffTopicGate({ userMsgCount, contextCategory, message } = {}) {
  if ((userMsgCount || 0) > 1) return true;
  if (contextCategory) return true;
  const tokenCount = tokenize(normalizeQuery(message)).length;
  if (tokenCount <= 2) return true;
  return false;
}
