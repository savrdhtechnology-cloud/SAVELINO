import type { MetadataRoute } from "next";
import { enabledCategories } from "@/lib/catalogue";
import { getSiteSettings } from "@/lib/settings-server";
import { site } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const collections = enabledCategories((await getSiteSettings()).catalogue);
  const now = new Date();
  const staticRoutes = [
    "",
    "/collections",
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
    "/virtual-try-on",
    "/try-on-terms",
    "/image-consent",
    "/login",
    "/register",
    "/partner",
    "/partner/register",
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
  ];
}
