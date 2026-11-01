import { Fragment, type ReactNode } from "react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { getSiteSettings } from "@/lib/settings-server";
import type { SectionId } from "@/lib/settings";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { Hero } from "@/components/hero/Hero";
import { DesignerBlouses } from "@/components/sections/DesignerBlouses";
import { ProductShowcase } from "@/components/sections/ProductShowcase";
import { SignatureGallery } from "@/components/sections/SignatureGallery";
import { ReadyMade } from "@/components/sections/ReadyMade";
import { CustomStitching } from "@/components/sections/CustomStitching";
import { Heritage } from "@/components/sections/Heritage";
import { Craftsmanship } from "@/components/sections/Craftsmanship";
import { Lookbook } from "@/components/sections/Lookbook";
import { Collections } from "@/components/sections/Collections";
import { PartnerProgram } from "@/components/sections/PartnerProgram";
import { CustomerEntry } from "@/components/sections/CustomerEntry";
import { site } from "@/lib/site";
import { enabledCategories } from "@/lib/catalogue";
import { ShopSection } from "@/components/sections/ShopSection";
import { getLiveProducts } from "@/lib/store/products-server";

export default async function Home() {
  const settings = await getSiteSettings();
  const enabled = enabledCategories(settings.catalogue);
  const enabledSlugs = enabled.map((c) => c.slug);
  const visibleSections = new Set(settings.sections.filter((s) => s.visible).map((s) => s.id));
  // Blouses have their own homepage sections; the collections section lists the rest (or everything if those are hidden).
  const ownSection: Record<string, SectionId> = { "designer-blouses": "designer-blouses", "ready-made-blouses": "ready-made" };
  const collectionItems = enabled.filter((c) => !(ownSection[c.slug] && visibleSections.has(ownSection[c.slug])));
  const enabledSet = new Set(enabledSlugs);
  const liveProducts = (await getLiveProducts()).filter((p) => enabledSet.has(p.category));

  const SECTIONS: Record<SectionId, ReactNode> = {
    "designer-blouses": enabledSet.has("designer-blouses") ? <DesignerBlouses /> : null,
    showcase: <ProductShowcase enabled={enabled} />,
    signature: <SignatureGallery enabled={enabledSlugs} />,
    "ready-made": enabledSet.has("ready-made-blouses") ? <ReadyMade /> : null,
    "custom-stitching": <CustomStitching />,
    heritage: <Heritage />,
    craftsmanship: <Craftsmanship />,
    lookbook: <Lookbook enabled={enabledSlugs} />,
    collections: <Collections items={collectionItems} />,
    partners: <PartnerProgram />,
    account: <CustomerEntry />,
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
      <main id="main">
        <Hero content={settings.hero} />
        <ShopSection products={liveProducts} />
        {settings.sections
          .filter((sec) => sec.visible)
          .map((sec) => (
            <Fragment key={sec.id}>{SECTIONS[sec.id]}</Fragment>
          ))}
      </main>
      <SiteFooter />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  );
}
