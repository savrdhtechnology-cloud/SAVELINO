create table public.dpr_assumptions (
  id boolean primary key default true check (id),
  assumptions jsonb not null default '{}'::jsonb check (jsonb_typeof(assumptions) = 'object'),
  revision integer not null default 0 check (revision >= 0)
);

insert into public.dpr_assumptions (id) values (true);
alter table public.dpr_assumptions enable row level security;
revoke all on public.dpr_assumptions from anon, authenticated;
grant select, update on public.dpr_assumptions to authenticated;

create policy "Admins can view the DPR" on public.dpr_assumptions
  for select to authenticated using (public.is_admin());

create policy "Admins can update the DPR" on public.dpr_assumptions
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
