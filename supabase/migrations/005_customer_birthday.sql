-- Run in Supabase SQL Editor once. Safe/idempotent.
--
-- Free-text birthday (e.g. "15/08" or "15 Aug") — not a strict date column,
-- since most customers won't give a year. Groundwork for a future
-- "birthday customers" filter; nothing reads/writes it until this feature
-- ships.

ALTER TABLE customers ADD COLUMN IF NOT EXISTS birthday text;
