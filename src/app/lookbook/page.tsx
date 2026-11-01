import type { Metadata } from "next";
import { PageIntro, PageShell } from "@/components/layout/PageShell";
import { Lookbook } from "@/components/sections/Lookbook";
import { SignatureGallery } from "@/components/sections/SignatureGallery";
import { getVisibleCategories } from "@/lib/data/catalog-server";

export const metadata: Metadata = {
  title: "Lookbook",
  description: "The SAVLINO editorial lookbook — sarees, salwar suits, designer blouses, lingerie and loungewear.",
  alternates: { canonical: "/lookbook" },
};

export default async function LookbookPage() {
  const enabled = (await getVisibleCategories()).map((c) => c.slug);
  return (
    <PageShell>
      <PageIntro
        eyebrow="Editorial lookbook"
        title="The moods of SAVLINO"
        intro="From candlelit celebrations to slow satin mornings — the season, styled."
      />
      <Lookbook enabled={enabled} />
      <SignatureGallery enabled={enabled} />
    </PageShell>
  );
}
