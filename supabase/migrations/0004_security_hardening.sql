-- Resolves Supabase security-advisor findings. Contains a DROP VIEW (recreated
-- immediately), so Supabase asks for confirmation before applying it.

-- Trigger functions are never called directly through the API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.on_partner_approved() from public, anon, authenticated;
revoke execute on function public.protect_profile_role() from public, anon, authenticated;

-- Partner referred orders: owner-rights logic moves into a private, non-exposed
-- schema and the public view becomes security_invoker.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.partner_referred_orders()
returns table (id uuid, partner_id uuid, order_number text, created_at timestamptz, order_status public.order_status, order_total numeric)
language sql
stable
security definer
set search_path = public
as $$
  select o.id, o.partner_id, o.order_number, o.created_at, o.status, o.total_amount
  from public.orders o
  join public.partners p on p.id = o.partner_id
  where p.user_id = auth.uid() and p.status = 'approved';
$$;

revoke all on function private.partner_referred_orders() from public, anon;
grant execute on function private.partner_referred_orders() to authenticated;

drop view if exists public.partner_referred_orders_view;
create view public.partner_referred_orders_view with (security_invoker = true) as
  select * from private.partner_referred_orders();

revoke all on public.partner_referred_orders_view from anon;
grant select on public.partner_referred_orders_view to authenticated;
