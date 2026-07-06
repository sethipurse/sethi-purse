// Admin's actual size presets are in inches with semantic labels (see
// SIZE_PRESETS in components/ProductForm.js: '20" Cabin', '24" Medium',
// '28" Large', '32" XL') — not the plain "55 cm" strings this was first
// written against. So this also parses inch measurements (converting to cm)
// before ever falling back to the coarse label buckets.
const CM_PATTERN = /(\d{2,3})\s*cm\b/i;
const PAREN_CM_PATTERN = /\((\d{2,3})\)/;
const INCH_PATTERN = /(\d{2,3})\s*(?:"|inch(?:es)?|in\b)/i;

function extractCmFromString(value) {
  if (!value || typeof value !== 'string') return null;

  const cmMatch = value.match(CM_PATTERN) || value.match(PAREN_CM_PATTERN);
  if (cmMatch) return Number(cmMatch[1]);

  const inchMatch = value.match(INCH_PATTERN);
  if (inchMatch) return Math.round(Number(inchMatch[1]) * 2.54);

  const lower = value.toLowerCase();
  if (lower.includes('cabin') || lower.includes('small')) return 55;
  if (lower.includes('xl') || lower.includes('extra large')) return 79;
  if (lower.includes('large')) return 75;
  if (lower.includes('medium')) return 65;

  return null;
}

export function parseLuggageCm(product, selectedSize) {
  if (!product) return null;

  const candidates = [
    selectedSize,
    ...(Array.isArray(product.sizes) ? product.sizes : []),
    product.size,
    product.name,
  ];

  for (const candidate of candidates) {
    const cm = extractCmFromString(candidate);
    if (cm != null) return cm;
  }

  return null;
}
