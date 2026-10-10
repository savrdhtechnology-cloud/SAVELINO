-- Scopes the workflow flag to the function that set it, so a guarded change made
-- later in the same transaction can never ride on an earlier approval.

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
  perform set_config('atelier.workflow', 'off', true);
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
  perform set_config('atelier.workflow', 'off', true);
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
  perform set_config('atelier.workflow', 'off', true);
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
  perform set_config('atelier.workflow', 'off', true);
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
  perform set_config('atelier.workflow', 'off', true);
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
  perform set_config('atelier.workflow', 'off', true);
  return v_out;
end;
$$;

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
  perform set_config('atelier.workflow', 'off', true);
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
  perform set_config('atelier.workflow', 'off', true);
end;
$$;

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
  perform set_config('atelier.workflow', 'off', true);
  return v_qty;
end;
$$;
