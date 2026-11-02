-- Rolls back 006. (place_order stays as in 005 once re-run from that migration.)
drop function if exists public.my_orders();
drop table if exists public.customer_addresses;
drop table if exists public.customer_profiles;
alter table public.orders drop column if exists user_id;
