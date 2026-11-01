# SAVLINO — A Legacy of Elegance

Luxury women's fashion website + SAVLINO Commerce CRM (Next.js 15, Supabase).

## Setup
1. Run `supabase/schema.sql` in the Supabase SQL Editor.
2. Copy `.env.example` → `.env.local` and fill the Supabase publishable key.
3. Create your user in Supabase Auth, then:
   `update public.profiles set role = 'admin' where email = 'you@example.com';`
4. `npm install && npm run dev` → website at `/`, CRM at `/admin`.

See `docs/ARCHITECTURE.md`.
