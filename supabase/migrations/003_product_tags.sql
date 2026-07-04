-- Run this in Supabase SQL Editor (Dashboard -> SQL Editor -> New query)
-- Lets a product be tagged by use-case (School / Office / College / Travel /
-- Daily / Gift / Party) so Smart Finder chips that share one category (e.g.
-- school/office/college bags are all "Backpacks") can show genuinely
-- different, admin-curated results instead of guessing from keywords.

ALTER TABLE products ADD COLUMN IF NOT EXISTS tags text[] DEFAULT ARRAY[]::text[];
