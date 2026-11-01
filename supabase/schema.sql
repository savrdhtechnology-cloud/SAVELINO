-- ═══════════════════════════════════════════════════════════════════════════
--  SAVLINO Commerce — complete database (Supabase / Postgres 15+)
--  Run ONCE in Supabase → SQL Editor on an empty project.
--  Website + CRM: settings, categories, products, photos, customers, orders,
--  payments, contact messages. Row Level Security on every table.
-- ═══════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ───────────────────────── Staff (CRM users) ─────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text not null default '',
  role text not null default 'none' check (role in ('none', 'staff', 'admin')),
  created_at timestamptz not null default now()
);

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('staff', 'admin'));
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- Every new auth user gets a profile with NO access; an admin grants 'staff' or 'admin'.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Users created before this script ran also get a profile.
insert into public.profiles (id, email)
select id, email from auth.users
on conflict (id) do nothing;

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ───────────────────────── Website settings (one row) ─────────────────────────
create table public.settings (
  id int primary key default 1 check (id = 1),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ───────────────────────── Catalogue ─────────────────────────
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  kicker text not null default '',
  description text not null default '',
  image_url text not null default '',
  is_visible boolean not null default false,
  is_featured boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  sku text unique,
  name text not null check (length(name) between 1 and 120),
  category_id uuid references public.categories (id) on delete set null,
  subtitle text not null default '',
  description text not null default '',
  price int not null default 0 check (price >= 0),
  compare_at_price int check (compare_at_price is null or compare_at_price >= 0),
  colors jsonb not null default '[]'::jsonb,
  sizes jsonb not null default '[]'::jsonb,
  features jsonb not null default '[]'::jsonb,
  stock int not null default 0 check (stock >= 0),
  status text not null default 'draft' check (status in ('draft', 'live', 'archived')),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint live_needs_price check (status <> 'live' or price > 0)
);
create index products_live_idx on public.products (category_id, sort_order, created_at desc) where status = 'live';
create trigger products_touch before update on public.products for each row execute function public.touch_updated_at();

-- Photos: url is a Supabase Storage public URL (bucket "media") or a site path like /seed/x.webp.
-- position 0 = main photo, 1–2 = side angles, 3–6 = detail shots (the website builds the creative from them).
create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  url text not null,
  storage_path text,
  position int not null default 0,
  width int,
  height int,
  created_at timestamptz not null default now()
);
create index product_images_idx on public.product_images (product_id, position);

-- ───────────────────────── Customers, orders, payments ─────────────────────────
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null unique,
  email text not null default '',
  city text not null default '',
  state text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_no text not null unique,
  customer_id uuid references public.customers (id) on delete set null,
  customer_name text not null,
  phone text not null,
  email text not null default '',
  address text not null,
  city text not null,
  state text not null,
  pincode text not null,
  notes text not null default '',
  items jsonb not null,
  subtotal int not null,
  shipping int not null default 0,
  discount int not null default 0,
  total int not null,
  payment_method text not null check (payment_method in ('cod', 'upi')),
  payment_status text not null default 'pending' check (payment_status in ('pending', 'verified', 'rejected', 'refunded')),
  status text not null default 'new'
    check (status in ('new', 'payment_review', 'processing', 'stitching', 'qc', 'shipped', 'delivered', 'cancelled')),
  tracking text not null default '',
  internal_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_created_idx on public.orders (created_at desc);
create index orders_status_idx on public.orders (status);
create trigger orders_touch before update on public.orders for each row execute function public.touch_updated_at();

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  method text not null check (method in ('upi', 'cod', 'bank', 'card', 'cash')),
  amount int not null check (amount >= 0),
  reference text not null default '',
  status text not null default 'pending' check (status in ('pending', 'verified', 'rejected', 'refunded')),
  note text not null default '',
  verified_by uuid references auth.users (id) on delete set null,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);
create index payments_order_idx on public.payments (order_id);
create index payments_status_idx on public.payments (status, created_at desc);

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 120),
  email text not null default '',
  phone text not null default '',
  topic text not null default '',
  message text not null check (length(message) between 1 and 4000),
  handled boolean not null default false,
  created_at timestamptz not null default now()
);

