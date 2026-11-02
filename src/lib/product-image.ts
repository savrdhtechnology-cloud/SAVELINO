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
