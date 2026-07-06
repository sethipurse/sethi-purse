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
export const VOICE_SEARCH_PLACEHOLDER = 'Bol ke dhundo… 🎤';
export const VOICE_SEARCH_HINT = '🎤 Punjabi ya Hindi mein bol ke dhundh sakte ho';
export const CABIN_WEIGHT_NOTE = 'Cabin limit 7 kg hota hai — packing ka dhyan rakhna 😄';
export const FALLBACK_SEARCH_NOTICE = 'Exact match nahi mila — ye similar options dekho 👇';
export const FALLBACK_CHAT_NOTICE = 'Ye similar options hain 👇';
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
