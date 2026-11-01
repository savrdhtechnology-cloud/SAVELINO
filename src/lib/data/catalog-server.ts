import "server-only";
import { createClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import { getSupabaseEnv } from "@/lib/supabase/env";
import type { Category, Product } from "./types";

/** Tag revalidated by the CRM after any catalogue change. */
export const CATALOG_TAG = "catalog";

const PRODUCT_SELECT = "*, images:product_images(id, url, position, width, height)";

function anon() {
  const env = getSupabaseEnv();
  return env ? createClient(env.url, env.anonKey, { auth: { persistSession: false } }) : null;
}

const sortImages = (p: Product): Product => ({ ...p, images: [...(p.images ?? [])].sort((a, b) => a.position - b.position) });

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
  ["live-products-v1"],
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
  ["live-product-v1"],
  { tags: [CATALOG_TAG], revalidate: 120 },
);
