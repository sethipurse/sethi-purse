import { tokenize as baseTokenize, normalizeQuery } from './multiScript';
import { CATEGORY_ALIASES } from './constants';

// Curated synonyms for categories we know about today — Hindi/Punjabi slang,
// use-cases, and near-misses that a plain word-split wouldn't catch. This is
// a *bonus* layer; it is NOT required for a category to be searchable — see
// the dynamic word-based fallback in detectCategory() below, which gives
// every category (including ones added later in admin) baseline matching
// with zero code changes.
export const CATEGORY_KEYWORDS = {
  'LUGGAGE': [
    'luggage', 'luggege', 'luggae', 'lugage', 'trolley', 'trolly', 'strolly',
    'strolley', 'stroley', 'stroly', 'stroller bag', 'trollie', 'trolli',
    'trolley bag', 'trolly bag', 'suitcase', 'suit case', 'suitcas', 'sootcase',
    'travel bag', 'travel luggage', 'cabin bag', 'check-in', 'checkin',
    'bag on wheels', 'roller bag', 'rolling bag', 'rolling suitcase', 'wheelie bag',
    'hard case', 'hardcase', 'hard shell bag', 'hardshell', 'soft case', 'softcase',
    'spinner', 'spinner luggage', 'spinner wheels bag', 'wheeled bag', 'wheel bag',
    '4 wheel bag', '4 wheel trolley', '8 wheel trolley', 'cabin luggage',
    'check in bag', 'check in luggage', 'carry on', 'carryon', 'carry-on bag',
    '20 inch', '24 inch', '28 inch', '22 inch', '26 inch', '32 inch',
    'samaan', 'saman', 'samaan ki bag', 'saman wali bag', 'yatra bag',
    'journey bag', 'safar', 'safar bag', 'airport bag', 'flight bag', 'travel',
    'trip bag', 'attachi', 'attachee', 'atashi', 'attache', 'attache case',
    'peti', 'vip bag', 'vip suitcase', 'four wheeler bag', '4 wheeler bag',
    'international travel bag', 'holiday bag', 'tour bag', 'tourist bag',
    'outstation bag', 'vacation bag', 'abroad bag', 'expandable luggage',
    'expandable bag', 'polycarbonate bag', 'abs luggage', 'abs suitcase',
    'pc luggage', 'tsa lock bag', 'number lock bag', 'combination lock bag',
    'export bag', 'big bag for travel', 'large travel bag',
  ],
  'Backpacks': [
    'backpack', 'back pack', 'bag pack', 'bagpack', 'bacpack', 'bakpack',
    'backbag', 'bagpac', 'rucksack', 'ruck sack', 'school bag', 'hiking bag',
    'trek bag', 'trekking bag', 'trekking backpack', 'camping bag',
    'travel backpack', 'daypack', 'day pack', 'casual backpack', 'office bag',
    'anti theft bag', 'usb charging bag', 'smart backpack',
    'waterproof backpack', 'adventure bag',
    'outdoor bag', 'pithu', 'pithhu', 'peethu', 'pitu', 'pith wali bag',
    'pith pe pehna', 'basta', 'bacha bag', 'kids backpack', 'children bag',
    'child bag', 'kids bag', 'shoulder backpack', 'college backpack',
    'college rucksack', 'hydration bag',
  ],
  'Handbags': [
    'handbag', 'hand bag', 'handbagg', 'handbeg', 'ladies bag', 'shoulder bag',
    'hobo bag', 'satchel', 'top handle bag',
    'bucket bag', 'structured bag', 'everyday bag', 'everyday purse', 'work bag',
    'office handbag', 'office ladies bag', 'ladies handbag', 'woman bag', 'women bag',
    'mahila bag', 'ladies purse', 'hand purse', 'hand carry bag', 'big purse',
    'large bag', 'daily use bag', 'casual bag', 'regular bag',
    'normal bag', 'purse', 'purs', 'branded handbag', 'designer handbag',
    'leather handbag', 'trendy handbag', 'stylish handbag', 'casual handbag',
  ],
  'Party Wear Purse': [
    'party wear purse', 'party purse', 'party bag', 'party wear bag',
    'fancy purse', 'fancy bag', 'evening bag',
    'evening purse', 'bridal purse', 'bridal bag', 'wedding bag',
    'wedding purse', 'shaadi bag', 'shaadi purse', 'shadi bag', 'shadi purse',
    'function bag', 'function purse', 'designer purse', 'designer bag',
    'stylish purse', 'stylish bag', 'glitter bag', 'glitter purse', 'sequin bag',
    'embroidered bag', 'embroidered purse',
    'potli', 'potli bag', 'potli purse', 'ethnic bag', 'ethnic purse',
    'sangeet bag', 'reception bag', 'cocktail bag', 'formal purse',
    'fancy', 'party wear', 'shiny bag', 'embellished bag', 'byah', 'vyah',
    'wedding function bag', 'occasion bag', 'occasion purse', 'engagement bag',
    'ring ceremony bag', 'ring ceremony purse', 'mehendi bag', 'mehndi bag',
    'mehndi purse', 'haldi bag', 'haldi function bag', 'festive bag',
    'festive purse', 'diwali purse',
  ],
  'Slings': [
    'sling', 'sling bag', 'slng bag', 'cross body bag', 'crossbody bag',
    'cross-body bag', 'crossbody purse', 'messenger bag', 'shoulder sling',
    'cross sling', 'side bag', 'side purse', 'ek strap bag', 'single strap bag',
    'body bag', 'mini bag', 'small bag', 'compact bag', 'belt bag', 'waist bag',
    'fanny pack', 'chest bag', 'chest pouch', 'mobile bag', 'phone bag',
    'shoulder strap bag', 'long strap bag', 'sling purse', 'sling pouch',
    'small sling', 'unisex sling', 'travel sling', 'casual sling bag',
    'college sling bag',
  ],
  'Wallets': [
    'wallet', 'wallett', 'walet', 'wallete', 'purse for cash',
    'bifold', 'billfold', 'trifold wallet', 'leather wallet',
    'slim wallet', 'rfid wallet', 'ladies wallet',
    'zip wallet', 'zipper wallet', 'coin purse', 'cash holder',
    'money clip', 'travel wallet', 'passport wallet',
    'document wallet', 'long wallet', 'short wallet',
    'keychain wallet', 'batua', 'batwa', 'purse for money',
  ],
  'School Bags': [
    'school bag', 'skool bag', 'school backpack', 'student bag', 'class bag',
    'child bag', 'kids bag', 'student backpack', 'vidyalaya bag', 'basta',
    'bacha bag', 'primary bag', 'cartoon bag', 'kids backpack', 'children bag',
    'nursery bag', 'kindergarten bag', 'kg bag', 'class 1 bag', 'junior school bag',
  ],
  // The 4 categories below always existed but had no dedicated keyword list —
  // they relied entirely on the generic 'LUGGAGE' umbrella (which, on closer
  // inspection, never actually resolves to a real category name — see the
  // note further down) or the dynamic word-overlap fallback. These give them
  // the same curated-synonym coverage as every other category.
  'Trolley Bags': [
    'trolley', 'trolly', 'strolly', 'strolley', 'stroley', 'stroly', 'trollie',
    'trolli', 'trolley bag', 'trolly bag', 'rolling bag', 'rolling suitcase',
    'wheelie bag', 'wheeled bag', 'wheel bag', 'bag on wheels', 'roller bag',
    'spinner', 'spinner luggage', '4 wheel bag', '4 wheel trolley',
    '8 wheel trolley', 'hard case', 'hardcase', 'hard shell bag', 'hardshell',
    'polycarbonate bag', 'abs luggage', 'abs suitcase', 'pc luggage',
    'tsa lock bag', 'number lock bag', 'combination lock bag',
    'expandable luggage', 'expandable bag', 'four wheeler bag', '4 wheeler bag',
    'suitcase', 'suit case', 'suitcas', 'sootcase',
    '20 inch', '24 inch', '28 inch', '22 inch', '26 inch', '32 inch',
  ],
  'Travel Bags': [
    'travel bag', 'travel luggage', 'trip bag', 'journey bag', 'yatra bag',
    'safar', 'safar bag', 'samaan', 'saman', 'samaan ki bag', 'saman wali bag',
    'weekend travel bag', 'holiday bag', 'tour bag', 'tourist bag',
    'outstation bag', 'vacation bag', 'abroad bag', 'international travel bag',
    'flight bag', 'airport bag', 'carry on', 'carryon', 'carry-on bag',
    'cabin bag', 'cabin luggage', 'check-in', 'checkin', 'check in bag',
    'check in luggage', 'export bag', 'big bag for travel', 'large travel bag',
    'soft luggage', 'soft case', 'softcase', 'attachi', 'attachee', 'atashi',
    'attache', 'attache case', 'peti', 'vip bag', 'vip suitcase',
  ],
  'Laptop Bags': [
    'laptop bag', 'laptop backpack', 'leptop bag', 'laptop sleeve', 'laptop case',
    'laptop cover', 'notebook bag', 'office laptop bag', 'business bag',
    'formal laptop bag', 'executive bag', 'macbook bag', 'macbook cover',
    'laptop pouch', 'work bag for laptop', 'laptop wala bag', 'computer bag',
    '15.6 inch laptop bag', '14 inch laptop bag', 'laptop office bag',
  ],
  'Accessories': [
    'accessory', 'accessories', 'bag accessories', 'travel accessories',
    'luggage tag', 'bag tag', 'name tag', 'keychain', 'key chain', 'bag charm',
    'mirror', 'small pouch', 'pouch', 'organizer pouch', 'toiletry pouch',
    'travel kit', 'travel organizer', 'bag strap', 'luggage strap', 'padlock',
    'luggage lock', 'bag lock',
  ],
  'Tote Bags': [
    'tote', 'tote bag', 'totebag', 'shopping bag', 'carry bag', 'office tote',
    'canvas bag', 'canvas tote', 'jhola', 'jhola bag', 'big tote', 'market bag',
    'grocery bag', 'college tote', 'tote purse', 'tote for women', 'ladies tote',
    'shoulder tote', 'everyday tote', 'work tote',
  ],
  'Duffle Bags': [
    'duffle', 'duffel', 'duffle bag', 'duffel bag', 'travel duffle', 'travel duffel',
    'holdall', 'weekend bag', 'weekender', 'duffle bag with wheels', 'barrel bag',
    'cylindrical bag', 'sports duffle', 'gym duffle', 'kit bag', 'kitbag',
    'cricket kit bag', 'overnight bag',
  ],
  'Girls Backpacks': [
    'girls backpack', 'girl backpack', 'ladies backpack', 'women backpack',
    'school bag for girls', 'college bag for girls', 'girls school bag',
    'cute backpack', 'pink backpack', 'floral backpack', 'girls bagpack',
    'girls rucksack', 'stylish backpack for girls', 'college backpack for girls',
  ],
  'College Bags': [
    'college bag', 'collage bag', 'campus bag', 'university bag',
    'college bag for boys', 'college wali bag', 'college tote bag',
    'college side bag', 'college backpack bag',
  ],
  'Gents Wallet': [
    'gents wallet', "gent's wallet", 'mens wallet', "men's wallet", 'purse for men',
    'mard ka wallet', 'aadmi ka wallet', 'boy wallet', 'gents purse',
    'leather wallet for men', 'bifold wallet men', 'formal wallet men',
  ],
  'Belts': [
    'belt', 'leather belt', 'formal belt', 'pant belt', 'patka', 'kamarband',
    'office belt', 'casual belt', 'reversible belt', 'buckle belt',
    'jeans belt', 'trouser belt', 'gents belt', 'mens belt',
  ],
  'Card Wallet': [
    'card wallet', 'card holder', 'atm card wallet', 'slim card wallet', 'card case',
    'business card holder', 'visiting card holder', 'id card wallet',
    'credit card holder', 'debit card holder', 'mini wallet', 'thin wallet',
  ],
  'School Trolley Bags': [
    'school trolley', 'kids trolley bag', 'school suitcase', 'school trolley bag',
    'trolley bag for kids', 'kids wheeled bag', 'student trolley',
    'trolley school bag', 'wheeled school bag',
  ],
  'Hand Wallet': [
    'hand wallet', 'clutch wallet', 'haath wala purse',
    'ladies hand purse', 'small hand bag', 'wristlet', 'wrist purse',
    'hand clutch', 'mini purse',
  ],
  'Clutch': [
    'clutch', 'clutch bag', 'wedding clutch', 'party clutch', 'shaadi purse clutch',
    'evening clutch', 'bridal clutch', 'fancy clutch', 'clutch purse',
    'sling clutch', 'box clutch', 'embellished clutch', 'occasion clutch',
  ],
  'Gym Bags': [
    'gym bag', 'sports bag', 'fitness bag', 'gym ka bag', 'workout bag',
    'exercise bag', 'training bag', 'yoga bag', 'gym kit bag', 'sports kit bag',
    'daily gym bag', 'gym wala bag',
  ],
};

