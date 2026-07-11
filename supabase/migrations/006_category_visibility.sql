-- Run in Supabase SQL Editor once. Safe/idempotent.
--
-- Adds a visibility flag to categories, same pattern as products.is_active.
-- Postgres applies a column DEFAULT to all existing rows instantly when
-- adding the column (no separate backfill UPDATE needed), so every
-- category that already exists becomes is_active = true automatically.

ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