-- ───────────────────────── Checkout (runs as the database, prices from the catalogue) ─────────────────────────
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
    select * into p from public.products where id = (it ->> 'productId')::uuid and status = 'live';
    if not found then raise exception 'A piece in your bag is no longer available'; end if;
    v_qty := least(10, greatest(1, coalesce((it ->> 'qty')::int, 1)));
    v_size := coalesce(it ->> 'size', '');
    v_color := coalesce(it ->> 'color', '');
    if jsonb_array_length(p.sizes) > 0 and not (p.sizes ? v_size) then raise exception 'Please choose a size for %', p.name; end if;
    if jsonb_array_length(p.colors) > 0 and not exists (select 1 from jsonb_array_elements(p.colors) x where x ->> 'name' = v_color) then
      raise exception 'Please choose a colour for %', p.name;
    end if;
    v_items := v_items || jsonb_build_object('productId', p.id, 'slug', p.slug, 'name', p.name, 'price', p.price, 'size', v_size, 'color', v_color, 'qty', v_qty);
    v_sub := v_sub + p.price * v_qty;
  end loop;

  v_ship := case when v_free > 0 and v_sub >= v_free then 0 else v_fee end;

  insert into public.customers (name, phone, email, city, state) values (v_name, v_phone, v_email, v_city, v_state)
  on conflict (phone) do update set name = excluded.name, email = coalesce(nullif(excluded.email, ''), customers.email),
    city = excluded.city, state = excluded.state
  returning id into v_cust;

  v_no := v_prefix || to_char(now() at time zone 'Asia/Kolkata', 'YYMMDD') || '-' || upper(substr(md5(gen_random_uuid()::text), 1, 6));

  insert into public.orders (order_no, customer_id, customer_name, phone, email, address, city, state, pincode, notes, items,
                             subtotal, shipping, total, payment_method, status)
  values (v_no, v_cust, v_name, v_phone, v_email, v_address, v_city, v_state, v_pin, v_notes, v_items,
          v_sub, v_ship, v_sub + v_ship, v_method, case when v_method = 'upi' and v_ref <> '' then 'payment_review' else 'new' end)
  returning id into v_order;

  if v_method = 'cod' or v_ref <> '' then
    insert into public.payments (order_id, method, amount, reference) values (v_order, v_method, v_sub + v_ship, v_ref);
  end if;

  return jsonb_build_object('orderNo', v_no, 'total', v_sub + v_ship);
end;
$$;

-- After paying by UPI, the customer submits the UTR / reference for verification.
create or replace function public.submit_payment_reference(p_order_no text, p_phone text, p_reference text) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  o public.orders;
  v_ref text := left(btrim(coalesce(p_reference, '')), 40);
begin
  if length(v_ref) < 6 then raise exception 'Please enter the UTR / reference number'; end if;
  select * into o from public.orders
   where order_no = p_order_no and phone = regexp_replace(coalesce(p_phone, ''), '[^0-9+]', '', 'g') and payment_method = 'upi';
  if not found then raise exception 'Order not found'; end if;
  if exists (select 1 from public.payments where order_id = o.id and status in ('pending', 'verified')) then return true; end if;
  insert into public.payments (order_id, method, amount, reference) values (o.id, 'upi', o.total, v_ref);
  update public.orders set status = 'payment_review' where id = o.id and status = 'new';
  return true;
end;
$$;

-- Staff: verify or reject a payment (keeps the order in step).
create or replace function public.review_payment(p_payment uuid, p_verified boolean, p_note text default '') returns boolean
language plpgsql security definer set search_path = public as $$
declare
  pay public.payments;
begin
  if not public.is_staff() then raise exception 'Not allowed'; end if;
  update public.payments set status = case when p_verified then 'verified' else 'rejected' end,
         note = coalesce(p_note, ''), verified_by = auth.uid(), verified_at = now()
   where id = p_payment returning * into pay;
  if not found then raise exception 'Payment not found'; end if;
  update public.orders set payment_status = case when p_verified then 'verified' else 'rejected' end,
         status = case when p_verified and status in ('new', 'payment_review') then 'processing' else status end
   where id = pay.order_id;
  return true;
end;
$$;

revoke all on function public.place_order(jsonb) from public;
revoke all on function public.submit_payment_reference(text, text, text) from public;
revoke all on function public.review_payment(uuid, boolean, text) from public;
grant execute on function public.place_order(jsonb) to anon, authenticated;
grant execute on function public.submit_payment_reference(text, text, text) to anon, authenticated;
grant execute on function public.review_payment(uuid, boolean, text) to authenticated;
grant execute on function public.is_staff() to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;

-- ───────────────────────── Row Level Security ─────────────────────────
alter table public.profiles enable row level security;
alter table public.settings enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.payments enable row level security;
alter table public.contact_messages enable row level security;

create policy "profiles: own or staff read" on public.profiles for select to authenticated using (id = auth.uid() or public.is_staff());
create policy "profiles: admin manage" on public.profiles for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "settings: public read" on public.settings for select using (true);
create policy "settings: admin write" on public.settings for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "categories: public read visible" on public.categories for select using (is_visible or public.is_staff());
create policy "categories: staff write" on public.categories for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "products: public read live" on public.products for select using (status = 'live' or public.is_staff());
create policy "products: staff write" on public.products for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "images: public read live" on public.product_images for select
  using (public.is_staff() or exists (select 1 from public.products p where p.id = product_id and p.status = 'live'));
create policy "images: staff write" on public.product_images for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "customers: staff" on public.customers for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "orders: staff" on public.orders for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "payments: staff" on public.payments for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "messages: anyone can write" on public.contact_messages for insert with check (handled = false);
create policy "messages: staff manage" on public.contact_messages for all to authenticated using (public.is_staff()) with check (public.is_staff());

