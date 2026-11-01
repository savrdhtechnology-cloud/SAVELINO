import { CATEGORY_SLUG } from "@/lib/settings";
import type { ProductInput } from "./products-server";
import type { StoreColor } from "./types";

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const int = (v: unknown) => {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
};

export const slugify = (v: string) =>
  v
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

/** Validates an admin product form. Returns the clean input or an error message. */
export function parseProductInput(body: unknown): { ok: true; value: ProductInput } | { ok: false; error: string } {
  if (!isObj(body)) return { ok: false, error: "Invalid request" };
  const name = str(body.name, 120);
  if (!name) return { ok: false, error: "Product name is required" };
  const slug = slugify(str(body.slug, 80) || name);
  if (!slug || !CATEGORY_SLUG.test(slug)) return { ok: false, error: "Could not make a web address from this name" };
  const category = str(body.category, 60);
  if (!CATEGORY_SLUG.test(category)) return { ok: false, error: "Choose a category" };
  const price = int(body.price) ?? 0;
  const compare = int(body.compare_at_price);
  const isActive = body.is_active === true;
  if (isActive && price <= 0) return { ok: false, error: "Set a price before publishing" };

  const colors: StoreColor[] = Array.isArray(body.colors)
    ? body.colors
        .filter(isObj)
        .map((c) => ({ name: str(c.name, 40), hex: str(c.hex, 7) }))
        .filter((c) => c.name && /^#[0-9a-fA-F]{6}$/.test(c.hex))
        .slice(0, 16)
    : [];
  const list = (v: unknown, max: number, len: number) =>
    Array.isArray(v) ? [...new Set(v.map((x) => str(x, len)).filter(Boolean))].slice(0, max) : [];

  return {
    ok: true,
    value: {
      slug,
      name,
      category,
      subtitle: str(body.subtitle, 160),
      description: str(body.description, 4000),
      price,
      compare_at_price: compare && compare > price ? compare : null,
      colors,
      sizes: list(body.sizes, 20, 12),
      features: list(body.features, 8, 40),
      is_active: isActive,
      sort_order: int(body.sort_order) ?? 0,
    },
  };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: unknown): v is string => typeof v === "string" && UUID.test(v);
