-- ═══════════════════════════════════════════════════════════════════════════
--  SAVLINO · DesignLab (design → pattern → tailor order → production → stock)
--  Run ONCE in Supabase → SQL Editor, AFTER schema.sql and migrations 002–003.
--  Safe to re-run (everything is "if not exists" / "create or replace").
--  Rollback: supabase/rollbacks/004_designlab_rollback.sql
--
--  Nothing here touches existing products, orders or stock. The ONLY way DesignLab
--  changes products.stock is public.designlab_post_finished_stock(), which works on a
--  completed (QC-passed) tailor order exactly once.
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────── Concurrency-safe, never-reused IDs ─────────────────────────
create sequence if not exists public.designlab_design_seq;   -- SV-DL-0001, SV-DL-0002 …
create sequence if not exists public.designlab_order_seq;    -- DL-WO-0001 …

create or replace function public.designlab_in_rpc() returns boolean
language sql stable as $$ select coalesce(current_setting('savlino.dl_rpc', true), '') = '1' $$;

create or replace function public.designlab_actor() returns text
language sql stable security definer set search_path = public as $$
  select coalesce(nullif((select full_name from public.profiles where id = auth.uid()), ''), (select email from public.profiles where id = auth.uid()), 'staff');
$$;

-- ───────────────────────── Import history ─────────────────────────
create table if not exists public.designlab_import_batches (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  file_size bigint not null default 0,
  status text not null default 'running' check (status in ('running', 'done', 'partial', 'failed')),
  designs_created int not null default 0,
  images_uploaded int not null default 0,
  images_failed int not null default 0,
  images_skipped int not null default 0,
  report jsonb not null default '{}'::jsonb,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

-- ───────────────────────── Designs and their images ─────────────────────────
create table if not exists public.designlab_designs (
  id uuid primary key default gen_random_uuid(),
  design_code text not null unique default ('SV-DL-' || lpad(nextval('public.designlab_design_seq')::text, 4, '0')),
  name text not null check (length(btrim(name)) between 1 and 120),
  category text not null default '',
  color text not null default '',
  source_sku text,
  fabric text not null default '',
  neckline text not null default '',
  sleeve text not null default '',
  closure text not null default '',
  lining text not null default '',
  stitching_notes text not null default '',
  status text not null default 'new' check (status in ('new', 'in_review', 'approved', 'in_production', 'completed')),
  archived boolean not null default false,
  product_id uuid references public.products (id) on delete set null,
  batch_id uuid references public.designlab_import_batches (id) on delete set null,
  approved_by uuid,
  approved_at timestamptz,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists designlab_designs_sku_idx on public.designlab_designs (source_sku) where source_sku is not null;
create index if not exists designlab_designs_list_idx on public.designlab_designs (archived, status, created_at desc);

create table if not exists public.designlab_images (
  id uuid primary key default gen_random_uuid(),
  design_id uuid not null references public.designlab_designs (id) on delete cascade,
  url text not null,
  storage_path text,
  position int not null default 0,
  angle text not null default 'unlabeled' check (angle in ('unlabeled', 'front', 'back', 'side', 'detail')),
  width int,
  height int,
  file_name text not null default '',
  content_hash text,
  size_bytes bigint,
  batch_id uuid references public.designlab_import_batches (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists designlab_images_design_idx on public.designlab_images (design_id, position);
create index if not exists designlab_images_hash_idx on public.designlab_images (content_hash);
create unique index if not exists designlab_images_design_hash_idx on public.designlab_images (design_id, content_hash) where content_hash is not null;

-- ───────────────────────── Size master (editable templates, NOT certified standards) ─────────────────────────
create table if not exists public.designlab_size_templates (
  id uuid primary key default gen_random_uuid(),
  size_label text not null unique check (length(btrim(size_label)) between 1 and 20),
  sort_order int not null default 0,
  unit text not null default 'in' check (unit in ('in', 'cm')),
  body jsonb not null default '{}'::jsonb,
  garment jsonb not null default '{}'::jsonb,
  ease jsonb not null default '{}'::jsonb,
  seam_allowance numeric(6, 2) check (seam_allowance is null or seam_allowance >= 0),
  cutting jsonb not null default '{}'::jsonb,
  notes text not null default '',
  verified boolean not null default false,
  verified_by_name text,
  verified_at timestamptz,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
-- Standard sizes start EMPTY and unverified: the numbers must come from your physical samples / master patterns.
insert into public.designlab_size_templates (size_label, sort_order)
values ('32', 32), ('34', 34), ('36', 36), ('38', 38), ('40', 40), ('42', 42), ('44', 44)
on conflict (size_label) do nothing;

-- ───────────────────────── Patterns and revisions ─────────────────────────
create table if not exists public.designlab_patterns (
  id uuid primary key default gen_random_uuid(),
  design_id uuid not null unique references public.designlab_designs (id) on delete cascade,
  pattern_code text not null unique,
  notes text not null default '',
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.designlab_pattern_revisions (
  id uuid primary key default gen_random_uuid(),
  pattern_id uuid not null references public.designlab_patterns (id) on delete cascade,
  revision int not null check (revision >= 1),
  size_label text not null,
  size_template_id uuid references public.designlab_size_templates (id) on delete set null,
  unit text not null default 'in' check (unit in ('in', 'cm')),
  body jsonb not null default '{}'::jsonb,
  garment jsonb not null default '{}'::jsonb,
  ease jsonb not null default '{}'::jsonb,
  seam_allowance numeric(6, 2) check (seam_allowance is null or seam_allowance >= 0),
  cutting jsonb not null default '{}'::jsonb,
  cutting_notes text not null default '',
  stitching_notes text not null default '',
  status text not null default 'draft' check (status in ('draft', 'submitted', 'approved', 'rejected', 'superseded')),
  sample_verified boolean not null default false,
  sample_verified_by text,
  sample_verified_at timestamptz,
  review_note text not null default '',
  approved_by uuid,
  approved_at timestamptz,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (pattern_id, size_label, revision)
);
create index if not exists designlab_revisions_idx on public.designlab_pattern_revisions (pattern_id, size_label, revision desc);

-- ───────────────────────── Approvals (audit) ─────────────────────────
create table if not exists public.designlab_approvals (
  id uuid primary key default gen_random_uuid(),
  design_id uuid not null references public.designlab_designs (id) on delete cascade,
  entity_type text not null check (entity_type in ('design', 'pattern_revision', 'sample', 'product_draft')),
  entity_id uuid not null,
  action text not null,
  note text not null default '',
  by_user uuid default auth.uid(),
  by_name text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists designlab_approvals_idx on public.designlab_approvals (design_id, created_at desc);

-- ───────────────────────── Tailor orders, items, production audit ─────────────────────────
create table if not exists public.designlab_tailor_orders (
  id uuid primary key default gen_random_uuid(),
  order_no text not null unique default ('DL-WO-' || lpad(nextval('public.designlab_order_seq')::text, 4, '0')),
  design_id uuid not null references public.designlab_designs (id) on delete restrict,
  product_id uuid references public.products (id) on delete set null,
  fabric text not null default '',
  lining text not null default '',
  color text not null default '',
  tailor_name text not null default '',
  tailor_phone text not null default '',
  delivery_date date,
  instructions text not null default '',
  notes text not null default '',
  status text not null default 'draft' check (status in ('draft', 'pattern_approved', 'assigned', 'cutting', 'stitching', 'finishing', 'qc', 'completed', 'cancelled')),
  completed_at timestamptz,
  stock_posted_at timestamptz,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists designlab_orders_idx on public.designlab_tailor_orders (status, created_at desc);
create index if not exists designlab_orders_design_idx on public.designlab_tailor_orders (design_id, created_at desc);

create table if not exists public.designlab_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.designlab_tailor_orders (id) on delete cascade,
  revision_id uuid not null references public.designlab_pattern_revisions (id) on delete restrict,
  size_label text not null default '',
  quantity int not null check (quantity between 1 and 10000),
  produced_qty int not null default 0 check (produced_qty >= 0),
  accepted_qty int not null default 0 check (accepted_qty >= 0),
  rejected_qty int not null default 0 check (rejected_qty >= 0),
  rework_qty int not null default 0 check (rework_qty >= 0),
  created_at timestamptz not null default now(),
  unique (order_id, revision_id),
  check (accepted_qty + rejected_qty + rework_qty <= produced_qty)
);

create table if not exists public.designlab_production_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.designlab_tailor_orders (id) on delete cascade,
  design_id uuid not null references public.designlab_designs (id) on delete cascade,
  event_type text not null,
  from_status text,
  to_status text,
  note text not null default '',
  data jsonb not null default '{}'::jsonb,
  by_user uuid default auth.uid(),
  by_name text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists designlab_events_order_idx on public.designlab_production_events (order_id, created_at desc);
create index if not exists designlab_events_design_idx on public.designlab_production_events (design_id, created_at desc);

-- One row per order, primary key = the duplicate-stock guard.
create table if not exists public.designlab_stock_postings (
  order_id uuid primary key references public.designlab_tailor_orders (id) on delete restrict,
  product_id uuid not null references public.products (id) on delete restrict,
  quantity int not null check (quantity > 0),
  design_code text not null,
  order_no text not null,
  posted_by uuid default auth.uid(),
  posted_at timestamptz not null default now()
);

-- updated_at
drop trigger if exists designlab_designs_touch on public.designlab_designs;
create trigger designlab_designs_touch before update on public.designlab_designs for each row execute function public.touch_updated_at();
drop trigger if exists designlab_revisions_touch on public.designlab_pattern_revisions;
create trigger designlab_revisions_touch before update on public.designlab_pattern_revisions for each row execute function public.touch_updated_at();
drop trigger if exists designlab_orders_touch on public.designlab_tailor_orders;
create trigger designlab_orders_touch before update on public.designlab_tailor_orders for each row execute function public.touch_updated_at();
drop trigger if exists designlab_sizes_touch on public.designlab_size_templates;
create trigger designlab_sizes_touch before update on public.designlab_size_templates for each row execute function public.touch_updated_at();

-- ───────────────────────── Guards: approvals and stock can't be bypassed from the browser ─────────────────────────
-- The CRM talks to the database directly, so these triggers (not the UI) enforce the workflow.
create or replace function public.designlab_guard_design() returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    if not public.designlab_in_rpc() then
      new.status := 'new'; new.approved_by := null; new.approved_at := null;
    end if;
    return new;
  end if;
  if not public.designlab_in_rpc() and (new.status is distinct from old.status or new.approved_by is distinct from old.approved_by or new.approved_at is distinct from old.approved_at) then
    raise exception 'Design status changes go through the approval workflow';
  end if;
  if new.archived and not old.archived and exists (select 1 from public.designlab_tailor_orders o where o.design_id = old.id and o.status not in ('completed', 'cancelled')) then
    raise exception 'This design has open tailor orders — complete or cancel them before archiving';
  end if;
  return new;
end $$;
drop trigger if exists designlab_guard_design on public.designlab_designs;
create trigger designlab_guard_design before insert or update on public.designlab_designs for each row execute function public.designlab_guard_design();

create or replace function public.designlab_guard_revision() returns trigger language plpgsql as $$
declare v_changed boolean;
begin
  if tg_op = 'INSERT' then
    if not public.designlab_in_rpc() then
      new.status := 'draft'; new.sample_verified := false; new.sample_verified_by := null; new.sample_verified_at := null;
      new.approved_by := null; new.approved_at := null; new.review_note := '';
    end if;
    return new;
  end if;
  v_changed := (new.size_label, new.unit, new.body, new.garment, new.ease, new.seam_allowance, new.cutting, new.cutting_notes, new.stitching_notes)
               is distinct from (old.size_label, old.unit, old.body, old.garment, old.ease, old.seam_allowance, old.cutting, old.cutting_notes, old.stitching_notes);
  if not public.designlab_in_rpc() then
    if new.status is distinct from old.status or new.sample_verified is distinct from old.sample_verified
       or new.sample_verified_by is distinct from old.sample_verified_by or new.sample_verified_at is distinct from old.sample_verified_at
       or new.approved_by is distinct from old.approved_by or new.approved_at is distinct from old.approved_at then
      raise exception 'Pattern approval and sample verification go through the approval workflow';
    end if;
    if v_changed and old.status not in ('draft', 'rejected') then
      raise exception 'This revision is % — create a new revision to change measurements', old.status;
    end if;
  end if;
  -- Any measurement edit invalidates an earlier sample check.
  if v_changed and old.sample_verified and old.status in ('draft', 'rejected') then
    new.sample_verified := false; new.sample_verified_by := null; new.sample_verified_at := null;
  end if;
  return new;
end $$;
drop trigger if exists designlab_guard_revision on public.designlab_pattern_revisions;
create trigger designlab_guard_revision before insert or update on public.designlab_pattern_revisions for each row execute function public.designlab_guard_revision();

create or replace function public.designlab_guard_order() returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    if not public.designlab_in_rpc() then
      new.status := 'draft'; new.completed_at := null; new.stock_posted_at := null;
    end if;
    return new;
  end if;
  if not public.designlab_in_rpc() then
    if new.status is distinct from old.status or new.completed_at is distinct from old.completed_at
       or new.stock_posted_at is distinct from old.stock_posted_at or new.design_id is distinct from old.design_id or new.order_no is distinct from old.order_no then
      raise exception 'Order status is changed from the Production Tracker only';
    end if;
    if old.stock_posted_at is not null then
      raise exception 'Finished stock was already transferred — this order is locked';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists designlab_guard_order on public.designlab_tailor_orders;
create trigger designlab_guard_order before insert or update on public.designlab_tailor_orders for each row execute function public.designlab_guard_order();

create or replace function public.designlab_guard_item() returns trigger language plpgsql as $$
declare v_order public.designlab_tailor_orders; v_size text; v_ok boolean;
begin
  if tg_op = 'DELETE' then
    if not public.designlab_in_rpc() and exists (select 1 from public.designlab_tailor_orders o where o.id = old.order_id and o.status <> 'draft') then
      raise exception 'Items can only be removed while the order is a draft';
    end if;
    return old;
  end if;
  select * into v_order from public.designlab_tailor_orders where id = new.order_id;
  if tg_op = 'INSERT' then
    if not public.designlab_in_rpc() then
      if v_order.status <> 'draft' then raise exception 'Items can only be added while the order is a draft'; end if;
      new.produced_qty := 0; new.accepted_qty := 0; new.rejected_qty := 0; new.rework_qty := 0;
    end if;
    select r.size_label, true into v_size, v_ok
    from public.designlab_pattern_revisions r join public.designlab_patterns p on p.id = r.pattern_id
    where r.id = new.revision_id and p.design_id = v_order.design_id;
    if v_ok is not true then raise exception 'That pattern revision belongs to a different design'; end if;
    new.size_label := v_size;
    return new;
  end if;
  if not public.designlab_in_rpc() then
    if new.produced_qty is distinct from old.produced_qty or new.accepted_qty is distinct from old.accepted_qty
       or new.rejected_qty is distinct from old.rejected_qty or new.rework_qty is distinct from old.rework_qty
       or new.order_id is distinct from old.order_id or new.revision_id is distinct from old.revision_id then
      raise exception 'Production quantities are recorded from the Production Tracker only';
    end if;
    if new.quantity is distinct from old.quantity and v_order.status <> 'draft' then
      raise exception 'Quantity can only change while the order is a draft';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists designlab_guard_item on public.designlab_order_items;
create trigger designlab_guard_item before insert or update or delete on public.designlab_order_items for each row execute function public.designlab_guard_item();

create or replace function public.designlab_guard_size() returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    new.verified := false; new.verified_by_name := null; new.verified_at := null;
    return new;
  end if;
  if (new.verified, new.verified_by_name, new.verified_at) is distinct from (old.verified, old.verified_by_name, old.verified_at) and not public.is_admin() then
    raise exception 'Only an admin can mark a size template as verified';
  end if;
  -- Changing the numbers voids an earlier verification.
  if (new.unit, new.body, new.garment, new.ease, new.seam_allowance, new.cutting) is distinct from (old.unit, old.body, old.garment, old.ease, old.seam_allowance, old.cutting)
     and new.verified = old.verified then
    new.verified := false; new.verified_by_name := null; new.verified_at := null;
  end if;
  return new;
end $$;
drop trigger if exists designlab_guard_size on public.designlab_size_templates;
create trigger designlab_guard_size before insert or update on public.designlab_size_templates for each row execute function public.designlab_guard_size();

-- ───────────────────────── Row-level security (staff only) ─────────────────────────
alter table public.designlab_import_batches enable row level security;
alter table public.designlab_designs enable row level security;
alter table public.designlab_images enable row level security;
alter table public.designlab_size_templates enable row level security;
alter table public.designlab_patterns enable row level security;
alter table public.designlab_pattern_revisions enable row level security;
alter table public.designlab_approvals enable row level security;
alter table public.designlab_tailor_orders enable row level security;
alter table public.designlab_order_items enable row level security;
alter table public.designlab_production_events enable row level security;
alter table public.designlab_stock_postings enable row level security;

do $$
declare t text;
begin
  foreach t in array array['designlab_import_batches', 'designlab_designs', 'designlab_images', 'designlab_size_templates', 'designlab_patterns', 'designlab_pattern_revisions', 'designlab_tailor_orders', 'designlab_order_items'] loop
    execute format('drop policy if exists "%1$s: staff" on public.%1$I', t);
    execute format('create policy "%1$s: staff" on public.%1$I for all to authenticated using (public.is_staff()) with check (public.is_staff())', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
  -- Audit tables: staff can read, only the database functions below can write.
  foreach t in array array['designlab_approvals', 'designlab_production_events', 'designlab_stock_postings'] loop
    execute format('drop policy if exists "%1$s: staff read" on public.%1$I', t);
    execute format('create policy "%1$s: staff read" on public.%1$I for select to authenticated using (public.is_staff())', t);
    execute format('grant select on public.%I to authenticated', t);
  end loop;
end $$;
grant usage, select on sequence public.designlab_design_seq, public.designlab_order_seq to authenticated;

-- ───────────────────────── Workflow functions ─────────────────────────
create or replace function public.designlab_log(p_order uuid, p_type text, p_from text, p_to text, p_note text, p_data jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into designlab_production_events (order_id, design_id, event_type, from_status, to_status, note, data, by_name)
  select o.id, o.design_id, p_type, p_from, p_to, coalesce(p_note, ''), coalesce(p_data, '{}'::jsonb), designlab_actor() from designlab_tailor_orders o where o.id = p_order;
end $$;

create or replace function public.designlab_ensure_pattern(p_design uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_code text;
begin
  if not is_staff() then raise exception 'Staff access only'; end if;
  select design_code into v_code from designlab_designs where id = p_design;
  if v_code is null then raise exception 'Design not found'; end if;
  insert into designlab_patterns (design_id, pattern_code) values (p_design, 'PT-' || v_code) on conflict (design_id) do nothing;
  select id into v_id from designlab_patterns where design_id = p_design;
  return v_id;
end $$;

create or replace function public.designlab_set_design_status(p_design uuid, p_status text, p_note text default '') returns void
language plpgsql security definer set search_path = public as $$
declare d designlab_designs;
begin
  if not is_staff() then raise exception 'Staff access only'; end if;
  perform set_config('savlino.dl_rpc', '1', true);
  select * into d from designlab_designs where id = p_design for update;
  if d.id is null then raise exception 'Design not found'; end if;
  if p_status not in ('new', 'in_review', 'approved') then raise exception 'Production statuses are set by tailor orders'; end if;
  if d.status in ('in_production') then raise exception 'This design is in production — finish or cancel its tailor orders first'; end if;
  if p_status = 'approved' then
    if not is_admin() then raise exception 'Only an admin can approve a design'; end if;
    update designlab_designs set status = 'approved', approved_by = auth.uid(), approved_at = now() where id = p_design;
  else
    if d.status in ('approved', 'completed') and not is_admin() then raise exception 'Only an admin can reopen an approved design'; end if;
    update designlab_designs set status = p_status, approved_by = null, approved_at = null where id = p_design;
  end if;
  insert into designlab_approvals (design_id, entity_type, entity_id, action, note, by_name)
  values (p_design, 'design', p_design, d.status || ' → ' || p_status, coalesce(p_note, ''), designlab_actor());
end $$;

create or replace function public.designlab_create_revision(p_design uuid, p_size text, p_template uuid default null, p_copy_from uuid default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_pattern uuid; v_rev int; v_id uuid; t designlab_size_templates; c designlab_pattern_revisions;
begin
  if not is_staff() then raise exception 'Staff access only'; end if;
  if coalesce(btrim(p_size), '') = '' then raise exception 'Choose a size'; end if;
  v_pattern := designlab_ensure_pattern(p_design);
  select coalesce(max(revision), 0) + 1 into v_rev from designlab_pattern_revisions where pattern_id = v_pattern and size_label = btrim(p_size);
  if p_copy_from is not null then
    select * into c from designlab_pattern_revisions where id = p_copy_from and pattern_id = v_pattern;
    if c.id is null then raise exception 'Revision to copy was not found for this design'; end if;
    insert into designlab_pattern_revisions (pattern_id, revision, size_label, size_template_id, unit, body, garment, ease, seam_allowance, cutting, cutting_notes, stitching_notes)
    values (v_pattern, v_rev, btrim(p_size), c.size_template_id, c.unit, c.body, c.garment, c.ease, c.seam_allowance, c.cutting, c.cutting_notes, c.stitching_notes) returning id into v_id;
  elsif p_template is not null then
    select * into t from designlab_size_templates where id = p_template;
    if t.id is null then raise exception 'Size template not found'; end if;
    insert into designlab_pattern_revisions (pattern_id, revision, size_label, size_template_id, unit, body, garment, ease, seam_allowance, cutting)
    values (v_pattern, v_rev, btrim(p_size), t.id, t.unit, t.body, t.garment, t.ease, t.seam_allowance, t.cutting) returning id into v_id;
  else
    insert into designlab_pattern_revisions (pattern_id, revision, size_label) values (v_pattern, v_rev, btrim(p_size)) returning id into v_id;
  end if;
  return v_id;
end $$;

-- Required before approval: finished measurements for the core fit points and the cutting sheet.
create or replace function public.designlab_missing_measurements(r designlab_pattern_revisions) returns text[]
language plpgsql immutable as $$
declare k text; out text[] := '{}';
begin
  foreach k in array array['bust', 'waist', 'shoulder', 'front_length', 'back_length', 'armhole', 'front_neck_depth', 'back_neck_depth', 'neck_width'] loop
    if coalesce(nullif(r.garment ->> k, ''), '') = '' then out := out || ('finished ' || replace(k, '_', ' ')); end if;
  end loop;
  foreach k in array array['bust', 'front_length', 'back_length', 'shoulder'] loop
    if coalesce(nullif(r.cutting ->> k, ''), '') = '' then out := out || ('cutting ' || replace(k, '_', ' ')); end if;
  end loop;
  if r.seam_allowance is null then out := out || 'seam allowance'::text; end if;
  return out;
end $$;

create or replace function public.designlab_submit_revision(p_rev uuid) returns void
language plpgsql security definer set search_path = public as $$
declare r designlab_pattern_revisions; v_missing text[];
begin
  if not is_staff() then raise exception 'Staff access only'; end if;
  perform set_config('savlino.dl_rpc', '1', true);
  select * into r from designlab_pattern_revisions where id = p_rev for update;
  if r.id is null then raise exception 'Revision not found'; end if;
  if r.status not in ('draft', 'rejected') then raise exception 'Only a draft or rejected revision can be submitted'; end if;
  v_missing := designlab_missing_measurements(r);
  if array_length(v_missing, 1) > 0 then raise exception 'Fill in before submitting: %', array_to_string(v_missing, ', '); end if;
  update designlab_pattern_revisions set status = 'submitted', review_note = '' where id = p_rev;
end $$;

create or replace function public.designlab_verify_sample(p_rev uuid, p_by text, p_note text default '') returns void
language plpgsql security definer set search_path = public as $$
declare r designlab_pattern_revisions; v_design uuid;
begin
  if not is_staff() then raise exception 'Staff access only'; end if;
  if coalesce(btrim(p_by), '') = '' then raise exception 'Enter the tailor / pattern master who verified the sample'; end if;
  perform set_config('savlino.dl_rpc', '1', true);
  select * into r from designlab_pattern_revisions where id = p_rev for update;
  if r.id is null then raise exception 'Revision not found'; end if;
  if r.status not in ('draft', 'submitted', 'rejected') then raise exception 'This revision is already %', r.status; end if;
  update designlab_pattern_revisions set sample_verified = true, sample_verified_by = btrim(p_by), sample_verified_at = now() where id = p_rev;
  select p.design_id into v_design from designlab_patterns p where p.id = r.pattern_id;
  insert into designlab_approvals (design_id, entity_type, entity_id, action, note, by_name)
  values (v_design, 'sample', p_rev, 'sample verified by ' || btrim(p_by), coalesce(p_note, ''), designlab_actor());
end $$;

create or replace function public.designlab_review_revision(p_rev uuid, p_decision text, p_note text default '') returns void
language plpgsql security definer set search_path = public as $$
declare r designlab_pattern_revisions; v_design uuid; v_missing text[];
begin
  if not is_admin() then raise exception 'Only an admin can approve or reject a pattern'; end if;
  perform set_config('savlino.dl_rpc', '1', true);
  select * into r from designlab_pattern_revisions where id = p_rev for update;
  if r.id is null then raise exception 'Revision not found'; end if;
  if r.status <> 'submitted' then raise exception 'Submit the revision for approval first'; end if;
  select p.design_id into v_design from designlab_patterns p where p.id = r.pattern_id;
  if p_decision = 'approve' then
    if not r.sample_verified then raise exception 'A pattern cannot be approved until a tailor has verified it against the physical sample'; end if;
    v_missing := designlab_missing_measurements(r);
    if array_length(v_missing, 1) > 0 then raise exception 'Incomplete measurements: %', array_to_string(v_missing, ', '); end if;
    update designlab_pattern_revisions set status = 'superseded' where pattern_id = r.pattern_id and size_label = r.size_label and status = 'approved' and id <> p_rev;
    update designlab_pattern_revisions set status = 'approved', approved_by = auth.uid(), approved_at = now(), review_note = coalesce(p_note, '') where id = p_rev;
    insert into designlab_approvals (design_id, entity_type, entity_id, action, note, by_name)
    values (v_design, 'pattern_revision', p_rev, 'approved size ' || r.size_label || ' rev ' || r.revision, coalesce(p_note, ''), designlab_actor());
  elsif p_decision = 'reject' then
    if coalesce(btrim(p_note), '') = '' then raise exception 'Write what needs to change'; end if;
    update designlab_pattern_revisions set status = 'rejected', review_note = p_note where id = p_rev;
    insert into designlab_approvals (design_id, entity_type, entity_id, action, note, by_name)
    values (v_design, 'pattern_revision', p_rev, 'rejected size ' || r.size_label || ' rev ' || r.revision, p_note, designlab_actor());
  else
    raise exception 'Unknown decision';
  end if;
end $$;

create or replace function public.designlab_create_order(
  p_design uuid, p_items jsonb, p_fabric text default '', p_lining text default '', p_color text default '',
  p_tailor text default '', p_phone text default '', p_delivery date default null, p_instructions text default '', p_notes text default ''
) returns uuid
language plpgsql security definer set search_path = public as $$
declare d designlab_designs; v_order uuid; it jsonb; v_rev uuid; v_qty int;
begin
  if not is_staff() then raise exception 'Staff access only'; end if;
  perform set_config('savlino.dl_rpc', '1', true);
  select * into d from designlab_designs where id = p_design;
  if d.id is null then raise exception 'Design not found'; end if;
  if d.archived then raise exception 'This design is archived'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'Add at least one size with a quantity'; end if;
  insert into designlab_tailor_orders (design_id, product_id, fabric, lining, color, tailor_name, tailor_phone, delivery_date, instructions, notes)
  values (p_design, d.product_id, coalesce(nullif(btrim(p_fabric), ''), d.fabric), coalesce(nullif(btrim(p_lining), ''), d.lining), coalesce(nullif(btrim(p_color), ''), d.color),
          coalesce(btrim(p_tailor), ''), coalesce(btrim(p_phone), ''), p_delivery, coalesce(p_instructions, ''), coalesce(p_notes, ''))
  returning id into v_order;
  for it in select * from jsonb_array_elements(p_items) loop
    v_rev := (it ->> 'revision_id')::uuid;
    v_qty := (it ->> 'quantity')::int;
    insert into designlab_order_items (order_id, revision_id, quantity) values (v_order, v_rev, v_qty);
  end loop;
  perform designlab_log(v_order, 'created', null, 'draft', 'Job card created', jsonb_build_object('items', p_items));
  return v_order;
end $$;

create or replace function public.designlab_set_order_status(p_order uuid, p_to text, p_note text default '') returns void
language plpgsql security definer set search_path = public as $$
declare
  o designlab_tailor_orders; d designlab_designs;
  flow text[] := array['draft', 'pattern_approved', 'assigned', 'cutting', 'stitching', 'finishing', 'qc', 'completed'];
  i_from int; i_to int; v_bad text; v_prod int; v_acc int; v_rej int; v_rw int;
begin
  if not is_staff() then raise exception 'Staff access only'; end if;
  perform set_config('savlino.dl_rpc', '1', true);
  select * into o from designlab_tailor_orders where id = p_order for update;
  if o.id is null then raise exception 'Order not found'; end if;
  if o.status in ('completed', 'cancelled') then raise exception 'This order is already %', o.status; end if;
  select * into d from designlab_designs where id = o.design_id;

  if p_to = 'cancelled' then
    if coalesce(btrim(p_note), '') = '' then raise exception 'Write why the order is cancelled'; end if;
    update designlab_tailor_orders set status = 'cancelled' where id = p_order;
    perform designlab_log(p_order, 'status', o.status, 'cancelled', p_note);
    update designlab_designs x set status = 'approved'
      where x.id = o.design_id and x.status = 'in_production'
        and not exists (select 1 from designlab_tailor_orders z where z.design_id = x.id and z.id <> p_order and z.status not in ('completed', 'cancelled', 'draft', 'pattern_approved'));
    return;
  end if;

  i_from := array_position(flow, o.status);
  i_to := array_position(flow, p_to);
  if i_to is null then raise exception 'Unknown status'; end if;
  if i_to = i_from - 1 and i_from > 2 then
    if coalesce(btrim(p_note), '') = '' then raise exception 'Write why the job is going back a stage (rework)'; end if;
  elsif i_to <> i_from + 1 then
    raise exception 'An order moves one stage at a time (now: %)', o.status;
  end if;

  if p_to = 'pattern_approved' then
    if d.status not in ('approved', 'in_production', 'completed') then raise exception 'Approve the design first (Design Workspace → Design Details)'; end if;
    select string_agg(i.size_label || ' (rev ' || r.revision || ')', ', ') into v_bad
    from designlab_order_items i join designlab_pattern_revisions r on r.id = i.revision_id
    where i.order_id = p_order and (r.status <> 'approved' or not r.sample_verified);
    if v_bad is not null then raise exception 'These sizes do not have an approved, sample-verified pattern: %', v_bad; end if;
    if not exists (select 1 from designlab_order_items where order_id = p_order) then raise exception 'The order has no sizes'; end if;
  elsif p_to = 'assigned' then
    if coalesce(btrim(o.tailor_name), '') = '' then raise exception 'Assign a tailor first'; end if;
  elsif p_to = 'qc' then
    select coalesce(sum(produced_qty), 0) into v_prod from designlab_order_items where order_id = p_order;
    if v_prod = 0 then raise exception 'Record the produced quantities before QC'; end if;
  elsif p_to = 'completed' then
    select coalesce(sum(produced_qty), 0), coalesce(sum(accepted_qty), 0), coalesce(sum(rejected_qty), 0), coalesce(sum(rework_qty), 0)
      into v_prod, v_acc, v_rej, v_rw from designlab_order_items where order_id = p_order;
    if v_prod = 0 then raise exception 'Record the produced quantities first'; end if;
    if v_rw > 0 then raise exception '% piece(s) are still marked for rework — resolve them first', v_rw; end if;
    if v_acc + v_rej <> v_prod then raise exception 'QC is incomplete: % produced but only % accepted + % rejected', v_prod, v_acc, v_rej; end if;
  end if;

  update designlab_tailor_orders set status = p_to, completed_at = case when p_to = 'completed' then now() else completed_at end where id = p_order;
  perform designlab_log(p_order, case when i_to < i_from then 'rework' else 'status' end, o.status, p_to, p_note);

  if p_to = 'assigned' then
    update designlab_designs set status = 'in_production' where id = o.design_id and status = 'approved';
  elsif p_to = 'completed' then
    update designlab_designs x set status = 'completed'
      where x.id = o.design_id and x.status = 'in_production'
        and not exists (select 1 from designlab_tailor_orders z where z.design_id = x.id and z.id <> p_order and z.status not in ('completed', 'cancelled', 'draft', 'pattern_approved'));
  end if;
end $$;

create or replace function public.designlab_record_quantities(p_order uuid, p_items jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare o designlab_tailor_orders; it jsonb; v_prod int; v_acc int; v_rej int; v_rw int;
begin
  if not is_staff() then raise exception 'Staff access only'; end if;
  perform set_config('savlino.dl_rpc', '1', true);
  select * into o from designlab_tailor_orders where id = p_order for update;
  if o.id is null then raise exception 'Order not found'; end if;
  if o.status not in ('cutting', 'stitching', 'finishing', 'qc') then raise exception 'Quantities are recorded from Cutting to QC (now: %)', o.status; end if;
  for it in select * from jsonb_array_elements(p_items) loop
    v_prod := greatest(0, coalesce((it ->> 'produced')::int, 0));
    v_acc := greatest(0, coalesce((it ->> 'accepted')::int, 0));
    v_rej := greatest(0, coalesce((it ->> 'rejected')::int, 0));
    v_rw := greatest(0, coalesce((it ->> 'rework')::int, 0));
    if v_acc + v_rej + v_rw > v_prod then raise exception 'Accepted + rejected + rework cannot exceed produced'; end if;
    if (o.status <> 'qc') and (v_acc > 0 or v_rej > 0) then raise exception 'Accepted / rejected pieces are entered at the QC stage'; end if;
    update designlab_order_items set produced_qty = v_prod, accepted_qty = v_acc, rejected_qty = v_rej, rework_qty = v_rw
      where id = (it ->> 'item_id')::uuid and order_id = p_order;
  end loop;
  perform designlab_log(p_order, 'quantities', o.status, o.status, 'Quantities updated', jsonb_build_object('items', p_items));
end $$;

-- QC-approved pieces → existing stock. Exactly once per order.
create or replace function public.designlab_post_finished_stock(p_order uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare o designlab_tailor_orders; d designlab_designs; v_qty int; v_sizes text; v_reason text;
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
  v_reason := left('designlab ' || d.design_code || ' / ' || o.order_no || ' (' || coalesce(v_sizes, '') || ')', 200);
  perform set_config('savlino.reason', v_reason, true);
  update products set stock = stock + v_qty where id = o.product_id;
  perform set_config('savlino.reason', '', true);
  update designlab_tailor_orders set stock_posted_at = now() where id = p_order;
  perform designlab_log(p_order, 'stock_posted', 'completed', 'completed', v_reason, jsonb_build_object('quantity', v_qty, 'product_id', o.product_id));
  return jsonb_build_object('posted', v_qty, 'product_id', o.product_id, 'reason', v_reason);
end $$;

-- Approved design → Product Studio DRAFT (never live, never any stock).
create or replace function public.designlab_create_product_draft(p_design uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare d designlab_designs; v_slug text; v_base text; v_n int := 1; v_cat uuid; v_sku text; v_prod uuid; v_sizes jsonb;
begin
  if not is_staff() then raise exception 'Staff access only'; end if;
  perform set_config('savlino.dl_rpc', '1', true);
  select * into d from designlab_designs where id = p_design for update;
  if d.id is null then raise exception 'Design not found'; end if;
  if d.product_id is not null and exists (select 1 from products where id = d.product_id) then return d.product_id; end if;
  if d.status not in ('approved', 'in_production', 'completed') then raise exception 'Approve the design before creating a product draft'; end if;
  v_base := trim(both '-' from regexp_replace(lower(d.name), '[^a-z0-9]+', '-', 'g'));
  if v_base = '' then v_base := 'design'; end if;
  v_slug := v_base;
  while exists (select 1 from products where slug = v_slug) loop v_n := v_n + 1; v_slug := v_base || '-' || v_n; end loop;
  select id into v_cat from categories where lower(name) = lower(d.category) or lower(name) = lower(d.category) || 's' or lower(name) || 's' = lower(d.category) limit 1;
  v_sku := coalesce(d.source_sku, d.design_code);
  if exists (select 1 from products where sku = v_sku) then v_sku := d.design_code; end if;
  if exists (select 1 from products where sku = v_sku) then v_sku := null; end if;
  select coalesce(jsonb_agg(distinct r.size_label), '[]'::jsonb) into v_sizes
  from designlab_pattern_revisions r join designlab_patterns p on p.id = r.pattern_id where p.design_id = p_design and r.status = 'approved';
  insert into products (slug, sku, name, category_id, subtitle, description, price, sizes, status, stock)
  values (v_slug, v_sku, d.name, v_cat, d.color, '', 0, v_sizes, 'draft', 0) returning id into v_prod;
  -- Same photos; storage_path stays NULL so deleting the product can never delete DesignLab's files.
  insert into product_images (product_id, url, storage_path, position, width, height, kind)
  select v_prod, url, null, position, width, height, 'photo' from designlab_images where design_id = p_design order by position;
  update designlab_designs set product_id = v_prod where id = p_design;
  insert into designlab_approvals (design_id, entity_type, entity_id, action, note, by_name)
  values (p_design, 'product_draft', v_prod, 'Product Studio draft created', v_slug, designlab_actor());
  return v_prod;
end $$;

revoke all on function public.designlab_log(uuid, text, text, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.designlab_ensure_pattern(uuid), public.designlab_set_design_status(uuid, text, text),
  public.designlab_create_revision(uuid, text, uuid, uuid), public.designlab_submit_revision(uuid), public.designlab_verify_sample(uuid, text, text),
  public.designlab_review_revision(uuid, text, text), public.designlab_create_order(uuid, jsonb, text, text, text, text, text, date, text, text),
  public.designlab_set_order_status(uuid, text, text), public.designlab_record_quantities(uuid, jsonb), public.designlab_post_finished_stock(uuid),
  public.designlab_create_product_draft(uuid) from public, anon;
grant execute on function public.designlab_ensure_pattern(uuid), public.designlab_set_design_status(uuid, text, text),
  public.designlab_create_revision(uuid, text, uuid, uuid), public.designlab_submit_revision(uuid), public.designlab_verify_sample(uuid, text, text),
  public.designlab_review_revision(uuid, text, text), public.designlab_create_order(uuid, jsonb, text, text, text, text, text, date, text, text),
  public.designlab_set_order_status(uuid, text, text), public.designlab_record_quantities(uuid, jsonb), public.designlab_post_finished_stock(uuid),
  public.designlab_create_product_draft(uuid) to authenticated;

notify pgrst, 'reload schema';
