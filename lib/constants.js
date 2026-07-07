export const WHATSAPP_NUMBER = '917986161633';
export const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}`;
export const SITE_URL = 'https://sethi-purse.vercel.app';
export const LOGO_URL = 'https://i.ibb.co/nsFgJzQF/sethi-purse-logo.jpg';
export const BUSINESS = {
  name: 'SETHI PURSE',
  tagline: "Punjab's Trusted Premium Luggage Destination",
  phone: '+91 7986161633',
  timings: '10:00 AM - 8:00 PM',
  address: 'Inside Mai Hiran Gate, Near Books Market, Chowk Adda Tanda, Dhan Mohalla, Jalandhar, Punjab 144001',
  maps: 'https://maps.app.goo.gl/vpKnhg527X24t9DAA',
  reviews: 'https://share.google/O2h8iutjH45vNgQMH',
  instagram: 'https://www.instagram.com/sethipurse',
  facebook: 'https://www.facebook.com/sethipurse',
  youtube: 'https://www.youtube.com/@sethipurse',
};
export const BRANDS = ['American Tourister', 'Safari', 'Genie', 'Arctic Fox'];

// Customer-facing wording — kept here (not hardcoded in components) so the
// shop owner can edit tone/phrasing without touching component code.
export const REPLY_PROMISE = '⚡ Fast reply on WhatsApp — 10am to 8pm';
export const SET_DISCOUNT_NOTE = 'Set discount milega — WhatsApp pe apply hoga ✨';
export const SET_ORDER_NOTE = 'Note: Set liya hai — set discount apply karna ji 😄';
export const UPSELL_HEADING = 'Ye bhi saath le jao 👜';
export const CABIN_WEIGHT_NOTE = 'Cabin limit 7 kg hota hai — packing ka dhyan rakhna 😄';
export const FALLBACK_SEARCH_NOTICE = 'Exact match nahi mila — ye similar options dekho 👇';
export const FALLBACK_CHAT_NOTICE = 'Ye similar options hain 👇';

export function buildCategoryUpdatingReply(categoryName) {
  return `${categoryName} abhi update ho rahi hai — WhatsApp pe poochho, store mein zaroor milega!`;
}

// Multilingual (Hinglish/English/Punjabi) terms that signal genuine shopping
// intent — used as a relevance gate before ever showing product cards in
// search/chat, so an off-topic query (e.g. asking about biscuits) can never
// "match" the catalog just because of a scoring baseline. Extend freely.
export const SHOP_INTENT_TERMS = [
  'bag', 'bags', 'purse', 'purses', 'attachi', 'attache', 'attachee', 'bagpack', 'ਅਟੈਚੀ', 'ਬੈਗ', 'ਪਰਸ',
  'luggage', 'trolley', 'suitcase', 'backpack', 'sling', 'wallet', 'handbag',
  'school', 'college', 'office', 'travel', 'trip', 'gift', 'shaadi', 'viah',
  'cabin', 'size', 'price', 'sasta', 'budget',
  // Devanagari (Hindi)
  'बैग', 'बैग्स', 'पर्स', 'अटैची', 'सूटकेस', 'ट्रॉली', 'ट्राली', 'बैगपैक', 'हैंडबैग',
  'स्कूल', 'कॉलेज', 'ऑफिस', 'सफर', 'यात्रा', 'शादी', 'ब्याह', 'गिफ्ट', 'तोहफा', 'सस्ता',
  // Gurmukhi (Punjabi)
  'ਸਕੂਲ', 'ਕਾਲਜ', 'ਟਰਾਲੀ', 'ਸੂਟਕੇਸ', 'ਬੈਗਪੈਕ', 'ਹੈਂਡਬੈਗ', 'ਵਿਆਹ', 'ਤੋਹਫ਼ਾ', 'ਸਫ਼ਰ', 'ਸਸਤਾ',
];

export const OFF_TOPIC_REPLY = 'Hum bags & luggage ke expert hain ji 😄 Bag, purse ya attachi ke baare mein poochho — best suggest karenge!';

// Category "families" — real category names only (see the `recommend`
// endpoint's USE_TO_CATEGORY map and lib/categoryMatch.js's
// CATEGORY_KEYWORDS keys). Used so a fallback, when nothing matches
// directly, never crosses into an unrelated family — a purse query must
// never surface a backpack, and vice versa.
export const CATEGORY_FAMILIES = {
  purse: ['Party Wear Purse', 'Handbags', 'Slings', 'Wallets'],
  backpack: ['Backpacks', 'School Bags'],
  luggage: ['LUGGAGE'],
};

// Which SHOP_INTENT_TERMS hint at which family, so the family can be
// inferred from whichever intent term(s) the query actually hit. A term
// absent from here (e.g. "office") is intentionally ambiguous — no family
// is inferred and the fallback uses featured products instead.
export const FAMILY_INTENT_TERMS = {
  purse: ['purse', 'purses', 'handbag', 'wallet', 'sling', 'ਪਰਸ', 'पर्स', 'हैंडबैग', 'ਹੈਂਡਬੈਗ'],
  backpack: ['backpack', 'school', 'college', 'स्कूल', 'बस्ता', 'बैगपैक', 'ਸਕੂਲ'],
  luggage: ['luggage', 'trolley', 'suitcase', 'attachi', 'attache', 'ਅਟੈਚੀ', 'cabin', 'travel', 'trip', 'अटैची', 'सूटकेस', 'ट्रॉली', 'ਸੂਟਕੇਸ'],
};

// Multi-script aliases for real category names (same keys as
// CATEGORY_FAMILIES/CATEGORY_KEYWORDS) — lets a spoken/typed Devanagari or
// Gurmukhi category name (e.g. "पार्टी वियर पर्स") resolve straight to that
// exact category instead of falling back to a whole family. Checked in
// findCategoryHit() with the same priority as an English category-name hit.
export const CATEGORY_ALIASES = {
  'LUGGAGE': [
    'attachi', 'attachee', 'attache', 'अटैची', 'ਅਟੈਚੀ',
    'suitcase', 'सूटकेस', 'ਸੂਟਕੇਸ',
    'trolley', 'ट्रॉली', 'ट्राली', 'ਟਰਾਲੀ',
  ],
  'Backpacks': [
    'backpack', 'bagpack', 'बैगपैक', 'ਬੈਗਪੈਕ', 'rucksack',
  ],
  'School Bags': [
    'school bag', 'school bags', 'स्कूल बैग', 'ਸਕੂਲ ਬੈਗ',
    'basta', 'बस्ता', 'ਬਸਤਾ',
  ],
  'Handbags': [
    'handbag', 'handbags', 'हैंडबैग', 'ਹੈਂਡਬੈਗ', 'ladies purse', 'लेडीज पर्स',
  ],
  'Slings': [
    'sling bag', 'sling', 'स्लिंग बैग', 'ਸਲਿੰਗ ਬੈਗ', 'cross body bag',
  ],
  'Party Wear Purse': [
    'party wear purse', 'party purse', 'पार्टी पर्स', 'पार्टी वियर पर्स', 'ਪਾਰਟੀ ਪਰਸ',
    // These all contain the generic word "purse", which Handbags' own bare
    // "purse" keyword would otherwise shadow in detectCategory() — listed
    // here as aliases so findCategoryHit() (checked before detectCategory
    // ever runs) resolves them straight to this category.
    'bridal purse', 'ब्राइडल पर्स', 'ਬ੍ਰਾਈਡਲ ਪਰਸ',
    'wedding purse', 'वेडिंग पर्स', 'ਵੈਡਿੰਗ ਪਰਸ',
    'fancy purse', 'फैंसी पर्स', 'ਫੈਂਸੀ ਪਰਸ',
    'evening purse', 'ईवनिंग पर्स', 'ਈਵਨਿੰਗ ਪਰਸ',
    'designer purse', 'डिज़ाइनर पर्स', 'ਡਿਜ਼ਾਈਨਰ ਪਰਸ',
    'formal purse', 'फॉर्मल पर्स', 'ਫਾਰਮਲ ਪਰਸ',
    'clutch purse', 'क्लच पर्स', 'ਕਲੱਚ ਪਰਸ',
  ],
  'Wallets': [
    'wallet', 'wallets', 'बटुआ', 'ਬਟੂਆ', 'purse for cash',
  ],
};

export const DEALS_ALERT_LABEL = '🔔 Deals ki alert lo';
export const DEALS_ALERT_ON_LABEL = '✅ Alerts on!';

export function buildWhatsAppLink(message) {
  return `${WHATSAPP_URL}?text=${encodeURIComponent(message)}`;
}

export function buildProductUrl(productId) {
  return `${SITE_URL}/product/${productId}`;
}

export function productPrice(product) {
  return Number(product?.sale_price ?? product?.salePrice ?? product?.price ?? 0);
}

export function rupee(value) {
  return `Rs.${Number(value || 0).toLocaleString('en-IN')}`;
}

export function buildBuyNowMessage(product, options = {}) {
  const quantity = Math.max(1, Number(options.quantity || options.qty || 1));
  const price = productPrice(product);
  const total = price * quantity;
  const lines = [
    'Hi SETHI PURSE, I want to buy this product:',
    '',
    `Product Name: ${product?.name || 'Product'}`,
    `Quantity: ${quantity}`,
    `Price: ${rupee(price)}`,
    `Total: ${rupee(total)}`,
  ];

  if (options.size) lines.push(`Size: ${options.size}`);
  if (options.color) lines.push(`Color: ${options.color}`);
  if (options.productUrl) lines.push(`Product Link: ${options.productUrl}`);

  return lines.join('\n');
}

export function cartItemTotal(item) {
  return Number(item?.price || 0) * Math.max(1, Number(item?.qty || 1));
}

export function cartTotal(items) {
  return (items || []).reduce((sum, item) => sum + cartItemTotal(item), 0);
}

export function buildCartOrderMessage(items, options = {}) {
  const cart = items || [];
  const lines = ['Hi SETHI PURSE, I want to place this order:', ''];

  cart.forEach((item, index) => {
    const quantity = Math.max(1, Number(item?.qty || 1));
    lines.push(
      `${index + 1}. Product Name: ${item?.name || 'Product'}`,
      `Quantity: ${quantity}`,
      `Price: ${rupee(item?.price || 0)}`,
      `Total: ${rupee(cartItemTotal(item))}`,
      ''
    );
  });

  lines.push(`Order Total: ${rupee(cartTotal(cart))}`);
  if (options.hasLuggageSet) lines.push('', SET_ORDER_NOTE);
  return lines.join('\n').trim();
}

export function formatIST(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
    }) + ' IST';
  } catch (e) { return ''; }
}

// FIX: support both snake_case (Supabase) and camelCase (old JSON) field names
export function resolveImage(product) {
  if (!product) return '';
  const imageType = product.image_type || product.imageType;
  const imageUrl = product.image_url || product.imageUrl;
  if (imageType === 'local') return `/uploads/${imageUrl}`;
  return imageUrl || '';
}

export const WA_MESSAGES = {
  home: "Hi SETHI PURSE! I visited your website and would like to know more about your products.",
  products: "Hi SETHI PURSE! I am browsing your collection. Can you help me find the right bag?",
  category: "Hi SETHI PURSE! I am browsing a category on your website. Can you share current availability?",
  offers: "Hi SETHI PURSE! I saw your offers online. Can you share current deals?",
  contact: "Hi SETHI PURSE! I want to visit your store. Please share directions and timings.",
  reviews: "Hi SETHI PURSE! I read your customer reviews and would like to visit your store.",
  default: "Hi SETHI PURSE! I visited your website and would like to know more.",
};

export function getWAMessageForPath(pathname) {
  if (!pathname) return WA_MESSAGES.home;
  if (pathname.startsWith('/products')) return WA_MESSAGES.products;
  if (pathname.startsWith('/category')) return WA_MESSAGES.category;
  if (pathname.startsWith('/offers')) return WA_MESSAGES.offers;
  if (pathname.startsWith('/contact')) return WA_MESSAGES.contact;
  if (pathname.startsWith('/reviews')) return WA_MESSAGES.reviews;
  if (pathname === '/') return WA_MESSAGES.home;
  return WA_MESSAGES.default;
}

export function getWALinkForPath(pathname) {
  return buildWhatsAppLink(getWAMessageForPath(pathname));
}

export function formatDateLong(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch (e) { return ''; }
}

export function formatDateShort(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  } catch (e) { return ''; }
}

export function getInitials(name) {
  if (!name) return '?';
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}
