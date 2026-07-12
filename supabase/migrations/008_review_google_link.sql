-- Run once in Supabase SQL Editor. Safe/idempotent (IF NOT EXISTS).
--
-- Optional link to the store's Google Business listing, attached per
-- review, so a customer can click through and verify a copied-in review
-- is real. Google doesn't support deep-linking to one specific review —
-- this points at the business listing, which is expected.

ALTER TABLE reviews ADD COLUMN IF NOT EXISTS google_review_link text;
