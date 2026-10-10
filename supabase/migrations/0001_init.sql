-- SAVLINO — initial schema for Customer Portal, Partner Portal and Admin CRM.
-- Every table has Row Level Security enabled. Customers and partners only
-- ever see their own rows; admins are resolved from profiles.role.

create extension if not exists "pgcrypto";

-- ───────────────────────────── Enums ─────────────────────────────
create type public.user_role as enum ('customer', 'partner', 'admin');
create type public.order_status as enum (
  'pending_payment', 'payment_review', 'confirmed', 'in_production',
  'shipped', 'delivered', 'cancelled', 'returned'
);
create type public.payment_status as enum ('pending', 'verified', 'rejected', 'refunded');
create type public.partner_status as enum ('pending', 'approved', 'suspended');
create type public.commission_status as enum ('pending', 'approved', 'paid', 'rejected');
create type public.payout_status as enum ('scheduled', 'paid', 'failed');
create type public.shipment_status as enum ('label_created', 'in_transit', 'out_for_delivery', 'delivered', 'exception');
create type public.return_type as enum ('return', 'exchange');
create type public.return_status as enum ('requested', 'approved', 'received', 'refunded', 'exchanged', 'rejected');

-- ───────────────────────────── Profiles ─────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  phone text,
  role public.user_role not null default 'customer',
  measurements jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- ───────────────────────────── Catalogue ─────────────────────────────
create table public.collections (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  sort_order int not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid references public.collections (id) on delete set null,
  slug text not null unique,
  name text not null,
  description text,
  price numeric(12, 2) not null check (price >= 0),
  is_custom_stitchable boolean not null default false,
  is_active boolean not null default false,
  media jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  sku text not null unique,
  size text,
  color text,
  created_at timestamptz not null default now()
);

create table public.inventory (
  variant_id uuid primary key references public.product_variants (id) on delete cascade,
  quantity int not null default 0 check (quantity >= 0),
  updated_at timestamptz not null default now()
);

-- ───────────────────────────── Customers ─────────────────────────────
create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  label text,
  full_name text not null,
  phone text not null,
  line1 text not null,
  line2 text,
  city text not null,
  state text not null,
  postal_code text not null,
  country text not null default 'IN',
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

