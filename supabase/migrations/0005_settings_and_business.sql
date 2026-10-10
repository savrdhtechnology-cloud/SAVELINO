-- Website settings (Studio + Settings) and business-management modules for the CRM.
-- All business tables are admin-only. site_settings is publicly readable (the website needs it).

create table public.site_settings (
  id int primary key default 1 check (id = 1),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
insert into public.site_settings (id) values (1) on conflict do nothing;

alter table public.site_settings enable row level security;
create policy "settings: public read" on public.site_settings for select using (true);
create policy "settings: admin write" on public.site_settings for update using (public.is_admin()) with check (public.is_admin());

-- Custom stitching production pipeline
create table public.stitching_orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  phone text,
  garment text not null default 'Blouse',
  design_ref text,
  fabric_source text not null default 'customer' check (fabric_source in ('customer', 'savlino')),
  stage text not null default 'enquiry' check (stage in ('enquiry', 'measurements', 'cutting', 'stitching', 'embroidery', 'trial', 'ready', 'delivered')),
  measurements jsonb not null default '{}'::jsonb,
  due_date date,
  price numeric(12, 2) check (price is null or price >= 0),
  advance_paid numeric(12, 2) not null default 0 check (advance_paid >= 0),
  assigned_to text,
  notes text,
  created_at timestamptz not null default now()
);

-- Sales pipeline
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  source text not null default 'website' check (source in ('website', 'instagram', 'whatsapp', 'walk_in', 'referral', 'exhibition', 'other')),
  interest text,
  stage text not null default 'new' check (stage in ('new', 'contacted', 'consultation', 'quoted', 'won', 'lost')),
  value numeric(12, 2) check (value is null or value >= 0),
  follow_up date,
  notes text,
  created_at timestamptz not null default now()
);

-- Team tasks
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  assignee text,
  status text not null default 'todo' check (status in ('todo', 'doing', 'review', 'done')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  due_date date,
  created_at timestamptz not null default now()
);

create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code = upper(code) and char_length(code) between 3 and 30),
  kind text not null default 'percent' check (kind in ('percent', 'flat')),
  value numeric(12, 2) not null check (value > 0),
  min_order numeric(12, 2) not null default 0,
  starts_at date,
  ends_at date,
  usage_limit int check (usage_limit is null or usage_limit > 0),
  used_count int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_person text,
  phone text,
  email text,
  city text,
  category text not null default 'fabric' check (category in ('fabric', 'embroidery', 'trims', 'packaging', 'logistics', 'other')),
  notes text,
  created_at timestamptz not null default now()
);

create table public.materials (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text,
  color text,
  supplier_name text,
  unit text not null default 'metre',
  quantity numeric(12, 2) not null default 0 check (quantity >= 0),
  reorder_level numeric(12, 2) not null default 0,
  cost_per_unit numeric(12, 2),
  created_at timestamptz not null default now()
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  spent_on date not null default current_date,
  category text not null check (category in ('fabric', 'karigar', 'rent', 'marketing', 'shipping', 'packaging', 'utilities', 'other')),
  description text,
  amount numeric(12, 2) not null check (amount > 0),
  paid_to text,
  payment_method text,
  created_at timestamptz not null default now()
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  product text,
  rating int not null check (rating between 1 and 5),
  comment text,
  status text not null default 'pending' check (status in ('pending', 'published', 'hidden')),
  created_at timestamptz not null default now()
);

create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null default 'tailor' check (role in ('karigar', 'tailor', 'designer', 'sales', 'operations', 'manager')),
  phone text,
  skills text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

do $$
declare t text;
begin
  foreach t in array array['stitching_orders', 'leads', 'tasks', 'coupons', 'suppliers', 'materials', 'expenses', 'reviews', 'team_members'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "%s: admin manage" on public.%I for all using (public.is_admin()) with check (public.is_admin())', t, t);
  end loop;
end $$;

create policy "reviews: public read published" on public.reviews for select using (status = 'published');
