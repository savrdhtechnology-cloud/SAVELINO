import type { MetadataRoute } from "next";
import { getLiveProducts, getVisibleCategories } from "@/lib/data/catalog-server";
import { site } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const collections = await getVisibleCategories();
  const products = await getLiveProducts();
  const now = new Date();
  const staticRoutes = [
    "",
    "/collections",
    "/shop",
    "/lookbook",
    "/our-story",
    "/craftsmanship",
    "/custom-stitching",
    "/size-guide",
    "/faq",
    "/contact",
    "/shipping-returns",
    "/privacy",
    "/terms",
  ];
  return [
    ...staticRoutes.map((path) => ({
      url: `${site.url}${path}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: path === "" ? 1 : 0.6,
    })),
    ...collections.map((c) => ({
      url: `${site.url}/collections/${c.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...products.map((p) => ({
      url: `${site.url}/shop/${p.slug}`,
      lastModified: new Date(p.updated_at ?? p.created_at),
      changeFrequency: "weekly" as const,
      priority: 0.9,
    })),
  ];
}
