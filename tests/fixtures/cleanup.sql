-- SAVLINO QA fixture cleanup. Dedicated staging DB only.
-- Uses deterministic UUID range for fixture records. Does not delete live users.
begin;
delete from public.quality_inspections where id='aaaaaaaa-0000-4000-8000-000000000181';
delete from public.worker_assignments where id='aaaaaaaa-0000-4000-8000-000000000171';
delete from public.production_tasks where id in ('aaaaaaaa-0000-4000-8000-000000000161','aaaaaaaa-0000-4000-8000-000000000162');
delete from public.production_batches where id='aaaaaaaa-0000-4000-8000-000000000151';
delete from public.design_versions where id='aaaaaaaa-0000-4000-8000-000000000131';
delete from public.size_charts where id='aaaaaaaa-0000-4000-8000-000000000141';
delete from public.garment_designs where id in ('aaaaaaaa-0000-4000-8000-000000000121','aaaaaaaa-0000-4000-8000-000000000122');
delete from public.stitching_orders where id='aaaaaaaa-0000-4000-8000-000000000111';
delete from public.team_members where id in ('aaaaaaaa-0000-4000-8000-000000000101','aaaaaaaa-0000-4000-8000-000000000102');
delete from public.reviews where id='aaaaaaaa-0000-4000-8000-000000000091';
delete from public.expenses where id='aaaaaaaa-0000-4000-8000-000000000081';
delete from public.materials where id in ('aaaaaaaa-0000-4000-8000-000000000071','aaaaaaaa-0000-4000-8000-000000000072');
delete from public.suppliers where id in ('aaaaaaaa-0000-4000-8000-000000000061','aaaaaaaa-0000-4000-8000-000000000062');
delete from public.coupons where id='aaaaaaaa-0000-4000-8000-000000000051';
delete from public.contact_messages where id='aaaaaaaa-0000-4000-8000-000000000041';
delete from public.tasks where id in ('aaaaaaaa-0000-4000-8000-000000000031','aaaaaaaa-0000-4000-8000-000000000032','aaaaaaaa-0000-4000-8000-000000000033');
delete from public.leads where id in ('aaaaaaaa-0000-4000-8000-000000000021','aaaaaaaa-0000-4000-8000-000000000022','aaaaaaaa-0000-4000-8000-000000000023');
delete from public.inventory where variant_id in ('aaaaaaaa-0000-4000-8000-000000000011','aaaaaaaa-0000-4000-8000-000000000012','aaaaaaaa-0000-4000-8000-000000000013','aaaaaaaa-0000-4000-8000-000000000014');
delete from public.product_variants where id in ('aaaaaaaa-0000-4000-8000-000000000011','aaaaaaaa-0000-4000-8000-000000000012','aaaaaaaa-0000-4000-8000-000000000013','aaaaaaaa-0000-4000-8000-000000000014');
delete from public.products where id in ('aaaaaaaa-0000-4000-8000-000000000001','aaaaaaaa-0000-4000-8000-000000000002','aaaaaaaa-0000-4000-8000-000000000003');
commit;
