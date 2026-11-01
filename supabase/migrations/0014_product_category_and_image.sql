-- Products carry the website category they belong to (matches CRM → Categories slugs)
-- and a photo URL, so live products can be listed on each category page.
alter table public.products
  add column if not exists category text,
  add column if not exists image_url text;

-- Backfill from the linked collection where one exists.
update public.products p
set category = c.slug
from public.collections c
where p.collection_id = c.id and p.category is null;

alter table public.products drop constraint if exists products_category_format;
alter table public.products
  add constraint products_category_format check (category is null or category ~ '^[a-z0-9]+(-[a-z0-9]+)*$');

create index if not exists products_live_category_idx on public.products (category, created_at desc) where is_active;
