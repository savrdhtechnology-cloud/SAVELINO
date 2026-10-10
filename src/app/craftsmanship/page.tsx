import type { Metadata } from "next";
import { PageIntro, PageShell } from "@/components/layout/PageShell";
import { Craftsmanship } from "@/components/sections/Craftsmanship";
import { CustomStitching } from "@/components/sections/CustomStitching";
import { DesignerBlouses } from "@/components/sections/DesignerBlouses";

export const metadata: Metadata = {
  title: "Craftsmanship",
  description: "Hand embroidery, fabric selection, precision fit and finishing — the craft behind every SAVLINO piece.",
  alternates: { canonical: "/craftsmanship" },
};

export default function CraftsmanshipPage() {
  return (
    <PageShell>
      <PageIntro
        eyebrow="Craftsmanship"
        title="Hundreds of small decisions, made by hand"
        intro="How a SAVLINO piece is drafted, embroidered, stitched and finished."
      />
      <Craftsmanship />
      <DesignerBlouses />
      <CustomStitching />
    </PageShell>
  );
}
