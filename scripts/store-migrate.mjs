// Runs before `next build`: creates/updates the website store schema on Neon
// (schema `store`, separate from the CRM tables) and seeds the first products once.
// Idempotent and never fails the build — problems are logged and the build continues.
import { readFileSync } from "node:fs";

const log = (m) => console.log(`[store-db] ${m}`);
const cs = process.env.DATABASE_URL || process.env.POSTGRES_URL;

let endpoint = null;
async function sql(query, params = []) {
  const host = new URL(cs).hostname;
  const candidates = endpoint ? [endpoint] : [`https://${host.replace(/^[^.]+\./, "api.")}/sql`, `https://${host}/sql`];
  let last = new Error("Neon request failed");
  for (const ep of candidates) {
    const res = await fetch(ep, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Neon-Connection-String": cs, "Neon-Raw-Text-Output": "true", "Neon-Array-Mode": "true" },
      body: JSON.stringify({ query, params }),
    }).catch((e) => e);
    if (res instanceof Error) {
      last = res;
      continue;
    }
    const text = await res.text();
    let body = null;
    try {
      body = JSON.parse(text);
    } catch {}
    if (res.ok && body) {
      endpoint = ep;
      return body.rows ?? [];
    }
    if (body?.message && res.status !== 404) throw new Error(body.message);
    last = new Error(`HTTP ${res.status} from ${new URL(ep).hostname}`);
  }
  throw last;
}

const SCHEMA = [
  `create schema if not exists store`,
  `create table if not exists store.meta (key text primary key, created_at timestamptz not null default now())`,
  `create table if not exists store.products (
    id uuid primary key default gen_random_uuid(),
    slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    name text not null check (length(name) between 1 and 120),
    category text not null default 'designer-blouses',
    subtitle text not null default '',
    description text not null default '',
    price integer not null default 0 check (price >= 0),
    compare_at_price integer check (compare_at_price is null or compare_at_price >= 0),
    colors jsonb not null default '[]'::jsonb,
    sizes jsonb not null default '[]'::jsonb,
    features jsonb not null default '[]'::jsonb,
    is_active boolean not null default false,
    sort_order integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  )`,
  `create index if not exists store_products_live_idx on store.products (category, sort_order, created_at desc) where is_active`,
  `create table if not exists store.product_images (
    id uuid primary key default gen_random_uuid(),
    product_id uuid not null references store.products (id) on delete cascade,
    position integer not null default 0,
    mime text not null check (mime in ('image/webp', 'image/jpeg', 'image/png')),
    data bytea not null,
    width integer,
    height integer,
    created_at timestamptz not null default now()
  )`,
  `create index if not exists store_product_images_idx on store.product_images (product_id, position)`,
  `create table if not exists store.orders (
    id uuid primary key default gen_random_uuid(),
    order_no text not null unique,
    customer_name text not null,
    phone text not null,
    email text not null default '',
    address text not null,
    city text not null,
    state text not null,
    pincode text not null,
    notes text not null default '',
    items jsonb not null,
    subtotal integer not null,
    shipping integer not null default 0,
    total integer not null,
    payment_method text not null check (payment_method in ('cod', 'whatsapp')),
    status text not null default 'new' check (status in ('new', 'confirmed', 'shipped', 'delivered', 'cancelled')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  )`,
  `create index if not exists store_orders_created_idx on store.orders (created_at desc)`,
];

const FEATURES = ["Premium Fabric", "Fine Stitching", "Perfect Fit"];
const SIZES = ["S", "M", "L", "XL", "XXL"];
const BRIGHT = [
  { name: "Rani Pink", hex: "#D6246E" },
  { name: "Teal Blue", hex: "#1C7FA6" },
  { name: "Mustard", hex: "#F2A900" },
  { name: "Coral", hex: "#F0663A" },
  { name: "Bottle Green", hex: "#1F7A3A" },
];

/** The first three blouses from the brand's product creatives — saved as drafts (no price yet). */
const SEED = [
  {
    slug: "rani-pink-pearl-scallop-blouse",
    name: "Rani Pink Pearl Scallop Blouse",
    subtitle: "Designer blouse with pearl-scallop sleeves",
    description:
      "A sweetheart V front, a deep U back finished with a knotted dori and tassel, and hand-set pearl scallops along the sleeves. Smooth, softly lustrous fabric that drapes beautifully under any saree.",
    colors: BRIGHT,
    features: ["Premium Fabric", "Smooth Texture", "Fine Stitching", "Perfect Fit"],
  },
  {
    slug: "mirror-work-multicolour-blouse",
    name: "Mirror Work Multicolour Blouse",
    subtitle: "Festive print with mirror work and tassel tie",
    description:
      "Joyful floral and geometric print lit up with mirror work, a V front and an open back held by a dori with mirror-tassel drops. Made for mehendi, garba and every festive evening.",
    colors: BRIGHT,
    features: ["Premium Fabric", "Mirror Work", "Fine Stitching", "Perfect Fit"],
  },
  {
    slug: "peacock-blue-gold-tassel-blouse",
    name: "Peacock Blue Gold Tassel Blouse",
    subtitle: "Modern design with an elegant back style",
    description:
      "Rich peacock-blue silk with broad straps, gold bead-tassel shoulder detail and a deep back tied with a twisted gold cord. Statement styling that pairs with silk and tissue sarees.",
    colors: [
      { name: "Peacock Blue", hex: "#0F4C81" },
      { name: "Maroon", hex: "#7A1F2B" },
      { name: "Emerald", hex: "#1E5E3A" },
      { name: "Black", hex: "#141414" },
      { name: "Champagne", hex: "#E8D9B5" },
    ],
    features: FEATURES,
  },
];

async function seed() {
  const claimed = await sql(`insert into store.meta (key) values ('seed-v1') on conflict do nothing returning key`);
  if (claimed.length === 0) return log("seed already applied");
  for (const [i, p] of SEED.entries()) {
    const inserted = await sql(
      `insert into store.products (slug, name, category, subtitle, description, price, colors, sizes, features, is_active, sort_order)
       values ($1, $2, 'designer-blouses', $3, $4, 0, $5::jsonb, $6::jsonb, $7::jsonb, false, $8::int)
       on conflict (slug) do nothing returning id`,
      [p.slug, p.name, p.subtitle, p.description, JSON.stringify(p.colors), JSON.stringify(SIZES), JSON.stringify(p.features), String(i)],
    );
    const id = inserted[0]?.[0];
    if (!id) continue;
    const b64 = readFileSync(new URL(`./store-seed/${p.slug}.webp`, import.meta.url)).toString("base64");
    await sql(
      `insert into store.product_images (product_id, position, mime, data, width, height) values ($1::uuid, 0, 'image/webp', decode($2, 'base64'), 1536, 1024)`,
      [id, b64],
    );
  }
  log(`seeded ${SEED.length} draft products`);
}

async function main() {
  if (!cs) return log("skipped (no DATABASE_URL)");
  for (const s of SCHEMA) await sql(s);
  log(`schema ready via ${new URL(endpoint).hostname.split(".")[0]} endpoint`);
  await seed();
  const counts = await sql(
    `select (select count(*) from store.products)::text, (select count(*) from store.products where is_active)::text, (select count(*) from store.orders)::text`,
  );
  log(`products=${counts[0][0]} live=${counts[0][1]} orders=${counts[0][2]}`);
}

main().catch((e) => log(`FAILED: ${e.message}`));
