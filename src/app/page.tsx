import { Header } from "@/components/layout/Header";
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

export default function Home() {
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
      <Header />
      <main id="main">
        <Hero />
        <DesignerBlouses />
        <ProductShowcase />
        <SignatureGallery />
        <ReadyMade />
        <CustomStitching />
        <Heritage />
        <Craftsmanship />
        <Lookbook />
        <Collections />
        <PartnerProgram />
        <CustomerEntry />
      </main>
      <Footer />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  );
}
