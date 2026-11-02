-- ═══════════════════════════════════════════════════════════════════════════
--  SAVLINO · DesignLab part 2 — S/M/L/XL starter sizes, Upcoming listing, Pre-orders
--  Run ONCE in Supabase → SQL Editor, AFTER 004_designlab.sql. Safe to re-run.
--  Rollback: supabase/rollbacks/005_designlab_upcoming_rollback.sql
--
--  • Adds an "upcoming" product status. Upcoming pieces are visible on the website and can be
--    PRE-ORDERED, but never touch stock. Existing "live" behaviour is unchanged.
--  • Pre-orders wait in a queue (products.preorder_qty). When DesignLab posts QC-accepted pieces,
--    the oldest waiting pre-orders are covered first; only the remainder goes to sellable stock.
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────── Products: upcoming status ─────────────────────────
alter table public.products add column if not exists expected_at date;
alter table public.products add column if not exists preorder_qty int not null default 0 check (preorder_qty >= 0);

alter table public.products drop constraint if exists products_status_check;
alter table public.products add constraint products_status_check check (status in ('draft', 'live', 'archived', 'upcoming'));
alter table public.products drop constraint if exists live_needs_price;
alter table public.products add constraint live_needs_price check (status not in ('live', 'upcoming') or price > 0);

drop policy if exists "products: public read live" on public.products;
create policy "products: public read live" on public.products for select using (status in ('live', 'upcoming') or public.is_staff());
drop policy if exists "images: public read live" on public.product_images;
create policy "images: public read live" on public.product_images for select
  using (public.is_staff() or exists (select 1 from public.products p where p.id = product_id and p.status in ('live', 'upcoming')));

create index if not exists products_upcoming_idx on public.products (sort_order, created_at desc) where status = 'upcoming';

-- ───────────────────────── Orders: pre-order queue state ─────────────────────────
alter table public.orders add column if not exists preorder_state text check (preorder_state in ('waiting', 'covered'));
create index if not exists orders_preorder_idx on public.orders (created_at) where preorder_state = 'waiting';

-- ───────────────────────── Checkout: live pieces OR one upcoming design (pre-order) ─────────────────────────
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
                             subtotal, shipping, total, payment_method, status, preorder_state)
  values (v_no, v_cust, v_name, v_phone, v_email, v_address, v_city, v_state, v_pin, v_notes, v_items,
          v_sub, v_ship, v_sub + v_ship, v_method, case when v_method = 'upi' and v_ref <> '' then 'payment_review' else 'new' end,
          case when v_has_pre then 'waiting' end)
  returning id into v_order;

  if v_method = 'cod' or v_ref <> '' then
    insert into public.payments (order_id, method, amount, reference) values (v_order, v_method, v_sub + v_ship, v_ref);
  end if;

  return jsonb_build_object('orderNo', v_no, 'total', v_sub + v_ship, 'preorder', v_has_pre);
end;
$$;

-- ───────────────────────── Stock: waiting pre-orders join a queue instead of taking stock ─────────────────────────
create or replace function public.order_stock() returns trigger
language plpgsql security definer set search_path = public as $$
declare it jsonb; v_sign int; v_qty int;
begin
  if tg_op = 'INSERT' then
    v_sign := -1;
  elsif new.status = 'cancelled' and old.status <> 'cancelled' then
    v_sign := 1;
  elsif old.status = 'cancelled' and new.status <> 'cancelled' then
    v_sign := -1;
  else
    return new;
  end if;

  if new.preorder_state = 'waiting' then
    -- Not yet made: no stock moves, only the queue of pieces still to be covered.
    for it in select * from jsonb_array_elements(coalesce(new.items, '[]'::jsonb)) loop
      v_qty := greatest(0, coalesce((it ->> 'qty')::int, 0));
      update products set preorder_qty = greatest(0, preorder_qty - v_sign * v_qty) where id = (it ->> 'productId')::uuid;
    end loop;
    return new;
  end if;

  perform set_config('savlino.reason', case when v_sign < 0 then 'order ' else 'cancelled ' end || new.order_no, true);
  for it in select * from jsonb_array_elements(coalesce(new.items, '[]'::jsonb)) loop
    update products set stock = greatest(0, stock + v_sign * greatest(0, coalesce((it ->> 'qty')::int, 0)))
    where id = (it ->> 'productId')::uuid;
  end loop;
  perform set_config('savlino.reason', '', true);
  return new;
end;
$$;

