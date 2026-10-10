# SAVLINO architecture

## Frontend

```
src/
  app/
    page.tsx                    Landing page (20 sections)
    collections/[slug]/         Collection pages (statically generated)
    custom-stitching/           Measurement guide
    login, register/            Customer auth
    partner/                    Partner program, login, register
    partner/dashboard/[section] Partner portal
    account/[section]           Customer portal
    admin/[module]              Admin CRM
    auth/callback/route.ts      Supabase email-confirmation code exchange
    sitemap.ts robots.ts manifest.ts opengraph-image.jpg icon.png
  components/
    hero/Hero.tsx               Fullscreen hero, static-monogram fallback, scroll motion
    three/MonogramScene.tsx     R3F rotating gold SL monogram, lights, floating ornaments
    three/ProductCarousel.tsx   R3F 3D product presentation ring
    sections/*                  Landing sections
    portal/*                    Portal shell, data tables, notices
    auth/*                      Auth pages and form
  lib/
    portals.ts                  Registry of every portal / CRM section → table + columns
    supabase/                   Browser + server clients, env detection
  middleware.ts                 Session refresh + route protection (only when Supabase is configured)
supabase/migrations/0001_init.sql  Schema, RLS policies, triggers
```

### Performance & accessibility

- Three.js is code-split (`next/dynamic`, `ssr: false`). The hero first renders the approved monogram as an
  optimised image (no layout shift), then cross-fades to WebGL when ready.
- WebGL render loops pause when their section is off-screen (`frameloop="never"`).
- Mobile uses fewer slices, particles and ornaments and a lower device-pixel-ratio cap.
- `prefers-reduced-motion: reduce` disables the 3D canvases (static approved artwork and image grid instead),
  word reveals, parallax and the pinned GSAP lookbook. CSS transitions are also neutralised.
- No post-processing passes (Safari friendly). Errors in WebGL fall back to the static monogram.

## Backend design (Supabase / PostgreSQL)

| Area | Tables / views |
| --- | --- |
| Identity | `profiles` (role: customer / partner / admin, measurements) |
| Catalogue | `collections`, `products`, `product_variants`, `inventory`, `inventory_view` |
| Customer portal | `orders`, `order_items`, `shipments`, `addresses`, `wishlist_items(_view)`, `return_requests` |
| Partner portal | `partners` (status, referral code), `partner_referred_orders_view`, `commissions`, `payouts` |
| Admin CRM | all of the above + `payments` (verification), `content_blocks`, `admin_sales_daily_view` |

### Security model

- Row Level Security on every table. Customers read only their own rows; partners only their own partner
  record, commissions and payouts.
- Partners never read `orders` directly (it contains customer addresses). They see referred orders through a
  view that exposes only order number, date, status and value.
- Roles live in `profiles.role` and are read server-side. A trigger blocks users from changing their own role.
- Partner sign-up only creates a **pending** application. Approval by an admin issues the referral code and
  grants the partner role (trigger `on_partner_approved`).
- Admin routes check the role in the server layout; middleware only verifies a session exists.
- Commissions are linked one-to-one to orders and should only be created once the payment is verified and the
  order delivered (server-side job or admin action — not from the client).

### Activating the backend

1. Create a Supabase project and run `supabase/migrations/0001_init.sql`.
2. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `NEXT_PUBLIC_SITE_URL`.
3. Add `<site>/auth/callback` to Supabase Auth redirect URLs.
4. Promote the first administrator: `update profiles set role = 'admin' where id = '<user uuid>';`
5. Generate typed clients with `supabase gen types typescript` and replace `lib/supabase/loose.ts`.

### Next implementation steps

- Product catalogue + cart + checkout with a payment provider (webhook → `payments` → admin verification).
- Referral attribution: persist `?ref=CODE` in a cookie and attach `partner_id` to the order server-side.
- Admin write actions (approve partner, verify payment, create shipment) as Server Actions with role checks.