// NOTE (found while auditing coverage for this task, not fixed here — out of
// scope, touches CATEGORY_FAMILIES/CATEGORY_ALIASES in lib/constants.js
// which govern separate mechanics this task wasn't asked to change): the
// 'LUGGAGE' key above is a keyword-only umbrella with no real category of
// that exact name — no product or categories-table row is ever literally
// named "Luggage" (the real names are "Trolley Bags"/"Travel Bags"). That
// means detectCategory()'s bestKeywordMatch and findAliasHit() both silently
// fail to resolve a 'LUGGAGE' hit to any real, product-matching category —
// this keyword list (and CATEGORY_ALIASES['LUGGAGE'] / CATEGORY_FAMILIES.
// luggage) has likely been dead for that reason. Queries relying on it still
// work today only because findCategoryHit()'s dynamic word-overlap fallback
// matches directly against the real "Trolley Bags"/"Travel Bags" names
// before detectCategory() is ever reached.

// Words too generic to identify a specific category on their own — used to
// strip down a category name to its distinctive words for the dynamic
// fallback below (e.g. "Party Wear Purse" -> ["party"], since "wear" and
// "purse" alone are too broad / already claimed by other categories).
const GENERIC_WORDS = new Set([
  'bag', 'bags', 'purse', 'purses', 'wear', 'the', 'and', 'for', 'of', 'a', 'an', 'with',
]);

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Trailing "s?" makes every phrase/category-name check plural-tolerant, so
// "school bags" matches the same as "school bag" instead of silently
// falling through to near-empty text-only results just because the
// customer typed the plural form.
function wordBoundaryTest(lower, phrase) {
  return new RegExp(`\\b${escapeRegex(phrase.toLowerCase())}s?\\b`, 'i').test(lower);
}

