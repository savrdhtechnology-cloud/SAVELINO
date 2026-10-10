# SAVLINO Full System Test Fixtures

**Branch only**: test/full-system-fixtures-20261010. Production website and Supabase database remain unchanged.

This seed provides sample catalogue, variants, stock (including sold-out / low stock), leads, follow-ups, coupons, enquiries, tasks, suppliers, materials, expenses, reviews, tailoring orders, design/version, size chart, team/worker, production batches, task assignments and QC. All records are visibly prefixed **QA** and use deterministic UUIDs. Values are placeholders, not genuine transactions.

## Safe usage

1. Create a **separate Supabase staging project/database** and apply the SAVLINO schema/migrations there. Git branching alone does **not** isolate a Supabase database.
2. Confirm the staging project ref is **not** `vfqbddwutifhwstjcrzn`; back it up first.
3. Run `seed.sql` in staging SQL editor, then verify module screens on a **Preview** deployment whose environment variables point to staging.
4. Run `cleanup.sql` to remove fixtures after testing; separately delete any test Auth identities and Storage files created during interactive QA.

Never run these SQL files on the production database. Idempotent inserts are intentionally limited to known deterministic IDs. Existing unrelated records must not be overwritten.

## Schema alignment (2026-10-10)

`seed.sql` now uses only values allowed by the CHECK constraints in migrations 0001–0013 (task, lead, stitching and supplier statuses, atelier roles, `designer-blouses` category, `cm` units). It was validated against the SAVLINO schema inside a rolled-back transaction — **no data was written**.

Deliberately **not** seeded, because direct inserts would bypass (or be blocked by) the workflow guards:
- production job cards, worker assignments, material reservations, QC inspections and stock receipt — create them by approving `QA-BATCH-001` and running the workflow in the CRM;
- design versions — version 1 is created automatically by trigger;
- approved size charts / patterns / markers — approve them through the CRM as a pattern master.

## Deferred scenarios

Customer/partner account identities, actual checkout orders and payments, commissions/payouts, user-scoped wishes and addresses, virtual try-on uploaded assets, and certain advanced cutting/BOM workflows depend on real Supabase Auth identities, Storage or business state machines. These must be created through authorized **staging** application flows so that FK, RLS, payment verification and audit rules are correctly exercised. **Do not fabricate successful payments or real disbursements.**

Some workflow statuses are deployment-specific. Execute only after schema validation; adjust fixture enum values to the staging schema and document test results.
