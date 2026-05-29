const CATEGORY_ALIASES = {
  luggage: ['luggage', 'trolley bags'],
  handbags: ['handbags', 'handbag'],
  'school-bags': ['school bags', 'school bag'],
};

export function slugifyCategory(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function categoryPath(category) {
  return `/category/${slugifyCategory(category)}`;
}

export function titleFromSlug(slug) {
  return String(slug || '')
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function productMatchesCategorySlug(product, slug) {
  const productCategory = product?.category || product?.category_id || '';
  const productSlug = slugifyCategory(productCategory);
  const requestedSlug = slugifyCategory(slug);
  if (!requestedSlug) return false;
  if (productSlug === requestedSlug) return true;

  const aliases = CATEGORY_ALIASES[requestedSlug] || [];
  return aliases.some((alias) => slugifyCategory(alias) === productSlug);
}

export function findCategoryBySlug(categories, slug) {
  const requestedSlug = slugifyCategory(slug);
  return (categories || []).find((category) => {
    const idSlug = slugifyCategory(category?.id);
    const nameSlug = slugifyCategory(category?.name);
    return idSlug === requestedSlug || nameSlug === requestedSlug;
  });
}
