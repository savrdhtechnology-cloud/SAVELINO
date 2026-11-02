-- ═══════════════════════════════════════════════════════════════════════════
--  006 — Customer accounts: sign-up profile, saved addresses, "my orders"
--  Safe to run once in Supabase → SQL Editor. Staff/CRM access is NOT affected:
--  customer sign-ups get role 'none' in public.profiles, exactly like any new user.
-- ═══════════════════════════════════════════════════════════════════════════

-- Customer profile (name + mobile + email) created automatically at sign-up.
create table if not exists public.customer_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  phone text not null default '',
  email text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Saved delivery addresses (one default per customer).
create table if not exists public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  label text not null default 'Home',
  name text not null,
  phone text not null,
  address text not null,
  city text not null,
  state text not null,
  pincode text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists customer_addresses_user_idx on public.customer_addresses (user_id);
create unique index if not exists customer_addresses_one_default on public.customer_addresses (user_id) where is_default;

alter table public.customer_profiles enable row level security;
alter table public.customer_addresses enable row level security;

drop policy if exists "cust profile: own" on public.customer_profiles;
create policy "cust profile: own" on public.customer_profiles for all to authenticated using (id = auth.uid()) with check (id = auth.uid());
drop policy if exists "cust profile: staff read" on public.customer_profiles;
create policy "cust profile: staff read" on public.customer_profiles for select to authenticated using (public.is_staff());
drop policy if exists "cust address: own" on public.customer_addresses;
create policy "cust address: own" on public.customer_addresses for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Orders remember who placed them (guest orders stay NULL).
alter table public.orders add column if not exists user_id uuid references auth.users (id) on delete set null;
create index if not exists orders_user_idx on public.orders (user_id, created_at desc);

-- New sign-ups: keep the staff profile (role 'none') AND create the customer profile from the sign-up form.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  insert into public.customer_profiles (id, full_name, phone, email)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''),
          regexp_replace(coalesce(new.raw_user_meta_data ->> 'phone', ''), '[^0-9+]', '', 'g'), coalesce(new.email, ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Existing users get a customer profile too.
insert into public.customer_profiles (id, full_name, email)
select id, coalesce(raw_user_meta_data ->> 'full_name', ''), coalesce(email, '') from auth.users
on conflict (id) do nothing;

-- The signed-in customer's own orders, WITHOUT staff-only columns (internal notes, costs).
create or replace function public.my_orders() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at desc), '[]'::jsonb) from (
    select o.order_no, o.created_at, o.status, o.payment_method, o.payment_status, o.tracking, o.preorder_state,
           o.items, o.subtotal, o.shipping, o.discount, o.total,
           o.customer_name, o.phone, o.address, o.city, o.state, o.pincode
    from public.orders o where o.user_id = auth.uid()
  ) t;
$$;
revoke all on function public.my_orders() from public, anon;
grant execute on function public.my_orders() to authenticated;

