import type { StaticImageData } from "next/image";
import { collections, images } from "./collections";
import type { Category as DbCategory } from "./data/types";

/** A website category as shown to visitors: database row + built-in copy/photo where the CRM left fields empty. */
export type Category = {
  id: string;
  slug: string;
  title: string;
  kicker: string;
  summary: string;
  story: string;
  highlights: string[];
  image: StaticImageData | string;
  featured: boolean;
};

const titleFromSlug = (slug: string) => slug.replace(/-/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());

export function resolveCategory(c: DbCategory): Category {
  const base = collections.find((b) => b.slug === c.slug);
  return {
    id: c.id,
    slug: c.slug,
    title: c.name.trim() || base?.title || titleFromSlug(c.slug),
    kicker: c.kicker.trim() || base?.kicker || "New at SAVLINO",
    summary: c.description.trim() || base?.summary || "",
    story: base?.story ?? c.description,
    highlights: base?.highlights ?? [],
    image: c.image_url.trim() || base?.image || images.heritage,
    featured: c.is_featured,
  };
}

export const resolveCategories = (rows: DbCategory[]) => rows.map(resolveCategory);

export const isStaticImage = (img: StaticImageData | string): img is StaticImageData => typeof img !== "string";

export const categoryImageUrl = (c: Category) => (isStaticImage(c.image) ? c.image.src : c.image);
