-- Rollback for 004_designlab.sql — removes ONLY DesignLab objects.
-- Products / stock that DesignLab already added stay as they are (they are normal products & stock history).
-- Product drafts created from designs remain in Product Studio (their photos keep working).
drop function if exists public.designlab_create_product_draft(uuid);
drop function if exists public.designlab_post_finished_stock(uuid);
drop function if exists public.designlab_record_quantities(uuid, jsonb);
drop function if exists public.designlab_set_order_status(uuid, text, text);
drop function if exists public.designlab_create_order(uuid, jsonb, text, text, text, text, text, date, text, text);
drop function if exists public.designlab_review_revision(uuid, text, text);
drop function if exists public.designlab_verify_sample(uuid, text, text);
drop function if exists public.designlab_submit_revision(uuid);
drop function if exists public.designlab_missing_measurements(public.designlab_pattern_revisions);
drop function if exists public.designlab_create_revision(uuid, text, uuid, uuid);
drop function if exists public.designlab_set_design_status(uuid, text, text);
drop function if exists public.designlab_ensure_pattern(uuid);
drop function if exists public.designlab_log(uuid, text, text, text, text, jsonb);
drop table if exists public.designlab_stock_postings cascade;
drop table if exists public.designlab_production_events cascade;
drop table if exists public.designlab_order_items cascade;
drop table if exists public.designlab_tailor_orders cascade;
drop table if exists public.designlab_approvals cascade;
drop table if exists public.designlab_pattern_revisions cascade;
drop table if exists public.designlab_patterns cascade;
drop table if exists public.designlab_size_templates cascade;
drop table if exists public.designlab_images cascade;
drop table if exists public.designlab_designs cascade;
drop table if exists public.designlab_import_batches cascade;
drop function if exists public.designlab_guard_design();
drop function if exists public.designlab_guard_revision();
drop function if exists public.designlab_guard_order();
drop function if exists public.designlab_guard_item();
drop function if exists public.designlab_guard_size();
drop function if exists public.designlab_actor();
drop function if exists public.designlab_in_rpc();
drop sequence if exists public.designlab_design_seq;
drop sequence if exists public.designlab_order_seq;
notify pgrst, 'reload schema';
