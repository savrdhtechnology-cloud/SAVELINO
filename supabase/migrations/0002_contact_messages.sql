-- Reconstructed from SAVLINO live Supabase schema (2026-10-10).
-- Remote migration history: 20261010074205 / 0002_contact_messages.
-- Idempotent schema reconciliation; original migration source was not in GitHub.
create table if not exists public.contact_messages (
 id uuid primary key default gen_random_uuid(),
 name text not null,
 email text not null,
 phone text,
 topic text not null,
 message text not null,
 handled boolean not null default false,
 created_at timestamptz not null default now()
);
alter table public.contact_messages enable row level security;
-- Do not grant public SELECT/UPDATE. Submissions should use a validated server endpoint.
