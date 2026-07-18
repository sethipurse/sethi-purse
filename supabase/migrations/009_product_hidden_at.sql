-- Run once in Supabase SQL Editor. Safe/idempotent (IF NOT EXISTS).
--
-- Tracks exactly when a product most recently became hidden (is_active
-- false), so the stale-hidden image-cleanup tool can report a real
-- "hidden for N days" instead of guessing from created_at. Cleared back to
-- NULL whenever the product is made visible again — this column always
-- means "since when has it been continuously hidden," not a historical log.

ALTER TABLE products ADD COLUMN IF NOT EXISTS hidden_at timestamptz;
