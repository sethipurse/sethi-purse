-- Run this in Supabase SQL Editor (Dashboard -> SQL Editor -> New query)
-- Lets a review be tagged with a category so product pages only show
-- reviews relevant to that product, instead of any random review.

ALTER TABLE reviews ADD COLUMN IF NOT EXISTS category text;
