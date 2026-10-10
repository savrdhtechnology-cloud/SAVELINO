-- Reconstructed security reconciliation from the active SAVLINO database.
-- Remote migration history: 20261010074509 / 0004_security_hardening.
-- This captures verified permissions as of 2026-10-10; it is NOT a byte-for-byte
-- recovery of the original applied SQL.
revoke execute on function public.is_admin() from public, anon;
-- Authenticated RLS policies currently depend on public.is_admin().
-- Keep authenticated EXECUTE until a replacement protected role-check is deployed.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
