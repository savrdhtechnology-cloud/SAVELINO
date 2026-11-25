import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { PageShell } from "@/components/layout/PageShell";
import { Reveal } from "@/components/ui/Reveal";
import { TiltCard } from "@/components/ui/TiltCard";
import { SplitHeadline } from "@/components/ui/SplitHeadline";
import { Button } from "@/components/ui/Button";
import { StyleTiles } from "@/components/sections/StyleTiles";
import { UpcomingSection } from "@/components/sections/UpcomingSection";
import { getLiveProducts, getUpcomingProducts, getVisibleCategories } from "@/lib/data/catalog-server";
import { productCover } from "@/lib/product-image";

export const metadata: Metadata = {
  title: "Blouse collections",
  description: "Explore SAVLINO designer blouses, every style in the collection, what is coming soon, and custom blouse stitching.",
  alternates: { canonical: "/collections" },
};

export default async function CollectionsIndexPage() {
  const [categories, live, upcomingAll] = await Promise.all([getVisibleCategories(), getLiveProducts(), getUpcomingProducts()]);
  const ids = new Set(categories.map((c) => c.id));
  const upcoming = upcomingAll.filter((p) => !p.category_id || ids.has(p.category_id));
  const cards = categories
    .map((c) => {
      const items = live.filter((p) => p.category_id === c.id);
      const first = items.find((p) => p.images.length > 0);
      return { c, count: items.length, first };
    })
    .filter((x) => x.count > 0);
  return (
    <PageShell>
      <section className="relative isolate overflow-hidden border-b border-gold/30 bg-[#100b08]">
        <div className="relative aspect-[3/2] md:absolute md:inset-0 md:aspect-auto" aria-hidden="true">
          <Image
            src="/collections/royal-noir-hero.webp"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-[88%_35%] md:object-[center_30%]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#100b08] via-transparent to-transparent md:bg-gradient-to-r md:from-[#100b08] md:via-[#100b08]/20 md:to-transparent" />
        </div>
        <div className="relative mx-auto flex max-w-[1440px] items-center px-5 pb-12 md:min-h-[460px] md:px-12 md:py-16 lg:min-h-[510px] lg:px-20">
          <div className="max-w-[570px] md:w-[49%]">
            <Reveal y={10}><p className="eyebrow text-gold-light">Our collections</p></Reveal>
            <SplitHeadline as="h1" text="Curated blouse collections" trigger="mount" delay={0.1}
              className="mt-4 font-display text-[clamp(2.35rem,4.15vw,4.65rem)] leading-[1.02] text-[#faf0e2]" />
            <Reveal delay={0.25} y={14}>
              <p className="mt-5 max-w-[44ch] font-serif text-lg italic text-[#eadbc9] md:text-xl">
                Discover SAVLINO’s designer blouses, from occasionwear to everyday styles.
              </p>
            </Reveal>
            <Reveal delay={0.35} y={14} className="mt-7">
              <Button href="#all-styles" variant="outline">Explore all styles</Button>
            </Reveal>
          </div>
        </div>
      </section>

      {cards.length > 0 && (
        <section className="mx-auto max-w-[1280px] px-5 pt-10 md:px-10">
          <ul className="grid gap-4 sm:grid-cols-2 md:gap-6">
            {cards.map(({ c, count, first }, i) => {
              const { cover, fit } = first ? productCover(first.images) : { cover: undefined, fit: "50% 50%" };
              return (
                <li key={c.id}>
                  <Reveal delay={(i % 3) * 0.08} y={22}>
                    <TiltCard className="rounded-2xl">
                      <Link href={`/collections/${c.slug}`} className="group grid overflow-hidden rounded-2xl border border-gold/25 bg-noir-soft transition-colors hover:border-gold/70 lg:min-h-[300px] lg:grid-cols-2">
                        <div className="relative aspect-[4/3] overflow-hidden lg:aspect-auto">
                          {cover && <Image quality={90} src={cover.url} alt={first?.name ?? c.name} fill sizes="(min-width: 1024px) 30vw, (min-width: 640px) 46vw, 92vw" className="object-cover transition-transform duration-[1400ms] group-hover:scale-105" style={{ objectPosition: fit }} />}
                        </div>
                        <div className="flex flex-col justify-center p-5 lg:p-7">
                          <h2 className="font-display text-xl uppercase tracking-[0.08em] text-ivory">{c.name}</h2>
                          <p className="mt-1 line-clamp-2 text-[0.88rem] text-ivory/70">{c.description || c.kicker || `${count} ${count === 1 ? "style" : "styles"}`}</p>
                          <span className="mt-3 inline-flex items-center gap-3 text-[0.74rem] uppercase tracking-[0.28em] text-gold">
                            Explore <span className="h-px w-8 bg-gold transition-all duration-500 group-hover:w-14" />
                          </span>
                        </div>
                      </Link>
                    </TiltCard>
                  </Reveal>
                </li>
              );
            })}
            <li>
              <Reveal delay={0.1} y={22}>
                <TiltCard className="rounded-2xl">
                  <Link href="/custom-stitching" className="group flex h-full min-h-[300px] flex-col justify-end rounded-2xl border border-gold/40 bg-gradient-to-br from-burgundy-deep to-noir p-6 transition-colors hover:border-gold">
                    <p className="text-[0.74rem] uppercase tracking-[0.26em] text-gold-light">Made to measure</p>
                    <h2 className="mt-1 font-display text-2xl text-ivory md:text-3xl">Custom blouse stitching</h2>
                    <p className="mt-2 text-[0.92rem] text-ivory/75">Share your design and measurements — we stitch it for you.</p>
                    <span className="mt-3 inline-flex items-center gap-3 text-[0.74rem] uppercase tracking-[0.28em] text-gold">
                      <span className="h-px w-8 bg-gold transition-all duration-500 group-hover:w-14" />
                      See how it works
                    </span>
                  </Link>
                </TiltCard>
              </Reveal>
            </li>
          </ul>
        </section>
      )}

      <StyleTiles id="all-styles" products={live} limit={24} eyebrow="All styles" title="Every blouse in the collection" />
      <UpcomingSection products={upcoming} />
    </PageShell>
  );
}
