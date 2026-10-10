import type { Metadata } from "next";
import { PageIntro, PageShell } from "@/components/layout/PageShell";
import { Lookbook } from "@/components/sections/Lookbook";
import { SignatureGallery } from "@/components/sections/SignatureGallery";

export const metadata: Metadata = {
  title: "Lookbook",
  description: "The SAVLINO editorial lookbook — sarees, salwar suits, designer blouses, lingerie and loungewear.",
  alternates: { canonical: "/lookbook" },
};

export default function LookbookPage() {
  return (
    <PageShell>
      <PageIntro
        eyebrow="Editorial lookbook"
        title="Six moods of SAVLINO"
        intro="From candlelit celebrations to slow satin mornings — the season, styled."
      />
      <Lookbook />
      <SignatureGallery />
    </PageShell>
  );
}
