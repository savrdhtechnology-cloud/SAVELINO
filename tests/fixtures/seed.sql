-- SAVLINO reversible QA fixtures. Execute ONLY in a dedicated staging database.
-- Never run against production vfqbddwutifhwstjcrzn.
-- All fixture IDs use the deterministic range aaaaaaaa-0000-4000-8000-*.
-- Values match the CHECK constraints in supabase/migrations 0001–0013 (validated 2026-10-10).
-- Production workflow rows (job cards, assignments, reservations, QC, stock receipt) are NOT
-- seeded: they must be created through the atelier_* workflow functions so guards,
-- approvals and the audit log are exercised. See README.md.
begin;

-- Catalogue (collections come from 0003_seed_catalogue)
insert into public.products (id, collection_id, slug, name, description, price, is_custom_stitchable, is_active, media)
select 'aaaaaaaa-0000-4000-8000-000000000001'::uuid, id, 'qa-designer-blouse', 'QA • Heritage Embroidered Blouse', 'TEST ONLY: hand-finished blouse', 2499, true, false, '[]'::jsonb
from public.collections where slug = 'designer-blouses'
on conflict (id) do nothing;
insert into public.products (id, collection_id, slug, name, description, price, is_custom_stitchable, is_active, media)
select 'aaaaaaaa-0000-4000-8000-000000000002'::uuid, id, 'qa-salwar-suit', 'QA • Festival Salwar Suit', 'TEST ONLY: embroidered suit', 4999, true, false, '[]'::jsonb
from public.collections where slug = 'salwar-suits'
on conflict (id) do nothing;
insert into public.products (id, collection_id, slug, name, description, price, is_custom_stitchable, is_active, media)
select 'aaaaaaaa-0000-4000-8000-000000000003'::uuid, id, 'qa-ready-blouse', 'QA • Everyday Ready Blouse', 'TEST ONLY: ready-made garment', 1499, false, false, '[]'::jsonb
from public.collections where slug = 'ready-made-blouses'
on conflict (id) do nothing;

insert into public.product_variants (id, product_id, sku, size, color) values
  ('aaaaaaaa-0000-4000-8000-000000000011', 'aaaaaaaa-0000-4000-8000-000000000001', 'QA-BLOUSE-36-GOLD', '36', 'Gold'),
  ('aaaaaaaa-0000-4000-8000-000000000012', 'aaaaaaaa-0000-4000-8000-000000000001', 'QA-BLOUSE-38-MAROON', '38', 'Maroon'),
  ('aaaaaaaa-0000-4000-8000-000000000013', 'aaaaaaaa-0000-4000-8000-000000000002', 'QA-SUIT-36-BLUE', '36', 'Blue'),
  ('aaaaaaaa-0000-4000-8000-000000000014', 'aaaaaaaa-0000-4000-8000-000000000003', 'QA-READY-34-BLACK', '34', 'Black')
on conflict (id) do nothing;

-- Stock: healthy, low and sold-out
insert into public.inventory (variant_id, quantity) values
  ('aaaaaaaa-0000-4000-8000-000000000011', 20),
  ('aaaaaaaa-0000-4000-8000-000000000012', 3),
  ('aaaaaaaa-0000-4000-8000-000000000013', 9),
  ('aaaaaaaa-0000-4000-8000-000000000014', 0)
on conflict (variant_id) do nothing;

-- CRM
insert into public.leads (id, name, phone, email, source, interest, stage, value, follow_up, notes) values
  ('aaaaaaaa-0000-4000-8000-000000000021', 'QA Lead New', null, 'qa-lead-new@example.invalid', 'website', 'Designer blouse', 'new', 2499, current_date + 2, 'TEST ONLY'),
  ('aaaaaaaa-0000-4000-8000-000000000022', 'QA Lead Follow-up', null, 'qa-lead-followup@example.invalid', 'referral', 'Salwar suit', 'contacted', 4999, current_date + 1, 'TEST ONLY'),
  ('aaaaaaaa-0000-4000-8000-000000000023', 'QA Lead Won', null, 'qa-lead-won@example.invalid', 'instagram', 'Ready blouse', 'won', 1499, null, 'TEST ONLY')