-- ───────────────────────────── Partners ─────────────────────────────
create table public.partners (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  business_name text,
  referral_code text unique,
  status public.partner_status not null default 'pending',
  commission_rate numeric(5, 2) check (commission_rate between 0 and 100),
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

-- ───────────────────────────── Orders ─────────────────────────────
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default ('SV-' || to_char(now(), 'YYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 6)),
  user_id uuid not null references auth.users (id) on delete restrict,
  partner_id uuid references public.partners (id) on delete set null,
  status public.order_status not null default 'pending_payment',
  subtotal_amount numeric(12, 2) not null default 0,
  shipping_amount numeric(12, 2) not null default 0,
  total_amount numeric(12, 2) not null default 0,
  shipping_address jsonb not null,
  custom_measurements jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  variant_id uuid references public.product_variants (id) on delete set null,
  product_name text not null,
  size text,
  quantity int not null check (quantity > 0),
  unit_price numeric(12, 2) not null
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  method text not null,
  provider_reference text,
  amount numeric(12, 2) not null,
  status public.payment_status not null default 'pending',
  verified_by uuid references auth.users (id),
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  carrier text,
  tracking_number text,
  status public.shipment_status not null default 'label_created',
  shipped_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.return_requests (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  type public.return_type not null,
  reason text not null,
  status public.return_status not null default 'requested',
  created_at timestamptz not null default now()
);

create table public.commissions (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners (id) on delete cascade,
  order_id uuid not null unique references public.orders (id) on delete cascade,
  amount numeric(12, 2) not null check (amount >= 0),
  status public.commission_status not null default 'pending',
  created_at timestamptz not null default now()
);

create table public.payouts (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners (id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  reference text,
  status public.payout_status not null default 'scheduled',
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.content_blocks (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  title text,
  body jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ───────────────────────────── Views (security_invoker → RLS applies) ─────────────────────────────
create view public.wishlist_items_view with (security_invoker = true) as
  select w.id, w.user_id, w.created_at, p.name as product_name, c.name as collection_name
  from public.wishlist_items w
  join public.products p on p.id = w.product_id
  left join public.collections c on c.id = p.collection_id;

-- Partners must not read the orders table directly (it holds customer addresses).
-- This view runs with the owner's rights and exposes only non-personal columns,
-- filtered to the calling partner's own approved record.
create view public.partner_referred_orders_view as
  select o.id, o.partner_id, o.order_number, o.created_at, o.status as order_status, o.total_amount as order_total
  from public.orders o
  join public.partners p on p.id = o.partner_id
  where p.user_id = auth.uid() and p.status = 'approved';

create view public.inventory_view with (security_invoker = true) as
  select v.id, v.sku, v.size, p.name as product_name, coalesce(i.quantity, 0) as quantity
  from public.product_variants v
  join public.products p on p.id = v.product_id
  left join public.inventory i on i.variant_id = v.id;

create view public.admin_sales_daily_view with (security_invoker = true) as
  select date_trunc('day', created_at)::date as day, count(*) as orders, sum(total_amount) as revenue
  from public.orders
  where status not in ('cancelled', 'pending_payment')
  group by 1;

-- ───────────────────────────── Row Level Security ─────────────────────────────
alter table public.profiles enable row level security;
alter table public.collections enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.inventory enable row level security;
alter table public.addresses enable row level security;
alter table public.wishlist_items enable row level security;
alter table public.partners enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.shipments enable row level security;
alter table public.return_requests enable row level security;
alter table public.commissions enable row level security;
alter table public.payouts enable row level security;
alter table public.content_blocks enable row level security;

-- Profiles: own row (role cannot be self-escalated — see trigger below), admins all.
create policy "profiles: read own" on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "profiles: update own" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles: admin manage" on public.profiles for all using (public.is_admin()) with check (public.is_admin());

-- Public catalogue.
create policy "collections: public read" on public.collections for select using (is_published or public.is_admin());
create policy "collections: admin manage" on public.collections for all using (public.is_admin()) with check (public.is_admin());
create policy "products: public read" on public.products for select using (is_active or public.is_admin());
create policy "products: admin manage" on public.products for all using (public.is_admin()) with check (public.is_admin());
create policy "variants: public read" on public.product_variants for select using (true);
create policy "variants: admin manage" on public.product_variants for all using (public.is_admin()) with check (public.is_admin());
create policy "inventory: admin only" on public.inventory for all using (public.is_admin()) with check (public.is_admin());
create policy "content: public read" on public.content_blocks for select using (true);
create policy "content: admin manage" on public.content_blocks for all using (public.is_admin()) with check (public.is_admin());

-- Customer-owned data.
create policy "addresses: own" on public.addresses for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "addresses: admin read" on public.addresses for select using (public.is_admin());
create policy "wishlist: own" on public.wishlist_items for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "orders: read own" on public.orders for select using (user_id = auth.uid() or public.is_admin());
create policy "orders: admin manage" on public.orders for all using (public.is_admin()) with check (public.is_admin());
create policy "order items: read own" on public.order_items for select using (
  exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_admin()))
);
create policy "order items: admin manage" on public.order_items for all using (public.is_admin()) with check (public.is_admin());
create policy "payments: read own" on public.payments for select using (
  exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()) or public.is_admin()
);
create policy "payments: admin verify" on public.payments for all using (public.is_admin()) with check (public.is_admin());
create policy "shipments: read own" on public.shipments for select using (user_id = auth.uid() or public.is_admin());
create policy "shipments: admin manage" on public.shipments for all using (public.is_admin()) with check (public.is_admin());
create policy "returns: read own" on public.return_requests for select using (user_id = auth.uid() or public.is_admin());
create policy "returns: create own" on public.return_requests for insert with check (
  user_id = auth.uid() and exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
);
create policy "returns: admin manage" on public.return_requests for all using (public.is_admin()) with check (public.is_admin());

-- Partner data: partners see only their own record, referred orders and money.
create policy "partners: read own" on public.partners for select using (user_id = auth.uid() or public.is_admin());
create policy "partners: admin manage" on public.partners for all using (public.is_admin()) with check (public.is_admin());
create policy "commissions: partner reads own" on public.commissions for select using (
  exists (select 1 from public.partners p where p.id = partner_id and p.user_id = auth.uid()) or public.is_admin()
);
create policy "commissions: admin manage" on public.commissions for all using (public.is_admin()) with check (public.is_admin());
create policy "payouts: partner reads own" on public.payouts for select using (
  exists (select 1 from public.partners p where p.id = partner_id and p.user_id = auth.uid()) or public.is_admin()
);
create policy "payouts: admin manage" on public.payouts for all using (public.is_admin()) with check (public.is_admin());

-- ───────────────────────────── Triggers ─────────────────────────────
-- New auth users get a customer profile. A partner sign-up only creates a
-- *pending* application; the partner role is granted by an admin on approval.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (new.id, new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'phone');

  if (new.raw_user_meta_data ->> 'signup_intent') = 'partner' then
    insert into public.partners (user_id, business_name)
    values (new.id, nullif(new.raw_user_meta_data ->> 'business_name', ''));
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Prevent users from changing their own role.
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Only administrators can change roles';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_protect_role
  before update on public.profiles
  for each row execute function public.protect_profile_role();

-- Approving a partner issues a referral code and grants the partner role.
create or replace function public.on_partner_approved()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'approved' and old.status is distinct from 'approved' then
    new.approved_at := coalesce(new.approved_at, now());
    if new.referral_code is null then
      new.referral_code := 'SAV' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 7));
    end if;
    update public.profiles set role = 'partner' where id = new.user_id and role = 'customer';
  end if;
  return new;
end;
$$;

create trigger partners_on_approved
  before update on public.partners
  for each row execute function public.on_partner_approved();
