create table if not exists slider_images (
  id uuid primary key default gen_random_uuid(),
  category text not null default '',
  headline text not null default '',
  image_url text not null default '',
  badge_icons text[] not null default array[]::text[],
  badge_labels text[] not null default array[]::text[],
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table products add column if not exists price numeric;
alter table products add column if not exists original_price numeric;
alter table products add column if not exists discount_percent integer default 0;
alter table products add column if not exists category_id text;
alter table products add column if not exists is_active boolean default true;
alter table products add column if not exists gallery_images text[] default array[]::text[];
alter table products add column if not exists sizes text[] default array[]::text[];
alter table products add column if not exists colors text[] default array[]::text[];

alter table categories add column if not exists image_url text;
alter table categories add column if not exists sort_order integer default 0;

alter table offers add column if not exists code text;
alter table offers add column if not exists discount_percent integer default 0;
alter table offers add column if not exists is_active boolean default true;

alter table reviews add column if not exists comment text;
alter table reviews add column if not exists is_approved boolean default true;
alter table reviews add column if not exists product_id uuid;
alter table reviews add column if not exists category text;

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text unique not null,
  subscription jsonb not null,
  created_at timestamptz not null default now()
);

alter table slider_images enable row level security;
alter table push_subscriptions enable row level security;

drop policy if exists "Public can read active slider images" on slider_images;
create policy "Public can read active slider images"
on slider_images for select
using (is_active = true);

drop policy if exists "Anon can manage slider images" on slider_images;
create policy "Anon can manage slider images"
on slider_images for all
using (true)
with check (true);

drop policy if exists "Public can subscribe to push" on push_subscriptions;
create policy "Public can subscribe to push"
on push_subscriptions for insert
with check (true);

drop policy if exists "Anon can manage push subscriptions" on push_subscriptions;
create policy "Anon can manage push subscriptions"
on push_subscriptions for all
using (true)
with check (true);

insert into slider_images (category, headline, image_url, badge_icons, badge_labels, sort_order, is_active)
values
('LUGGAGE', 'Travel
Beyond', 'https://images.unsplash.com/photo-1565026057447-bc90a3dceb87?auto=format&fit=crop&w=1000&q=90', array['truck','shield','refresh'], array['Free Delivery','10 Year Warranty','Easy Returns'], 1, true),
('HANDBAGS', 'Elegance
Everyday', 'https://images.unsplash.com/photo-1594223274512-ad4803739b7c?auto=format&fit=crop&w=1000&q=90', array['sparkles','lock','heart'], array['Premium Quality','Secure Checkout','Timeless Design'], 2, true),
('SCHOOL BAGS', 'Ready
For More', 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1000&q=90', array['briefcase','shield','umbrella'], array['Spacious Storage','Durable Build','Water Resistant'], 3, true)
on conflict (id) do nothing;
