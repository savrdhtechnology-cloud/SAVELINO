import type { Metadata } from "next";
import { PageIntro, PageShell } from "@/components/layout/PageShell";
import { TryOnStudio } from "@/components/tryon/TryOnStudio";
import { tryOnProducts } from "@/lib/tryon/products";

export const metadata: Metadata = {
  title: "AI Virtual Try-On Studio",
  description: "Preview SAVLINO blouses, salwar suits, sarees and loungewear on your own photo — an AI-assisted styling preview.",
  alternates: { canonical: "/virtual-try-on" },
};

type Search = { searchParams: Promise<Record<string, string | string[] | undefined>> };
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function VirtualTryOnPage({ searchParams }: Search) {
  const sp = await searchParams;
  return (
    <PageShell>
      <PageIntro
        eyebrow="AI Virtual Try-On Studio"
        title="See it on you"
        intro="Upload a photo and preview how a SAVLINO piece could look — front, sides and back."
      />
      <div className="pt-12">
        {one(sp.deleted) === "1" && (
          <p role="status" className="mx-auto mb-10 max-w-xl border border-gold/30 bg-gold/5 px-5 py-3 text-center text-sm text-ivory/80">
            Your try-on photos and previews have been deleted.
          </p>
        )}
        <TryOnStudio products={tryOnProducts()} initial={{ product: one(sp.product), color: one(sp.color), size: one(sp.size) }} />
      </div>
    </PageShell>
  );
}
