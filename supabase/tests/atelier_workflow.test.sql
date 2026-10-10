-- Design & Production Studio — database workflow & role test.
-- Runs end-to-end as real roles (admin, pattern master, tailor, two QC inspectors, another
-- worker) using temporary users, then RAISES at the end so the whole transaction rolls
-- back: nothing is left in the database. Expected output: every line starts with PASS.

create or replace function pg_temp.as_user(p uuid) returns void language plpgsql as $f$
begin
  perform set_config('role', 'postgres', true);
  if p is null then return; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', p::text, true);
  perform set_config('role', 'authenticated', true);
end $f$;

create or replace function pg_temp.expect(p_label text, p_sql text, p_err text) returns text language plpgsql as $f$
begin
  execute p_sql;
  if p_err is null then return 'PASS ' || p_label; end if;
  return 'FAIL ' || p_label || ' (no error, expected ' || p_err || ')';
exception when others then
  if p_err is not null and sqlerrm like '%' || p_err || '%' then return 'PASS ' || p_label || ' [' || sqlerrm || ']'; end if;
  return 'FAIL ' || p_label || ' [' || sqlerrm || ']';
end $f$;

do $t$
declare
  r text[] := '{}';
  a uuid := gen_random_uuid(); pm uuid := gen_random_uuid(); w uuid := gen_random_uuid(); q uuid := gen_random_uuid(); q2 uuid := gen_random_uuid(); s uuid := gen_random_uuid();
  m_w uuid; m_q uuid; m_q2 uuid; m_pm uuid; m_s uuid;
  fab uuid; hook uuid; d uuid; ch uuid; b uuid; lay uuid; prod uuid; var uuid; t_cut uuid; t_st uuid; t_fin uuid; piece uuid;
  n int; n2 numeric; v text;
