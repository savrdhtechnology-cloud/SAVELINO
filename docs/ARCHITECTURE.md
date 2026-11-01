# SAVLINO — Architecture

**Website** (public, `src/app/*`): cinematic storefront — home, shop, product pages, collections, lookbook, contact, bag and checkout.
**Commerce CRM** (`/admin`, `src/app/admin/(crm)`, `src/components/crm`): Dashboard, AI Product Studio, Products, Orders, Payments, Website (manager + appearance studio), Settings.

## Data — Supabase
Schema: `supabase/schema.sql` (run once in Supabase → SQL Editor).

- `settings` (id=1, jsonb) — theme, fonts, motion, sections, commerce, CRM theme, SEO.
- `categories`, `products`, `product_images` — catalogue; anon reads only visible / live rows.
- `customers`, `orders`, `payments` — staff only. Shoppers write through RPCs:
  - `place_order(payload)` — prices come from the database, never the browser.
  - `submit_payment_reference(order_no, phone, utr)` — UPI reference → payment review.
  - `review_payment(id, verified, note)` — staff verification.
- Storage bucket `media` — product photos (public read, staff write).
- Roles live in `profiles.role` (`none` / `staff` / `admin`).

## Caching
Catalogue and settings use `unstable_cache` with tags `catalog` / `site-settings`; the CRM calls `/api/revalidate` (staff only) after every change so the website updates instantly.
