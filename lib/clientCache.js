'use client';

// Lightweight in-memory fetch cache + in-flight de-dup for client components.
// Scoped to the current tab's JS session only (cleared on full reload), so
// it never risks serving stale data across visits or to the admin panel —
// admin pages simply don't use this and keep fetching fresh every time.
//
// Fixes the common pattern where multiple globally-mounted components (e.g.
// the homepage and the site-wide WhatsAppFloat chat widget) each fetch the
// same /api/products on mount, doubling the network cost of every page load.
const cache = new Map();

export function cachedFetchJson(url, ttlMs = 20000) {
  const entry = cache.get(url);
  const now = Date.now();
  if (entry) {
    if (entry.promise) return entry.promise;
    if (entry.expiresAt > now) return Promise.resolve(entry.data);
  }
  const promise = fetch(url)
    .then((r) => r.json())
    .then((data) => {
      cache.set(url, { data, expiresAt: Date.now() + ttlMs });
      return data;
    })
    .catch((err) => {
      cache.delete(url);
      throw err;
    });
  cache.set(url, { promise });
  return promise;
}
