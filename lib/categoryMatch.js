// Curated synonyms for categories we know about today — Hindi/Punjabi slang,
// use-cases, and near-misses that a plain word-split wouldn't catch. This is
// a *bonus* layer; it is NOT required for a category to be searchable — see
// the dynamic word-based fallback in detectCategory() below, which gives
// every category (including ones added later in admin) baseline matching
// with zero code changes.
export const CATEGORY_KEYWORDS = {
  'LUGGAGE': [
    'luggage', 'trolley', 'suitcase', 'travel bag', 'travel luggage',
    'cabin bag', 'check-in', 'checkin', 'bag on wheels', 'roller bag',
    'hard case', 'soft case', 'spinner', 'wheeled bag',
    'cabin luggage', 'check in bag', '20 inch', '24 inch', '28 inch',
    'samaan', 'trolley bag', 'samaan ki bag', 'yatra bag', 'journey bag',
    'safar', 'safar bag', 'airport bag', 'flight bag', 'travel', 'trip bag',
  ],
  'Backpacks': [
    'backpack', 'bag pack', 'bagpack', 'rucksack', 'school bag',
    'college bag', 'laptop bag', 'hiking bag', 'trek bag',
    'trekking bag', 'camping bag', 'travel backpack', 'daypack',
    'casual backpack', 'office bag', 'gym bag', 'sports bag',
    'anti theft bag', 'usb charging bag', 'student bag', 'study bag',
    'pithu', 'pithhu', 'peethu', 'pitu', 'pith wali bag', 'pith pe pehna',
    'basta', 'bacha bag', 'kids backpack', 'children bag', 'child bag', 'kids bag',
  ],
  'Handbags': [
    'handbag', 'hand bag', 'ladies bag', 'shoulder bag',
    'tote bag', 'hobo bag', 'satchel', 'top handle bag',
    'bucket bag', 'structured bag', 'everyday bag', 'work bag',
    'office handbag', 'ladies handbag', 'woman bag', 'women bag',
    'mahila bag', 'ladies purse', 'hand purse',
    'big purse', 'large bag', 'shopping bag', 'daily use bag',
    'casual bag', 'regular bag', 'normal bag', 'purse',
  ],
  'Party Wear Purse': [
    'party wear purse', 'party purse', 'party bag', 'party wear bag',
    'fancy purse', 'fancy bag', 'fancy clutch', 'evening bag',
    'evening purse', 'bridal purse', 'bridal bag', 'wedding bag',
    'wedding purse', 'shaadi bag', 'shaadi purse', 'function bag',
    'function purse', 'designer purse', 'designer bag', 'stylish purse',
    'stylish bag', 'glitter bag', 'glitter purse', 'sequin bag',
    'embroidered bag', 'embroidered purse', 'clutch purse', 'clutch',
    'potli', 'potli bag', 'potli purse', 'ethnic bag', 'ethnic purse',
    'sangeet bag', 'reception bag', 'cocktail bag', 'formal purse',
    'fancy', 'party wear', 'shiny bag', 'embellished bag',
  ],
  'Slings': [
    'sling', 'sling bag', 'cross body bag', 'crossbody bag',
    'messenger bag', 'shoulder sling', 'cross sling', 'side bag',
    'side purse', 'ek strap bag', 'single strap bag', 'body bag',
    'mini bag', 'small bag', 'compact bag', 'belt bag', 'waist bag',
    'fanny pack', 'chest bag', 'mobile bag', 'phone bag',
    'shoulder strap bag',
  ],
  'Wallets': [
    'wallet', 'purse for cash', 'card holder', 'bifold', 'clutch wallet',
    'leather wallet', 'slim wallet', 'rfid wallet', 'mens wallet',
    'ladies wallet', 'zip wallet', 'coin purse', 'cash holder',
    'card case', 'card wallet', 'money clip', 'travel wallet',
    'passport wallet', 'document wallet',
  ],
  'School Bags': [
    'school bag', 'school backpack', 'student bag', 'class bag',
    'child bag', 'kids bag', 'student backpack', 'skool bag',
    'vidyalaya bag', 'basta', 'bacha bag', 'primary bag',
    'cartoon bag', 'kids backpack', 'children bag',
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

function wordBoundaryTest(lower, phrase) {
  return new RegExp(`\\b${escapeRegex(phrase.toLowerCase())}\\b`, 'i').test(lower);
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
