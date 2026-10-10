-- Stock is held to 0.01 units, so reservations round up to the next 0.01 (never under-reserve).
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
      v_need := ceil((v_marker.marker_length_cm / 100.0) * ceil(b.quantity::numeric / v_marker.pieces_per_marker) * (1 + v_marker.shrinkage_pct / 100.0) * 100) / 100.0;
    else
      v_need := ceil(r.qty_per_piece * b.quantity * (1 + r.wastage_pct / 100.0) * 100) / 100.0;
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
  perform set_config('atelier.workflow', 'off', true);
  return v_out;
end;
$$;
