-- Run in Supabase Dashboard -> SQL Editor -> New query -> paste -> Run.
-- Safe to run once. Uses IF NOT EXISTS / OR REPLACE throughout so a repeat
-- run is a harmless no-op instead of erroring.
--
-- CRM Step 1: customer database. Deny-all RLS — every read/write goes
-- through the server (service-role) client in app/api/[[...path]]/route.js,
-- the same pattern already used for products/inquiries/offers.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS customers (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  serial_no          text,
  full_name          text,
  phone_number       text NOT NULL,
  whatsapp_number    text,
  phone_2            text,
  city               text,
  country            text DEFAULT 'India',
  category_interest  text[] DEFAULT '{}',
  tags               text[] DEFAULT '{}',
  marketing_status   text DEFAULT 'subscribed',
  source             text DEFAULT 'import',
  last_purchase_date date,
  total_purchases    integer DEFAULT 0,
  purchase_value     numeric DEFAULT 0,
  last_contacted_at  timestamptz,
  notes              text,
  created_at         timestamptz DEFAULT now(),
  updated_at         timestamptz DEFAULT now()
);

-- Normalized-digits phone only (normalization happens in app code before
-- insert — see lib/phone.js) so every stored number is wa.me/tel-ready.
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_phone_number_format;
ALTER TABLE customers ADD CONSTRAINT customers_phone_number_format
  CHECK (phone_number ~ '^[0-9]{8,15}$');

ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_marketing_status_check;
ALTER TABLE customers ADD CONSTRAINT customers_marketing_status_check
  CHECK (marketing_status IN ('subscribed', 'unsubscribed', 'blocked'));

ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_source_check;
ALTER TABLE customers ADD CONSTRAINT customers_source_check
  CHECK (source IN ('import', 'csv', 'inquiry', 'whatsapp', 'manual'));

CREATE UNIQUE INDEX IF NOT EXISTS customers_phone_number_key ON customers (phone_number);
CREATE INDEX IF NOT EXISTS customers_city_idx ON customers (city);
CREATE INDEX IF NOT EXISTS customers_country_idx ON customers (country);
CREATE INDEX IF NOT EXISTS customers_last_purchase_date_idx ON customers (last_purchase_date);
CREATE INDEX IF NOT EXISTS customers_last_contacted_at_idx ON customers (last_contacted_at);
CREATE INDEX IF NOT EXISTS customers_created_at_idx ON customers (created_at);
CREATE INDEX IF NOT EXISTS customers_tags_gin_idx ON customers USING gin (tags);
CREATE INDEX IF NOT EXISTS customers_category_interest_gin_idx ON customers USING gin (category_interest);

CREATE OR REPLACE FUNCTION customers_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS customers_updated_at ON customers;
CREATE TRIGGER customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION customers_set_updated_at();

-- Deny-all RLS: no policies are created, so PostgREST/anon and authenticated
-- roles get zero rows/writes. The app never talks to Supabase from the
-- browser for this table — only the server-side service-role client in
-- app/api/[[...path]]/route.js (which bypasses RLS) reads/writes customers.
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
