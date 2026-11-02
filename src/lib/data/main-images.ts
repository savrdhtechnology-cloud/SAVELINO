import type { ProductImage } from "./types";

/** Hand-picked main image per product (files in /public/products). Shown first on cards, collections and the product page. */
const MAIN: Record<string, { file: string }> = {
  "peacock-blue-gold-tassel-blouse": { file: "peacock-blue-gold-tassel-blouse-main.webp" },
  "mirror-work-multicolour-blouse": { file: "mirror-work-multicolour-blouse-main.webp" },
  "rani-pink-pearl-scallop-blouse": { file: "rani-pink-pearl-scallop-blouse-main.webp" },
};

export function mainImageFor(slug: string, productId: string): ProductImage | null {
  const m = MAIN[slug];
  if (!m) return null;
  return { id: `main-${slug}`, product_id: productId, url: `/products/${m.file}`, position: -1, width: 1122, height: 1402, kind: "creative" } as ProductImage;
}
