import { collections } from "@/lib/collections";
import { TRYON_COLORS, isTryOnCategory } from "./config";

/** Try-on-eligible pieces, serialisable for client components. */
export function tryOnProducts() {
  return collections
    .filter((c) => isTryOnCategory(c.slug))
    .map((c) => ({
      slug: c.slug,
      title: c.title,
      kicker: c.kicker,
      image: c.image.src,
      colors: TRYON_COLORS[c.slug as keyof typeof TRYON_COLORS],
    }));
}
