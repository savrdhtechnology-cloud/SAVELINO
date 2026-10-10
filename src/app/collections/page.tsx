import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PageIntro, PageShell } from "@/components/layout/PageShell";
import { ImageReveal } from "@/components/ui/Reveal";
import { collections } from "@/lib/collections";

export const metadata: Metadata = {
  title: "All collections",
  description: "Designer blouses, ready-made blouses, salwar suits, sarees, shapewear, lingerie and loungewear by SAVLINO.",
  alternates: { canonical: "/collections" },
};

export default function CollectionsIndexPage() {
  return (
    <PageShell>
      <PageIntro
        eyebrow="The collections"
        title="For every shade of a woman"
        intro="Seven collections, one standard of care — from heirloom occasionwear to the softest essentials."
      />
      <section className="mx-auto max-w-[1440px] px-5 py-16 md:px-10 md:py-24">
        <ul className="grid gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((c, i) => (
            <li key={c.slug}>
              <Link href={`/collections/${c.slug}`} className="group block">
                <ImageReveal delay={(i % 3) * 0.1} className="aspect-[3/4] border border-gold/20">
                  <Image
                    src={c.image}
                    alt={c.title}
                    fill
                    sizes="(min-width: 1024px) 30vw, (min-width: 640px) 46vw, 92vw"
                    placeholder="blur"
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
