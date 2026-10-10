-- Pins search_path on the workflow-flag helpers (Supabase linter 0011).
alter function private.via_workflow() set search_path = pg_catalog;
alter function private.begin_workflow() set search_path = pg_catalog;
