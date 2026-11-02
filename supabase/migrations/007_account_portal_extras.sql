-- ═══════════════════════════════════════════════════════════════════════════
--  007 — Account portal extras: wishlist, saved measurements, returns & exchanges.
--  Builds on 006_customer_accounts.sql. Safe to run once in Supabase → SQL Editor.
-- ═══════════════════════════════════════════════════════════════════════════

-- Wishlist: one row per customer per product they've hearted.
create table if not exists public.customer_wishlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);
create index if not exists customer_wishlist_user_idx on public.customer_wishlist (user_id, created_at desc);

-- Saved measurements — a customer can keep a few named sets (e.g. "My usual", "For Mom").
create table if not exists public.customer_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  label text not null default 'My measurements',
  bust text not null default '',
  waist text not null default '',
  hip text not null default '',
  shoulder text not null default '',
  blouse_length text not null default '',
  sleeve_length text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists customer_measurements_user_idx on public.customer_measurements (user_id, created_at desc);

-- Return / exchange requests against a placed order.
create table if not exists public.order_returns (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  order_no text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  reason text not null,
  preference text not null check (preference in ('refund', 'replacement')),
  status text not null default 'requested'
    check (status in ('requested', 'approved', 'pickup_scheduled', 'in_transit', 'quality_check', 'refunded', 'replaced', 'rejected')),
  staff_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists order_returns_user_idx on public.order_returns (user_id, created_at desc);
create index if not exists order_returns_order_idx on public.order_returns (order_id);

alter table public.customer_wishlist enable row level security;
alter table public.customer_measurements enable row level security;
alter table public.order_returns enable row level security;

drop policy if exists "wishlist: own" on public.customer_wishlist;
create policy "wishlist: own" on public.customer_wishlist for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "measurements: own" on public.customer_measurements;
create policy "measurements: own" on public.customer_measurements for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "returns: own read" on public.order_returns;
create policy "returns: own read" on public.order_returns for select to authenticated using (user_id = auth.uid());
drop policy if exists "returns: staff all" on public.order_returns;
create policy "returns: staff all" on public.order_returns for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- Request a return/exchange for one of the signed-in customer's own orders. One open request per order.
create or replace function public.request_return(p_order_no text, p_reason text, p_preference text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_order public.orders;
  v_id uuid;
begin
  if p_preference not in ('refund', 'replacement') then raise exception 'Choose refund or replacement'; end if;
  if length(btrim(p_reason)) < 3 then raise exception 'Please tell us the reason for the return'; end if;
  select * into v_order from public.orders where order_no = p_order_no and user_id = auth.uid();
  if not found then raise exception 'Order not found'; end if;
  if v_order.status <> 'delivered' then raise exception 'Only delivered orders can be returned'; end if;
  if exists (select 1 from public.order_returns where order_id = v_order.id and status not in ('rejected')) then
    raise exception 'A return request already exists for this order';
  end if;
  insert into public.order_returns (order_id, order_no, user_id, reason, preference)
  values (v_order.id, v_order.order_no, auth.uid(), left(btrim(p_reason), 500), p_preference)
  returning id into v_id;
  return jsonb_build_object('id', v_id, 'status', 'requested');
end;
$$;
revoke all on function public.request_return(text, text, text) from public, anon;
grant execute on function public.request_return(text, text, text) to authenticated;

-- The signed-in customer's own return requests.
create or replace function public.my_returns() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at desc), '[]'::jsonb) from (
    select id, order_no, reason, preference, status, created_at, updated_at from public.order_returns where user_id = auth.uid()
  ) t;
$$;
revoke all on function public.my_returns() from public, anon;
grant execute on function public.my_returns() to authenticated;