function distinctiveWords(categoryName) {
  return String(categoryName || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3 && !GENERIC_WORDS.has(w));
}

// Detects which category (by its real, DB-sourced name) a free-text query is
// about. Tries, in order: (1) exact category name mentioned verbatim,
// (2) curated synonym list, (3) any distinctive word from a real category's
// name — this last tier means a brand-new category typed into admin starts
// matching immediately, without needing a CATEGORY_KEYWORDS entry.
// Splits into lowercase word tokens and crudely singularizes each (trailing
// "es"/"s" stripped) so "purses"/"purse", "bags"/"bag" etc. overlap cleanly —
// this is what makes "party wear purse" match a "Party Wear Purses" category
// name (or vice versa) even though CATEGORY_KEYWORDS/word-boundary phrase
// matching above wouldn't catch every spacing/plural variant.
function tokenize(text) {
  return baseTokenize(text)
    .map((t) => (t.length > 4 && t.endsWith('es') ? t.slice(0, -2) : t.length > 3 && t.endsWith('s') ? t.slice(0, -1) : t));
}

// True when the category/brand `name`'s distinctive words are all present in
// the query, or the query's own words are all present in the name — either
// direction is a legitimate "this query is about that name" signal.
function tokensOverlap(query, name) {
  const queryTokens = tokenize(query);
  const queryTokenSet = new Set(queryTokens);
  const nameTokensAll = tokenize(name);
  const nameTokens = nameTokensAll.filter((t) => t.length >= 3 && !GENERIC_WORDS.has(t));
  if (nameTokens.length === 0) return false;
  const nameCoveredByQuery = nameTokens.every((t) => queryTokenSet.has(t));
  const meaningfulQueryTokens = queryTokens.filter((t) => t.length >= 3);
  const queryCoveredByName = meaningfulQueryTokens.length > 0 && meaningfulQueryTokens.every((t) => nameTokensAll.includes(t));
  return nameCoveredByQuery || queryCoveredByName;
}