grant usage on schema public to anon, authenticated;
grant select on public.settings, public.categories, public.products, public.product_images to anon, authenticated;
grant insert on public.contact_messages to anon, authenticated;
grant select, insert, update, delete on public.categories, public.products, public.product_images, public.customers,
  public.orders, public.payments, public.contact_messages, public.settings to authenticated;
grant select, update on public.profiles to authenticated;

-- ───────────────────────── Photo storage (bucket "media", public read, staff upload) ─────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 8388608, array['image/webp', 'image/jpeg', 'image/png', 'image/avif'])
on conflict (id) do update set public = true;

create policy "media: public read" on storage.objects for select using (bucket_id = 'media');
create policy "media: staff upload" on storage.objects for insert to authenticated with check (bucket_id = 'media' and public.is_staff());
create policy "media: staff update" on storage.objects for update to authenticated using (bucket_id = 'media' and public.is_staff());
create policy "media: staff delete" on storage.objects for delete to authenticated using (bucket_id = 'media' and public.is_staff());

-- ───────────────────────── Starting data ─────────────────────────
insert into public.settings (id, data) values (1, jsonb_build_object(
  'commerce', jsonb_build_object('currency', 'INR', 'shippingFee', 0, 'freeShippingAbove', 0, 'taxPercent', 0, 'orderPrefix', 'SV',
                                 'codEnabled', true, 'returnWindowDays', 7, 'upiId', '', 'upiName', 'SAVLINO')
)) on conflict (id) do nothing;

insert into public.categories (slug, name, kicker, is_visible, is_featured, sort_order) values
  ('designer-blouses', 'Designer Blouses', 'The signature of SAVLINO', true, true, 1),
  ('ready-made-blouses', 'Ready-Made Blouses', 'Standard sizes, couture finish', true, false, 2),
  ('sarees', 'Sarees', 'Six yards of legacy', true, true, 3),
  ('salwar-suits', 'Salwar Suits', 'Regal ease', false, false, 4),
  ('shapewear', 'Shapewear', 'The foundation of every drape', false, false, 5),
  ('lingerie', 'Lingerie', 'Quiet indulgence', false, false, 6),
  ('loungewear', 'Loungewear', 'Luxury, at rest', false, false, 7)
on conflict (slug) do nothing;

with c as (select id from public.categories where slug = 'designer-blouses'),
p as (
  insert into public.products (slug, name, category_id, subtitle, description, colors, sizes, features, status, sort_order)
  select v.slug, v.name, c.id, v.subtitle, v.description, v.colors::jsonb, '["S","M","L","XL","XXL"]'::jsonb, v.features::jsonb, 'draft', v.ord
  from c, (values
    ('rani-pink-pearl-scallop-blouse', 'Rani Pink Pearl Scallop Blouse', 'Designer blouse with pearl-scallop sleeves',
     'A sweetheart V front, a deep U back finished with a knotted dori and tassel, and hand-set pearl scallops along the sleeves.',
     '[{"name":"Rani Pink","hex":"#D6246E"},{"name":"Teal Blue","hex":"#1C7FA6"},{"name":"Mustard","hex":"#F2A900"},{"name":"Coral","hex":"#F0663A"},{"name":"Bottle Green","hex":"#1F7A3A"}]',
     '["Premium Fabric","Smooth Texture","Fine Stitching","Perfect Fit"]', 0),
    ('mirror-work-multicolour-blouse', 'Mirror Work Multicolour Blouse', 'Festive print with mirror work and tassel tie',
     'Joyful floral and geometric print lit up with mirror work, a V front and an open back held by a dori with mirror-tassel drops.',
     '[{"name":"Rani Pink","hex":"#D6246E"},{"name":"Teal Blue","hex":"#1C7FA6"},{"name":"Mustard","hex":"#F2A900"},{"name":"Coral","hex":"#F0663A"},{"name":"Bottle Green","hex":"#1F7A3A"}]',
     '["Premium Fabric","Mirror Work","Fine Stitching","Perfect Fit"]', 1),
    ('peacock-blue-gold-tassel-blouse', 'Peacock Blue Gold Tassel Blouse', 'Modern design with an elegant back style',
     'Rich peacock-blue silk with broad straps, gold bead-tassel shoulder detail and a deep back tied with a twisted gold cord.',
     '[{"name":"Peacock Blue","hex":"#0F4C81"},{"name":"Maroon","hex":"#7A1F2B"},{"name":"Emerald","hex":"#1E5E3A"},{"name":"Black","hex":"#141414"},{"name":"Champagne","hex":"#E8D9B5"}]',
     '["Premium Fabric","Fine Stitching","Perfect Fit"]', 2)
  ) as v(slug, name, subtitle, description, colors, features, ord)
  on conflict (slug) do nothing
  returning id, slug
)
insert into public.product_images (product_id, url, position, width, height)
select p.id, '/seed/' || p.slug || '.webp', 0, 1536, 1024 from p;
