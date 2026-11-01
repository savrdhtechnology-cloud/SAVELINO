-- SAVLINO · Creative Studio (run once if schema.sql was run before 01-11-2026)
alter table public.product_images add column if not exists kind text not null default 'photo';
alter table public.product_images drop constraint if exists product_images_kind_check;
alter table public.product_images add constraint product_images_kind_check check (kind in ('photo', 'creative'));
alter table public.products add column if not exists creative jsonb not null default '{}'::jsonb;
notify pgrst, 'reload schema';