-- ───────────────────────── DesignLab: finished pieces cover waiting pre-orders first (oldest first) ─────────────────────────
create or replace function public.designlab_post_finished_stock(p_order uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  o designlab_tailor_orders; d designlab_designs; v_qty int; v_sizes text; v_reason text;
  v_left int; v_covered int := 0; v_covered_orders int := 0; r record;
begin
  if not is_staff() then raise exception 'Staff access only'; end if;
  perform set_config('savlino.dl_rpc', '1', true);
  select * into o from designlab_tailor_orders where id = p_order for update;
  if o.id is null then raise exception 'Order not found'; end if;
  if o.status <> 'completed' then raise exception 'Only a completed (QC-passed) order can add stock'; end if;
  if o.stock_posted_at is not null or exists (select 1 from designlab_stock_postings where order_id = p_order) then
    raise exception 'Stock for % was already transferred', o.order_no;
  end if;
  if o.product_id is null then raise exception 'Choose the product these pieces belong to first'; end if;
  select * into d from designlab_designs where id = o.design_id;
  select coalesce(sum(accepted_qty), 0), string_agg(size_label || '×' || accepted_qty, ', ' order by size_label) filter (where accepted_qty > 0)
    into v_qty, v_sizes from designlab_order_items where order_id = p_order;
  if v_qty <= 0 then raise exception 'No QC-accepted pieces to transfer'; end if;
  insert into designlab_stock_postings (order_id, product_id, quantity, design_code, order_no) values (p_order, o.product_id, v_qty, d.design_code, o.order_no);

  -- 1) customers who pre-ordered this design are served first, oldest order first
  v_left := v_qty;
  perform 1 from products where id = o.product_id for update;
  for r in
    select x.id, x.q from (
      select ord.id, ord.created_at,
             (select coalesce(sum(greatest(0, (i ->> 'qty')::int)), 0) from jsonb_array_elements(ord.items) i where i ->> 'productId' = o.product_id::text) as q
      from public.orders ord where ord.preorder_state = 'waiting' and ord.status <> 'cancelled'
    ) x where x.q > 0 order by x.created_at, x.id
  loop
    exit when r.q > v_left;
    update public.orders set preorder_state = 'covered' where id = r.id;
    update products set preorder_qty = greatest(0, preorder_qty - r.q) where id = o.product_id;
    v_left := v_left - r.q; v_covered := v_covered + r.q; v_covered_orders := v_covered_orders + 1;
  end loop;

  -- 2) whatever is left becomes sellable stock (through the normal stock history)
  v_reason := left('designlab ' || d.design_code || ' / ' || o.order_no || ' (' || coalesce(v_sizes, '') || ')'
                   || case when v_covered > 0 then ' · ' || v_covered || ' pc reserved for pre-orders' else '' end, 200);
  if v_left > 0 then
    perform set_config('savlino.reason', v_reason, true);
    update products set stock = stock + v_left where id = o.product_id;
    perform set_config('savlino.reason', '', true);
  end if;
  update designlab_tailor_orders set stock_posted_at = now() where id = p_order;
  perform designlab_log(p_order, 'stock_posted', 'completed', 'completed', v_reason,
                        jsonb_build_object('quantity', v_qty, 'to_stock', v_left, 'to_preorders', v_covered, 'preorders_covered', v_covered_orders, 'product_id', o.product_id));
  return jsonb_build_object('posted', v_qty, 'to_stock', v_left, 'to_preorders', v_covered, 'preorders_covered', v_covered_orders, 'product_id', o.product_id, 'reason', v_reason);
end $$;

