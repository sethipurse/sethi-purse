-- Run in Supabase SQL Editor once, AFTER 006_category_visibility.sql.
-- Safe/idempotent — each insert is guarded by a WHERE NOT EXISTS on name,
-- so re-running this migration never creates duplicates.
--
-- Adds 11 new categories, all HIDDEN (is_active = false). The owner
-- reveals each one from Admin -> Categories when it's ready.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO categories (id, name, image_url, is_active, created_at)
SELECT gen_random_uuid(), 'Tote Bags', 'https://placehold.co/600x400/0A0A0A/C9A84C?text=Tote+Bags', false, now() + interval '1 second'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Tote Bags');

INSERT INTO categories (id, name, image_url, is_active, created_at)
SELECT gen_random_uuid(), 'Duffle Bags', 'https://placehold.co/600x400/0A0A0A/C9A84C?text=Duffle+Bags', false, now() + interval '2 seconds'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Duffle Bags');

INSERT INTO categories (id, name, image_url, is_active, created_at)
SELECT gen_random_uuid(), 'Girls Backpacks', 'https://placehold.co/600x400/0A0A0A/C9A84C?text=Girls+Backpacks', false, now() + interval '3 seconds'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Girls Backpacks');

INSERT INTO categories (id, name, image_url, is_active, created_at)
SELECT gen_random_uuid(), 'College Bags', 'https://placehold.co/600x400/0A0A0A/C9A84C?text=College+Bags', false, now() + interval '4 seconds'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'College Bags');

INSERT INTO categories (id, name, image_url, is_active, created_at)
SELECT gen_random_uuid(), 'Gents Wallet', 'https://placehold.co/600x400/0A0A0A/C9A84C?text=Gents+Wallet', false, now() + interval '5 seconds'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Gents Wallet');

INSERT INTO categories (id, name, image_url, is_active, created_at)
SELECT gen_random_uuid(), 'Belts', 'https://placehold.co/600x400/0A0A0A/C9A84C?text=Belts', false, now() + interval '6 seconds'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Belts');

INSERT INTO categories (id, name, image_url, is_active, created_at)
SELECT gen_random_uuid(), 'Card Wallet', 'https://placehold.co/600x400/0A0A0A/C9A84C?text=Card+Wallet', false, now() + interval '7 seconds'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Card Wallet');

INSERT INTO categories (id, name, image_url, is_active, created_at)
SELECT gen_random_uuid(), 'School Trolley Bags', 'https://placehold.co/600x400/0A0A0A/C9A84C?text=School+Trolley+Bags', false, now() + interval '8 seconds'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'School Trolley Bags');

INSERT INTO categories (id, name, image_url, is_active, created_at)
SELECT gen_random_uuid(), 'Hand Wallet', 'https://placehold.co/600x400/0A0A0A/C9A84C?text=Hand+Wallet', false, now() + interval '9 seconds'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Hand Wallet');

INSERT INTO categories (id, name, image_url, is_active, created_at)
SELECT gen_random_uuid(), 'Clutch', 'https://placehold.co/600x400/0A0A0A/C9A84C?text=Clutch', false, now() + interval '10 seconds'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Clutch');

INSERT INTO categories (id, name, image_url, is_active, created_at)
SELECT gen_random_uuid(), 'Gym Bags', 'https://placehold.co/600x400/0A0A0A/C9A84C?text=Gym+Bags', false, now() + interval '11 seconds'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Gym Bags');
