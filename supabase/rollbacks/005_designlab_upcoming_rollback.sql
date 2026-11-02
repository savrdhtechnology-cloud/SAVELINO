-- Rollback for 005_designlab_upcoming.sql.
-- Run only when no product is 'upcoming' and no pre-order is waiting (move/cancel them first).
update public.products set status = 'draft' where status = 'upcoming';
drop function if exists public.designlab_set_listing(uuid, text, int, date);
-- restore the 004 version of the stock function and the 003 stock trigger / original checkout
-- (re-run the relevant create-or-replace blocks from 004_designlab.sql, 003_inventory_pricing.sql and schema.sql)
alter table public.orders drop column if exists preorder_state;
alter table public.products drop constraint if exists products_status_check;
alter table public.products add constraint products_status_check check (status in ('draft', 'live', 'archived'));
alter table public.products drop constraint if exists live_needs_price;
alter table public.products add constraint live_needs_price check (status <> 'live' or price > 0);
drop policy if exists "products: public read live" on public.products;
create policy "products: public read live" on public.products for select using (status = 'live' or public.is_staff());
drop policy if exists "images: public read live" on public.product_images;
create policy "images: public read live" on public.product_images for select
  using (public.is_staff() or exists (select 1 from public.products p where p.id = product_id and p.status = 'live'));
alter table public.products drop column if exists preorder_qty;
alter table public.products drop column if exists expected_at;
delete from public.designlab_size_templates where size_label in ('S', 'M', 'L', 'XL');
notify pgrst, 'reload schema';
