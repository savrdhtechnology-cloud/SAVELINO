import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PageIntro, PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/Button";
import { Reveal, ImageReveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { StyleTiles } from "@/components/sections/StyleTiles";
import { UpcomingSection } from "@/components/sections/UpcomingSection";
import { getLiveProducts, getUpcomingProducts, getVisibleCategories } from "@/lib/data/catalog-server";
import { productCover } from "@/lib/product-image";

export const metadata: Metadata = {
  title: "Lookbook",
  description: "The SAVLINO blouse lookbook — our designs, their colours and what is coming soon.",
  alternates: { canonical: "/lookbook" },
};

export default async function LookbookPage() {
  const [categories, live, upcomingAll] = await Promise.all([getVisibleCategories(), getLiveProducts(), getUpcomingProducts()]);
  const ids = new Set(categories.map((c) => c.id));
  const upcoming = upcomingAll.filter((p) => !p.category_id || ids.has(p.category_id));
  const lead = live.filter((p) => p.images.length > 0).slice(0, 5);
  // Colours really offered across the collection, most common first.
  const tally = new Map<string, { hex: string; n: number }>();
  for (const p of live) for (const c of p.colors) tally.set(c.name, { hex: c.hex, n: (tally.get(c.name)?.n ?? 0) + 1 });
  const shades = [...tally.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 12);
  return (
    <PageShell>
      <PageIntro eyebrow="The lookbook" title="Our blouses, up close" intro="A look at the designs in the SAVLINO collection, the colours they come in, and what is being stitched next." />

      {lead.length > 0 && (
        <section className="mx-auto max-w-[1280px] px-5 pt-10 md:px-10">
          <div className="grid gap-3 md:grid-cols-4 md:gap-4">
            {lead.map((p, i) => {
              const { cover, fit } = productCover(p.images);
              if (!cover) return null;
              const big = i === 0;
              return (
                <Reveal key={p.id} delay={i * 0.07} y={22} className={big ? "md:col-span-2 md:row-span-2" : ""}>
                  <Link href={`/shop/${p.slug}`} className="group relative block h-full overflow-hidden rounded-2xl border border-gold/25 bg-noir-soft">
                    <ImageReveal className={big ? "aspect-[4/5] md:aspect-auto md:h-full md:min-h-[560px]" : "aspect-[4/5]"}>
                      <Image quality={90} src={cover.url} alt={p.name} fill priority={i === 0} sizes={big ? "(min-width: 768px) 50vw, 92vw" : "(min-width: 768px) 25vw, 92vw"} className="object-cover transition-transform duration-[1400ms] group-hover:scale-105" style={{ objectPosition: fit }} />
                    </ImageReveal>
                    <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-noir/85 via-transparent to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-4">
                      <h2 className={`font-display text-ivory ${big ? "text-2xl md:text-4xl" : "text-lg md:text-xl"}`}>{p.name}</h2>
                      {p.subtitle && <p className="mt-1 line-clamp-2 text-[0.85rem] text-ivory/80">{p.subtitle}</p>}
                    </div>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        </section>
      )}

      {shades.length > 0 && (
        <section className="mx-auto max-w-[1100px] px-5 py-14 md:px-10 md:py-20">
          <SectionHeading eyebrow="Colours in the collection" title="Shades you can choose" intro="Every colour below is offered on at least one of our blouses." align="center" />
          <ul className="mt-8 flex flex-wrap justify-center gap-4 md:gap-6">
            {shades.map(([name, v], i) => (
              <li key={name}>
                <Reveal delay={i * 0.04} y={14} className="flex flex-col items-center gap-2">
                  <span className="h-14 w-14 rounded-full border border-gold/40 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.6)] md:h-16 md:w-16" style={{ background: v.hex }} />
                  <span className="max-w-24 text-center text-[0.8rem] text-ivory/80">{name}</span>
                </Reveal>
              </li>
            ))}
          </ul>
        </section>
      )}

      <StyleTiles id="all-styles" products={live.slice(5)} limit={12} eyebrow="More to explore" title="More styles" />
      <UpcomingSection products={upcoming} />

      <section className="px-5 py-16 text-center md:py-20">
        <Reveal>
          <p className="font-serif text-xl text-ivory/80 md:text-2xl">Found a design you love? We can stitch it to your measurements.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button href="/shop">Shop blouses</Button>
            <Button href="/custom-stitching" variant="outline">Custom stitching</Button>
          </div>
        </Reveal>
      </section>
    </PageShell>
  );
}