-- ───────────────────────── DesignLab → website listing ─────────────────────────
-- mode 'upcoming' (design must be approved or later: customers can pre-order) | 'live' (finished stock must exist) | 'off'
create or replace function public.designlab_set_listing(p_design uuid, p_mode text, p_price int default null, p_expected date default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare d designlab_designs; v_prod uuid; pr products; v_price int;
begin
  if not is_admin() then raise exception 'Only an admin can change the website listing'; end if;
  if p_mode not in ('upcoming', 'live', 'off') then raise exception 'Unknown listing mode'; end if;
  select * into d from designlab_designs where id = p_design for update;
  if d.id is null then raise exception 'Design not found'; end if;

  if p_mode = 'off' then
    if d.product_id is null then return jsonb_build_object('status', 'none'); end if;
    select * into pr from products where id = d.product_id for update;
    if pr.preorder_qty > 0 then raise exception '% piece(s) were pre-ordered by customers — fulfil or cancel those orders first', pr.preorder_qty; end if;
    if pr.status in ('upcoming', 'live') then update products set status = 'draft' where id = pr.id; end if;
    insert into designlab_approvals (design_id, entity_type, entity_id, action, note, by_name) values (p_design, 'product_draft', pr.id, 'Taken off the website', '', designlab_actor());
    return jsonb_build_object('status', 'draft', 'product_id', pr.id);
  end if;

  if p_mode = 'upcoming' and d.status not in ('approved', 'in_production', 'completed') then raise exception 'Approve the design before listing it as upcoming'; end if;
  if p_mode = 'live' and d.status not in ('in_production', 'completed') then raise exception 'Only a produced design can go live'; end if;

  v_prod := d.product_id;
  if v_prod is null or not exists (select 1 from products where id = v_prod) then v_prod := designlab_create_product_draft(p_design); end if;
  select * into pr from products where id = v_prod for update;
  v_price := coalesce(p_price, nullif(pr.price, 0));
  if v_price is null or v_price <= 0 then raise exception 'Enter the selling price (₹) first'; end if;
  if p_mode = 'upcoming' and p_expected is not null and p_expected < current_date then raise exception 'The expected date is in the past'; end if;
  if p_mode = 'live' and pr.stock <= 0 then raise exception 'No finished stock yet — post QC-accepted pieces to inventory first (Production Tracker)'; end if;

  update products set
    status = p_mode,
    price = v_price,
    expected_at = case when p_mode = 'upcoming' then coalesce(p_expected, expected_at) else null end,
    sizes = case when sizes::text ~ '[0-9]' or jsonb_array_length(sizes) = 0 then '["S","M","L","XL"]'::jsonb else sizes end
  where id = pr.id;
  insert into designlab_approvals (design_id, entity_type, entity_id, action, note, by_name)
  values (p_design, 'product_draft', pr.id, case when p_mode = 'upcoming' then 'Listed as Upcoming (pre-orders open)' else 'Moved to the live shop' end, '₹' || v_price, designlab_actor());
  return jsonb_build_object('status', p_mode, 'product_id', pr.id, 'slug', pr.slug);
end $$;

revoke all on function public.designlab_set_listing(uuid, text, int, date), public.designlab_post_finished_stock(uuid) from public, anon;
grant execute on function public.designlab_set_listing(uuid, text, int, date), public.designlab_post_finished_stock(uuid) to authenticated;

-- ───────────────────────── Starter sizes S / M / L / XL ─────────────────────────
-- Values come from the reference sheet you supplied (XL = chest 40" / waist 32" / shoulder 15 / length 13 /
-- front neck 8.5 / neck width 3 / armhole 8 / seam 1") and are graded 2" per size on the bust.
-- They are STARTING VALUES, editable, and stay "not verified" until an admin marks them after checking a
-- physical sample. A design's own pattern still needs sample verification + approval before cutting.
create or replace function pg_temp.n(x numeric) returns text language sql immutable as $f$ select trim_scale(round(x, 2))::text $f$;

do $$
declare r record; bust numeric; waist numeric; sh numeric; ah numeric; ease numeric := 2; seam numeric := 1; hem numeric := 1;
  fin_bust numeric; fin_waist numeric;
begin
  for r in select * from (values ('S', 34, 1), ('M', 36, 2), ('L', 38, 3), ('XL', 40, 4)) as t(label, b, ord) loop
    bust := r.b; waist := r.b - 8; sh := 13.5 + (r.b - 34) * 0.25; ah := 6.5 + (r.b - 34) * 0.25;
    fin_bust := bust + ease; fin_waist := waist + ease;
    insert into designlab_size_templates (size_label, sort_order, unit, body, garment, ease, seam_allowance, cutting, notes)
    values (
      r.label, r.ord, 'in',
      jsonb_build_object('bust', pg_temp.n(bust), 'waist', pg_temp.n(waist), 'shoulder', pg_temp.n(sh), 'front_length', '13', 'back_length', '13',
                         'armhole', pg_temp.n(ah), 'front_neck_depth', '8.5', 'back_neck_depth', '2.5', 'neck_width', '3'),
      jsonb_build_object('bust', pg_temp.n(fin_bust), 'waist', pg_temp.n(fin_waist), 'shoulder', pg_temp.n(sh), 'front_length', '13', 'back_length', '13',
                         'armhole', pg_temp.n(ah), 'front_neck_depth', '8.5', 'back_neck_depth', '2.5', 'neck_width', '3'),
      jsonb_build_object('bust', pg_temp.n(ease), 'waist', pg_temp.n(ease)),
      seam,
      jsonb_build_object('bust', pg_temp.n(fin_bust + 4 * seam), 'shoulder', pg_temp.n(sh + 2 * seam), 'front_length', pg_temp.n(13 + seam + hem),
                         'back_length', pg_temp.n(13 + seam + hem), 'armhole', pg_temp.n(ah + seam),
                         'front_neck_depth', pg_temp.n(8.5 + seam), 'back_neck_depth', pg_temp.n(2.5 + seam), 'neck_width', pg_temp.n(3 + 2 * seam),
                         'closure_allowance', '1', 'hem_allowance', pg_temp.n(hem)),
      'Starter values from the reference sheet (XL = chest 40 / waist 32), graded 2" per size. Length, neck depths and sleeve are design-dependent — check each design. NOT verified.'
    )
    on conflict (size_label) do nothing;
  end loop;
end $$;

notify pgrst, 'reload schema';