-- Checkout: orders placed while signed in are linked to the account.
create or replace function public.place_order(payload jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  c jsonb := coalesce(payload -> 'customer', '{}'::jsonb);
  v_name text := btrim(coalesce(c ->> 'name', ''));
  v_phone text := regexp_replace(coalesce(c ->> 'phone', ''), '[^0-9+]', '', 'g');
  v_email text := btrim(coalesce(c ->> 'email', ''));
  v_address text := btrim(coalesce(c ->> 'address', ''));
  v_city text := btrim(coalesce(c ->> 'city', ''));
  v_state text := btrim(coalesce(c ->> 'state', ''));
  v_pin text := btrim(coalesce(c ->> 'pincode', ''));
  v_notes text := left(btrim(coalesce(c ->> 'notes', '')), 500);
  v_method text := coalesce(payload ->> 'payment', 'cod');
  v_ref text := left(btrim(coalesce(payload ->> 'reference', '')), 40);
  s jsonb := coalesce((select data from public.settings where id = 1), '{}'::jsonb);
  v_fee int := coalesce((s #>> '{commerce,shippingFee}')::int, 0);
  v_free int := coalesce((s #>> '{commerce,freeShippingAbove}')::int, 0);
  v_cod boolean := coalesce((s #>> '{commerce,codEnabled}')::boolean, true);
  v_prefix text := coalesce(nullif(s #>> '{commerce,orderPrefix}', ''), 'SV');
  it jsonb;
  p public.products;
  v_qty int;
  v_size text;
  v_color text;
  v_items jsonb := '[]'::jsonb;
  v_sub int := 0;
  v_ship int;
  v_cust uuid;
  v_order uuid;
  v_no text;
  v_pre boolean;
  v_has_pre boolean := false;
  v_has_live boolean := false;
  v_pre_product uuid;
begin
  if length(v_name) < 2 or length(v_name) > 80 then raise exception 'Please enter your full name'; end if;
  if v_phone !~ '^\+?[0-9]{10,13}$' then raise exception 'Please enter a valid mobile number'; end if;
  if v_email <> '' and v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Please check your email'; end if;
  if length(v_address) < 5 or v_city = '' or v_state = '' then raise exception 'Please enter your full delivery address'; end if;
  if v_pin !~ '^[0-9]{6}$' then raise exception 'Please enter a 6-digit PIN code'; end if;
  if v_method not in ('cod', 'upi') then raise exception 'Choose a payment method'; end if;
  if v_method = 'cod' and not v_cod then raise exception 'Cash on delivery is not available'; end if;
  if jsonb_typeof(payload -> 'items') <> 'array' or jsonb_array_length(payload -> 'items') = 0 then raise exception 'Your bag is empty'; end if;
  if jsonb_array_length(payload -> 'items') > 20 then raise exception 'Too many items in one order'; end if;

  for it in select value from jsonb_array_elements(payload -> 'items') loop
    select * into p from public.products where id = (it ->> 'productId')::uuid and status in ('live', 'upcoming');
    if not found then raise exception 'A piece in your bag is no longer available'; end if;
    v_pre := p.status = 'upcoming';
    if v_pre then
      if v_has_live then raise exception 'Pre-order pieces must be ordered separately from ready pieces'; end if;
      if v_pre_product is not null and v_pre_product <> p.id then raise exception 'Please pre-order one design at a time'; end if;
      v_pre_product := p.id;
      v_has_pre := true;
    else
      if v_has_pre then raise exception 'Pre-order pieces must be ordered separately from ready pieces'; end if;
      v_has_live := true;
    end if;
    v_qty := least(10, greatest(1, coalesce((it ->> 'qty')::int, 1)));
    v_size := coalesce(it ->> 'size', '');
    v_color := coalesce(it ->> 'color', '');
    if jsonb_array_length(p.sizes) > 0 and not (p.sizes ? v_size) then raise exception 'Please choose a size for %', p.name; end if;
    if jsonb_array_length(p.colors) > 0 and not exists (select 1 from jsonb_array_elements(p.colors) x where x ->> 'name' = v_color) then
      raise exception 'Please choose a colour for %', p.name;
    end if;
    v_items := v_items || jsonb_build_object('productId', p.id, 'slug', p.slug, 'name', p.name || case when v_pre then ' (Pre-order)' else '' end,
                                             'price', p.price, 'size', v_size, 'color', v_color, 'qty', v_qty,
                                             'preorder', v_pre, 'expectedAt', case when v_pre then p.expected_at end);
    v_sub := v_sub + p.price * v_qty;
  end loop;

  v_ship := case when v_free > 0 and v_sub >= v_free then 0 else v_fee end;

  insert into public.customers (name, phone, email, city, state) values (v_name, v_phone, v_email, v_city, v_state)
  on conflict (phone) do update set name = excluded.name, email = coalesce(nullif(excluded.email, ''), customers.email),
    city = excluded.city, state = excluded.state
  returning id into v_cust;

  v_no := v_prefix || to_char(now() at time zone 'Asia/Kolkata', 'YYMMDD') || '-' || upper(substr(md5(gen_random_uuid()::text), 1, 6));

  insert into public.orders (order_no, customer_id, customer_name, phone, email, address, city, state, pincode, notes, items,
                             subtotal, shipping, total, payment_method, status, preorder_state, user_id)
  values (v_no, v_cust, v_name, v_phone, v_email, v_address, v_city, v_state, v_pin, v_notes, v_items,
          v_sub, v_ship, v_sub + v_ship, v_method, case when v_method = 'upi' and v_ref <> '' then 'payment_review' else 'new' end,
          case when v_has_pre then 'waiting' end, auth.uid())
  returning id into v_order;

  if v_method = 'cod' or v_ref <> '' then
    insert into public.payments (order_id, method, amount, reference) values (v_order, v_method, v_sub + v_ship, v_ref);
  end if;

  return jsonb_build_object('orderNo', v_no, 'total', v_sub + v_ship, 'preorder', v_has_pre);
end;
$$;
