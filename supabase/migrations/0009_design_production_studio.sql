-- SAVLINO Design & Production Studio.
-- Additive only: reuses products, product_variants, inventory, materials, team_members
-- and orders. Every approval, reservation, QC decision and stock receipt goes through a
-- checked function; triggers lock approved records and write an audit trail.

-- ───────────────────────── Team links ─────────────────────────
alter table public.team_members add column if not exists user_id uuid unique references auth.users (id) on delete set null;
alter table public.team_members add column if not exists atelier_role text
  check (atelier_role in ('designer', 'pattern_master', 'cutter', 'tailor', 'finisher', 'qc_inspector', 'production_manager'));

-- ───────────────────────── Tables ─────────────────────────
create table public.garment_designs (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default ('DS-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6))),
  name text not null check (char_length(name) between 1 and 120),
  category text not null default 'designer-blouses'
    check (category in ('designer-blouses', 'salwar-suits', 'sarees', 'shapewear', 'lingerie', 'loungewear')),
  product_id uuid references public.products (id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'sample', 'approved', 'archived')),
  spec jsonb not null default '{}'::jsonb,
  sketches jsonb not null default '[]'::jsonb check (jsonb_typeof(sketches) = 'array' and jsonb_array_length(sketches) <= 8),
  current_version int not null default 1,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  approved_by uuid references auth.users (id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.garment_designs (status);
create index on public.garment_designs (product_id);

create table public.design_versions (
  id uuid primary key default gen_random_uuid(),
  design_id uuid not null references public.garment_designs (id) on delete cascade,
  version int not null,
  name text not null,
  status text not null,
  spec jsonb not null,
  note text,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  unique (design_id, version)
);

create table public.size_charts (
  id uuid primary key default gen_random_uuid(),
  category text not null default 'designer-blouses',
  name text not null,
  version int not null default 1,
  status text not null default 'draft' check (status in ('draft', 'approved', 'archived')),
  unit text not null default 'cm' check (unit in ('cm', 'in')),
  notes text,
  approved_by uuid references auth.users (id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (category, version)
);

create table public.size_measurements (
  id uuid primary key default gen_random_uuid(),
  size_chart_id uuid not null references public.size_charts (id) on delete cascade,
  size text not null check (size ~ '^[0-9]{2}$'),
  bust numeric(6, 2) not null check (bust > 0),
  waist numeric(6, 2) not null check (waist > 0),
  shoulder numeric(6, 2) not null check (shoulder > 0),
  blouse_length numeric(6, 2) not null check (blouse_length > 0),
  armhole numeric(6, 2) not null check (armhole > 0),
  sleeve_length numeric(6, 2) not null check (sleeve_length >= 0),
  neck_depth_front numeric(6, 2) not null check (neck_depth_front >= 0),
  neck_depth_back numeric(6, 2) not null check (neck_depth_back >= 0),
  ease numeric(6, 2) not null default 4 check (ease >= 0),
  seam_allowance numeric(6, 2) not null default 1.5 check (seam_allowance >= 0),
  unique (size_chart_id, size)
);

create table public.pattern_pieces (
  id uuid primary key default gen_random_uuid(),
  design_id uuid not null references public.garment_designs (id) on delete cascade,
  design_version int not null,
  size_chart_id uuid not null references public.size_charts (id) on delete restrict,
  size text not null,
  piece_type text not null check (piece_type in ('front', 'back', 'sleeve', 'neck_facing', 'lining_front', 'lining_back', 'lining_sleeve')),
  version int not null default 1,
  status text not null default 'draft' check (status in ('draft', 'in_review', 'approved', 'rejected', 'superseded')),
  geometry jsonb not null,
  seam_allowance numeric(6, 2) not null default 1.5,
  annotations jsonb not null default '[]'::jsonb,
  graded_from uuid references public.pattern_pieces (id) on delete set null,
  approved_by uuid references auth.users (id) on delete set null,
  approved_at timestamptz,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  unique (design_id, size, piece_type, version)
);
create index on public.pattern_pieces (design_id, size, status);

create table public.cutting_layouts (
  id uuid primary key default gen_random_uuid(),
  design_id uuid not null references public.garment_designs (id) on delete cascade,
  size text not null,
  fabric_role text not null default 'main' check (fabric_role in ('main', 'lining')),
  fabric_width_cm numeric(6, 1) not null check (fabric_width_cm > 0),
  layout_type text not null default 'single_ply' check (layout_type in ('single_ply', 'folded', 'nested')),
  marker_length_cm numeric(8, 1) not null check (marker_length_cm > 0),
  pieces_per_marker int not null default 1 check (pieces_per_marker > 0),
  shrinkage_pct numeric(5, 2) not null default 0 check (shrinkage_pct between 0 and 30),
  status text not null default 'estimated' check (status in ('estimated', 'verified')),
  notes text,
  verified_by uuid references auth.users (id) on delete set null,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.cutting_layouts (design_id, size, fabric_role, status);

create table public.design_bom (
  id uuid primary key default gen_random_uuid(),
  design_id uuid not null references public.garment_designs (id) on delete cascade,
  item_type text not null check (item_type in ('main_fabric', 'lining', 'pads', 'hooks', 'thread', 'lace', 'zipper', 'label', 'packaging', 'embroidery', 'other')),
  material_id uuid references public.materials (id) on delete set null,
  description text,
  unit text not null default 'pcs',
  qty_per_piece numeric(10, 3) not null default 0 check (qty_per_piece >= 0),
  wastage_pct numeric(5, 2) not null default 0 check (wastage_pct between 0 and 50),
  notes text,
  created_at timestamptz not null default now()
);
create index on public.design_bom (design_id);
create index on public.design_bom (material_id);

create table public.production_batches (
  id uuid primary key default gen_random_uuid(),
  batch_no text not null unique default ('PB-' || to_char(now(), 'YYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 4))),
  design_id uuid not null references public.garment_designs (id) on delete restrict,
  design_version int,
  size text not null,
  color text,
  quantity int not null check (quantity between 1 and 10000),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  due_date date,
  status text not null default 'draft' check (status in ('draft', 'approved', 'material_reserved', 'cutting', 'stitching', 'finishing', 'quality_check', 'completed', 'stock_received')),
  product_variant_id uuid references public.product_variants (id) on delete set null,
  order_id uuid references public.orders (id) on delete set null,
  stitching_order_id uuid references public.stitching_orders (id) on delete set null,
  notes text,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.production_batches (status);
create index on public.production_batches (design_id);

create table public.production_batch_items (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.production_batches (id) on delete cascade,
  item_no int not null,
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'qc_pending', 'approved', 'rejected', 'rework')),
  unique (batch_id, item_no)
);

create table public.production_tasks (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.production_batches (id) on delete cascade,
  stage text not null check (stage in ('cutting', 'stitching', 'finishing', 'rework')),
  title text not null,
  instructions text,
  quantity int not null default 1,
  materials jsonb not null default '[]'::jsonb,
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'paused', 'done', 'blocked')),
  started_at timestamptz,
  completed_at timestamptz,
  minutes_worked int not null default 0,
  last_resumed_at timestamptz,
  completion_photo text check (completion_photo is null or (completion_photo ~ '^data:image/(jpeg|png|webp);base64,' and char_length(completion_photo) <= 1500000)),
  created_at timestamptz not null default now()
);
create index on public.production_tasks (batch_id, stage);

create table public.worker_assignments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.production_tasks (id) on delete cascade,
  team_member_id uuid not null references public.team_members (id) on delete cascade,
  assigned_by uuid references auth.users (id) on delete set null default auth.uid(),
  assigned_at timestamptz not null default now(),
  unique (task_id, team_member_id)
);
create index on public.worker_assignments (team_member_id);

create table public.production_task_notes (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.production_tasks (id) on delete cascade,
  kind text not null check (kind in ('clarification', 'shortage', 'reply', 'note')),
  message text not null check (char_length(message) between 1 and 2000),
  material_id uuid references public.materials (id) on delete set null,
  quantity numeric(10, 3),
  resolved boolean not null default false,
  author uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index on public.production_task_notes (task_id);

create table public.material_consumption (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.production_batches (id) on delete cascade,
  bom_id uuid references public.design_bom (id) on delete set null,
  material_id uuid references public.materials (id) on delete set null,
  kind text not null check (kind in ('estimated', 'reserved', 'actual', 'returned', 'shortage_report')),
  quantity numeric(12, 3) not null check (quantity >= 0),
  unit text,
  basis text check (basis in ('verified_marker', 'bom', 'manual')),
  note text,
  recorded_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index on public.material_consumption (batch_id);

create table public.quality_inspections (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.production_batches (id) on delete cascade,
  inspector uuid references auth.users (id) on delete set null default auth.uid(),
  checklist jsonb not null,
  result text not null check (result in ('approved', 'rejected', 'rework_required')),
  approved_quantity int not null default 0 check (approved_quantity >= 0),
  rejected_quantity int not null default 0 check (rejected_quantity >= 0),
  notes text,
  inspected_at timestamptz not null default now()
);
create index on public.quality_inspections (batch_id);

create table public.design_approvals (
  id uuid primary key default gen_random_uuid(),
  subject text not null check (subject in ('design', 'pattern', 'size_chart', 'marker')),
  design_id uuid references public.garment_designs (id) on delete cascade,
  design_version int,
  pattern_piece_id uuid references public.pattern_pieces (id) on delete cascade,
  size_chart_id uuid references public.size_charts (id) on delete cascade,
  cutting_layout_id uuid references public.cutting_layouts (id) on delete cascade,
  decision text not null check (decision in ('approved', 'rejected', 'changes_requested')),
  comment text,
  decided_by uuid references auth.users (id) on delete set null default auth.uid(),
  decided_at timestamptz not null default now()
);
create index on public.design_approvals (design_id);

create table public.atelier_audit_log (
  id bigint generated always as identity primary key,
  entity text not null,
  entity_id uuid,
  action text not null,
  actor uuid default auth.uid(),
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index on public.atelier_audit_log (entity, entity_id);

-- ───────────────────────── Helpers ─────────────────────────
create schema if not exists private;

create or replace function private.via_workflow() returns boolean language sql stable as $$
  select coalesce(current_setting('atelier.workflow', true), '') = 'on';
$$;

create or replace function private.atelier_member() returns uuid
language sql stable security definer set search_path = public as $$
  select id from public.team_members where user_id = auth.uid() and active limit 1;
$$;

create or replace function private.atelier_role() returns text
language sql stable security definer set search_path = public as $$
  select atelier_role from public.team_members where user_id = auth.uid() and active limit 1;
$$;

create or replace function private.can_approve_patterns() returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin() or coalesce(private.atelier_role() = 'pattern_master', false);
$$;

create or replace function private.can_inspect_qc() returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin() or coalesce(private.atelier_role() = 'qc_inspector', false);
$$;

create or replace function private.assigned_to_task(p_task uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.worker_assignments where task_id = p_task and team_member_id = private.atelier_member());
$$;

create or replace function private.assigned_to_batch(p_batch uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.worker_assignments wa join public.production_tasks t on t.id = wa.task_id
    where t.batch_id = p_batch and wa.team_member_id = private.atelier_member()
  );
$$;

create or replace function private.assigned_design_size(p_design uuid, p_size text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.production_batches b
    where b.design_id = p_design and (p_size is null or b.size = p_size) and private.assigned_to_batch(b.id)
  );
$$;

revoke all on all functions in schema private from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.via_workflow(), private.atelier_member(), private.atelier_role(), private.can_approve_patterns(),
  private.can_inspect_qc(), private.assigned_to_task(uuid), private.assigned_to_batch(uuid), private.assigned_design_size(uuid, text) to authenticated, anon;
grant usage on schema private to anon;

-- Audit trail for every change.
create or replace function private.atelier_audit() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_data jsonb := '{}'::jsonb;
begin
  if tg_op = 'DELETE' then v_id := old.id; else v_id := new.id; end if;
  if tg_op = 'UPDATE' and to_jsonb(new) ? 'status' and (to_jsonb(old) ->> 'status') is distinct from (to_jsonb(new) ->> 'status') then
    v_data := jsonb_build_object('from', to_jsonb(old) ->> 'status', 'to', to_jsonb(new) ->> 'status');
  end if;
  insert into public.atelier_audit_log (entity, entity_id, action, data) values (tg_table_name, v_id, lower(tg_op), v_data);
  return coalesce(new, old);
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['garment_designs', 'size_charts', 'size_measurements', 'pattern_pieces', 'cutting_layouts', 'design_bom',
    'production_batches', 'production_tasks', 'worker_assignments', 'material_consumption', 'quality_inspections', 'design_approvals', 'production_task_notes'] loop
    execute format('create trigger %I after insert or update or delete on public.%I for each row execute function private.atelier_audit()', t || '_audit', t);
  end loop;
end $$;

-- Designs: version every spec change; lock approved designs.
create or replace function private.design_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if new.status = 'approved' then raise exception 'use_approval_workflow'; end if;
    new.current_version := 1;
    return new;
  end if;
  if old.status = 'approved' and not private.via_workflow()
     and (new.spec is distinct from old.spec or new.name is distinct from old.name or new.sketches is distinct from old.sketches) then
    raise exception 'approved_design_locked';
  end if;
  if new.status is distinct from old.status and (new.status = 'approved' or old.status = 'approved') and not private.via_workflow() then
    raise exception 'use_approval_workflow';
  end if;
  if new.spec is distinct from old.spec or new.name is distinct from old.name then
    new.current_version := old.current_version + 1;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
create trigger garment_designs_guard before insert or update on public.garment_designs for each row execute function private.design_guard();

create or replace function private.design_snapshot() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' or new.current_version <> old.current_version then
    insert into public.design_versions (design_id, version, name, status, spec)
    values (new.id, new.current_version, new.name, new.status, new.spec)
    on conflict (design_id, version) do nothing;
  end if;
  return new;
end;
$$;
create trigger garment_designs_snapshot after insert or update on public.garment_designs for each row execute function private.design_snapshot();

-- Size charts: approved charts and their measurements are read-only.
create or replace function private.size_chart_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' and new.status = 'approved' then raise exception 'use_approval_workflow'; end if;
  if tg_op = 'UPDATE' and new.status is distinct from old.status and new.status = 'approved' and not private.via_workflow() then
    raise exception 'use_approval_workflow';
  end if;
  return new;
end;
$$;
create trigger size_charts_guard before insert or update on public.size_charts for each row execute function private.size_chart_guard();

create or replace function private.size_measure_guard() returns trigger
language plpgsql set search_path = public as $$
declare v_chart uuid := coalesce(new.size_chart_id, old.size_chart_id);
begin
  if exists (select 1 from public.size_charts where id = v_chart and status = 'approved') then
    raise exception 'approved_size_chart_locked';
  end if;
  return coalesce(new, old);
end;
$$;
create trigger size_measurements_guard before insert or update or delete on public.size_measurements for each row execute function private.size_measure_guard();

-- Patterns: approved geometry is immutable; approval only through review.
create or replace function private.pattern_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if new.status in ('approved', 'superseded') then raise exception 'use_approval_workflow'; end if;
    return new;
  end if;
  if old.status in ('approved', 'superseded') and (new.geometry is distinct from old.geometry or new.seam_allowance is distinct from old.seam_allowance or new.annotations is distinct from old.annotations) then
    raise exception 'approved_pattern_locked';
  end if;
  if new.status is distinct from old.status and new.status in ('approved', 'superseded', 'rejected') and not private.via_workflow() then
    raise exception 'use_approval_workflow';
  end if;
  if old.status in ('approved', 'superseded') and new.status is distinct from old.status and not private.via_workflow() then
    raise exception 'approved_pattern_locked';
  end if;
  return new;
end;
$$;
create trigger pattern_pieces_guard before insert or update on public.pattern_pieces for each row execute function private.pattern_guard();

create or replace function private.marker_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' and new.status = 'verified' then raise exception 'use_approval_workflow'; end if;
  if tg_op = 'UPDATE' then
    if old.status = 'verified' and not private.via_workflow() then raise exception 'verified_marker_locked'; end if;
    if new.status = 'verified' and old.status <> 'verified' and not private.via_workflow() then raise exception 'use_approval_workflow'; end if;
  end if;
  return new;
end;
$$;
create trigger cutting_layouts_guard before insert or update on public.cutting_layouts for each row execute function private.marker_guard();

-- Batches: created as drafts; every status change goes through the workflow.
create or replace function private.batch_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' and new.status <> 'draft' then raise exception 'batches_start_as_draft'; end if;
  if tg_op = 'UPDATE' then
    if new.status is distinct from old.status and not private.via_workflow() then raise exception 'use_production_workflow'; end if;
    if old.status <> 'draft' and not private.via_workflow()
       and (new.design_id, new.size, new.quantity, new.design_version) is distinct from (old.design_id, old.size, old.quantity, old.design_version) then
      raise exception 'approved_batch_locked';
    end if;
    new.updated_at := now();
  end if;
  return new;
end;
$$;
create trigger production_batches_guard before insert or update on public.production_batches for each row execute function private.batch_guard();

create or replace function private.qc_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  if not private.via_workflow() then raise exception 'use_qc_workflow'; end if;
  return coalesce(new, old);
end;
$$;
create trigger quality_inspections_guard before insert or update on public.quality_inspections for each row execute function private.qc_guard();

-- ───────────────────────── Row Level Security ─────────────────────────
do $$
declare t text;
begin
  foreach t in array array['garment_designs', 'design_versions', 'size_charts', 'size_measurements', 'pattern_pieces', 'cutting_layouts', 'design_bom',
    'production_batches', 'production_batch_items', 'production_tasks', 'worker_assignments', 'production_task_notes', 'material_consumption',
    'quality_inspections', 'design_approvals', 'atelier_audit_log'] loop
    execute format('alter table public.%I enable row level security', t);
    if t <> 'atelier_audit_log' then
      execute format('create policy "%s: admin manage" on public.%I for all using (public.is_admin()) with check (public.is_admin())', t, t);
    end if;
  end loop;
end $$;

create policy "audit: admin read" on public.atelier_audit_log for select using (public.is_admin());

-- Workers read only what their assignments need. All worker writes go through functions.
create policy "tasks: assigned read" on public.production_tasks for select using (private.assigned_to_task(id));
create policy "assignments: own read" on public.worker_assignments for select using (team_member_id = private.atelier_member());
create policy "batches: assigned or qc read" on public.production_batches for select using (
  private.assigned_to_batch(id) or (status = 'quality_check' and private.can_inspect_qc())
);
create policy "designs: approved for assigned or reviewers" on public.garment_designs for select using (
  (status = 'approved' and private.assigned_design_size(id, null)) or private.can_approve_patterns() or private.can_inspect_qc()
);
create policy "versions: reviewers read" on public.design_versions for select using (private.can_approve_patterns() or private.assigned_design_size(design_id, null));
create policy "patterns: approved for assigned, all for pattern master" on public.pattern_pieces for select using (
  (status = 'approved' and private.assigned_design_size(design_id, size)) or private.can_approve_patterns()
);
create policy "charts: approved read" on public.size_charts for select using (auth.uid() is not null and (status = 'approved' or private.can_approve_patterns()));
create policy "measurements: approved read" on public.size_measurements for select using (
  auth.uid() is not null and exists (select 1 from public.size_charts c where c.id = size_chart_id and (c.status = 'approved' or private.can_approve_patterns()))
);
create policy "bom: assigned read" on public.design_bom for select using (private.assigned_design_size(design_id, null));
create policy "layouts: assigned verified read" on public.cutting_layouts for select using (
  (status = 'verified' and private.assigned_design_size(design_id, size)) or private.can_approve_patterns()
);
create policy "notes: assigned read" on public.production_task_notes for select using (author = auth.uid() or private.assigned_to_task(task_id));
create policy "qc: inspector read" on public.quality_inspections for select using (inspector = auth.uid());

-- ───────────────────────── Workflow functions ─────────────────────────
create or replace function private.begin_workflow() returns void language sql as $$
  select set_config('atelier.workflow', 'on', true);
$$;

create or replace function public.atelier_set_design_status(p_design uuid, p_status text, p_comment text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v public.garment_designs;
begin
  if not public.is_admin() then raise exception 'admin_only'; end if;
  if p_status not in ('draft', 'sample', 'approved', 'archived') then raise exception 'invalid_status'; end if;
  select * into v from public.garment_designs where id = p_design for update;
  if not found then raise exception 'not_found'; end if;
  perform private.begin_workflow();
  update public.garment_designs
    set status = p_status,
        approved_by = case when p_status = 'approved' then auth.uid() else approved_by end,
        approved_at = case when p_status = 'approved' then now() else approved_at end
    where id = p_design;
  update public.design_versions set status = p_status where design_id = p_design and version = v.current_version;
  if p_status = 'approved' or v.status = 'approved' then
    insert into public.design_approvals (subject, design_id, design_version, decision, comment)
      values ('design', p_design, v.current_version, case when p_status = 'approved' then 'approved' else 'changes_requested' end, p_comment);
  end if;
end;
$$;

create or replace function public.atelier_approve_size_chart(p_chart uuid, p_comment text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_count int; v_cat text;
begin
  if not private.can_approve_patterns() then raise exception 'pattern_master_only'; end if;
  select category into v_cat from public.size_charts where id = p_chart and status = 'draft' for update;
  if not found then raise exception 'not_found'; end if;
  select count(*) into v_count from public.size_measurements where size_chart_id = p_chart;
  if v_count = 0 then raise exception 'size_chart_empty'; end if;
  perform private.begin_workflow();
  update public.size_charts set status = 'archived' where category = v_cat and status = 'approved' and id <> p_chart;
  update public.size_charts set status = 'approved', approved_by = auth.uid(), approved_at = now() where id = p_chart;
  insert into public.design_approvals (subject, size_chart_id, decision, comment) values ('size_chart', p_chart, 'approved', p_comment);
end;
$$;

-- New editable version of a chart (approved charts stay locked).
create or replace function public.atelier_clone_size_chart(p_chart uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare v public.size_charts; v_new uuid; v_ver int;
begin
  if not public.is_admin() then raise exception 'admin_only'; end if;
  select * into v from public.size_charts where id = p_chart;
  if not found then raise exception 'not_found'; end if;
  select coalesce(max(version), 0) + 1 into v_ver from public.size_charts where category = v.category;
  insert into public.size_charts (category, name, version, unit, notes) values (v.category, v.name, v_ver, v.unit, v.notes) returning id into v_new;
  insert into public.size_measurements (size_chart_id, size, bust, waist, shoulder, blouse_length, armhole, sleeve_length, neck_depth_front, neck_depth_back, ease, seam_allowance)
    select v_new, size, bust, waist, shoulder, blouse_length, armhole, sleeve_length, neck_depth_front, neck_depth_back, ease, seam_allowance
    from public.size_measurements where size_chart_id = p_chart;
  return v_new;
end;
$$;

create or replace function public.atelier_review_pattern(p_piece uuid, p_decision text, p_comment text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v public.pattern_pieces;
begin
  if not private.can_approve_patterns() then raise exception 'pattern_master_only'; end if;
  if p_decision not in ('approved', 'rejected', 'changes_requested') then raise exception 'invalid_decision'; end if;
  select * into v from public.pattern_pieces where id = p_piece for update;
  if not found then raise exception 'not_found'; end if;
  if v.status not in ('draft', 'in_review') then raise exception 'pattern_not_in_review'; end if;
  if p_decision = 'approved' and not exists (select 1 from public.size_charts where id = v.size_chart_id and status = 'approved') then
    raise exception 'size_chart_not_approved';
  end if;
  perform private.begin_workflow();
  if p_decision = 'approved' then
    update public.pattern_pieces set status = 'superseded'
      where design_id = v.design_id and size = v.size and piece_type = v.piece_type and status = 'approved' and id <> p_piece;
    update public.pattern_pieces set status = 'approved', approved_by = auth.uid(), approved_at = now() where id = p_piece;
  else
    update public.pattern_pieces set status = case when p_decision = 'rejected' then 'rejected' else 'draft' end where id = p_piece;
  end if;
  insert into public.design_approvals (subject, design_id, design_version, pattern_piece_id, decision, comment)
    values ('pattern', v.design_id, v.design_version, p_piece, p_decision, p_comment);
end;
$$;

create or replace function public.atelier_submit_pattern(p_piece uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'admin_only'; end if;
  update public.pattern_pieces set status = 'in_review' where id = p_piece and status in ('draft', 'rejected');
  if not found then raise exception 'pattern_not_draft'; end if;
end;
$$;

create or replace function public.atelier_verify_marker(p_layout uuid, p_comment text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v public.cutting_layouts;
begin
  if not private.can_approve_patterns() then raise exception 'pattern_master_only'; end if;
  select * into v from public.cutting_layouts where id = p_layout and status = 'estimated' for update;
  if not found then raise exception 'not_found'; end if;
  perform private.begin_workflow();
  update public.cutting_layouts set status = 'verified', verified_by = auth.uid(), verified_at = now() where id = p_layout;
  insert into public.design_approvals (subject, design_id, cutting_layout_id, decision, comment) values ('marker', v.design_id, p_layout, 'approved', p_comment);
end;
$$;

-- Required pieces for a blouse: front, back, neck facing, and sleeve unless sleeveless.
create or replace function private.missing_patterns(p_design uuid, p_size text) returns text[]
language plpgsql stable security definer set search_path = public as $$
declare v_required text[] := array['front', 'back', 'neck_facing']; v_missing text[] := '{}'; v_piece text; v_spec jsonb;
begin
  select spec into v_spec from public.garment_designs where id = p_design;
  if coalesce(v_spec ->> 'sleeve', 'cap') <> 'sleeveless' then v_required := v_required || 'sleeve'::text; end if;
  if coalesce(v_spec ->> 'lining', '') not in ('', 'none') then v_required := v_required || array['lining_front', 'lining_back']; end if;
  foreach v_piece in array v_required loop
    if not exists (select 1 from public.pattern_pieces where design_id = p_design and size = p_size and piece_type = v_piece and status = 'approved') then
      v_missing := v_missing || v_piece;
    end if;
  end loop;
  return v_missing;
end;
$$;

create or replace function public.atelier_approve_batch(p_batch uuid)
returns void language plpgsql security definer set search_path = public as $$
declare b public.production_batches; d public.garment_designs; v_missing text[]; v_mats jsonb;
begin
  if not public.is_admin() then raise exception 'admin_only'; end if;
  select * into b from public.production_batches where id = p_batch for update;
  if not found then raise exception 'not_found'; end if;
  if b.status <> 'draft' then raise exception 'batch_not_draft'; end if;
  select * into d from public.garment_designs where id = b.design_id;
  if d.status <> 'approved' then raise exception 'design_not_approved'; end if;
  if not exists (select 1 from public.size_charts where category = d.category and status = 'approved') then raise exception 'size_chart_not_approved'; end if;
  v_missing := private.missing_patterns(b.design_id, b.size);
  if array_length(v_missing, 1) > 0 then raise exception 'patterns_not_approved:%', array_to_string(v_missing, ','); end if;

  perform private.begin_workflow();
  update public.production_batches set status = 'approved', design_version = d.current_version where id = p_batch;
  insert into public.production_batch_items (batch_id, item_no) select p_batch, g from generate_series(1, b.quantity) g on conflict do nothing;

  select coalesce(jsonb_agg(jsonb_build_object('item', bo.item_type, 'material', coalesce(m.name, bo.description), 'unit', bo.unit,
           'per_piece', bo.qty_per_piece)), '[]'::jsonb)
    into v_mats from public.design_bom bo left join public.materials m on m.id = bo.material_id where bo.design_id = b.design_id;

  insert into public.production_tasks (batch_id, stage, title, instructions, quantity, materials) values
    (p_batch, 'cutting', 'Cut ' || d.name || ' · size ' || b.size, 'Cut using the approved pattern set and the verified marker only. Check grainline and notches on every piece.', b.quantity, v_mats),
    (p_batch, 'stitching', 'Stitch ' || d.name || ' · size ' || b.size, coalesce(d.spec ->> 'instructions', 'Follow the approved design specification.'), b.quantity, v_mats),
    (p_batch, 'finishing', 'Finish & press ' || d.name || ' · size ' || b.size, 'Hooks, hems, pressing and trims as per the approved specification.', b.quantity, v_mats);
end;
$$;

create or replace function public.atelier_reserve_materials(p_batch uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare b public.production_batches; r record; v_need numeric; v_marker public.cutting_layouts; v_out jsonb := '[]'::jsonb; v_role text; v_stock numeric;
begin
  if not public.is_admin() then raise exception 'admin_only'; end if;
  select * into b from public.production_batches where id = p_batch for update;
  if not found then raise exception 'not_found'; end if;
  if b.status <> 'approved' then raise exception 'batch_not_approved'; end if;
  if not exists (select 1 from public.design_bom where design_id = b.design_id) then raise exception 'bom_missing'; end if;

  for r in select bo.*, m.name as material_name from public.design_bom bo
           left join public.materials m on m.id = bo.material_id where bo.design_id = b.design_id loop
    if r.material_id is null then raise exception 'bom_material_not_linked:%', r.item_type; end if;
    if r.item_type in ('main_fabric', 'lining') then
      v_role := case when r.item_type = 'main_fabric' then 'main' else 'lining' end;
      select * into v_marker from public.cutting_layouts
        where design_id = b.design_id and size = b.size and fabric_role = v_role and status = 'verified'
        order by verified_at desc limit 1;
      if not found then raise exception 'marker_not_verified:%', r.item_type; end if;
      v_need := round((v_marker.marker_length_cm / 100.0) * ceil(b.quantity::numeric / v_marker.pieces_per_marker) * (1 + v_marker.shrinkage_pct / 100.0), 3);
    else
      v_need := round(r.qty_per_piece * b.quantity * (1 + r.wastage_pct / 100.0), 3);
    end if;
    select quantity into v_stock from public.materials where id = r.material_id for update;
    if v_stock < v_need then raise exception 'insufficient_stock:%', r.material_name; end if;
    update public.materials set quantity = quantity - v_need where id = r.material_id;
    insert into public.material_consumption (batch_id, bom_id, material_id, kind, quantity, unit, basis)
      values (p_batch, r.id, r.material_id, 'reserved', v_need, r.unit, case when r.item_type in ('main_fabric', 'lining') then 'verified_marker' else 'bom' end);
    v_out := v_out || jsonb_build_object('material', r.material_name, 'quantity', v_need, 'unit', r.unit);
  end loop;

  perform private.begin_workflow();
  update public.production_batches set status = 'material_reserved' where id = p_batch;
  return v_out;
end;
$$;

-- Moves a batch through cutting → stitching → finishing → quality check.
create or replace function public.atelier_advance_batch(p_batch uuid)
returns text language plpgsql security definer set search_path = public as $$
declare b public.production_batches; v_next text; v_stage text;
begin
  if not public.is_admin() then raise exception 'admin_only'; end if;
  select * into b from public.production_batches where id = p_batch for update;
  if not found then raise exception 'not_found'; end if;
  v_next := case b.status when 'material_reserved' then 'cutting' when 'cutting' then 'stitching' when 'stitching' then 'finishing' when 'finishing' then 'quality_check' end;
  if v_next is null then raise exception 'cannot_advance_from:%', b.status; end if;
  v_stage := case when b.status in ('cutting', 'stitching', 'finishing') then b.status end;
  if v_stage is not null and exists (select 1 from public.production_tasks where batch_id = p_batch and stage in (v_stage, 'rework') and status <> 'done') then
    raise exception 'stage_tasks_open:%', v_stage;
  end if;
  perform private.begin_workflow();
  update public.production_batches set status = v_next where id = p_batch;
  return v_next;
end;
$$;

create or replace function public.atelier_record_qc(p_batch uuid, p_checklist jsonb, p_result text, p_approved int, p_rejected int, p_notes text default null)
returns void language plpgsql security definer set search_path = public as $$
declare b public.production_batches;
begin
  if not private.can_inspect_qc() then raise exception 'qc_inspector_only'; end if;
  if private.assigned_to_batch(p_batch) then raise exception 'cannot_inspect_own_work'; end if;
  if p_result not in ('approved', 'rejected', 'rework_required') then raise exception 'invalid_result'; end if;
  select * into b from public.production_batches where id = p_batch for update;
  if not found then raise exception 'not_found'; end if;
  if b.status <> 'quality_check' then raise exception 'batch_not_in_qc'; end if;
  if coalesce(p_approved, 0) + coalesce(p_rejected, 0) > b.quantity then raise exception 'qc_quantity_exceeds_batch'; end if;
  if p_result = 'approved' and coalesce(p_approved, 0) < 1 then raise exception 'qc_approved_quantity_required'; end if;
  if jsonb_typeof(p_checklist) <> 'object' then raise exception 'qc_checklist_required'; end if;

  perform private.begin_workflow();
  insert into public.quality_inspections (batch_id, checklist, result, approved_quantity, rejected_quantity, notes)
    values (p_batch, p_checklist, p_result, case when p_result = 'approved' then p_approved else 0 end, coalesce(p_rejected, 0), p_notes);
  if p_result = 'approved' then
    update public.production_batch_items set status = 'approved' where batch_id = p_batch and item_no <= p_approved;
    update public.production_batch_items set status = 'rejected' where batch_id = p_batch and item_no > p_approved;
    update public.production_batches set status = 'completed' where id = p_batch;
  elsif p_result = 'rework_required' then
    insert into public.production_tasks (batch_id, stage, title, instructions, quantity)
      values (p_batch, 'rework', 'Rework · ' || b.batch_no, coalesce(p_notes, 'See QC notes.'), greatest(coalesce(p_rejected, 0), 1));
    update public.production_batch_items set status = 'rework' where batch_id = p_batch;
    update public.production_batches set status = 'stitching' where id = p_batch;
  else
    update public.production_batch_items set status = 'rejected' where batch_id = p_batch;
  end if;
end;
$$;

-- Only QC-approved quantity is added to finished inventory, exactly once.
create or replace function public.atelier_receive_stock(p_batch uuid)
returns int language plpgsql security definer set search_path = public as $$
declare b public.production_batches; v_qty int;
begin
  if not public.is_admin() then raise exception 'admin_only'; end if;
  select * into b from public.production_batches where id = p_batch for update;
  if not found then raise exception 'not_found'; end if;
  if b.status <> 'completed' then raise exception 'batch_not_completed'; end if;
  if b.product_variant_id is null then raise exception 'variant_required'; end if;
  select approved_quantity into v_qty from public.quality_inspections
    where batch_id = p_batch and result = 'approved' order by inspected_at desc limit 1;
  if coalesce(v_qty, 0) < 1 then raise exception 'no_qc_approved_quantity'; end if;
  insert into public.inventory (variant_id, quantity) values (b.product_variant_id, v_qty)
    on conflict (variant_id) do update set quantity = public.inventory.quantity + excluded.quantity, updated_at = now();
  perform private.begin_workflow();
  update public.production_batches set status = 'stock_received' where id = p_batch;
  return v_qty;
end;
$$;

-- Worker actions on their own assigned tasks.
create or replace function public.atelier_worker_task(p_task uuid, p_action text, p_photo text default null)
returns text language plpgsql security definer set search_path = public as $$
declare t public.production_tasks; b public.production_batches; v_mins int := 0;
begin
  if not private.assigned_to_task(p_task) then raise exception 'not_assigned'; end if;
  select * into t from public.production_tasks where id = p_task for update;
  select * into b from public.production_batches where id = t.batch_id;
  if b.status in ('draft', 'approved', 'completed', 'stock_received') then raise exception 'batch_not_in_production'; end if;
  if t.last_resumed_at is not null then v_mins := greatest(0, floor(extract(epoch from now() - t.last_resumed_at) / 60)::int); end if;
  if p_action = 'start' then
    if t.status not in ('todo', 'paused', 'blocked') then raise exception 'invalid_transition'; end if;
    update public.production_tasks set status = 'in_progress', started_at = coalesce(started_at, now()), last_resumed_at = now() where id = p_task;
  elsif p_action = 'pause' then
    if t.status <> 'in_progress' then raise exception 'invalid_transition'; end if;
    update public.production_tasks set status = 'paused', minutes_worked = minutes_worked + v_mins, last_resumed_at = null where id = p_task;
  elsif p_action = 'complete' then
    if t.status <> 'in_progress' then raise exception 'invalid_transition'; end if;
    if p_photo is not null and (p_photo !~ '^data:image/(jpeg|png|webp);base64,' or char_length(p_photo) > 1500000) then raise exception 'invalid_photo'; end if;
    update public.production_tasks set status = 'done', completed_at = now(), minutes_worked = minutes_worked + v_mins, last_resumed_at = null,
      completion_photo = coalesce(p_photo, completion_photo) where id = p_task;
  else
    raise exception 'invalid_action';
  end if;
  return p_action;
end;
$$;

create or replace function public.atelier_worker_report(p_task uuid, p_kind text, p_message text, p_material uuid default null, p_quantity numeric default null)
returns void language plpgsql security definer set search_path = public as $$
declare t public.production_tasks;
begin
  if not (private.assigned_to_task(p_task) or public.is_admin()) then raise exception 'not_assigned'; end if;
  if p_kind not in ('clarification', 'shortage', 'reply', 'note') then raise exception 'invalid_kind'; end if;
  if p_kind = 'reply' and not public.is_admin() then raise exception 'admin_only'; end if;
  select * into t from public.production_tasks where id = p_task;
  if not found then raise exception 'not_found'; end if;
  insert into public.production_task_notes (task_id, kind, message, material_id, quantity) values (p_task, p_kind, left(p_message, 2000), p_material, p_quantity);
  if p_kind = 'shortage' then
    insert into public.material_consumption (batch_id, material_id, kind, quantity, basis, note)
      values (t.batch_id, p_material, 'shortage_report', coalesce(p_quantity, 0), 'manual', left(p_message, 500));
    update public.production_tasks set status = 'blocked' where id = p_task and status in ('todo', 'paused');
  end if;
end;
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'atelier_set_design_status(uuid, text, text)', 'atelier_approve_size_chart(uuid, text)', 'atelier_clone_size_chart(uuid)',
    'atelier_review_pattern(uuid, text, text)', 'atelier_submit_pattern(uuid)', 'atelier_verify_marker(uuid, text)',
    'atelier_approve_batch(uuid)', 'atelier_reserve_materials(uuid)', 'atelier_advance_batch(uuid)',
    'atelier_record_qc(uuid, jsonb, text, int, int, text)', 'atelier_receive_stock(uuid)',
    'atelier_worker_task(uuid, text, text)', 'atelier_worker_report(uuid, text, text, uuid, numeric)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
revoke all on function private.missing_patterns(uuid, text) from public, anon, authenticated;
revoke all on function private.begin_workflow() from public, anon, authenticated;
