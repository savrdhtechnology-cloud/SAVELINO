import { buildSources } from "./CreativePanel";
import { canvasBlob, defaultSettings, loadBitmap, loadCreativeFonts, mergeSettings, renderAll } from "./creative";
import { db, fetchCategories, fetchProducts, must, revalidateSite, uploadBlob } from "./data";

export type BrandResult = { branded: number; skipped: number; failed: string[] };

/**
 * Gives every listed product (live or upcoming) the SAVLINO frame — logo, feature icons, title band — by
 * generating its branded creatives from its own photos, exactly like Product Studio does when saving.
 * Products that already have creatives, or have no photos, are left alone. Safe to run again.
 */
export async function brandProducts(onProgress?: (done: number, total: number, name: string) => void): Promise<BrandResult> {
  const [products, categories] = await Promise.all([fetchProducts(), fetchCategories()]);
  const todo = products.filter((p) => (p.status === "live" || p.status === "upcoming") && !p.images.some((i) => i.kind === "creative") && p.images.some((i) => i.kind !== "creative"));
  const result: BrandResult = { branded: 0, skipped: products.length - todo.length, failed: [] };
  if (!todo.length) return result;
  await loadCreativeFonts();
  const client = db();
  for (const [n, p] of todo.entries()) {
    onProgress?.(n, todo.length, p.name);
    try {
      const cat = categories.find((c) => c.id === p.category_id);
      const settings = mergeSettings(p.creative, defaultSettings(cat?.slug, cat?.name));
      const photos = p.images.filter((i) => i.kind !== "creative").sort((a, b) => a.position - b.position);
      const fresh = photos.map((i) => ({ key: i.id, url: i.url, file: undefined as File | undefined }));
      const sources = await buildSources(fresh, settings, {}, (ph) => loadBitmap(undefined, ph.url));
      const items = renderAll({ sources, settings, colors: p.colors, sizes: p.sizes.length ? p.sizes : ["S", "M", "L", "XL"] }).filter((r) => !settings.skip.includes(r.id));
      let made = 0;
      for (const [i, r] of items.entries()) {
        const blob = await canvasBlob(r.canvas);
        const up = await uploadBlob(`products/${p.id}/creatives`, blob, r.canvas.width, r.canvas.height);
        must(await client.from("product_images").insert({ product_id: p.id, url: up.url, storage_path: up.path, position: 100 + i, width: up.width, height: up.height, kind: "creative" }).select("id").single());
        made++;
      }
      if (made) {
        must(await client.from("products").update({ creative: settings }).eq("id", p.id).select("id"));
        result.branded++;
      }
    } catch (e) {
      result.failed.push(`${p.name}: ${e instanceof Error ? e.message : "failed"}`);
    }
  }
  onProgress?.(todo.length, todo.length, "");
  await revalidateSite().catch(() => undefined);
  return result;
}
