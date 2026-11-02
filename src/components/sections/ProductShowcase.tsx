"use client";

import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { collections } from "@/lib/collections";
import type { Category } from "@/lib/catalogue";
import { CinemaIcon } from "@/components/cinema/icons";

type ShowcaseCard = { slug: string; title: string; img: string | StaticImageData; aspect: number };

/** "Featured Collections" style 3D stack — same look as the homepage cinema carousel, reused here for
 * the collection photos. CSS-only (no WebGL), so it never depends on a browser's 3D support. */
export function ProductShowcase({ enabled, images = [] }: { enabled: Category[]; images?: string[] }) {
  const titles = new Map(enabled.map((c) => [c.slug, c.title]));
  const showcase: ShowcaseCard[] = collections
    .filter((c) => c.slug !== "ready-made-blouses" && titles.has(c.slug))
    .map((c, i) => ({
      slug: c.slug,
      title: titles.get(c.slug) ?? c.title,
      img: images[i] || c.image,
      aspect: images[i] ? 0.8 : c.image.width / c.image.height,
    }));

  const count = showcase.length;
  const [active, setActive] = useState(0);
  const [hold, setHold] = useState(false);
  const startX = useRef<number | null>(null);

  useEffect(() => {
    if (hold || count < 2) return;
    const t = window.setInterval(() => setActive((a) => (a + 1) % count), 3600);
    return () => window.clearInterval(t);
  }, [hold, count]);

  if (count === 0) return null;
  const go = (n: number) => setActive((a) => (a + n + count) % count);

  return (
    <section id="showcase" aria-labelledby="showcase-title" className="cin-band-deep relative overflow-hidden py-24 md:py-36">
      <div className="mx-auto max-w-[1440px] px-5 md:px-10">
        <SectionHeading
          align="center"
          eyebrow="The SAVLINO salon"
          title="Every piece, in the round"
          intro="A slow turn through the house — tap any piece to step inside its collection."
        />
      </div>

      <div
        role="region"
        aria-roledescription="carousel"
        aria-label="Collection showcase"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") go(-1);
          if (e.key === "ArrowRight") go(1);
        }}
        onMouseEnter={() => setHold(true)}
        onMouseLeave={() => setHold(false)}
        onFocus={() => setHold(true)}
        onBlur={() => setHold(false)}
        onPointerDown={(e) => {
          startX.current = e.clientX;
        }}
        onPointerUp={(e) => {
          if (startX.current === null) return;
          const dx = e.clientX - startX.current;
          startX.current = null;
          if (Math.abs(dx) > 45) go(dx < 0 ? 1 : -1);
        }}
        className="relative mx-auto mt-14 h-[560px] max-w-[1400px] touch-pan-y select-none outline-none sm:h-[600px]"
        style={{ perspective: 1600 }}
      >
        <div aria-hidden className="cin-reflection absolute bottom-6 left-1/2 h-16 w-[min(80vw,420px)] -translate-x-1/2 rounded-[50%]" />
        {showcase.map((item, i) => {
          const d = i - active;
          const ad = Math.abs(d);
          if (ad > 2) return null;
          const centre = d === 0;
          return (
            <div
              key={item.slug}
              className="cin-pcard absolute left-1/2 top-0 w-[min(76vw,340px)]"
              style={{
                transform: `translateX(calc(-50% + ${d * 72}%)) translateZ(${-ad * 170}px) rotateY(${d * -26}deg) scale(${centre ? 1.04 : 1})`,
                zIndex: 10 - ad,
                opacity: ad === 2 ? 0.35 : ad === 1 ? 0.8 : 1,
                filter: centre ? "none" : `brightness(${ad === 1 ? 0.62 : 0.4})`,
                transition: "transform 0.9s cubic-bezier(0.22,1,0.36,1), opacity 0.9s, filter 0.9s",
              }}
              aria-hidden={!centre}
            >
              <CollectionCardCinema item={item} centre={centre} />
              {!centre && <button type="button" tabIndex={-1} aria-label={`Show ${item.title}`} onClick={() => setActive(i)} className="absolute inset-0 cursor-pointer" />}
            </div>
          );
        })}
        <button type="button" onClick={() => go(-1)} aria-label="Previous collection" className="cin-arrow absolute left-3 top-[40%] z-20 md:left-10">
          <CinemaIcon name="arrowL" className="h-4 w-4" strokeWidth={1.6} />
        </button>
        <button type="button" onClick={() => go(1)} aria-label="Next collection" className="cin-arrow absolute right-3 top-[40%] z-20 md:right-10">
          <CinemaIcon name="arrowR" className="h-4 w-4" strokeWidth={1.6} />
        </button>
      </div>

      <div className="mt-2 flex justify-center gap-2" aria-hidden>
        {showcase.map((item, i) => (
          <span key={item.slug} className={`h-1 rounded-full transition-all duration-500 ${i === active ? "w-8 bg-gold" : "w-2 bg-gold/30"}`} />
        ))}
      </div>
    </section>
  );
}

function CollectionCardCinema({ item, centre }: { item: ShowcaseCard; centre: boolean }) {
  return (
    <article className={`cin-card rounded-[1.6rem] p-2 ${centre ? "cin-card-on" : ""}`}>
      <Link href={`/collections/${item.slug}`} tabIndex={centre ? 0 : -1} className="group relative block aspect-[3/4] overflow-hidden rounded-[1.2rem] bg-noir">
        <Image
          quality={90}
          src={item.img}
          alt={item.title}
          fill
          sizes="340px"
          className="object-cover transition-transform duration-[1400ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
        />
      </Link>
      <div className="px-3 pb-3 pt-4 text-center">
        <h3 className="font-display text-xl text-ivory">{item.title}</h3>
        <Link
          href={`/collections/${item.slug}`}
          tabIndex={centre ? 0 : -1}
          className="mt-3 inline-block text-[0.65rem] uppercase tracking-[0.3em] text-gold underline-offset-8 hover:underline"
        >
          Discover the collection
        </Link>
      </div>
    </article>
  );
}
