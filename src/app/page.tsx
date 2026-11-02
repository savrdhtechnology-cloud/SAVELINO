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
import { getLiveProducts, getUpcomingProducts, getVisibleCategories } from "@/lib/data/catalog-server";
import { UpcomingSection } from "@/components/sections/UpcomingSection";
import { MotionStyleProvider } from "@/components/site/Motion";
import { SITE_THEMES, type SiteThemeId } from "@/lib/settings";
import { productCover, showcaseProduct } from "@/lib/product-image";
import { CinematicHero } from "@/components/cinema/CinematicHero";
import { LuxuryCategoryCarousel } from "@/components/cinema/LuxuryCategoryCarousel";
import { PerspectiveProductCarousel, type ShowcaseItem } from "@/components/cinema/PerspectiveProductCarousel";
import { StitchingJourney } from "@/components/cinema/StitchingJourney";
import { TrustFeatures } from "@/components/cinema/TrustFeatures";
import type { Product } from "@/lib/data/types";

function showcaseItems(products: Product[]): ShowcaseItem[] {
  return products.slice(0, 9).map((p) => {
    const { cover, fit } = productCover(p.images);
    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      subtitle: p.subtitle,
      price: p.price,
      compareAt: p.compare_at_price,
      sizes: p.sizes,
      colors: p.colors.map((c) => ({ name: c.name, hex: c.hex })),
      image: cover ? { url: cover.url, fit } : null,
      bagImage: cover?.url ?? null,
    };
  });
}

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
  const upcoming = await getUpcomingProducts();
  const liveProducts = (await getLiveProducts()).filter((p) => p.category_id && visibleIds.has(p.category_id));
  const designerBlousesId = enabled.find((c) => c.slug === "designer-blouses")?.id;
  const readyMadeId = enabled.find((c) => c.slug === "ready-made-blouses")?.id;
  // Pearl theme hero: a photo slider of the curated editorial lookbook photography (not raw product
  // shots — those read as catalogue photos, not the magazine-style hero the reference mockups want).
  const heroSlides: HeroSlide[] = [...enabled]
    .sort((a, b) => Number(b.featured) - Number(a.featured))
    .slice(0, 5)
    .map((c) => ({ kicker: c.kicker, title: c.title, summary: c.summary, image: c.image, href: `/collections/${c.slug}` }));

  const SECTIONS: Record<SectionId, ReactNode> = {
    shop: <ShopSection products={liveProducts} />,
    "designer-blouses": enabledSet.has("designer-blouses") ? (
      <DesignerBlouses product={showcaseProduct(liveProducts, designerBlousesId)} />
    ) : null,
    showcase: <ProductShowcase enabled={enabled} images={settings.showcaseImages} effect={settings.showcaseEffect} />,
    signature: <SignatureGallery enabled={enabledSlugs} images={settings.signatureImages} products={liveProducts} links={settings.signatureLinks} />,
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

  const cinema = siteTheme === "cinema";
  // Royal Cinema replaces the shop grid and the stitching section with its own 3D carousel and journey.
  const replacedByCinema = new Set<SectionId>(["shop", "custom-stitching"]);

  return (
    <div data-site-theme={siteTheme}>
      <SiteHeader />
      <MotionStyleProvider style={settings.effects.motion}>
        <main id="main" data-site-theme={siteTheme}>
          {cinema ? (
            <>
              <CinematicHero content={settings.hero} />
              <LuxuryCategoryCarousel items={enabled.map((c) => ({ slug: c.slug, title: c.title, kicker: c.kicker, image: c.image, href: `/collections/${c.slug}` }))} />
              <UpcomingSection products={upcoming} />
              {visibleSections.has("shop") && <PerspectiveProductCarousel items={showcaseItems(liveProducts)} />}
              <TrustFeatures />
              {visibleSections.has("custom-stitching") && <StitchingJourney />}
            </>
          ) : (
            <>
              {siteTheme === "pearl" && heroSlides.length ? <HeroSlider slides={heroSlides} /> : <Hero content={settings.hero} />}
              {siteTheme === "pearl" && <StatsStrip />}
              <UpcomingSection products={upcoming} />
            </>
          )}
          {settings.sections
            .filter((sec) => sec.visible && !(cinema && replacedByCinema.has(sec.id)))
            .map((sec) => (
              <Fragment key={sec.id}>{SECTIONS[sec.id]}</Fragment>
            ))}
        </main>
      </MotionStyleProvider>
      <SiteFooter />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </div>
  );
}
