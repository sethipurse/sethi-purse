# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
yarn dev          # Start dev server on 0.0.0.0:3000
yarn dev:mem      # Same, with 512MB Node heap cap (use if OOM crashes)
yarn build        # Production build
yarn start        # Run production build
```

No lint or test scripts are configured.

## Architecture Overview

**SETHI PURSE** — Next.js 14 App Router e-commerce site for a Jalandhar luggage store. Mobile-first, WhatsApp-based inquiry flow (no cart/checkout). JavaScript only (no TypeScript).

### Data Layer

Two-tier storage with automatic fallback:

1. **Supabase** (primary) — tables: `products`, `categories`, `offers`, `reviews`, `inquiries`, `slider_images`, `settings`
2. **Static JSON** (`/data/*.json`) — bundled at build time, used as fallback when Supabase is unavailable or empty

All async data fetchers live in `lib/data.js`. Each follows the same pattern: try Supabase, catch errors, fall back to the local JSON. `lib/storage.js` exports the Supabase client and `nowIST()` (IST timestamp formatter). The `readJson`/`writeJson` stubs in `storage.js` are no-ops — the JSON files are static build-time data only.

### API

Single catch-all route handles **all** backend logic: `app/api/[[...path]]/route.js`.

Route segments dispatched inside the handler:
- `GET/POST /api/products`, `GET/PUT/DELETE /api/products/[id]`
- `GET/POST /api/categories`, `PUT/DELETE /api/categories/[id]`
- `GET/POST /api/offers`, `PUT/DELETE /api/offers/[id]`
- `GET/POST /api/inquiries`, `PUT/DELETE /api/inquiries/[id]`
- `GET/POST /api/reviews`, `PUT/DELETE /api/reviews/[id]`
- `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/session`
- `GET/PUT /api/settings`
- `GET/POST/PUT/DELETE /api/slider`
- `POST /api/chat` (AI product assistant with category/language detection)

Write operations mutate Supabase directly. There is no ORM.

### Auth

Cookie-based. `lib/security.js` manages the `sethi_admin_session` HTTP-only cookie (8-hour TTL). `requireAdmin(request)` returns a 401 response if the cookie is absent; call it at the top of every mutating admin endpoint. Rate limiting is in-memory per IP (60 req/min window), applied to login and chat endpoints via `rateLimit()`.

Admin credentials default to `admin / sethi2024` and are stored in the Supabase `settings` table (fallback: `/data/settings.json`).

### Routing

**Customer** (`app/`):
- `/` — home (HeroSlider, featured products, category grid, offers, reviews)
- `/products`, `/products/[id]` — product listing and detail
- `/product/[id]` — alternate product detail URL (same data)
- `/categories`, `/category/[slug]` — category browse
- `/offers`, `/reviews`, `/contact`

**Admin** (`app/admin/`):
- `/admin` — login page (checks `/api/auth/session`, redirects to dashboard if already logged in)
- `/admin/dashboard`, `/admin/products`, `/admin/products/add`, `/admin/products/edit/[id]`
- `/admin/categories`, `/admin/offers`, `/admin/inquiries`, `/admin/reviews`, `/admin/settings`, `/admin/notifications`, `/admin/slider`

Admin pages are client components that call `/api/auth/session` on mount and redirect to `/admin` on 401. `components/AdminShell.js` provides the sidebar layout wrapper.

### Component Structure

- `components/ui/` — shadcn/ui primitives (Radix UI based); do not edit these manually
- `components/` — feature components: `ProductCard`, `ProductForm`, `ProductDetailClient`, `ProductsClient`, `HomePageClient`, `HeroSlider`, `AdminShell`, etc.

### Design Tokens

Background `#faf8f4`, text `#2c1f14`, gold accents. Fonts loaded via CSS (`Playfair Display` for headings, `DM Sans` for body). Theme defined in `app/globals.css` and `tailwind.config.js`.

### Environment Variables

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (public, client-side) |
| `SUPABASE_SERVICE_KEY` | Supabase service role key (server-side only) |

Images hosted on Supabase Storage (`bbdatviaaiqpfvwumkkd.supabase.co`); the `next.config.js` allowlist covers this hostname.

### Known Issues

- `app/api/[[...path]]/route.js` line ~249: rating clamp bug — `Number(r.rating) || 5` treats `0` as falsy. Fix: `r.rating != null ? Number(r.rating) : 5`.
