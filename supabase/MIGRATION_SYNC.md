# SAVLINO Supabase migration synchronization (2026-10-10)

Target **only** Supabase project `vfqbddwutifhwstjcrzn` (SAVLINO).

Remote already reports these migrations applied:
- `20261010074150` — `0001_init`
- `20261010074205` — `0002_contact_messages`
- `20261010074209` — `0003_seed_catalogue`
- `20261010074509` — `0004_security_hardening`

GitHub originally contained only `0001_init.sql`. The other three
files in this branch are **reconstructed**, idempotent descriptions
of the observed schema/data/security state, not the exact original
migration bodies. Do not blindly execute these against the
already-migrated database or mark the source files as equivalent to
the remote migration checksums.

The checked live database has 17 public tables, all with RLS enabled.
There are seven published collections and four content blocks.
Product, order, customer-profile and partner tables currently contain
no records. The security advisor still reports `is_admin()` as
callable by authenticated users (required by current role policies);
the anonymous grant has been revoked. The event-trigger helper
`rls_auto_enable()` is not callable by anon or authenticated.

Before new migrations or any clean-room restore:
1. Back up the live database and obtain the **original SQL bodies** or a
   complete schema dump where possible.
2. Normalize migration names/versions for the Supabase CLI (existing
   `0001_init.sql` uses a legacy, non-timestamped filename) without
   re-executing already-applied migrations.
3. Run all migrations against an isolated test database and validate
   RLS, functions, triggers, seed content, and sign-in flows.
4. Only then enable automated `db push` workflows.

No passwords, service-role keys, or production user records belong in Git.
