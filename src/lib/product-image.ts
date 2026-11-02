import type { Product, ProductImage } from "@/lib/data/types";

/**
 * Cover for a product tile — the first of the ranked images.
 */
export function productCover(images: ProductImage[]) {
  // Images arrive ranked by the catalogue loader (sharp portrait photo → framed creative → rest).
  const [cover, second] = images;
  const landscape = !!cover?.width && !!cover?.height && cover.width > cover.height;
  const fit = cover?.kind === "creative" || landscape ? "50% 50%" : "50% 30%";
  return { cover, second, fit };
}

/** First live product in a category with at least one image — used for homepage showcase sections. */
export function showcaseProduct(products: Product[], categoryId?: string): Product | undefined {
  if (!categoryId) return undefined;
  return products.find((p) => p.category_id === categoryId && p.images.length > 0);
}

/**
 * Widest landscape photo among a category's live products — for a full-bleed hero banner the
 * bundled collection thumbnails (896px wide) stretch and blur, but a product's combined creative
 * (1536px) or a wide raw photo holds up at full screen width.
 */
export function heroPhoto(products: Product[], categoryId?: string): ProductImage | undefined {
  if (!categoryId) return undefined;
  let best: ProductImage | undefined;
  for (const p of products) {
    if (p.category_id !== categoryId) continue;
    for (const img of p.images) {
      const landscape = img.width && img.height ? img.width > img.height : img.kind === "creative";
      if (!landscape) continue;
      if (!best || (img.width ?? 0) > (best.width ?? 0)) best = img;
    }
  }
  return best;
}
