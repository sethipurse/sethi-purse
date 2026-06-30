-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- Adds view_count, purchase_count, and demo_video_url to products table

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS purchase_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS demo_video_url text;
