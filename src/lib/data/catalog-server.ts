import "server-only";
import { createClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
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
  const all = [...(p.images ?? [])].sort((a, b) => a.position - b.position);
  const creatives = all.filter((i) => i.kind === "creative");
  const photos = all.filter((i) => i.kind !== "creative");
  if (!creatives.length) return { ...p, images: photos, generated: false };
  const base = p.creative?.showRaw ? [...creatives, ...photos] : creatives;
  // A product with only the combined (3:2) creative and no per-photo (4:5) ones has nothing portrait
  // to show as a grid cover — forcing that wide creative into a 4:5 card crops straight through its
  // logo and title text. Keep one raw photo in reserve so the card always has a clean portrait cover.
  const hasPortrait = creatives.some((i) => !i.width || !i.height || i.height >= i.width);
  const images = hasPortrait || p.creative?.showRaw || !photos.length ? base : [...base, photos[0]];
  return { ...p, images, generated: true };
};

/** Visible categories, in CRM order. */
export const getVisibleCategories = unstable_cache(
  async (): Promise<Category[]> => {
    const db = anon();
    if (!db) return [];
    const { data, error } = await db.from("categories").select("*").eq("is_visible", true).order("sort_order").order("name");
    if (error) console.error("[catalog] categories", error.message);
    return (data as Category[] | null) ?? [];
  },
  ["visible-categories-v1"],
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
  ["live-products-v2"],
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
  ["live-product-v2"],
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
  ["upcoming-products-v1"],
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
  ["upcoming-product-v1"],
  { tags: [CATALOG_TAG], revalidate: 120 },
);
