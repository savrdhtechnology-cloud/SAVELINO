import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { PageShell } from "@/components/layout/PageShell";
import { Reveal } from "@/components/ui/Reveal";
import { TiltCard } from "@/components/ui/TiltCard";
import { PhotoHero } from "@/components/sections/PhotoHero";
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
      <PhotoHero eyebrow="Our collections" title="Curated blouse collections" intro="Designs, details and versatile styles — discover SAVLINO's blouse collections." product={live.find((p) => p.images.length > 0)}>
        <Button href="#all-styles" variant="outline">Explore all styles</Button>
      </PhotoHero>

      {cards.length > 0 && (
        <section className="mx-auto max-w-[1280px] px-5 pt-10 md:px-10">
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 md:gap-6">
            {cards.map(({ c, count, first }, i) => {
              const { cover, fit } = first ? productCover(first.images) : { cover: undefined, fit: "50% 50%" };
              return (
                <li key={c.id}>
                  <Reveal delay={(i % 3) * 0.08} y={22}>
                    <TiltCard className="rounded-2xl">
                      <Link href={`/collections/${c.slug}`} className="group block overflow-hidden rounded-2xl border border-gold/25 bg-noir-soft transition-colors hover:border-gold/70">
                        <div className="relative aspect-[4/3] overflow-hidden">
                          {cover && <Image quality={90} src={cover.url} alt={first?.name ?? c.name} fill sizes="(min-width: 1024px) 30vw, (min-width: 640px) 46vw, 92vw" className="object-cover transition-transform duration-[1400ms] group-hover:scale-105" style={{ objectPosition: fit }} />}
                        </div>
                        <div className="p-5">
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