on conflict (id) do nothing;

insert into public.tasks (id, title, assignee, status, priority, due_date) values
  ('aaaaaaaa-0000-4000-8000-000000000031', 'QA: call new prospect', 'QA Team', 'todo', 'high', current_date + 1),
  ('aaaaaaaa-0000-4000-8000-000000000032', 'QA: verify fabric supplier', 'QA Manager', 'doing', 'medium', current_date + 3),
  ('aaaaaaaa-0000-4000-8000-000000000033', 'QA: inspect finished sample', 'QA QC', 'done', 'low', current_date)
on conflict (id) do nothing;

insert into public.contact_messages (id, name, email, topic, message, handled) values
  ('aaaaaaaa-0000-4000-8000-000000000041', 'QA Contact', 'qa-contact@example.invalid', 'Custom stitching', 'TEST ONLY: sample enquiry about a custom blouse.', false)
on conflict (id) do nothing;

insert into public.coupons (id, code, kind, value, min_order, active) values
  ('aaaaaaaa-0000-4000-8000-000000000051', 'QADEMO10', 'percent', 10, 1000, false)
on conflict (id) do nothing;

-- Purchasing & stock materials
insert into public.suppliers (id, name, contact_person, city, category, notes) values
  ('aaaaaaaa-0000-4000-8000-000000000061', 'QA Textile Suppliers', 'QA Contact', 'Bhopal', 'fabric', 'TEST ONLY'),
  ('aaaaaaaa-0000-4000-8000-000000000062', 'QA Trims Workshop', 'QA Contact', 'Indore', 'trims', 'TEST ONLY')
on conflict (id) do nothing;

insert into public.materials (id, name, kind, color, supplier_name, unit, quantity, reorder_level, cost_per_unit) values
  ('aaaaaaaa-0000-4000-8000-000000000071', 'QA Silk Fabric', 'fabric', 'Maroon', 'QA Textile Suppliers', 'metre', 75, 20, 280),
  ('aaaaaaaa-0000-4000-8000-000000000072', 'QA Decorative Lace', 'lace', 'Gold', 'QA Trims Workshop', 'metre', 12, 20, 65),
  ('aaaaaaaa-0000-4000-8000-000000000073', 'QA Hook & Eye', 'trims', 'Silver', 'QA Trims Workshop', 'pcs', 400, 100, 1)
on conflict (id) do nothing;

insert into public.expenses (id, spent_on, category, description, amount, paid_to, payment_method) values
  ('aaaaaaaa-0000-4000-8000-000000000081', current_date, 'fabric', 'TEST ONLY purchase', 2200, 'QA Textile Suppliers', 'cash')
on conflict (id) do nothing;

insert into public.reviews (id, customer_name, product, rating, comment, status) values
  ('aaaaaaaa-0000-4000-8000-000000000091', 'QA Customer', 'QA Heritage Blouse', 5, 'TEST ONLY review', 'pending')
on conflict (id) do nothing;

-- Team (no portal login: link user_id only to a staging test identity created via Auth)
insert into public.team_members (id, name, role, skills, active, atelier_role) values
  ('aaaaaaaa-0000-4000-8000-000000000101', 'QA Stitching Worker', 'tailor', 'Blouse stitching', true, 'tailor'),
  ('aaaaaaaa-0000-4000-8000-000000000102', 'QA Quality Inspector', 'tailor', 'Quality inspection', true, 'qc_inspector'),
  ('aaaaaaaa-0000-4000-8000-000000000103', 'QA Pattern Master', 'designer', 'Pattern drafting', true, 'pattern_master')
on conflict (id) do nothing;

