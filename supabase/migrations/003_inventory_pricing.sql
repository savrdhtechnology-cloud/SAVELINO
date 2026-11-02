-- SAVLINO · Inventory & Price Manager
-- Cost prices live in their own staff-only table so shoppers can never read them.

alter table public.products add column if not exists low_stock_at int not null default 3 check (low_stock_at >= 0);

create table if not exists public.product_costs (
  product_id uuid primary key references public.products (id) on delete cascade,
  cost_price int not null default 0 check (cost_price >= 0),
  updated_at timestamptz not null default now()
);

-- Every change to price, MRP, cost or stock (who, when, old → new).
create table if not exists public.product_history (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  field text not null check (field in ('price', 'compare_at_price', 'cost_price', 'stock')),
  old_value int,
  new_value int,
  reason text not null default 'manual',
  changed_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists product_history_idx on public.product_history (product_id, created_at desc);
create index if not exists product_history_time_idx on public.product_history (created_at desc);

alter table public.product_costs enable row level security;
alter table public.product_history enable row level security;
drop policy if exists "costs: staff" on public.product_costs;
create policy "costs: staff" on public.product_costs for all to authenticated using (public.is_staff()) with check (public.is_staff());
drop policy if exists "history: staff read" on public.product_history;
create policy "history: staff read" on public.product_history for select to authenticated using (public.is_staff());
grant select, insert, update, delete on public.product_costs to authenticated;
grant select on public.product_history to authenticated;

create or replace function public.log_product_changes() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_reason text := coalesce(nullif(current_setting('savlino.reason', true), ''), 'manual');
begin
  if new.price is distinct from old.price then
    insert into product_history (product_id, field, old_value, new_value, reason) values (new.id, 'price', old.price, new.price, v_reason);
  end if;
  if new.compare_at_price is distinct from old.compare_at_price then
    insert into product_history (product_id, field, old_value, new_value, reason) values (new.id, 'compare_at_price', old.compare_at_price, new.compare_at_price, v_reason);
  end if;
  if new.stock is distinct from old.stock then
    insert into product_history (product_id, field, old_value, new_value, reason) values (new.id, 'stock', old.stock, new.stock, v_reason);
  end if;
  return new;
end;
$$;
drop trigger if exists products_history on public.products;
create trigger products_history after update of price, compare_at_price, stock on public.products
  for each row execute function public.log_product_changes();

create or replace function public.log_cost_changes() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' or new.cost_price is distinct from old.cost_price then
    insert into product_history (product_id, field, old_value, new_value)
    values (new.product_id, 'cost_price', case when tg_op = 'UPDATE' then old.cost_price end, new.cost_price);
  end if;
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists product_costs_history on public.product_costs;
create trigger product_costs_history before insert or update on public.product_costs
  for each row execute function public.log_cost_changes();

-- Orders take stock out; a cancelled order puts it back.
create or replace function public.order_stock() returns trigger
language plpgsql security definer set search_path = public as $$
declare it jsonb; v_sign int;
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
  perform set_config('savlino.reason', case when v_sign < 0 then 'order ' else 'cancelled ' end || new.order_no, true);
  for it in select * from jsonb_array_elements(coalesce(new.items, '[]'::jsonb)) loop
    update products set stock = greatest(0, stock + v_sign * greatest(0, coalesce((it ->> 'qty')::int, 0)))
    where id = (it ->> 'productId')::uuid;
  end loop;
  perform set_config('savlino.reason', '', true);
  return new;
end;
$$;
drop trigger if exists orders_stock on public.orders;
create trigger orders_stock after insert or update of status on public.orders
  for each row execute function public.order_stock();

notify pgrst, 'reload schema';