// Multi-script alias matching (Task: spoken "party wear purse" arriving as
// Devanagari/Gurmukhi never matching the English category name) — checked
// ahead of tokensOverlap so an alias hit (e.g. "पार्टी वियर पर्स") resolves
// straight to its exact category, not the wider family fallback. Multi-word
// aliases are matched as a substring of the normalized query (word-boundary
// regex doesn't apply cleanly across scripts); single-word aliases must
// appear as a whole token, to avoid a short alias matching inside an
// unrelated longer word. When more than one alias matches, the longest
// (most specific) one wins.
function findAliasHit(normalizedQuery, candidates) {
  let best = null;
  for (const [catKey, aliases] of Object.entries(CATEGORY_ALIASES)) {
    const realName = candidates.find((c) => c.toLowerCase() === catKey.toLowerCase());
    if (!realName) continue;
    for (const alias of aliases) {
      const normalizedAlias = normalizeQuery(alias);
      if (!normalizedAlias) continue;
      const isMatch = normalizedAlias.includes(' ')
        ? normalizedQuery.includes(normalizedAlias)
        : tokenize(normalizedQuery).includes(normalizedAlias);
      if (isMatch && (!best || normalizedAlias.length > best.aliasLen)) {
        best = { name: realName, aliasLen: normalizedAlias.length };
      }
    }
  }
  return best ? best.name : null;
}