insert into public.stitching_orders (id, customer_name, garment, design_ref, fabric_source, stage, measurements, due_date, price, advance_paid, assigned_to, notes) values
  ('aaaaaaaa-0000-4000-8000-000000000111', 'QA Customer', 'Blouse', 'QA-DESIGN-001', 'customer', 'enquiry', '{"bust":91.5,"waist":76}'::jsonb, current_date + 10, 2499, 500, 'QA Stitching Worker', 'TEST ONLY')
on conflict (id) do nothing;

-- Design Studio (drafts; version 1 is created automatically by trigger)
insert into public.garment_designs (id, code, name, category, status, spec, sketches) values
  ('aaaaaaaa-0000-4000-8000-000000000121', 'QA-DESIGN-001', 'QA Princess Cut Blouse', 'designer-blouses', 'draft',
   '{"neckline":"sweetheart","backNeck":"deep-u","sleeve":"elbow","cut":"princess","darts":["waist"],"closure":"front-hooks","fabric":"Raw silk","lining":"Cotton cambric","embroidery":"Zardozi","accessories":["Padding"],"colors":["Maroon"],"instructions":"TEST ONLY","notes":"QA fixture"}'::jsonb, '[]'::jsonb),
  ('aaaaaaaa-0000-4000-8000-000000000122', 'QA-DESIGN-002', 'QA Straight Salwar', 'salwar-suits', 'draft',
   '{"fabric":"Cotton silk","colors":["Blue"],"notes":"QA fixture — future-ready category"}'::jsonb, '[]'::jsonb)
on conflict (id) do nothing;

insert into public.design_bom (id, design_id, item_type, material_id, unit, qty_per_piece, wastage_pct, description) values
  ('aaaaaaaa-0000-4000-8000-000000000125', 'aaaaaaaa-0000-4000-8000-000000000121', 'main_fabric', 'aaaaaaaa-0000-4000-8000-000000000071', 'metre', 0, 0, 'From verified marker'),
  ('aaaaaaaa-0000-4000-8000-000000000126', 'aaaaaaaa-0000-4000-8000-000000000121', 'hooks', 'aaaaaaaa-0000-4000-8000-000000000073', 'pcs', 6, 5, 'Hook & eye size 2'),
  ('aaaaaaaa-0000-4000-8000-000000000127', 'aaaaaaaa-0000-4000-8000-000000000121', 'lace', 'aaaaaaaa-0000-4000-8000-000000000072', 'metre', 0.4, 10, 'Sleeve hem lace')
on conflict (id) do nothing;

-- Size chart (draft, high version number so it never collides with real charts)
insert into public.size_charts (id, category, name, version, status, unit, notes) values
  ('aaaaaaaa-0000-4000-8000-000000000141', 'designer-blouses', 'QA Blouse Size Chart', 900, 'draft', 'cm', 'TEST ONLY — not verified')
on conflict (id) do nothing;
insert into public.size_measurements (id, size_chart_id, size, bust, waist, shoulder, blouse_length, armhole, sleeve_length, neck_depth_front, neck_depth_back, ease, seam_allowance) values
  ('aaaaaaaa-0000-4000-8000-000000000142', 'aaaaaaaa-0000-4000-8000-000000000141', '36', 91.5, 76, 36.5, 38, 42, 15, 17.5, 16, 4, 1.5),
  ('aaaaaaaa-0000-4000-8000-000000000143', 'aaaaaaaa-0000-4000-8000-000000000141', '38', 96.5, 81, 37.5, 39, 44, 15.5, 18, 16.5, 4, 1.5)
on conflict (id) do nothing;

-- Draft production batch (approve it through the CRM to generate job cards)
insert into public.production_batches (id, batch_no, design_id, size, color, quantity, priority, due_date, status, product_variant_id, notes) values
  ('aaaaaaaa-0000-4000-8000-000000000151', 'QA-BATCH-001', 'aaaaaaaa-0000-4000-8000-000000000121', '36', 'Maroon', 10, 'normal', current_date + 14, 'draft', 'aaaaaaaa-0000-4000-8000-000000000011', 'TEST ONLY')
on conflict (id) do nothing;

commit;
