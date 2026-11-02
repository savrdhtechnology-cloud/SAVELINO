# SAVLINO DesignLab

Design-to-production module inside the admin panel (`/admin/designlab`).

## Screens
| Route | Purpose |
|---|---|
| `/admin/designlab/library` | Design Library — cards, filters, search, rename, archive, image viewer |
| `/admin/designlab/import` | ZIP Import — drag & drop, review/merge/split groups, duplicates, progress, retry, history |
| `/admin/designlab/designs/SV-DL-0001` | Design Workspace — images, details, Measurements, Pattern & Cutting, Tailor Job Card, Production History |
| `/admin/designlab/sizes` | Size & Pattern Master (32–44 + custom, in/cm, blank & unverified by default) |
| `/admin/designlab/orders` | Tailor Job Orders |
| `/admin/designlab/tracker` | Production Tracker (Draft → … → Completed) + inventory handoff |
| `/admin/print/designlab/<orderId>` | Printable A4 job card (use *Print / Save as PDF*) |

## Database
Run `supabase/migrations/004_designlab.sql` once in the Supabase SQL editor (after schema.sql, 002, 003).
Undo with `supabase/rollbacks/004_designlab_rollback.sql` (removes only DesignLab objects).

The rules are enforced in the database, not just the UI: guard triggers + `SECURITY DEFINER` functions
(`designlab_*`) check the signed-in user's role. A pattern cannot be approved without sample verification,
a job cannot be released without an approved pattern, and `designlab_post_finished_stock()` adds QC-accepted
pieces to `products.stock` exactly once per order (primary key on `designlab_stock_postings.order_id`),
logged in `product_history` with the design ID and order number.

## Tests
- `tsx scripts/designlab-zip.test.mts <path-to-zip>` — ZIP reader, magic-number check, grouping, path-traversal guard.
- Workflow/RLS tests were run on a scratch Postgres 16 (ID sequence, approval gating, state machine,
  duplicate-stock block, guard triggers, unauthorised access, rollback + re-apply).

## Known limits
- No automatic image-similarity grouping: loose photos are suggested one-by-one and merged by hand.
- Products have no size-variant table, so stock is posted to the product total; the size split is kept in the stock-history note and order.
- Job-card PDF uses the browser's print dialog.
- Size templates ship empty; no measurement is presented as a standard.