// Category-first matching (Task: "party wear purse" bug) — tries alias
// matching, then token overlap against every candidate name, and returns the
// longest (most specific) match. Callers should pass BOTH the categories
// table's names AND the real `product.category` string values as
// candidates, since those two can disagree in spacing/casing/pluralization;
// matching against whichever string actually exists on products is what
// prevents a false "zero products in this category" result.
export function findCategoryHit(query, candidates = []) {
  const lower = normalizeQuery(query);
  if (!lower) return null;
  const unique = [...new Set((candidates || []).filter(Boolean))];

  const alias = findAliasHit(lower, unique);
  if (alias) return alias;

  const hits = unique.filter((name) => tokensOverlap(lower, name));
  if (hits.length === 0) return null;
  return hits.sort((a, b) => b.length - a.length)[0];
}

// Same singular/plural + whitespace/casing tolerance as tokenize() above,
// but requires the WHOLE normalized string to match — not word overlap —
// so a product's own `category` field (however it was actually typed: admin
// dropdown, CSV import, legacy data) is recognized as the same category as
// the categories table's name even when they differ in spacing, casing, or
// singular/plural ("Duffle Bag" vs "Duffle Bags"). Deliberately NOT the
// looser tokensOverlap() used for query matching above — that direction-
// agnostic word-subset check would incorrectly treat "School Bags" as the
// same category as "School Trolley Bags", or "Wallets" as "Gents Wallet",
// since one name's words are a subset of the other's.
function normalizeCategoryString(s) {
  return String(s || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((w) => (w.length > 4 && w.endsWith('es') ? w.slice(0, -2) : w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w))
    .join(' ');
}

// Whether a product's `category` field and a resolved category name (from
// findCategoryHit/detectCategory) refer to the same category. The two are
// supposed to agree exactly but aren't guaranteed to — this is what makes
// matching robust to minor data-entry variance without needing perfect
// consistency for every category the owner adds by hand.
export function categoryNamesEquivalent(a, b) {
  const na = normalizeCategoryString(a);
  const nb = normalizeCategoryString(b);
  return !!na && na === nb;
}

export function findBrandHit(query, brands = []) {
  const lower = normalizeQuery(query);
  if (!lower) return null;
  const unique = [...new Set((brands || []).filter(Boolean))];
  const hits = unique.filter((name) => tokensOverlap(lower, name));
  if (hits.length === 0) return null;
  return hits.sort((a, b) => b.length - a.length)[0];
}

export function detectCategory(text, dbCategories = []) {
  const lower = (text || '').toLowerCase().trim();
  if (!lower) return 'Other';

  const sortedDbCats = [...new Set((dbCategories || []).filter(Boolean))].sort((a, b) => b.length - a.length);

  for (const catName of sortedDbCats) {
    if (wordBoundaryTest(lower, catName)) return catName;
  }

  // Scans every category's full keyword list and keeps the LONGEST matching
  // keyword (most specific) instead of returning on the first category that
  // has any match at all — otherwise a generic keyword declared on an
  // earlier category (e.g. Handbags' bare "purse") permanently shadows a
  // more specific, more correct keyword on a later category (e.g. Party Wear
  // Purse's "bridal purse") for every query containing that generic word,
  // regardless of Object.entries() declaration order.
  let bestKeywordMatch = null;
  for (const [keywordCat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const kw of keywords) {
      if (wordBoundaryTest(lower, kw) && (!bestKeywordMatch || kw.length > bestKeywordMatch.kwLen)) {
        bestKeywordMatch = { cat: keywordCat, kwLen: kw.length };
      }
    }
  }
  if (bestKeywordMatch) {
    return sortedDbCats.find((c) => c.toLowerCase() === bestKeywordMatch.cat.toLowerCase()) || bestKeywordMatch.cat;
  }

  for (const catName of sortedDbCats) {
    for (const word of distinctiveWords(catName)) {
      if (wordBoundaryTest(lower, word)) return catName;
    }
  }

  return 'Other';
}
