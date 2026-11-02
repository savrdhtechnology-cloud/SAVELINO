import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro, PageShell } from "@/components/layout/PageShell";
import { ImageReveal } from "@/components/ui/Reveal";
import { CategoryImage } from "@/components/ui/CategoryImage";

export const metadata: Metadata = {
  title: "Blouse collections",
  description: "Explore SAVLINO designer blouses, ready-made pieces and custom blouse stitching.",
  alternates: { canonical: "/collections" },
};

const blouseCollections = [
  {
    slug: "designer-blouses",
    href: "/collections/designer-blouses",
    title: "Designer Blouses",
    kicker: "The signature of SAVLINO",
    summary: "Discover statement blouse designs, elegant back details and hand-finished occasionwear.",
    image: "/seed/peacock-blue-gold-tassel-blouse.webp",
  },
  {
    slug: "ready-made-blouses",
    href: "/collections/ready-made-blouses",
    title: "Ready-Made Blouses",
    kicker: "Beautiful styles, ready for you",
    summary: "Explore versatile blouse designs in classic colours, with effortless everyday elegance.",
    image: "https://ldfbrwcdebwoypthdqko.supabase.co/storage/v1/object/public/media/products/18717914-f161-47d1-808c-f242da408210/33c2b48d-e562-4aba-839a-35b472ab9918.webp",
  },
  {
    slug: "custom-stitching",
    href: "/custom-stitching",
    title: "Custom Blouse Stitching",
    kicker: "Your fabric, your perfect design",
    summary: "Bring your own fabric or choose ours. Share your preferred design for personal stitching and fitting.",
    image: "/seed/rani-pink-pearl-scallop-blouse.webp",
  },
] as const;

export default function CollectionsIndexPage() {
  return (
    <PageShell>
      <PageIntro
        eyebrow="The blouse collections"
        title="A blouse for every occasion"
        intro="Explore our blouse designs or have a piece stitched to your measurements — with your fabric or ours."
      />
      <section className="mx-auto max-w-[1440px] px-5 py-16 md:px-10 md:py-24">
        <ul className="grid gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
          {blouseCollections.map((c, i) => (
            <li key={c.slug}>
              <Link href={c.href} className="group block">
                <ImageReveal delay={(i % 3) * 0.1} className="aspect-[3/4] border border-gold/20">
                  <CategoryImage
                    src={c.image}
                    alt={c.title}
                    sizes="(min-width: 1024px) 30vw, (min-width: 640px) 46vw, 92vw"
                    className="object-cover object-top transition-transform duration-[1400ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
                  />
                </ImageReveal>
                <p className="eyebrow mt-6">{c.kicker}</p>
                <h2 className="mt-2 font-display text-3xl text-ivory transition-colors group-hover:text-gold">{c.title}</h2>
                <p className="mt-2 font-serif text-lg text-ivory/65">{c.summary}</p>
                <span className="mt-4 inline-flex items-center gap-3 text-[0.65rem] uppercase tracking-[0.3em] text-gold">
                  <span className="h-px w-8 bg-gold transition-all duration-500 group-hover:w-14" />
                  Discover
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </PageShell>
  );
}
