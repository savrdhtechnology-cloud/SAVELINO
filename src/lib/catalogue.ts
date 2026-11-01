import type { StaticImageData } from "next/image";
import { collections, images } from "./collections";
import type { CategorySetting, SiteSettings } from "./settings";

/** A website category as shown to visitors: built-in copy and photo, with any CRM edits applied. */
export type Category = {
  slug: string;
  title: string;
  kicker: string;
  summary: string;
  story: string;
  highlights: string[];
  image: StaticImageData | string;
  enabled: boolean;
  custom: boolean;
};

const titleFromSlug = (slug: string) => slug.replace(/-/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());

export function resolveCategory(c: CategorySetting): Category {
  const base = collections.find((b) => b.slug === c.slug);
  const image = c.image.trim();
  return {
    slug: c.slug,
    title: c.title.trim() || base?.title || titleFromSlug(c.slug),
    kicker: c.kicker.trim() || base?.kicker || "New at SAVLINO",
    summary: c.summary.trim() || base?.summary || "",
    story: base?.story ?? (c.summary.trim() || ""),
    highlights: base?.highlights ?? [],
    image: image || base?.image || images.heritage,
    enabled: c.enabled,
    custom: !base,
  };
}

/** Every category in CRM order (switched off ones included). */
export const allCategories = (catalogue: SiteSettings["catalogue"]) => catalogue.categories.map(resolveCategory);

/** Categories visitors can see, in CRM order. */
export const enabledCategories = (catalogue: SiteSettings["catalogue"]) => allCategories(catalogue).filter((c) => c.enabled);

/** A visible category by slug, or undefined when it doesn't exist or is switched off. */
export const findCategory = (catalogue: SiteSettings["catalogue"], slug: string) => enabledCategories(catalogue).find((c) => c.slug === slug);

export const isStaticImage = (img: StaticImageData | string): img is StaticImageData => typeof img !== "string";

/** URL of a category photo, for metadata. */
export const categoryImageUrl = (c: Category) => (isStaticImage(c.image) ? c.image.src : c.image);
