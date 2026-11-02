import type { Product, ProductImage } from "@/lib/data/types";

/**
 * Picks the best single cover photo for a product tile: a portrait image fills a 4:5/5:4 frame
 * cleanly, a generated creative is already centred (50/50 crop), a raw photo needs the usual
 * off-centre crop that favours the garment over empty background (28/50).
 */
export function productCover(images: ProductImage[]) {
  const portrait = images.filter((i) => !i.width || !i.height || i.height >= i.width);
  const [cover, second] = portrait.length ? portrait : images;
  const fit = cover?.kind === "creative" ? "50% 50%" : "28% 50%";
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
