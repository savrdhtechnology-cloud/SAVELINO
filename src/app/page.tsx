import { Fragment, type ReactNode } from "react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { getSiteSettings } from "@/lib/settings-server";
import type { SectionId } from "@/lib/settings";
import { Footer } from "@/components/layout/Footer";
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
import { collections } from "@/lib/collections";

const SECTIONS: Record<SectionId, ReactNode> = {
  "designer-blouses": <DesignerBlouses />,
  showcase: <ProductShowcase />,
  signature: <SignatureGallery />,
  "ready-made": <ReadyMade />,
  "custom-stitching": <CustomStitching />,
  heritage: <Heritage />,
  craftsmanship: <Craftsmanship />,
  lookbook: <Lookbook />,
  collections: <Collections />,
  partners: <PartnerProgram />,
  account: <CustomerEntry />,
};

export default async function Home() {
  const settings = await getSiteSettings();
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
      itemListElement: collections.map((c) => ({
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
        {settings.sections
          .filter((sec) => sec.visible)
          .map((sec) => (
            <Fragment key={sec.id}>{SECTIONS[sec.id]}</Fragment>
          ))}
      </main>
      <Footer />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  );
}