begin
  insert into auth.users (id, aud, role, email) values
    (a, 'authenticated', 'authenticated', 'qa-admin@savlino.test'), (pm, 'authenticated', 'authenticated', 'qa-pm@savlino.test'),
    (w, 'authenticated', 'authenticated', 'qa-worker@savlino.test'), (q, 'authenticated', 'authenticated', 'qa-qc@savlino.test'),
    (q2, 'authenticated', 'authenticated', 'qa-qc2@savlino.test'), (s, 'authenticated', 'authenticated', 'qa-other@savlino.test');
  insert into public.profiles (id, role) values (a, 'admin'), (pm, 'worker'), (w, 'worker'), (q, 'worker'), (q2, 'worker'), (s, 'worker')
    on conflict (id) do update set role = excluded.role;
  insert into public.team_members (name, role, user_id, atelier_role) values ('QA Pattern Master', 'tailor', pm, 'pattern_master') returning id into m_pm;
  insert into public.team_members (name, role, user_id, atelier_role) values ('QA Tailor', 'tailor', w, 'tailor') returning id into m_w;
  insert into public.team_members (name, role, user_id, atelier_role) values ('QA Inspector', 'tailor', q, 'qc_inspector') returning id into m_q;
  insert into public.team_members (name, role, user_id, atelier_role) values ('QA Inspector 2', 'tailor', q2, 'qc_inspector') returning id into m_q2;
  insert into public.team_members (name, role, user_id, atelier_role) values ('QA Other', 'karigar', s, 'tailor') returning id into m_s;

  perform pg_temp.as_user(a);
  insert into public.materials (name, kind, unit, quantity) values ('QA Raw silk', 'fabric', 'metre', 20) returning id into fab;
  insert into public.materials (name, kind, unit, quantity) values ('QA Hooks', 'trims', 'pcs', 100) returning id into hook;

  -- Design creation & versioning
  insert into public.garment_designs (name, spec) values ('QA Princess blouse', '{"neckline":"sweetheart","sleeve":"cap","cut":"princess","lining":"none"}') returning id into d;
  update public.garment_designs set spec = spec || '{"neckline":"boat"}' where id = d;
  select count(*) into n from public.design_versions where design_id = d;
  r := r || (case when n = 2 then 'PASS design versioning (2 versions)' else 'FAIL design versioning ' || n end);
  r := r || pg_temp.expect('direct design approval blocked', format('update public.garment_designs set status = %L where id = %L', 'approved', d), 'use_approval_workflow');

  -- Size management
  insert into public.size_charts (name) values ('QA Blouse standard') returning id into ch;
  insert into public.size_measurements (size_chart_id, size, bust, waist, shoulder, blouse_length, armhole, sleeve_length, neck_depth_front, neck_depth_back)
    values (ch, '36', 91.5, 76, 36.5, 38, 42, 15, 17.5, 16);
  perform pg_temp.as_user(w);
  r := r || pg_temp.expect('worker cannot approve size chart', format('select public.atelier_approve_size_chart(%L)', ch), 'pattern_master_only');
  update public.size_measurements set bust = 99 where size_chart_id = ch; get diagnostics n = row_count;
  r := r || (case when n = 0 then 'PASS worker cannot modify standard sizes' else 'FAIL worker edited sizes' end);
  perform pg_temp.as_user(pm);
  r := r || pg_temp.expect('pattern master approves size chart', format('select public.atelier_approve_size_chart(%L)', ch), null);
  perform pg_temp.as_user(a);
  r := r || pg_temp.expect('approved size chart locked', format('update public.size_measurements set bust = 99 where size_chart_id = %L', ch), 'approved_size_chart_locked');

  -- Approved pattern workflow
  insert into public.pattern_pieces (design_id, design_version, size_chart_id, size, piece_type, geometry)
    select d, 2, ch, '36', x, '{"paths":[]}' from unnest(array['front','back','sleeve','neck_facing']) x;
  r := r || pg_temp.expect('direct pattern approval blocked', format('update public.pattern_pieces set status = %L where design_id = %L and piece_type = %L', 'approved', d, 'front'), 'use_approval_workflow');
  for piece in select id from public.pattern_pieces where design_id = d loop perform public.atelier_submit_pattern(piece); end loop;
  perform pg_temp.as_user(w);
  select id into piece from public.pattern_pieces where design_id = d limit 1;
  r := r || (case when piece is null then 'PASS worker cannot see unapproved patterns' else 'FAIL worker sees draft patterns' end);
  perform pg_temp.as_user(a);
  select id into piece from public.pattern_pieces where design_id = d limit 1;
  perform pg_temp.as_user(w);
  r := r || pg_temp.expect('worker cannot approve pattern', format('select public.atelier_review_pattern(%L, %L)', piece, 'approved'), 'pattern_master_only');
  perform pg_temp.as_user(pm);
  for piece in select id from public.pattern_pieces where design_id = d loop perform public.atelier_review_pattern(piece, 'approved', 'QA'); end loop;
  perform pg_temp.as_user(a);
  select count(*) into n from public.pattern_pieces where design_id = d and status = 'approved';
  r := r || (case when n = 4 then 'PASS pattern master approved 4 pieces' else 'FAIL approved pieces ' || n end);
  r := r || pg_temp.expect('approved pattern geometry locked', format('update public.pattern_pieces set geometry = %L where design_id = %L', '{}', d), 'approved_pattern_locked');

  -- Production batch
  insert into public.production_batches (design_id, size, color, quantity, priority, due_date) values (d, '36', 'Wine', 5, 'high', current_date + 14) returning id into b;
  r := r || pg_temp.expect('batch needs approved design', format('select public.atelier_approve_batch(%L)', b), 'design_not_approved');
  perform public.atelier_set_design_status(d, 'approved', 'QA approval');
  r := r || pg_temp.expect('approved design spec locked', format('update public.garment_designs set spec = %L where id = %L', '{}', d), 'approved_design_locked');
  r := r || pg_temp.expect('approve batch', format('select public.atelier_approve_batch(%L)', b), null);
  select count(*) into n from public.production_tasks where batch_id = b;
  r := r || (case when n = 3 then 'PASS job cards generated (3)' else 'FAIL job cards ' || n end);
  r := r || pg_temp.expect('direct status change blocked', format('update public.production_batches set status = %L where id = %L', 'cutting', b), 'use_production_workflow');

  -- BOM, fabric calculation and stock reservation
  insert into public.design_bom (design_id, item_type, material_id, unit, qty_per_piece) values (d, 'main_fabric', fab, 'metre', 0.9), (d, 'hooks', hook, 'pcs', 6);
  r := r || pg_temp.expect('unverified fabric estimate refused', format('select public.atelier_reserve_materials(%L)', b), 'marker_not_verified');
  insert into public.cutting_layouts (design_id, size, fabric_width_cm, marker_length_cm, pieces_per_marker, shrinkage_pct) values (d, '36', 112, 160, 2, 3) returning id into lay;
  perform pg_temp.as_user(pm);
  perform public.atelier_verify_marker(lay, 'QA marker');
  perform pg_temp.as_user(a);
  r := r || pg_temp.expect('reserve materials', format('select public.atelier_reserve_materials(%L)', b), null);
  select quantity into n2 from public.materials where id = fab;
  r := r || (case when n2 = 15.05 then 'PASS fabric reserved from verified marker (1.6 m × 3 lays × 1.03 = 4.95 m)' else 'FAIL fabric stock ' || n2 end);
  select quantity into n2 from public.materials where id = hook;
  r := r || (case when n2 = 70 then 'PASS hooks reserved (30)' else 'FAIL hooks ' || n2 end);

  -- Worker assignment & role-based access
  select id into t_cut from public.production_tasks where batch_id = b and stage = 'cutting';
  select id into t_st from public.production_tasks where batch_id = b and stage = 'stitching';
  select id into t_fin from public.production_tasks where batch_id = b and stage = 'finishing';
  insert into public.worker_assignments (task_id, team_member_id) values (t_cut, m_w), (t_st, m_w), (t_fin, m_w), (t_fin, m_q);
  perform public.atelier_advance_batch(b);

  perform pg_temp.as_user(w);
  select count(*) into n from public.production_tasks; r := r || (case when n = 3 then 'PASS worker sees own 3 tasks' else 'FAIL worker tasks ' || n end);
  select count(*) into n from public.garment_designs where id = d; r := r || (case when n = 1 then 'PASS worker opens approved design' else 'FAIL worker design' end);
  select count(*) into n from public.pattern_pieces where design_id = d; r := r || (case when n = 4 then 'PASS worker views approved cutting patterns' else 'FAIL worker patterns ' || n end);
  select count(*) into n from public.payments; r := r || (case when n = 0 then 'PASS worker cannot read payments' else 'FAIL payments visible' end);
  select count(*) into n from public.commissions; r := r || (case when n = 0 then 'PASS worker cannot read commissions' else 'FAIL commissions visible' end);
  select count(*) into n from public.team_members; r := r || (case when n = 1 then 'PASS worker reads only own team record' else 'FAIL team rows visible ' || n end);
  update public.pattern_pieces set seam_allowance = 3 where design_id = d; get diagnostics n = row_count;
  r := r || (case when n = 0 then 'PASS worker cannot edit approved patterns' else 'FAIL worker edited patterns' end);
  update public.garment_designs set name = 'x' where id = d; get diagnostics n = row_count;
  r := r || (case when n = 0 then 'PASS worker cannot change design spec' else 'FAIL worker edited design' end);
  r := r || pg_temp.expect('worker starts cutting', format('select public.atelier_worker_task(%L, %L)', t_cut, 'start'), null);
  r := r || pg_temp.expect('worker pauses', format('select public.atelier_worker_task(%L, %L)', t_cut, 'pause'), null);
  r := r || pg_temp.expect('worker resumes', format('select public.atelier_worker_task(%L, %L)', t_cut, 'start'), null);
  r := r || pg_temp.expect('worker completes with photo', format('select public.atelier_worker_task(%L, %L, %L)', t_cut, 'complete', 'data:image/jpeg;base64,/9j/4AAQ'), null);
  r := r || pg_temp.expect('worker reports shortage', format('select public.atelier_worker_report(%L, %L, %L, %L, 2)', t_st, 'shortage', 'Need 2 more hook packs', hook), null);
  r := r || pg_temp.expect('worker requests clarification', format('select public.atelier_worker_report(%L, %L, %L)', t_st, 'clarification', 'Confirm piping colour'), null);

  perform pg_temp.as_user(s);
  select count(*) into n from public.production_tasks; r := r || (case when n = 0 then 'PASS other worker sees no tasks' else 'FAIL other worker sees ' || n end);
  select count(*) into n from public.production_task_notes; r := r || (case when n = 0 then 'PASS other worker cannot read notes' else 'FAIL notes visible' end);
  r := r || pg_temp.expect('other worker cannot act on task', format('select public.atelier_worker_task(%L, %L)', t_st, 'start'), 'not_assigned');

  -- Task completion drives the stages
  perform pg_temp.as_user(a);
  perform public.atelier_advance_batch(b);
  r := r || pg_temp.expect('stage cannot advance with open tasks', format('select public.atelier_advance_batch(%L)', b), 'stage_tasks_open');
  perform pg_temp.as_user(w);
  perform public.atelier_worker_task(t_st, 'start'); perform public.atelier_worker_task(t_st, 'complete');
  perform pg_temp.as_user(a);
  perform public.atelier_advance_batch(b);
  perform pg_temp.as_user(w);
  perform public.atelier_worker_task(t_fin, 'start'); perform public.atelier_worker_task(t_fin, 'complete');
  perform pg_temp.as_user(a);
  perform public.atelier_advance_batch(b);
  select status into v from public.production_batches where id = b;
  r := r || (case when v = 'quality_check' then 'PASS batch reached quality check' else 'FAIL batch status ' || v end);

  -- Quality approval
  perform pg_temp.as_user(w);
  r := r || pg_temp.expect('tailor cannot record QC', format('select public.atelier_record_qc(%L, %L, %L, 5, 0)', b, '{"measurements":true}', 'approved'), 'qc_inspector_only');
  perform pg_temp.as_user(q);
  r := r || pg_temp.expect('inspector cannot verify own work', format('select public.atelier_record_qc(%L, %L, %L, 5, 0)', b, '{"measurements":true}', 'approved'), 'cannot_inspect_own_work');
  perform pg_temp.as_user(a);
  r := r || pg_temp.expect('stock refused before QC', format('select public.atelier_receive_stock(%L)', b), 'batch_not_completed');
  r := r || pg_temp.expect('direct QC insert blocked', format('insert into public.quality_inspections (batch_id, checklist, result) values (%L, %L, %L)', b, '{}', 'approved'), 'use_qc_workflow');
  perform pg_temp.as_user(q2);
  r := r || pg_temp.expect('independent inspector approves 4 of 5', format('select public.atelier_record_qc(%L, %L, %L, 4, 1, %L)', b,
    '{"measurements":true,"stitch_quality":true,"fabric_defects":true,"neckline":true,"sleeve_alignment":true,"closures":true,"pressing":true,"final_appearance":true}', 'approved', 'One piece: uneven hem'), null);

  -- Finished stock update
  perform pg_temp.as_user(a);
  insert into public.products (slug, name, price) values ('qa-princess-blouse-' || substr(b::text, 1, 6), 'QA Princess blouse', 4500) returning id into prod;
  insert into public.product_variants (product_id, sku, size, color) values (prod, 'QA-' || substr(b::text, 1, 8), '36', 'Wine') returning id into var;
  update public.production_batches set product_variant_id = var where id = b;
  r := r || pg_temp.expect('receive QC-approved stock', format('select public.atelier_receive_stock(%L)', b), null);
  select quantity into n from public.inventory where variant_id = var;
  r := r || (case when n = 4 then 'PASS finished inventory +4 (QC-approved only)' else 'FAIL inventory ' || n end);
  r := r || pg_temp.expect('stock cannot be received twice', format('select public.atelier_receive_stock(%L)', b), 'batch_not_completed');

  -- Audit logs
  select count(*) into n from public.atelier_audit_log where entity_id in (d, b, ch, lay, t_cut);
  r := r || (case when n > 10 then 'PASS audit log entries: ' || n else 'FAIL audit entries ' || n end);
  perform pg_temp.as_user(w);
  select count(*) into n from public.atelier_audit_log; r := r || (case when n = 0 then 'PASS worker cannot read audit log' else 'FAIL audit visible' end);
  perform pg_temp.as_user(null);

  raise exception E'QA RESULTS (rolled back)\n%', array_to_string(r, E'\n');
end $t$;
