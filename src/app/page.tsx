import { Fragment, type ReactNode } from "react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { getSiteSettings } from "@/lib/settings-server";
import type { SectionId } from "@/lib/settings";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { Hero } from "@/components/hero/Hero";
import { HeroSlider, type HeroSlide } from "@/components/hero/HeroSlider";
import { DesignerBlouses } from "@/components/sections/DesignerBlouses";
import { ProductShowcase } from "@/components/sections/ProductShowcase";
import { SignatureGallery } from "@/components/sections/SignatureGallery";
import { ReadyMade } from "@/components/sections/ReadyMade";
import { CustomStitching } from "@/components/sections/CustomStitching";
import { Heritage } from "@/components/sections/Heritage";
import { Craftsmanship } from "@/components/sections/Craftsmanship";
import { Lookbook } from "@/components/sections/Lookbook";
import { Collections } from "@/components/sections/Collections";
import { StatsStrip } from "@/components/sections/StatsStrip";
import { site } from "@/lib/site";
import { resolveCategories } from "@/lib/catalogue";
import { ShopSection } from "@/components/sections/ShopSection";
import { getLiveProducts, getVisibleCategories } from "@/lib/data/catalog-server";
import { MotionStyleProvider } from "@/components/site/Motion";
import { SITE_THEMES, type SiteThemeId } from "@/lib/settings";
import { showcaseProduct } from "@/lib/product-image";

type Props = { searchParams?: Promise<{ theme?: string }> };

export default async function Home({ searchParams }: Props) {
  const settings = await getSiteSettings();
  // Appearance Studio → Website themes previews an unsaved pick with ?theme=, same pattern as hero presets.
  const { theme: themeParam } = (await searchParams) ?? {};
  const siteTheme: SiteThemeId = SITE_THEMES.includes(themeParam as SiteThemeId) ? (themeParam as SiteThemeId) : settings.layout.theme;
  const enabled = resolveCategories(await getVisibleCategories());
  const enabledSlugs = enabled.map((c) => c.slug);
  const visibleSections = new Set(settings.sections.filter((s) => s.visible).map((s) => s.id));
  // Blouses have their own homepage sections; the collections section lists the rest (or everything if those are hidden).
  const ownSection: Record<string, SectionId> = { "designer-blouses": "designer-blouses", "ready-made-blouses": "ready-made" };
  const collectionItems = enabled.filter((c) => !(ownSection[c.slug] && visibleSections.has(ownSection[c.slug])));
  const enabledSet = new Set(enabledSlugs);
  const visibleIds = new Set(enabled.map((c) => c.id));
  const liveProducts = (await getLiveProducts()).filter((p) => p.category_id && visibleIds.has(p.category_id));
  const designerBlousesId = enabled.find((c) => c.slug === "designer-blouses")?.id;
  const readyMadeId = enabled.find((c) => c.slug === "ready-made-blouses")?.id;
  // Pearl theme hero: a photo slider built from real collection/category photography — featured first.
  const heroSlides: HeroSlide[] = [...enabled]
    .sort((a, b) => Number(b.featured) - Number(a.featured))
    .slice(0, 5)
    .map((c) => ({ kicker: c.kicker, title: c.title, summary: c.summary, image: c.image, href: `/collections/${c.slug}` }));

  const SECTIONS: Record<SectionId, ReactNode> = {
    shop: <ShopSection products={liveProducts} />,
    "designer-blouses": enabledSet.has("designer-blouses") ? (
      <DesignerBlouses product={showcaseProduct(liveProducts, designerBlousesId)} />
    ) : null,
    showcase: <ProductShowcase enabled={enabled} />,
    signature: <SignatureGallery enabled={enabledSlugs} />,
    "ready-made": enabledSet.has("ready-made-blouses") ? (
      <ReadyMade product={showcaseProduct(liveProducts, readyMadeId)} />
    ) : null,
    "custom-stitching": <CustomStitching />,
    heritage: <Heritage />,
    craftsmanship: <Craftsmanship />,
    lookbook: <Lookbook enabled={enabledSlugs} />,
    collections: <Collections items={collectionItems} />,
  };
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ClothingStore",
    name: site.name,
    slogan: site.tagline,
    description: site.description,
    url: site.url,
    logo: `${site.url}${site.logo.lockup}`,
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "SAVLINO Collections",
      itemListElement: enabled.map((c) => ({
        "@type": "OfferCatalog",
        name: c.title,
        url: `${site.url}/collections/${c.slug}`,
      })),
    },
  };

  return (
    <>
      <SiteHeader />
      <MotionStyleProvider style={settings.effects.motion}>
        <main id="main" data-site-theme={siteTheme}>
          {siteTheme === "pearl" && heroSlides.length ? <HeroSlider slides={heroSlides} /> : <Hero content={settings.hero} />}
          {siteTheme === "pearl" && <StatsStrip />}
          {settings.sections
            .filter((sec) => sec.visible)
            .map((sec) => (
              <Fragment key={sec.id}>{SECTIONS[sec.id]}</Fragment>
            ))}
        </main>
      </MotionStyleProvider>
      <SiteFooter />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  );
}
