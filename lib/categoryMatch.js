import { tokenize as baseTokenize, normalizeQuery } from './multiScript';

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
    'backbag', 'bagpac', 'rucksack', 'ruck sack', 'school bag', 'college bag',
    'collage bag', 'laptop bag', 'laptop backpack', 'leptop bag', 'hiking bag',
    'trek bag', 'trekking bag', 'trekking backpack', 'camping bag',
    'travel backpack', 'daypack', 'day pack', 'casual backpack', 'office bag',
    'gym bag', 'sports bag', 'anti theft bag', 'usb charging bag', 'smart backpack',
    'waterproof backpack', 'student bag', 'study bag', 'adventure bag',
    'outdoor bag', 'pithu', 'pithhu', 'peethu', 'pitu', 'pith wali bag',
    'pith pe pehna', 'basta', 'bacha bag', 'kids backpack', 'children bag',
    'child bag', 'kids bag', 'shoulder backpack', 'college backpack',
    'college rucksack', 'hydration bag',
  ],
  'Handbags': [
    'handbag', 'hand bag', 'handbagg', 'handbeg', 'ladies bag', 'shoulder bag',
    'tote bag', 'totebag', 'hobo bag', 'satchel', 'top handle bag',
    'bucket bag', 'structured bag', 'everyday bag', 'everyday purse', 'work bag',
    'office handbag', 'office ladies bag', 'ladies handbag', 'woman bag', 'women bag',
    'mahila bag', 'ladies purse', 'hand purse', 'hand carry bag', 'big purse',
    'large bag', 'shopping bag', 'daily use bag', 'casual bag', 'regular bag',
    'normal bag', 'purse', 'purs', 'branded handbag', 'designer handbag',
    'leather handbag', 'trendy handbag', 'stylish handbag', 'casual handbag',
  ],
  'Party Wear Purse': [
    'party wear purse', 'party purse', 'party bag', 'party wear bag',
    'fancy purse', 'fancy bag', 'fancy clutch', 'evening bag',
    'evening purse', 'bridal purse', 'bridal bag', 'wedding bag',
    'wedding purse', 'shaadi bag', 'shaadi purse', 'shadi bag', 'shadi purse',
    'function bag', 'function purse', 'designer purse', 'designer bag',
    'stylish purse', 'stylish bag', 'glitter bag', 'glitter purse', 'sequin bag',
    'embroidered bag', 'embroidered purse', 'clutch purse', 'clutch',
    'potli', 'potli bag', 'potli purse', 'ethnic bag', 'ethnic purse',
    'sangeet bag', 'reception bag', 'cocktail bag', 'formal purse',
    'fancy', 'party wear', 'shiny bag', 'embellished bag', 'byah', 'vyah',
    'wedding function bag', 'occasion bag', 'occasion purse', 'engagement bag',
    'ring ceremony bag', 'ring ceremony purse', 'mehendi bag', 'mehndi bag',
    'mehndi purse', 'haldi bag', 'haldi function bag', 'festive bag',
    'festive purse', 'diwali purse', 'occasion clutch',
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
    'wallet', 'wallett', 'walet', 'wallete', 'purse for cash', 'card holder',
    'bifold', 'billfold', 'trifold wallet', 'clutch wallet', 'leather wallet',
    'slim wallet', 'rfid wallet', 'mens wallet', "men's wallet", 'ladies wallet',
    'zip wallet', 'zipper wallet', 'coin purse', 'cash holder', 'card case',
    'card wallet', 'money clip', 'travel wallet', 'passport wallet',
    'document wallet', 'long wallet', 'short wallet', 'id card wallet',
    'visiting card holder', 'keychain wallet', 'batua', 'batwa', 'purse for money',
  ],
  'School Bags': [
    'school bag', 'skool bag', 'school backpack', 'student bag', 'class bag',
    'child bag', 'kids bag', 'student backpack', 'vidyalaya bag', 'basta',
    'bacha bag', 'primary bag', 'cartoon bag', 'kids backpack', 'children bag',
    'nursery bag', 'kindergarten bag', 'kg bag', 'class 1 bag', 'junior school bag',
  ],
};

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

// Category-first matching (Task: "party wear purse" bug) — tries token
// overlap against every candidate name and returns the longest (most
// specific) match. Callers should pass BOTH the categories table's names AND
// the real `product.category` string values as candidates, since those two
// can disagree in spacing/casing/pluralization; matching against whichever
// string actually exists on products is what prevents a false "zero
// products in this category" result.
export function findCategoryHit(query, candidates = []) {
  const lower = normalizeQuery(query);
  if (!lower) return null;
  const unique = [...new Set((candidates || []).filter(Boolean))];
  const hits = unique.filter((name) => tokensOverlap(lower, name));
  if (hits.length === 0) return null;
  return hits.sort((a, b) => b.length - a.length)[0];
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

  for (const [keywordCat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const kw of keywords) {
      if (wordBoundaryTest(lower, kw)) {
        return sortedDbCats.find((c) => c.toLowerCase() === keywordCat.toLowerCase()) || keywordCat;
      }
    }
  }

  for (const catName of sortedDbCats) {
    for (const word of distinctiveWords(catName)) {
      if (wordBoundaryTest(lower, word)) return catName;
    }
  }

  return 'Other';
}
