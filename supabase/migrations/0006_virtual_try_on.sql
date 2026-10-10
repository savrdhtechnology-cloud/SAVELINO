-- SAVLINO Virtual Try-On Studio — Phase 1.
-- Customer photos never live in a public bucket: inputs are stored down-scaled in
-- Postgres and are only readable by the session owner (signed-in customer or the
-- holder of the session's private guest token) and administrators.
-- All writes go through SECURITY DEFINER functions that check ownership.

create table public.virtual_try_on_sessions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references auth.users (id) on delete set null,
  guest_id uuid,
  product_id text not null,
  product_name text,
  product_variant_id uuid references public.product_variants (id) on delete set null,
  selected_size text,
  selected_color text,
  mode text not null default 'quick' check (mode in ('quick', 'premium')),
  category text,
  consent_accepted boolean not null check (consent_accepted),
  consent_version text not null,
  status text not null default 'draft' check (status in ('draft', 'uploaded', 'processing', 'completed', 'failed', 'deleted')),
  processing_provider text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (customer_id is not null or guest_id is not null)
);
create index on public.virtual_try_on_sessions (customer_id);
create index on public.virtual_try_on_sessions (guest_id);
create index on public.virtual_try_on_sessions (product_id);

create table public.virtual_try_on_inputs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.virtual_try_on_sessions (id) on delete cascade,
  image_type text not null check (image_type in ('front', 'left', 'right', 'back', 'selfie', 'other')),
  image_url text not null check (image_url ~ '^data:image/(jpeg|png|webp);base64,' and char_length(image_url) <= 3000000),
  image_width int check (image_width between 1 and 8000),
  image_height int check (image_height between 1 and 8000),
  uploaded_at timestamptz not null default now(),
  unique (session_id, image_type)
);

create table public.virtual_try_on_outputs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.virtual_try_on_sessions (id) on delete cascade,
  output_view text not null check (output_view in ('front', 'left', 'right', 'back')),
  image_url text,
  generated_at timestamptz not null default now(),
  provider_response_meta jsonb,
  unique (session_id, output_view)
);

create table public.virtual_try_on_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.virtual_try_on_sessions (id) on delete cascade,
  event_type text not null check (char_length(event_type) <= 60),
  event_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index on public.virtual_try_on_events (session_id);
create index on public.virtual_try_on_events (event_type);

create table public.virtual_try_on_saved_looks (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.virtual_try_on_sessions (id) on delete cascade,
  customer_id uuid not null references auth.users (id) on delete cascade,
  saved_at timestamptz not null default now(),
  unique (session_id, customer_id)
);

create table public.virtual_try_on_conversion (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references public.virtual_try_on_sessions (id) on delete cascade,
  added_to_cart boolean not null default false,
  cart_id text,
  converted_to_order boolean not null default false,
  order_id uuid references public.orders (id) on delete set null,
  converted_at timestamptz
);

-- ───────── Row Level Security (reads only; writes happen in the functions below) ─────────
alter table public.virtual_try_on_sessions enable row level security;
alter table public.virtual_try_on_inputs enable row level security;
alter table public.virtual_try_on_outputs enable row level security;
alter table public.virtual_try_on_events enable row level security;
alter table public.virtual_try_on_saved_looks enable row level security;
alter table public.virtual_try_on_conversion enable row level security;

create policy "tryon sessions: owner or admin read" on public.virtual_try_on_sessions
  for select using ((customer_id = auth.uid() and status <> 'deleted') or public.is_admin());
create policy "tryon sessions: admin manage" on public.virtual_try_on_sessions
  for update using (public.is_admin()) with check (public.is_admin());

create policy "tryon inputs: owner or admin read" on public.virtual_try_on_inputs for select using (
  public.is_admin() or exists (select 1 from public.virtual_try_on_sessions s where s.id = session_id and s.customer_id = auth.uid())
);
create policy "tryon outputs: owner or admin read" on public.virtual_try_on_outputs for select using (
  public.is_admin() or exists (select 1 from public.virtual_try_on_sessions s where s.id = session_id and s.customer_id = auth.uid())
);
create policy "tryon events: admin read" on public.virtual_try_on_events for select using (public.is_admin());
create policy "tryon saved: owner or admin read" on public.virtual_try_on_saved_looks
  for select using (customer_id = auth.uid() or public.is_admin());
