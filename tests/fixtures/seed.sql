-- SAVLINO reversible QA fixtures. Execute ONLY in a dedicated staging database.
-- Never run against production vfqbddwutifhwstjcrzn.
-- All deterministic fixture IDs start with aaaaaaaa-0000-4000-8000.
begin;
insert into public.products (id,collection_id,slug,name,description,price,is_custom_stitchable,is_active,media)
select 'aaaaaaaa-0000-4000-8000-000000000001'::uuid,id,'qa-designer-blouse','QA • Heritage Embroidered Blouse','TEST ONLY: hand-finished blouse',2499,true,true,'[]'::jsonb from public.collections where slug='designer-blouses'
on conflict (id) do nothing;
insert into public.products (id,collection_id,slug,name,description,price,is_custom_stitchable,is_active,media)
select 'aaaaaaaa-0000-4000-8000-000000000002'::uuid,id,'qa-salwar-suit','QA • Festival Salwar Suit','TEST ONLY: embroidered suit',4999,true,true,'[]'::jsonb from public.collections where slug='salwar-suits'
on conflict (id) do nothing;
insert into public.products (id,collection_id,slug,name,description,price,is_custom_stitchable,is_active,media)
select 'aaaaaaaa-0000-4000-8000-000000000003'::uuid,id,'qa-ready-blouse','QA • Everyday Ready Blouse','TEST ONLY: ready-made garment',1499,false,true,'[]'::jsonb from public.collections where slug='ready-made-blouses'
on conflict (id) do nothing;
insert into public.product_variants(id,product_id,sku,size,color) values
('aaaaaaaa-0000-4000-8000-000000000011','aaaaaaaa-0000-4000-8000-000000000001','QA-BLOUSE-M-GOLD','M','Gold'),
('aaaaaaaa-0000-4000-8000-000000000012','aaaaaaaa-0000-4000-8000-000000000001','QA-BLOUSE-L-MAROON','L','Maroon'),
('aaaaaaaa-0000-4000-8000-000000000013','aaaaaaaa-0000-4000-8000-000000000002','QA-SUIT-M-BLUE','M','Blue'),
('aaaaaaaa-0000-4000-8000-000000000014','aaaaaaaa-0000-4000-8000-000000000003','QA-READY-S-BLACK','S','Black')
on conflict (id) do nothing;
insert into public.inventory(variant_id,quantity) values
('aaaaaaaa-0000-4000-8000-000000000011',20),
('aaaaaaaa-0000-4000-8000-000000000012',3),
('aaaaaaaa-0000-4000-8000-000000000013',9),
('aaaaaaaa-0000-4000-8000-000000000014',0)
on conflict (variant_id) do nothing;
insert into public.leads(id,name,phone,email,source,interest,stage,value,follow_up,notes) values
('aaaaaaaa-0000-4000-8000-000000000021','QA Lead New',null,'qa-lead-new@example.invalid','website','Designer blouse','new',2499,current_date + 2,'TEST ONLY'),
('aaaaaaaa-0000-4000-8000-000000000022','QA Lead Followup',null,'qa-lead-followup@example.invalid','referral','Salwar suit','follow_up',4999,current_date + 1,'TEST ONLY'),
('aaaaaaaa-0000-4000-8000-000000000023','QA Lead Converted',null,'qa-lead-converted@example.invalid','website','Ready blouse','converted',1499,current_date,'TEST ONLY')
on conflict(id) do nothing;
insert into public.tasks(id,title,assignee,status,priority,due_date) values
('aaaaaaaa-0000-4000-8000-000000000031','QA: call new prospect','QA Team','pending','high',current_date + 1),
('aaaaaaaa-0000-4000-8000-000000000032','QA: verify fabric supplier','QA Manager','in_progress','medium',current_date + 3),
('aaaaaaaa-0000-4000-8000-000000000033','QA: inspect finished sample','QA QC','completed','low',current_date)
on conflict(id) do nothing;
insert into public.contact_messages(id,name,email,topic,message,handled) values
('aaaaaaaa-0000-4000-8000-000000000041','QA Contact','qa-contact@example.invalid','Custom stitching','TEST ONLY: sample enquiry',false)
on conflict(id) do nothing;
insert into public.coupons(id,code,kind,value,min_order,active) values
('aaaaaaaa-0000-4000-8000-000000000051','QADEMO10','percent',10,1000,false)
on conflict(id) do nothing;
insert into public.suppliers(id,name,contact_person,city,category,notes) values
('aaaaaaaa-0000-4000-8000-000000000061','QA Textile Suppliers','QA Contact','Bhopal','Fabric','TEST ONLY'),
('aaaaaaaa-0000-4000-8000-000000000062','QA Trims Workshop','QA Contact','Indore','Trims','TEST ONLY')
on conflict(id) do nothing;
insert into public.materials(id,name,kind,color,supplier_name,unit,quantity,reorder_level,cost_per_unit) values
('aaaaaaaa-0000-4000-8000-000000000071','QA Silk Fabric','fabric','Maroon','QA Textile Suppliers','meter',75,20,280),
('aaaaaaaa-0000-4000-8000-000000000072','QA Decorative Lace','trim','Gold','QA Trims Workshop','meter',12,20,65)
on conflict(id) do nothing;
insert into public.expenses(id,spent_on,category,description,amount,paid_to,payment_method) values
('aaaaaaaa-0000-4000-8000-000000000081',current_date,'Materials','TEST ONLY purchase',2200,'QA Textile Suppliers','cash')
on conflict(id) do nothing;
insert into public.reviews(id,customer_name,product,rating,comment,status) values
('aaaaaaaa-0000-4000-8000-000000000091','QA Customer','QA Heritage Blouse',5,'TEST ONLY review','pending')
on conflict(id) do nothing;
insert into public.team_members(id,name,role,skills,active,atelier_role) values
('aaaaaaaa-0000-4000-8000-000000000101','QA Stitching Worker','worker','Blouse stitching',true,'worker'),
('aaaaaaaa-0000-4000-8000-000000000102','QA Quality Inspector','quality','Quality inspection',true,'qc')
on conflict(id) do nothing;
insert into public.stitching_orders(id,customer_name,garment,design_ref,fabric_source,stage,measurements,due_date,price,advance_paid,assigned_to,notes) values
('aaaaaaaa-0000-4000-8000-000000000111','QA Customer','Blouse','QA-DESIGN-001','customer','pending','{"bust":36,"waist":30}'::jsonb,current_date + 10,2499,500,'QA Stitching Worker','TEST ONLY')
on conflict(id) do nothing;
insert into public.garment_designs(id,code,name,category,status,spec,sketches) values
('aaaaaaaa-0000-4000-8000-000000000121','QA-DESIGN-001','QA Princess Cut Blouse','blouse','draft','{"fabric":"silk","style":"princess cut"}'::jsonb,'[]'::jsonb),
('aaaaaaaa-0000-4000-8000-000000000122','QA-DESIGN-002','QA Straight Salwar','salwar','draft','{"fabric":"cotton"}'::jsonb,'[]'::jsonb)
on conflict(id) do nothing;
insert into public.design_versions(id,design_id,version,name,status,spec) values
('aaaaaaaa-0000-4000-8000-000000000131','aaaaaaaa-0000-4000-8000-000000000121',1,'QA Blouse V1','draft','{"sample":true}'::jsonb)
on conflict(id) do nothing;
insert into public.size_charts(id,category,name,version,status,unit) values
('aaaaaaaa-0000-4000-8000-000000000141','blouse','QA Blouse Size Chart',1,'draft','inch')
on conflict(id) do nothing;
insert into public.production_batches(id,batch_no,design_id,design_version,size,color,quantity,priority,due_date,status,notes) values
('aaaaaaaa-0000-4000-8000-000000000151','QA-BATCH-001','aaaaaaaa-0000-4000-8000-000000000121',1,'M','Maroon',10,'normal',current_date + 14,'draft','TEST ONLY')
on conflict(id) do nothing;
insert into public.production_tasks(id,batch_id,stage,title,instructions,quantity,status,materials) values
('aaaaaaaa-0000-4000-8000-000000000161','aaaaaaaa-0000-4000-8000-000000000151','cutting','QA Cut Fabric','TEST ONLY: sample cutting task',10,'pending','[]'::jsonb),
('aaaaaaaa-0000-4000-8000-000000000162','aaaaaaaa-0000-4000-8000-000000000151','stitching','QA Stitch Garments','TEST ONLY: sample sewing task',10,'pending','[]'::jsonb)
on conflict(id) do nothing;
insert into public.worker_assignments(id,task_id,team_member_id) values
('aaaaaaaa-0000-4000-8000-000000000171','aaaaaaaa-0000-4000-8000-000000000162','aaaaaaaa-0000-4000-8000-000000000101')
on conflict(id) do nothing;
insert into public.quality_inspections(id,batch_id,checklist,result,approved_quantity,rejected_quantity,notes) values
('aaaaaaaa-0000-4000-8000-000000000181','aaaaaaaa-0000-4000-8000-000000000151','{"stitching":true,"measurements":true}'::jsonb,'pending',0,0,'TEST ONLY — no commercial approval')
on conflict(id) do nothing;
commit;
