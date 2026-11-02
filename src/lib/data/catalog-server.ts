import "server-only";
import { createClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import { mainImageFor } from "./main-images";
import { getSupabaseEnv } from "@/lib/supabase/env";
import type { Category, Product } from "./types";

/** Tag revalidated by the CRM after any catalogue change. */
export const CATALOG_TAG = "catalog";

const PRODUCT_SELECT = "*, images:product_images(id, url, position, width, height, kind)";

function anon() {
  const env = getSupabaseEnv();
  return env ? createClient(env.url, env.anonKey, { auth: { persistSession: false } }) : null;
}

/**
 * Orders photos and, when the CRM generated branded creatives, shows those instead of the raw
 * photos (raw photos follow only if "show raw photos" was ticked in the Product Studio).
 */
const sortImages = (p: Product): Product => {
  // Both storefront cards and detail pages must use the images belonging to
  // this exact product. Use uploaded product photos as the default cover; branded
  // promotional creatives belong in the gallery, not ahead of the garment photo.
  const all = [...(p.images ?? [])]
    .filter((image) => Boolean(image.url?.trim()) && (!image.product_id || image.product_id === p.id))
    .sort((a, b) => a.position - b.position || a.id.localeCompare(b.id));
  const creatives = all.filter((image) => image.kind === "creative");
  const tags = p.creative?.photoColors ?? {};
  const photos = all
    .filter((image) => image.kind !== "creative")
    .map((image) => (tags[image.id] ? { ...image, color: tags[image.id] } : image));
  // Rank for the storefront: sharp portrait photos first, then the framed portrait creatives,
  // then softer or landscape shots. Thumbnails too small to show sharply are dropped.
  const dims = (i: { width?: number | null; height?: number | null }) => ({ w: i.width ?? 0, h: i.height ?? 0 });
  const usable = [...photos, ...creatives].filter((i) => { const { w, h } = dims(i); return !w || !h || Math.max(w, h) >= 500; });
  const rank = (i: (typeof usable)[number]) => {
    const { w, h } = dims(i);
    const portrait = !w || !h || h >= w;
    const sharp = !w || !h || Math.min(w, h) >= 900;
    if (i.kind !== "creative" && portrait && sharp) return 0;
    if (i.kind === "creative" && portrait) return 1;
    if (portrait) return 2;
    return i.kind === "creative" ? 4 : 3;
  };
  const ranked = usable.map((img, idx) => ({ img, idx })).sort((x, y) => rank(x.img) - rank(y.img) || x.idx - y.idx).map((x) => x.img);
  const main = mainImageFor(p.slug, p.id);
  // A hand-picked main image replaces the auto-generated frames for that product.
  const list = main ? [main, ...ranked.filter((i) => i.kind !== "creative")] : ranked;
  const gallery = list;
  const images = list;
  return { ...p, images, gallery, generated: creatives.length > 0 };
};

/** Categories kept off the public website. */
export const HIDDEN_CATEGORY_SLUGS = ["sarees"];

/** Visible categories, in CRM order. */
export const getVisibleCategories = unstable_cache(
  async (): Promise<Category[]> => {
    const db = anon();
    if (!db) return [];
    const { data, error } = await db.from("categories").select("*").eq("is_visible", true).order("sort_order").order("name");
    if (error) console.error("[catalog] categories", error.message);
    // Sarees are not on the website for now — they stay in the CRM and come back when this list is emptied.
    return ((data as Category[] | null) ?? []).filter((c) => !HIDDEN_CATEGORY_SLUGS.includes(c.slug));
  },
  ["visible-categories-v4"],
  { tags: [CATALOG_TAG], revalidate: 120 },
);

/** Live products (optionally in one category), newest first within the CRM sort order. */
export const getLiveProducts = unstable_cache(
  async (categoryId?: string): Promise<Product[]> => {
    const db = anon();
    if (!db) return [];
    let q = db.from("products").select(PRODUCT_SELECT).eq("status", "live");
    if (categoryId) q = q.eq("category_id", categoryId);
    const { data, error } = await q.order("sort_order").order("created_at", { ascending: false }).limit(200);
    if (error) console.error("[catalog] products", error.message);
    return ((data as Product[] | null) ?? []).map(sortImages);
  },
  ["live-products-v4"],
  { tags: [CATALOG_TAG], revalidate: 120 },
);

export const getLiveProduct = unstable_cache(
  async (slug: string): Promise<Product | null> => {
    const db = anon();
    if (!db) return null;
    const { data, error } = await db.from("products").select(PRODUCT_SELECT).eq("status", "live").eq("slug", slug).maybeSingle();
    if (error) console.error("[catalog] product", error.message);
    return data ? sortImages(data as Product) : null;
  },
  ["live-product-v4"],
  { tags: [CATALOG_TAG], revalidate: 120 },
);

/** Pieces in production that customers can pre-order (status "upcoming"). Never mixed into the live shop queries above. */
export const getUpcomingProducts = unstable_cache(
  async (): Promise<Product[]> => {
    const db = anon();
    if (!db) return [];
    const { data, error } = await db.from("products").select(PRODUCT_SELECT).eq("status", "upcoming").order("expected_at", { ascending: true, nullsFirst: false }).order("created_at", { ascending: false }).limit(60);
    if (error) console.error("[catalog] upcoming", error.message);
    return ((data as Product[] | null) ?? []).map(sortImages);
  },
  ["upcoming-products-v3"],
  { tags: [CATALOG_TAG], revalidate: 120 },
);

export const getUpcomingProduct = unstable_cache(
  async (slug: string): Promise<Product | null> => {
    const db = anon();
    if (!db) return null;
    const { data, error } = await db.from("products").select(PRODUCT_SELECT).eq("status", "upcoming").eq("slug", slug).maybeSingle();
    if (error) console.error("[catalog] upcoming product", error.message);
    return data ? sortImages(data as Product) : null;
  },
  ["upcoming-product-v3"],
  { tags: [CATALOG_TAG], revalidate: 120 },
);