create policy "tryon conversion: owner or admin read" on public.virtual_try_on_conversion for select using (
  public.is_admin() or exists (select 1 from public.virtual_try_on_sessions s where s.id = session_id and s.customer_id = auth.uid())
);

-- ───────── Access helper ─────────
create schema if not exists private;

create or replace function private.tryon_can_access(p_session uuid, p_guest uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.virtual_try_on_sessions s
    where s.id = p_session
      and s.status <> 'deleted'
      and (
        (auth.uid() is not null and s.customer_id = auth.uid())
        or (p_guest is not null and s.guest_id = p_guest)
        or public.is_admin()
      )
  );
$$;
revoke all on function private.tryon_can_access(uuid, uuid) from public, anon, authenticated;

-- ───────── API functions ─────────
create or replace function public.tryon_create_session(
  p_guest uuid, p_product_id text, p_product_name text, p_category text,
  p_size text, p_color text, p_mode text, p_consent boolean, p_consent_version text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  if not coalesce(p_consent, false) then raise exception 'consent_required'; end if;
  if p_category is null or p_category not in ('designer-blouses', 'ready-made-blouses', 'salwar-suits', 'sarees', 'loungewear') then
    raise exception 'category_not_enabled';
  end if;
  if auth.uid() is null and p_guest is null then raise exception 'guest_token_required'; end if;
  insert into public.virtual_try_on_sessions
    (customer_id, guest_id, product_id, product_name, category, selected_size, selected_color, mode, consent_accepted, consent_version)
  values
    (auth.uid(), case when auth.uid() is null then p_guest else null end, left(p_product_id, 120), left(p_product_name, 200),
     p_category, left(p_size, 20), left(p_color, 40), coalesce(nullif(p_mode, ''), 'quick'), true, left(p_consent_version, 20))
  returning id into v_id;
  insert into public.virtual_try_on_events (session_id, event_type, event_data)
    values (v_id, 'session_created', jsonb_build_object('mode', p_mode, 'size', p_size, 'color', p_color));
  insert into public.virtual_try_on_conversion (session_id) values (v_id);
  return v_id;
end;
$$;

create or replace function public.tryon_add_input(p_session uuid, p_guest uuid, p_type text, p_data text, p_width int, p_height int)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not private.tryon_can_access(p_session, p_guest) then raise exception 'not_found'; end if;
  insert into public.virtual_try_on_inputs (session_id, image_type, image_url, image_width, image_height)
    values (p_session, p_type, p_data, p_width, p_height)
  on conflict (session_id, image_type) do update
    set image_url = excluded.image_url, image_width = excluded.image_width, image_height = excluded.image_height, uploaded_at = now();
  update public.virtual_try_on_sessions set status = 'uploaded', updated_at = now()
    where id = p_session and status in ('draft', 'uploaded', 'failed');
  insert into public.virtual_try_on_events (session_id, event_type, event_data)
    values (p_session, 'image_uploaded', jsonb_build_object('type', p_type, 'width', p_width, 'height', p_height));
end;
$$;

create or replace function public.tryon_set_status(p_session uuid, p_guest uuid, p_status text, p_provider text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not private.tryon_can_access(p_session, p_guest) then raise exception 'not_found'; end if;
  if p_status not in ('processing', 'failed') then raise exception 'invalid_status'; end if;
  update public.virtual_try_on_sessions
    set status = p_status, processing_provider = coalesce(left(p_provider, 40), processing_provider), updated_at = now()
    where id = p_session;
end;
$$;

-- Records generated views. p_outputs: [{ "view": "front", "image_url": "...", "meta": {...} }, …]
create or replace function public.tryon_record_outputs(p_session uuid, p_guest uuid, p_provider text, p_outputs jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare o jsonb;
begin
  if not private.tryon_can_access(p_session, p_guest) then raise exception 'not_found'; end if;
  if not exists (select 1 from public.virtual_try_on_inputs where session_id = p_session) then raise exception 'no_inputs'; end if;
  for o in select * from jsonb_array_elements(coalesce(p_outputs, '[]'::jsonb)) loop
    insert into public.virtual_try_on_outputs (session_id, output_view, image_url, provider_response_meta)
      values (p_session, o ->> 'view', nullif(o ->> 'image_url', ''), o -> 'meta')
    on conflict (session_id, output_view) do update
      set image_url = excluded.image_url, provider_response_meta = excluded.provider_response_meta, generated_at = now();
  end loop;
  update public.virtual_try_on_sessions
    set status = 'completed', processing_provider = left(p_provider, 40), updated_at = now()
    where id = p_session;
  insert into public.virtual_try_on_events (session_id, event_type, event_data)
    values (p_session, 'preview_generated', jsonb_build_object('provider', p_provider, 'views', jsonb_array_length(coalesce(p_outputs, '[]'::jsonb))));
end;
$$;

create or replace function public.tryon_get(p_session uuid, p_guest uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare v jsonb;
begin
  if not private.tryon_can_access(p_session, p_guest) then return null; end if;
  select jsonb_build_object(
    'session', to_jsonb(s) - 'guest_id',
    'inputs', coalesce((select jsonb_agg(jsonb_build_object('type', i.image_type, 'image_url', i.image_url, 'width', i.image_width, 'height', i.image_height) order by i.uploaded_at)
                        from public.virtual_try_on_inputs i where i.session_id = s.id), '[]'::jsonb),
    'outputs', coalesce((select jsonb_agg(jsonb_build_object('view', o.output_view, 'image_url', o.image_url, 'meta', o.provider_response_meta) order by o.output_view)
                         from public.virtual_try_on_outputs o where o.session_id = s.id), '[]'::jsonb),
    'saved', exists (select 1 from public.virtual_try_on_saved_looks l where l.session_id = s.id and l.customer_id = auth.uid()),
    'conversion', (select to_jsonb(c) from public.virtual_try_on_conversion c where c.session_id = s.id)
  ) into v
  from public.virtual_try_on_sessions s where s.id = p_session;
  return v;
end;
$$;

create or replace function public.tryon_log_event(p_session uuid, p_guest uuid, p_type text, p_data jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not private.tryon_can_access(p_session, p_guest) then raise exception 'not_found'; end if;
  if p_type not in ('compare_original', 'try_other_color', 'try_other_size', 'download', 'share', 'custom_stitching_request', 'view_result') then
    raise exception 'invalid_event';
  end if;
  insert into public.virtual_try_on_events (session_id, event_type, event_data) values (p_session, p_type, coalesce(p_data, '{}'::jsonb));
end;
$$;

create or replace function public.tryon_save_look(p_session uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'sign_in_required'; end if;
  if not private.tryon_can_access(p_session, null) then raise exception 'not_found'; end if;
  insert into public.virtual_try_on_saved_looks (session_id, customer_id) values (p_session, auth.uid())
    on conflict do nothing;
  insert into public.virtual_try_on_events (session_id, event_type) values (p_session, 'saved_look');
end;
$$;

-- Records the customer's intent to buy after trying on. There is no live cart yet,
-- so cart_id stays null; order conversion is set later only from a real order.
create or replace function public.tryon_add_to_cart(p_session uuid, p_guest uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not private.tryon_can_access(p_session, p_guest) then raise exception 'not_found'; end if;
  insert into public.virtual_try_on_conversion (session_id, added_to_cart) values (p_session, true)
    on conflict (session_id) do update set added_to_cart = true;
  insert into public.virtual_try_on_events (session_id, event_type) values (p_session, 'add_to_cart');
end;
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'tryon_create_session(uuid, text, text, text, text, text, text, boolean, text)',
    'tryon_add_input(uuid, uuid, text, text, int, int)',
    'tryon_set_status(uuid, uuid, text, text)',
    'tryon_record_outputs(uuid, uuid, text, jsonb)',
    'tryon_get(uuid, uuid)',
    'tryon_log_event(uuid, uuid, text, jsonb)',
    'tryon_save_look(uuid)',
    'tryon_add_to_cart(uuid, uuid)'
  ] loop
    execute format('revoke all on function public.%s from public', f);
    execute format('grant execute on function public.%s to anon, authenticated', f);
  end loop;
end $$;
