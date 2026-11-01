"use client";

import { useCallback, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { mergeSettings, type SiteSettings } from "@/lib/settings";
import type { Category, Order, Payment, Product, Profile } from "@/lib/data/types";

/** Browser Supabase client with the signed-in staff session (RLS decides what it can do). */
export function db() {
  const c = createSupabaseBrowserClient();
  if (!c) throw new Error("Database is not connected");
  return c;
}

type Res<T> = { data: T | null; error: { message: string } | null };
export function must<T>(res: Res<T>): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

/** Refreshes the public website after a change. */
export const revalidateSite = () => fetch("/api/revalidate", { method: "POST" }).catch(() => undefined);

/** Loads data on mount; `reload()` to refresh. */
export function useLoad<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(loader, deps);
  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setData(await run());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load");
    } finally {
      setLoading(false);
    }
  }, [run]);
  useEffect(() => {
    void reload();
  }, [reload]);
  return { data, setData, error, loading, reload };
}

const byPosition = (p: Product): Product => ({ ...p, images: [...(p.images ?? [])].sort((a, b) => a.position - b.position) });

export async function fetchProducts(): Promise<Product[]> {
  const rows = must(await db().from("products").select("*, images:product_images(id, url, storage_path, position, width, height)").order("sort_order").order("created_at", { ascending: false }));
  return (rows as Product[]).map(byPosition);
}

export async function fetchProduct(id: string): Promise<Product | null> {
  const row = must(await db().from("products").select("*, images:product_images(id, url, storage_path, position, width, height)").eq("id", id).maybeSingle());
  return row ? byPosition(row as Product) : null;
}

export const fetchCategories = async (): Promise<Category[]> => must(await db().from("categories").select("*").order("sort_order").order("name")) as Category[];

export const fetchOrders = async (limit = 500): Promise<Order[]> =>
  must(await db().from("orders").select("*").order("created_at", { ascending: false }).limit(limit)) as Order[];

export const fetchPayments = async (): Promise<Payment[]> =>
  must(await db().from("payments").select("*, orders(order_no, customer_name, phone, total)").order("created_at", { ascending: false }).limit(1000)) as Payment[];

export const fetchProfiles = async (): Promise<Profile[]> => must(await db().from("profiles").select("*").order("created_at")) as Profile[];

export async function fetchSettings(): Promise<SiteSettings> {
  const row = must(await db().from("settings").select("data").eq("id", 1).maybeSingle()) as { data?: unknown } | null;
  return mergeSettings(row?.data);
}

export async function saveSettings(next: SiteSettings) {
  must(await db().from("settings").upsert({ id: 1, data: next, updated_at: new Date().toISOString() }).select("id"));
  await revalidateSite();
}

/** Resizes a photo in the browser (max 1800px) and encodes WebP (JPEG fallback). */
export async function toWebp(file: File): Promise<{ blob: Blob; width: number; height: number }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, width, height);
  const encode = (type: string, q: number) => new Promise<Blob | null>((r) => canvas.toBlob(r, type, q));
  let blob = await encode("image/webp", 0.85);
  if (!blob || blob.type !== "image/webp") blob = await encode("image/jpeg", 0.88);
  if (!blob) throw new Error("Could not read this photo");
  return { blob, width, height };
}

/** Uploads a photo to the public "media" bucket and returns its public URL. */
export async function uploadMedia(folder: string, file: File) {
  const { blob, width, height } = await toWebp(file);
  const ext = blob.type === "image/webp" ? "webp" : "jpg";
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const client = db();
  const up = await client.storage.from("media").upload(path, blob, { contentType: blob.type, cacheControl: "31536000", upsert: false });
  if (up.error) throw new Error(up.error.message);
  const { data } = client.storage.from("media").getPublicUrl(path);
  return { url: data.publicUrl, path, width, height };
}

export async function removeMedia(paths: string[]) {
  const list = paths.filter(Boolean);
  if (list.length) await db().storage.from("media").remove(list);
}

/** Average colour of the centre of a photo — used to suggest the product colour. */
export async function dominantColor(file: Blob): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const c = document.createElement("canvas");
  c.width = 48;
  c.height = 48;
  const ctx = c.getContext("2d");
  if (!ctx) return "#888888";
  ctx.drawImage(bitmap, bitmap.width * 0.3, bitmap.height * 0.3, bitmap.width * 0.4, bitmap.height * 0.4, 0, 0, 48, 48);
  const px = ctx.getImageData(0, 0, 48, 48).data;
  let r = 0,
    g = 0,
    b = 0,
    n = 0;
  for (let i = 0; i < px.length; i += 4) {
    const max = Math.max(px[i], px[i + 1], px[i + 2]);
    const min = Math.min(px[i], px[i + 1], px[i + 2]);
    if (max < 25 || min > 235 || max - min < 18) continue; // skip skin-neutral greys, black and white
    r += px[i];
    g += px[i + 1];
    b += px[i + 2];
    n++;
  }
  if (!n) return "#888888";
  const h = (v: number) => Math.round(v / n).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

export function nearestColor<T extends { hex: string }>(hex: string, options: T[]): T {
  const rgb = (x: string) => [1, 3, 5].map((i) => parseInt(x.slice(i, i + 2), 16));
  const [r, g, b] = rgb(hex);
  let best = options[0];
  let bestD = Infinity;
  for (const o of options) {
    const [r2, g2, b2] = rgb(o.hex);
    const dist = (r - r2) ** 2 * 0.3 + (g - g2) ** 2 * 0.59 + (b - b2) ** 2 * 0.11;
    if (dist < bestD) {
      bestD = dist;
      best = o;
    }
  }
  return best;
}
