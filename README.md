# SAVLINO — A Legacy of Elegance

Cinematic 3D luxury women's fashion website built with Next.js (App Router), TypeScript, Tailwind CSS,
Motion for React, Three.js / React Three Fiber / Drei and GSAP ScrollTrigger.

## Local preview

```bash
npm install
npm run dev -- -p 2736
```

Open http://localhost:2736

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run lint` | ESLint (Next.js core-web-vitals + TypeScript rules) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run build` | Production build |
| `npm run verify` | lint + typecheck + build |
| `npm run screenshots` | Desktop / tablet / mobile QA screenshots against a running server (`BASE_URL`) |

CI (`.github/workflows/ci.yml`) runs all of the above on every pull request and uploads the screenshots.

## Branding

The approved logo lives in `public/branding/` and is used exactly as supplied:

| File | Use |
| --- | --- |
| `savlino-approved-brand-sheet.jpg` | Original approved brand sheet (reference) |
| `savlino-logo-lockup.png` | Monogram + wordmark + tagline on Royal Noir, cropped from the sheet |
| `savlino-logo-lockup-alpha.png` | Same lockup with the noir background made transparent (header, footer) |
| `savlino-monogram.png` / `savlino-monogram-alpha.png` | SL monogram; the alpha version is the 3D hero texture |

The artwork itself is never redrawn. The 3D hero gives the monogram depth by stacking slices of the exact
approved image. The lockup used on the site is the variant without the ® mark, per the brief.

Brand colours: Royal Noir `#0B0B0B` · Antique Gold `#D4AF37` · Ivory `#F8F5EB` · Burgundy `#6B0F1A`.
Typography: Bodoni Moda (display), Cormorant Garamond (editorial), Manrope (interface).

> Campaign photography in `src/assets/images/` is AI-generated (896×1200 / 1200×896, WebP). Replace files with
> real product photography (same file names) whenever it is available.

## Backend (Supabase-ready)

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). Copy `.env.example` to `.env.local` and add Supabase keys
to activate login, registration and the portals. Until then every portal shows an honest "being prepared"
state — no orders, payments, referrals or logins are simulated.
