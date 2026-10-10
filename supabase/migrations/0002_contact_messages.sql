-- Contact form inbox: anyone may submit, only admins may read.
create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  email text not null check (char_length(email) between 3 and 200),
  phone text check (phone is null or char_length(phone) <= 30),
  topic text not null check (char_length(topic) <= 60),
  message text not null check (char_length(message) between 10 and 4000),
  handled boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.contact_messages enable row level security;

create policy "contact: anyone can submit" on public.contact_messages
  for insert to anon, authenticated with check (handled = false);
create policy "contact: admin read" on public.contact_messages
  for select using (public.is_admin());
create policy "contact: admin update" on public.contact_messages
  for update using (public.is_admin()) with check (public.is_admin());
